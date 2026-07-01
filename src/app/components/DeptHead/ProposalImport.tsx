import React, { useState, useRef, useCallback, useMemo } from "react";
import {
  FileText,
  Upload,
  Loader2,
  Sparkles,
  AlertCircle,
  Layers,
  FolderOpen,
  Crown,
} from "lucide-react";
import {
  useEmployees,
  useEmployeeNotes,
  useUsers,
  useDepartments,
} from "../../hooks/useFirebaseData";
import { useAuth } from "../../contexts/AuthContext";
import { Employee } from "../../services/employeeService";
import { createTask, CreateTaskPayload } from "../../services/taskService";
import { createSubtasksBatch } from "../../services/subtaskService";
import {
  decomposeProposal,
  ProposalDecompositionResult,
} from "../../services/proposalDecompositionService";

// ─── PDF text extraction (pdfjs-dist) ────────────────────────────

async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  // Use local worker bundled with pdfjs-dist (Vite serves it from node_modules)
  const workerUrl = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  );
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.href;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: { str?: string }) => item.str || "")
      .join(" ");
    pages.push(text);
  }

  return pages.join("\n\n");
}

// ─── Types ───────────────────────────────────────────────────────

type ImportPhase = "idle" | "extracting" | "decomposing" | "done" | "error";

// ─── Component ───────────────────────────────────────────────────

export default function ProposalImport() {
  const { employees: allEmployees } = useEmployees();
  const { users } = useUsers();
  const { departments } = useDepartments();
  const { notes: employeeNotes } = useEmployeeNotes();
  const { userProfile } = useAuth();

  const departmentNameById = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach((dept) => {
      if (dept.id) {
        map.set(dept.id, dept.name);
      }
    });
    return map;
  }, [departments]);

  const usersAsEmployees = useMemo<Employee[]>(() => {
    const initialsFor = (name: string) =>
      name
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    const titleForRole = (role?: string) =>
      role
        ? role
            .split("_")
            .map((part) => part[0]?.toUpperCase() + part.slice(1))
            .join(" ")
        : "Employee";

    return users.map((user) => {
      const name = user.fullName || user.email || "Unnamed User";
      const departmentId = user.departmentId || "";
      return {
        id: user.uid,
        name,
        jobTitle: titleForRole(user.role),
        jobDescription: "",
        currentWorkload: typeof user.workload === "number" ? user.workload : 0,
        department: departmentId || undefined,
        departmentName: departmentId
          ? departmentNameById.get(departmentId) || departmentId
          : undefined,
        initials: initialsFor(name),
        email: user.email || undefined,
      };
    });
  }, [users, departmentNameById]);

  const userById = useMemo(
    () => new Map(users.map((user) => [user.uid, user])),
    [users],
  );

  const userByEmail = useMemo(() => {
    const map = new Map<string, (typeof users)[number]>();
    users.forEach((user) => {
      if (user.email) {
        map.set(user.email.toLowerCase(), user);
      }
    });
    return map;
  }, [users]);

  const headUsers = useMemo(() => {
    const ids = new Set<string>();
    const emails = new Set<string>();
    departments.forEach((dept) => {
      if (!dept.headUserId) return;
      ids.add(dept.headUserId);
      const head = userById.get(dept.headUserId);
      if (head?.email) {
        emails.add(head.email.toLowerCase());
      }
    });
    return { ids, emails };
  }, [departments, userById]);

  const directoryEmployees = useMemo(() => {
    const merged = new Map<string, Employee>();
    const emails = new Set<string>();

    allEmployees.forEach((emp) => {
      merged.set(emp.id, emp);
      if (emp.email) {
        emails.add(emp.email.toLowerCase());
      }
    });

    usersAsEmployees.forEach((emp) => {
      const emailKey = emp.email?.toLowerCase();
      if (emailKey && emails.has(emailKey)) return;
      if (!merged.has(emp.id)) {
        merged.set(emp.id, emp);
      }
    });

    return Array.from(merged.values());
  }, [allEmployees, usersAsEmployees]);

  const deptEmployees = useMemo(() => {
    if (!userProfile?.departmentId) return directoryEmployees;
    const currentEmail = userProfile.email?.toLowerCase();
    const departmentId = userProfile.departmentId;

    return directoryEmployees.filter((emp) => {
      if (emp.department !== departmentId) return false;
      if (userProfile.uid && emp.id === userProfile.uid) return false;
      if (currentEmail && emp.email?.toLowerCase() === currentEmail) {
        return false;
      }

      const matchById = userById.get(emp.id);
      const matchByEmail = emp.email
        ? userByEmail.get(emp.email.toLowerCase())
        : undefined;
      const matchedUser = matchById || matchByEmail;

      if (matchedUser?.role === "department_head") return false;
      if (headUsers.ids.has(emp.id)) return false;
      if (emp.email && headUsers.emails.has(emp.email.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [
    directoryEmployees,
    headUsers,
    userByEmail,
    userById,
    userProfile?.departmentId,
    userProfile?.email,
    userProfile?.uid,
  ]);

  const deptEmployeesWithNotes = useMemo(
    () => deptEmployees.filter((emp) => Boolean(employeeNotes?.[emp.id])),
    [deptEmployees, employeeNotes],
  );

  const employeeById = useMemo<Record<string, Employee>>(
    () => Object.fromEntries((deptEmployees || []).map((e) => [e.id, e])),
    [deptEmployees],
  );

  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<ImportPhase>("idle");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ProposalDecompositionResult | null>(
    null,
  );
  const [autoCreateStatus, setAutoCreateStatus] = useState<
    "idle" | "creating" | "done" | "error"
  >("idle");
  const [autoCreateMessage, setAutoCreateMessage] = useState("");
  const [createdTaskKeys, setCreatedTaskKeys] = useState<Set<string>>(
    new Set(),
  );
  const [failedTaskKeys, setFailedTaskKeys] = useState<Set<string>>(new Set());
  const [taskPayloads, setTaskPayloads] = useState<
    Record<string, CreateTaskPayload>
  >({});
  const [taskSubtasksByKey, setTaskSubtasksByKey] = useState<
    Record<string, string[]>
  >({});
  const [subtasksCreatedByKey, setSubtasksCreatedByKey] = useState<
    Record<string, number>
  >({});

  const taskKey = (pi: number, pj: number, ai: number, ti: number) =>
    `${pi}-${pj}-${ai}-${ti}`;

  const buildTaskPayloads = useCallback(
    (decomposed: ProposalDecompositionResult) => {
      const payloads: Record<string, CreateTaskPayload> = {};
      const subtasksMap: Record<string, string[]> = {};
      const proposalTitle =
        decomposed.proposal?.title ||
        fileName.replace(/\.pdf$/i, "") ||
        "Imported Proposal";
      const proposalSlug = proposalTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48);
      const proposalId = `proposal-${proposalSlug || "imported"}`;
      const importBatchId = `${proposalId}-${Date.now()}`;

      decomposed.programs.forEach((program, pi) => {
        const programId = `${proposalId}-program-${pi + 1}`;
        program.projects.forEach((project, pj) => {
          const projectId = `${programId}-project-${pj + 1}`;
          project.activities.forEach((activity, ai) => {
            const activityId = `${projectId}-activity-${ai + 1}`;
            activity.tasks.forEach((task, ti) => {
              const key = taskKey(pi, pj, ai, ti);
              subtasksMap[key] = task.subtasks || [];
              const contextLines = [
                `Program: ${program.title}`,
                `Project: ${project.title}`,
                `Activity: ${activity.title}`,
                activity.schedule ? `Schedule: ${activity.schedule}` : "",
                activity.methodology && activity.methodology.length > 0
                  ? `Methodology: ${activity.methodology.join(", ")}`
                  : "",
              ].filter(Boolean);
              const contextBlock = contextLines.length
                ? `Context:\n${contextLines.join("\n")}`
                : "";
              const description = [task.description, contextBlock]
                .filter(Boolean)
                .join("\n\n");
              const recommendedIds = task.recommendedEmployeeIds || [];
              const recommendedMembers = recommendedIds
                .map((id) => employeeById[id])
                .filter((member): member is Employee => Boolean(member));
              const leadMember = recommendedMembers[0];

              payloads[key] = {
                title: task.title,
                description: description || "No description provided.",
                deadline: activity.schedule || "",
                priority: task.priority || "medium",
                tags: task.requiredSkills || [],
                status: "pending_assignment",
                department: userProfile?.departmentId || "",
                teamId: userProfile?.departmentId || "",
                teamName:
                  leadMember?.departmentName ||
                  leadMember?.department ||
                  userProfile?.departmentId ||
                  "Imported",
                teamMemberIds: recommendedMembers.map((member) => member.id),
                teamMemberNames: recommendedMembers.map((member) => member.name),
                assigneeId: leadMember?.id,
                assigneeName: leadMember?.name,
                recommendedEmployeeIds: recommendedIds,
                recommendationReasoning: task.recommendationReasoning,
                recommendationSource:
                  recommendedIds.length > 0 || task.recommendationReasoning
                    ? "import"
                    : undefined,
                recommendationLeadId: recommendedIds[0],
                burnoutWarning: task.burnoutWarning,
                proposalId,
                proposalTitle,
                programId,
                programTitle: program.title,
                projectId,
                projectTitle: project.title,
                activityId,
                activityTitle: activity.title,
                activitySchedule: activity.schedule || "",
                hierarchyPath: [
                  proposalTitle,
                  program.title,
                  project.title,
                  activity.title,
                ]
                  .filter(Boolean)
                  .join(" > "),
                importBatchId,
              };
            });
          });
        });
      });

      return { payloads, subtasksMap };
    },
    [employeeById, fileName, userProfile?.departmentId],
  );

  const autoCreateTasks = useCallback(
    async (decomposed: ProposalDecompositionResult) => {
      const { payloads: payloadMap, subtasksMap } = buildTaskPayloads(decomposed);
      setTaskPayloads(payloadMap);
      setTaskSubtasksByKey(subtasksMap);

      const entries = Object.entries(payloadMap);
      if (entries.length === 0) {
        setAutoCreateStatus("done");
        setAutoCreateMessage("No tasks found to create.");
        return;
      }

      const created = new Set<string>();
      const failed = new Set<string>();
      const subtaskCounts: Record<string, number> = {};

      await Promise.all(
        entries.map(async ([key, payload]) => {
          try {
            const createdTask = await createTask(payload);
            created.add(key);

            const subtaskTitles = subtasksMap[key] || [];
            if (subtaskTitles.length > 0) {
              try {
                const createdSubtasks = await createSubtasksBatch(
                  createdTask.id,
                  subtaskTitles,
                  "ai_extracted",
                );
                subtaskCounts[key] = createdSubtasks.length;
              } catch (subErr) {
                console.error("Failed to create subtasks for task:", key, subErr);
              }
            }
          } catch (err) {
            console.error("Failed to auto-create task:", err);
            failed.add(key);
          }
        }),
      );

      setCreatedTaskKeys(created);
      setFailedTaskKeys(failed);
      setSubtasksCreatedByKey(subtaskCounts);

      if (failed.size > 0) {
        setAutoCreateStatus("error");
        setAutoCreateMessage(
          `${failed.size} task${failed.size === 1 ? "" : "s"} failed to create.`,
        );
      } else {
        setAutoCreateStatus("done");
        setAutoCreateMessage(
          `Created ${created.size} task${created.size === 1 ? "" : "s"} in the Task Board.`,
        );
      }
    },
    [buildTaskPayloads],
  );

  const retryFailedTasks = useCallback(async () => {
    if (failedTaskKeys.size === 0) return;

    setAutoCreateStatus("creating");
    const created = new Set(createdTaskKeys);
    const failed: string[] = [];

    await Promise.all(
      Array.from(failedTaskKeys).map(async (key) => {
        const payload = taskPayloads[key];
        if (!payload) {
          failed.push(key);
          return;
        }
        try {
          await createTask(payload);
          created.add(key);
        } catch (err) {
          console.error("Retry failed for task:", err);
          failed.push(key);
        }
      }),
    );

    setCreatedTaskKeys(created);
    setFailedTaskKeys(new Set(failed));

    if (failed.length > 0) {
      setAutoCreateStatus("error");
      setAutoCreateMessage(
        `${failed.length} task${failed.length === 1 ? "" : "s"} still failed to create.`,
      );
    } else {
      setAutoCreateStatus("done");
      setAutoCreateMessage("All tasks created successfully.");
    }
  }, [createdTaskKeys, failedTaskKeys, taskPayloads]);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setError("Please upload a PDF file.");
        setPhase("error");
        return;
      }

      setFileName(file.name);
      setError("");
      setResult(null);
      setAutoCreateStatus("idle");
      setAutoCreateMessage("");
      setCreatedTaskKeys(new Set());
      setFailedTaskKeys(new Set());
      setTaskPayloads({});
      setTaskSubtasksByKey({});
      setSubtasksCreatedByKey({});

      // Phase 1: Extract text
      setPhase("extracting");
      let text: string;
      try {
        text = await extractTextFromPdf(file);
        if (!text.trim()) {
          setError("Could not extract text from PDF. It may be image-based.");
          setPhase("error");
          return;
        }
      } catch (err) {
        console.error("PDF extraction error:", err);
        setError("Failed to read PDF file. Please try a different file.");
        setPhase("error");
        return;
      }

      // Phase 2: Decompose via LLM
      setPhase("decomposing");
      try {
        const availableEmployees =
          deptEmployeesWithNotes.length > 0
            ? deptEmployeesWithNotes
            : deptEmployees;
        const decomposed = await decomposeProposal(
          text,
          file.name.replace(/\.pdf$/i, ""),
          availableEmployees,
          employeeNotes,
        );
        setResult(decomposed);
        setPhase("done");
        setAutoCreateStatus("creating");
        await autoCreateTasks(decomposed);
      } catch (err) {
        console.error("Decomposition error:", err);
        setError("AI decomposition failed. Please try again.");
        setPhase("error");
      }
    },
    [deptEmployees, deptEmployeesWithNotes, employeeNotes, autoCreateTasks],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const summaryCounts = useMemo(() => {
    if (!result) {
      return { programs: 0, projects: 0, activities: 0, tasks: 0 };
    }
    const programs = result.programs.length;
    const projects = result.programs.reduce(
      (sum, program) => sum + program.projects.length,
      0,
    );
    const activities = result.programs.reduce(
      (sum, program) =>
        sum +
        program.projects.reduce(
          (acc, project) => acc + project.activities.length,
          0,
        ),
      0,
    );
    const tasks = result.programs.reduce(
      (sum, program) =>
        sum +
        program.projects.reduce(
          (acc, project) =>
            acc +
            project.activities.reduce(
              (taskSum, activity) => taskSum + activity.tasks.length,
              0,
            ),
          0,
        ),
      0,
    );

    return { programs, projects, activities, tasks };
  }, [result]);

  const boardStyles = useMemo(
    () =>
      ({
        "--board-bg": "#f7f4ee",
        "--board-panel": "#ffffff",
        "--board-accent": "#0f766e",
        "--board-accent-soft": "#e6f4f1",
        "--board-border": "#e6e1d7",
        "--board-shadow": "rgba(15, 118, 110, 0.12)",
      }) as React.CSSProperties,
    [],
  );

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div
      className="p-8 min-h-full font-['Lexend:Regular',_sans-serif] bg-[var(--board-bg)]"
      style={boardStyles}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-400 uppercase tracking-wider mb-1">
            <FileText size={12} /> Programs & Activities · Proposal Import
          </div>
          <h1 className="text-[22px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
            PDF Proposal Import
          </h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">
            Upload a government proposal PDF → AI decomposes it into Programs →
            Projects → Activities → Tasks with employee suggestions.
          </p>
        </div>
        {result && (
          <button
            onClick={() => {
              setResult(null);
              setPhase("idle");
              setFileName("");
              setAutoCreateStatus("idle");
              setAutoCreateMessage("");
              setCreatedTaskKeys(new Set());
              setFailedTaskKeys(new Set());
              setTaskPayloads({});
              setTaskSubtasksByKey({});
              setSubtasksCreatedByKey({});
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50"
          >
            <Upload size={13} /> Import Another
          </button>
        )}
      </div>

      {/* Upload Zone */}
      {phase === "idle" && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className="cursor-pointer rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-16 text-center transition hover:border-violet-400 hover:bg-violet-50/30"
        >
          <Upload size={40} className="mx-auto mb-4 text-neutral-400" />
          <div className="text-[16px] font-['Lexend:SemiBold',_sans-serif] text-neutral-700">
            Drop a PDF proposal here
          </div>
          <div className="text-[13px] text-neutral-500 mt-1">
            or click to browse · Supports government proposal PDFs
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleInputChange}
          />
        </div>
      )}

      {/* Processing */}
      {(phase === "extracting" || phase === "decomposing") && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-16 text-center">
          <Loader2
            size={36}
            className="mx-auto mb-4 text-violet-600 animate-spin"
          />
          <div className="text-[16px] font-['Lexend:SemiBold',_sans-serif] text-neutral-800">
            {phase === "extracting"
              ? "Extracting text from PDF…"
              : "AI is decomposing the proposal…"}
          </div>
          <div className="text-[13px] text-neutral-500 mt-1">
            {fileName} ·{" "}
            {phase === "extracting"
              ? "Reading pages"
              : "This may take up to 2 minutes for large proposals"}
          </div>
          <div className="mt-6 flex justify-center gap-3">
            <div
              className={`h-2 w-2 rounded-full ${phase === "extracting" ? "bg-violet-600 animate-pulse" : "bg-emerald-500"}`}
            />
            <div
              className={`h-2 w-2 rounded-full ${phase === "decomposing" ? "bg-violet-600 animate-pulse" : "bg-neutral-300"}`}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {phase === "error" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle size={32} className="mx-auto mb-3 text-red-500" />
          <div className="text-[15px] font-['Lexend:SemiBold',_sans-serif] text-red-800">
            Import Failed
          </div>
          <div className="text-[13px] text-red-700 mt-1">{error}</div>
          <button
            onClick={() => {
              setPhase("idle");
              setError("");
            }}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-[12px] font-['Lexend:Medium',_sans-serif] hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Results Board */}
      {phase === "done" && result && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--board-border)] bg-[var(--board-panel)] p-4 shadow-[0_16px_40px_-28px_var(--board-shadow)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--board-accent)]">
                  Auto-created tasks
                </div>
                <div className="mt-1 text-[14px] text-neutral-700">
                  Suggestions are ready. Assignments stay flexible for manual
                  edits in the Task Board.
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-full border border-[var(--board-border)] bg-white px-3 py-1 text-[11px] text-neutral-600">
                  {createdTaskKeys.size}/{summaryCounts.tasks} created
                </div>
                {autoCreateStatus === "creating" && (
                  <div className="inline-flex items-center gap-2 text-[11px] text-neutral-600">
                    <Loader2 size={12} className="animate-spin" /> Creating
                    tasks
                  </div>
                )}
                {autoCreateStatus === "error" && failedTaskKeys.size > 0 && (
                  <button
                    onClick={retryFailedTasks}
                    className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-['Lexend:Medium',_sans-serif] text-red-700 hover:bg-red-100"
                  >
                    <AlertCircle size={12} /> Retry failed
                  </button>
                )}
              </div>
            </div>
            {autoCreateMessage && (
              <div className="mt-2 text-[11px] text-neutral-500">
                {autoCreateMessage}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-[var(--board-border)] bg-white p-4">
              <div className="text-[10px] uppercase tracking-wider text-neutral-400">
                Programs
              </div>
              <div className="mt-2 text-[22px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
                {summaryCounts.programs}
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--board-border)] bg-white p-4">
              <div className="text-[10px] uppercase tracking-wider text-neutral-400">
                Projects
              </div>
              <div className="mt-2 text-[22px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
                {summaryCounts.projects}
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--board-border)] bg-white p-4">
              <div className="text-[10px] uppercase tracking-wider text-neutral-400">
                Activities
              </div>
              <div className="mt-2 text-[22px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
                {summaryCounts.activities}
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--board-border)] bg-white p-4">
              <div className="text-[10px] uppercase tracking-wider text-neutral-400">
                Tasks
              </div>
              <div className="mt-2 text-[22px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
                {summaryCounts.tasks}
              </div>
            </div>
          </div>

          {result.programs.map((program, pi) => (
            <section
              key={pi}
              className="rounded-3xl border border-[var(--board-border)] bg-[var(--board-panel)] shadow-[0_20px_60px_-40px_var(--board-shadow)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--board-border)] bg-gradient-to-r from-[var(--board-accent-soft)] to-white px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl border border-[var(--board-border)] bg-white p-2">
                    <Layers
                      size={16}
                      className="text-[color:var(--board-accent)]"
                    />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--board-accent)]">
                      Program
                    </div>
                    <div className="mt-1 text-[18px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
                      {program.title}
                    </div>
                    {program.description && (
                      <div className="mt-1 text-[12px] text-neutral-600">
                        {program.description}
                      </div>
                    )}
                  </div>
                </div>
                <span className="rounded-full border border-[var(--board-border)] bg-white px-3 py-1 text-[10px] uppercase tracking-wider text-neutral-500">
                  {program.projects.length} projects
                </span>
              </div>

              <div className="px-5 pb-5 pt-4">
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {program.projects.map((project, pj) => (
                    <div
                      key={pj}
                      className="min-w-[320px] max-w-[360px] flex-shrink-0 rounded-2xl border border-[var(--board-border)] bg-white shadow-[0_14px_30px_-24px_var(--board-shadow)]"
                    >
                      <div className="border-b border-[var(--board-border)] bg-neutral-50 px-4 py-3">
                        <div className="flex items-start gap-2">
                          <FolderOpen size={14} className="text-amber-600" />
                          <div className="min-w-0">
                            <div className="text-[13px] font-['Lexend:Medium',_sans-serif] text-neutral-800 truncate">
                              {project.title}
                            </div>
                            {project.description && (
                              <div className="mt-1 text-[10px] text-neutral-500 line-clamp-2">
                                {project.description}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 text-[9px] uppercase tracking-wider text-neutral-400">
                          {project.activities.length} activities
                        </div>
                      </div>

                      <div className="p-3 space-y-3">
                        {project.activities.map((activity, ai) => (
                          <div
                            key={ai}
                            className="rounded-xl border border-neutral-200 bg-neutral-50/70"
                          >
                            <div className="flex items-start justify-between gap-2 border-b border-neutral-200 bg-white px-3 py-2.5">
                              <div className="min-w-0">
                                <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-700 truncate">
                                  {activity.title}
                                </div>
                                {activity.description && (
                                  <div className="mt-1 text-[10px] text-neutral-500 line-clamp-2">
                                    {activity.description}
                                  </div>
                                )}
                              </div>
                              {activity.schedule && (
                                <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] text-emerald-700">
                                  {activity.schedule}
                                </span>
                              )}
                            </div>

                            {activity.methodology &&
                              activity.methodology.length > 0 && (
                                <div className="px-3 pt-2 flex flex-wrap gap-1.5">
                                  {activity.methodology.map((method) => (
                                    <span
                                      key={method}
                                      className="rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[9px] uppercase tracking-wider text-neutral-500"
                                    >
                                      {method}
                                    </span>
                                  ))}
                                </div>
                              )}

                            <div className="px-3 pb-3 pt-2 space-y-2">
                              {activity.tasks.map((task, ti) => {
                                const key = taskKey(pi, pj, ai, ti);
                                const recMembers = (
                                  task.recommendedEmployeeIds || []
                                )
                                  .map((id) => employeeById[id])
                                  .filter((e): e is Employee => Boolean(e));
                                const isCreated = createdTaskKeys.has(key);
                                const isFailed = failedTaskKeys.has(key);

                                return (
                                  <div
                                    key={ti}
                                    className={`rounded-xl border bg-white p-3 ${
                                      isCreated
                                        ? "border-emerald-200"
                                        : isFailed
                                          ? "border-red-200"
                                          : "border-neutral-200"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-800">
                                          {task.title}
                                        </div>
                                        {task.description && (
                                          <div className="mt-1 text-[10px] text-neutral-500 line-clamp-2">
                                            {task.description}
                                          </div>
                                        )}
                                      </div>
                                      {task.priority && (
                                        <span
                                          className={`rounded-full px-2 py-0.5 text-[9px] uppercase ${
                                            task.priority === "high"
                                              ? "bg-red-100 text-red-700"
                                              : task.priority === "medium"
                                                ? "bg-amber-100 text-amber-700"
                                                : "bg-emerald-100 text-emerald-700"
                                          }`}
                                        >
                                          {task.priority}
                                        </span>
                                      )}
                                      {task.subtasks && task.subtasks.length > 0 && (
                                        <span className="rounded-full px-2 py-0.5 text-[9px] bg-violet-100 text-violet-700 inline-flex items-center gap-1">
                                          <Layers size={9} /> {task.subtasks.length} steps
                                        </span>
                                      )}
                                    </div>

                                    {(task.requiredSkills || []).length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-1.5">
                                        {(task.requiredSkills || []).map(
                                          (skill) => (
                                            <span
                                              key={skill}
                                              className="rounded-full border border-[var(--board-border)] bg-[var(--board-accent-soft)] px-2 py-0.5 text-[9px] uppercase tracking-wider text-[color:var(--board-accent)]"
                                            >
                                              {skill}
                                            </span>
                                          ),
                                        )}
                                      </div>
                                    )}

                                    <div className="mt-2 rounded-lg border border-[var(--board-border)] bg-[var(--board-accent-soft)]/50 p-2">
                                      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-[color:var(--board-accent)]">
                                        <Sparkles size={10} /> Suggested team
                                        {task.burnoutWarning && (
                                          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[9px] text-amber-700">
                                            <AlertCircle size={9} /> Burnout
                                            risk
                                          </span>
                                        )}
                                      </div>
                                      {recMembers.length > 0 ? (
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                          {recMembers.map((member, mi) => (
                                            <span
                                              key={member.id}
                                              className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[10px] text-neutral-700"
                                            >
                                              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-neutral-900 text-[8px] font-['Lexend:Medium',_sans-serif] text-white">
                                                {getInitials(member.name)}
                                              </span>
                                              {member.name}
                                              {mi === 0 && (
                                                <Crown
                                                  size={9}
                                                  className="text-amber-500 ml-0.5"
                                                />
                                              )}
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="mt-2 text-[10px] text-neutral-500">
                                          No recommendation provided.
                                        </div>
                                      )}
                                      {task.recommendationReasoning && (
                                        <div className="mt-2 text-[10px] text-neutral-600">
                                          {task.recommendationReasoning}
                                        </div>
                                      )}
                                    </div>

                                    <div className="mt-2 flex items-center justify-between text-[9px] uppercase tracking-wider text-neutral-400">
                                      <span>
                                        {isCreated
                                          ? "Created"
                                          : isFailed
                                            ? "Failed to create"
                                            : autoCreateStatus === "creating"
                                              ? "Creating"
                                              : "Queued"}
                                      </span>
                                      {isFailed && (
                                        <button
                                          onClick={retryFailedTasks}
                                          className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[9px] text-red-700"
                                        >
                                          Retry
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
