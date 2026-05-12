import { Employee } from "./employeeService";
import { Task } from "./taskService";
import type { EmployeeNotesMap } from "./employeeNotesService";

const API_BASE = (import.meta.env.VITE_LLM_BASE_URL || "/api").replace(/\/$/, "");
const CHAT_ENDPOINT = `${API_BASE}/chat`;
const LLM_MODEL = "deepseek-r1:8b";

let cachedAuthKey: string | null = null;
let authKeyPromise: Promise<string | null> | null = null;

const fetchAuthKey = async () => {
  if (cachedAuthKey) return cachedAuthKey;
  if (authKeyPromise) return authKeyPromise;

  authKeyPromise = fetch(`${API_BASE}/authkey`)
    .then(async (res) => {
      if (!res.ok) return null;
      const data = await res.json();
      const key = typeof data.api_key === "string" ? data.api_key.trim() : null;
      if (key) cachedAuthKey = key;
      return key;
    })
    .catch((error) => {
      console.error("Failed to fetch auth key from backend:", error);
      return null;
    })
    .finally(() => {
      authKeyPromise = null;
    });

  return authKeyPromise;
};

export interface LLMTeamRecommendation {
  recommendedEmployeeIds: string[];
  reasoning: string;
  burnoutWarning: boolean;
}

export const recommendTeam = async (
  task: Task,
  employees: Employee[],
  employeeNotes?: EmployeeNotesMap,
): Promise<LLMTeamRecommendation | null> => {
  const employeesContext = employees
    .map((e) => {
      const notes = employeeNotes?.[e.id];
      const noteText = notes
        ? `\n  Strengths: ${notes.strengths || "-"}\n  Weaknesses: ${notes.weaknesses || "-"}\n  Notes: ${notes.notes || "-"}\n  Tags: ${(notes.tags || []).join(", ") || "-"}`
        : "";

      return `- ID: ${e.id}\n  Name: ${e.name}\n  Team: ${e.departmentName ?? e.department ?? "Unassigned"}\n  Job: ${e.jobTitle}\n  Description: ${e.jobDescription}\n  Workload (0-100): ${e.currentWorkload}${noteText}`;
    })
    .join("\n\n");

  const prompt = `You are an AI assistant helping a Department Head assign tasks to employees using a Genetic Algorithm-like evaluation approach.

Task Details:
- Title: ${task.title}
- Description: ${task.description || "No description provided."}

Available Employees:
${employeesContext}

Instructions:
1. Select a team of 1 to N employees. You may choose as many as needed based on complexity.
2. Use job descriptions and manager notes (strengths/weaknesses/tags) to match skills.
3. Consider workload. Workload above 80 indicates burnout risk.
4. Choose a lead candidate among the team (include them in the list).
5. Output your response as strict JSON with no markdown.

Required JSON format:
{
  "recommendedEmployeeIds": ["id_1", "id_2"],
  "reasoning": "Why this team and size were selected, plus workload assessment.",
  "burnoutWarning": true/false
}`;

  try {
    const runtimeToken = await fetchAuthKey();
    const response = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(runtimeToken ? { Authorization: `Bearer ${runtimeToken}` } : {}),
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [{ role: "user", content: prompt }],
        stream: false,
      }),
    });

    if (!response.ok) {
      console.error("LLM Error:", response.status, response.statusText);
      return null;
    }

    const data = await response.json();

    const contentString =
      data.message?.content ||
      data.choices?.[0]?.message?.content ||
      data.response ||
      data.content ||
      "";

    // Try to extract JSON from the content (DeepSeek sometimes wraps in markdown code blocks even if told not to)
    const jsonMatch = contentString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const ids = Array.isArray(parsed.recommendedEmployeeIds)
        ? parsed.recommendedEmployeeIds.filter(
            (id: unknown): id is string => typeof id === "string",
          )
        : typeof parsed.recommendedEmployeeIds === "string"
          ? [parsed.recommendedEmployeeIds]
          : [];
      return {
        recommendedEmployeeIds: ids,
        reasoning: parsed.reasoning || "",
        burnoutWarning:
          parsed.burnoutWarning === true || parsed.burnoutWarning === "true",
      };
    }

    return null;
  } catch (error) {
    console.error("Failed to fetch LLM recommendation:", error);
    return null;
  }
};
