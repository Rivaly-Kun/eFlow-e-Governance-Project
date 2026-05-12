import { Employee } from "./employeeService";
import { Task } from "./taskService";

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

export interface LLMRecommendation {
  recommendedEmployeeId: string;
  reasoning: string;
  burnoutWarning: boolean;
}

export const recommendAssignee = async (
  task: Task,
  employees: Employee[]
): Promise<LLMRecommendation | null> => {
  const employeesContext = employees
    .map(
      (e) =>
        `- ID: ${e.id}\n  Name: ${e.name}\n  Team: ${e.departmentName ?? e.department ?? "Unassigned"}\n  Job: ${e.jobTitle}\n  Description: ${e.jobDescription}\n  Workload (0-100): ${e.currentWorkload}`
    )
    .join("\n\n");

  const prompt = `You are an AI assistant helping a Department Head assign tasks to employees using a Genetic Algorithm-like evaluation approach.

Task Details:
- Title: ${task.title}
- Description: ${task.description || "No description provided."}

Available Employees:
${employeesContext}

Instructions:
1. Evaluate all employees based on their job descriptions, matching their skills to the task requirements.
2. Evaluate their current workload. A workload above 80 indicates a high risk of burnout.
3. Recommend the mathematically optimal assignee. If the best match has a workload > 80, issue a burnout warning but you may still recommend them if they are the only logical fit, or you can recommend the second best.
4. Output your response as a strict JSON object with no markdown formatting or extra text.

Required JSON format:
{
  "recommendedEmployeeId": "id_of_employee",
  "reasoning": "Detailed explanation of why this employee is the best fit, including workload assessment.",
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
      return {
        recommendedEmployeeId: parsed.recommendedEmployeeId,
        reasoning: parsed.reasoning,
        burnoutWarning: parsed.burnoutWarning === true || parsed.burnoutWarning === "true",
      };
    }

    return null;
  } catch (error) {
    console.error("Failed to fetch LLM recommendation:", error);
    return null;
  }
};
