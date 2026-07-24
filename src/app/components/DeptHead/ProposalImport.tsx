import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  Upload,
  Loader2,
  AlertCircle,
  Layers,
  ChevronRight,
  ChevronDown,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Users,
  Check,
  Crown,
  X,
  Search,
} from "lucide-react";
import { useEmployees, useEmployeeNotes } from "../../hooks/useFirebaseData";
import { useOrgs } from "../../hooks/useSupabaseData";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../ui/Toast";
import { Employee } from "../../services/employeeService";
import type { EmployeeNotesMap } from "../../services/employeeNotesService";
import { Organization } from "../../types";
import { createProject, fetchMilestones } from "../../services/projectService";
import { createTask, CreateTaskPayload } from "../../services/taskService";
import {
  decomposeProposal,
  ProposalDecompositionResult,
} from "../../services/proposalDecompositionService";
import { supabase } from "../../../lib/supabase";
import { getDescendantOrgIds } from "../../../lib/supabaseService";

// ─── PDF Extraction ───────────────────────────────────────────────

async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => (item.str as string) || "")
      .join(" ");
    pages.push(text);
  }
  return pages.join("\n\n");
}

function filterEmployeesByPdfMentions(
  pdfText: string,
  allEmployees: Employee[],
  orgs: Organization[]
): Employee[] {
  if (!allEmployees || allEmployees.length === 0) return [];
  
  const textUpper = pdfText.toUpperCase();
  
  const mentionedOrgs = orgs.filter((org) => {
    const nameMatch = org.name && textUpper.includes(org.name.toUpperCase());
    const slugMatch = org.slug && textUpper.includes(org.slug.toUpperCase());
    
    let acronymMatch = false;
    if (org.slug === "ledip" || org.slug === "ledipo") {
      acronymMatch = textUpper.includes("LEDIP") || textUpper.includes("LEDIPO");
    } else if (org.slug === "cpdo") {
      acronymMatch = textUpper.includes("CPDO");
    } else if (org.slug === "bplo") {
      acronymMatch = textUpper.includes("BPLO") || textUpper.includes("BUSINESS PERMITS");
    } else if (org.slug === "ociib") {
      acronymMatch = textUpper.includes("OCIIB") || textUpper.includes("INCENTIVES BOARD");
    }
    
    return nameMatch || slugMatch || acronymMatch;
  });

  if (mentionedOrgs.length === 0) {
    console.log("[PDF Scope Filter] No matching proponents found in PDF. Using all employees.");
    return allEmployees;
  }

  const allowedOrgIds = new Set<string>();
  mentionedOrgs.forEach((org) => {
    const descendants = getDescendantOrgIds(orgs, org.id);
    descendants.forEach((id) => allowedOrgIds.add(id));
  });

  console.log("[PDF Scope Filter] Mentioned Orgs:", mentionedOrgs.map(o => o.name));
  console.log("[PDF Scope Filter] Allowed Org IDs:", Array.from(allowedOrgIds));

  const filtered = allEmployees.filter((emp) => {
    return emp.department && allowedOrgIds.has(emp.department);
  });

  console.log("[PDF Scope Filter] Filtered Employees:", filtered.map(e => e.name));
  return filtered;
}

// ─── Types ────────────────────────────────────────────────────────

type PdfPhase =
  | "idle"
  | "extracting"
  | "decomposing"
  | "review"
  | "committing"
  | "done"
  | "error";

interface DraftTask {
  key: string;
  proposalTitle: string;
  proposalId: string;
  programIdx: number;
  projectIdx: number;
  activityIdx: number;
  taskIdx: number;
  programId: string;
  programTitle: string;
  projectId: string;
  projectTitle: string;
  activityId: string;
  activityTitle: string;
  activitySchedule: string;
  title: string;
  description: string;
  deadline: string;
  priority: "low" | "medium" | "high";
  requiredSkills: string[];
  assignedMemberIds: string[];
  leadMemberId: string | null;
  burnoutWarning: boolean;
  reasoning: string;
  enabled: boolean;
}

// ─── Constants & Helpers ──────────────────────────────────────────

const priorityMeta: Record<
  string,
  { bar: string; badge: string; label: string }
> = {
  high: {
    bar: "bg-red-500",
    badge: "bg-red-100 text-red-700",
    label: "High",
  },
  medium: {
    bar: "bg-amber-400",
    badge: "bg-amber-100 text-amber-700",
    label: "Medium",
  },
  low: {
    bar: "bg-emerald-400",
    badge: "bg-emerald-100 text-emerald-700",
    label: "Low",
  },
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const slugifyFragment = (value: string, fallback: string) => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || fallback;
};

const buildHierarchyIds = (
  proposalTitle: string,
  programTitle: string,
  projectTitle: string,
  activityTitle: string,
  pi: number,
  pj: number,
  ai: number,
) => {
  const proposalId = `proposal-${slugifyFragment(proposalTitle, "imported")}`;
  const programId = `${proposalId}-program-${pi + 1}-${slugifyFragment(programTitle, "program")}`;
  const projectId = `${programId}-project-${pj + 1}-${slugifyFragment(projectTitle, "project")}`;
  const activityId = `${projectId}-activity-${ai + 1}-${slugifyFragment(activityTitle, "activity")}`;
  return { proposalId, programId, projectId, activityId };
};

// ─── Main Component ───────────────────────────────────────────────

export default function ProposalImport({ onClose }: { onClose?: () => void }) {
  const { employees: allEmployees } = useEmployees();
  const { notes: employeeNotes } = useEmployeeNotes();
  const { userProfile } = useAuth();
  const { orgs } = useOrgs();
  const { toast } = useToast();

  const deptEmployees = useMemo(() => {
    return allEmployees || [];
  }, [allEmployees]);

  const deptEmployeesWithNotes = useMemo(
    () => deptEmployees.filter((emp) => Boolean(employeeNotes?.[emp.id])),
    [deptEmployees, employeeNotes],
  );

  const employeesForAi = useMemo(
    () =>
      deptEmployeesWithNotes.length > 0
        ? deptEmployeesWithNotes
        : deptEmployees,
    [deptEmployees, deptEmployeesWithNotes],
  );

  const employeeById = useMemo(
    () => {
      const candidates = allEmployees && allEmployees.length > 0 ? allEmployees : deptEmployees;
      return Object.fromEntries(candidates.map((e) => [e.id, e])) as Record<
        string,
        Employee
      >;
    },
    [deptEmployees, allEmployees],
  );

  const departmentFilter = userProfile?.departmentId || "";
  const currentUserId = userProfile?.uid || "";
  const currentUserName = userProfile?.fullName || userProfile?.email || "";

  const pdfFileRef = useRef<HTMLInputElement>(null);
  const [pdfPhase, setPdfPhase] = useState<PdfPhase>("idle");
  const [pdfFileName, setPdfFileName] = useState("");
  const [pdfError, setPdfError] = useState("");
  const [draftTasks, setDraftTasks] = useState<DraftTask[]>([]);
  const [committing, setCommitting] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");

  // Assignment modal for PDF drafts
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignModalTaskKey, setAssignModalTaskKey] = useState<string | null>(
    null,
  );
  const currentDraftTask = assignModalTaskKey
    ? draftTasks.find((t) => t.key === assignModalTaskKey) || null
    : null;

  const buildDraftTasks = (
    result: ProposalDecompositionResult,
    fallbackProposalTitle?: string,
  ): DraftTask[] => {
    const out: DraftTask[] = [];
    const proposalTitle =
      result.proposal?.title ||
      fallbackProposalTitle ||
      pdfFileName.replace(/\.pdf$/i, "") ||
      "Imported Proposal";
    result.programs.forEach((prog, pi) => {
      prog.projects.forEach((proj, pj) => {
        proj.activities.forEach((act, ai) => {
          const hierarchyIds = buildHierarchyIds(
            proposalTitle,
            prog.title,
            proj.title,
            act.title,
            pi,
            pj,
            ai,
          );
          act.tasks.forEach((t, ti) => {
            out.push({
              key: `${pi}-${pj}-${ai}-${ti}`,
              proposalTitle,
              proposalId: hierarchyIds.proposalId,
              programIdx: pi,
              projectIdx: pj,
              activityIdx: ai,
              taskIdx: ti,
              programId: hierarchyIds.programId,
              programTitle: prog.title,
              projectId: hierarchyIds.projectId,
              projectTitle: proj.title,
              activityId: hierarchyIds.activityId,
              activityTitle: act.title,
              activitySchedule: act.schedule || "",
              title: t.title,
              description: t.description,
              deadline: act.schedule || "",
              priority: t.priority || "medium",
              requiredSkills: t.requiredSkills || [],
              assignedMemberIds: t.recommendedEmployeeIds || [],
              leadMemberId: t.recommendedEmployeeIds?.[0] || null,
              burnoutWarning: t.burnoutWarning || false,
              reasoning: t.recommendationReasoning || "",
              enabled: true,
            });
          });
        });
      });
    });
    return out;
  };

  const handlePdfFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setPdfError("Please upload a PDF file.");
      setPdfPhase("error");
      return;
    }
    setPdfFileName(file.name);
    setPdfError("");
    setDraftTasks([]);
    setCommitMessage("");
    setPdfPhase("extracting");

    let text: string;
    try {
      text = await extractTextFromPdf(file);
      if (!text.trim()) {
        setPdfError("Could not extract text from PDF. It may be image-based.");
        setPdfPhase("error");
        return;
      }
    } catch {
      setPdfError("Failed to read PDF file.");
      setPdfPhase("error");
      return;
    }

    setPdfPhase("decomposing");
    try {
      const candidates = allEmployees && allEmployees.length > 0
        ? filterEmployeesByPdfMentions(text, allEmployees, orgs)
        : employeesForAi;
      const result = await decomposeProposal(
        text,
        file.name.replace(/\.pdf$/i, ""),
        candidates,
        employeeNotes,
      );
      setDraftTasks(buildDraftTasks(result, file.name.replace(/\.pdf$/i, "")));
      setPdfPhase("review");
    } catch {
      setPdfError("AI decomposition failed. Please try again.");
      setPdfPhase("error");
    }
  };

  const handleDraftUpdate = (key: string, patch: Partial<DraftTask>) =>
    setDraftTasks((prev) =>
      prev.map((task) => (task.key === key ? { ...task, ...patch } : task)),
    );

  const handleDraftDelete = (key: string) =>
    setDraftTasks((prev) => prev.filter((task) => task.key !== key));

  const handleDraftAdd = (
    programIdx: number,
    projectIdx: number,
    activityIdx: number,
  ) => {
    const sibling = draftTasks.find(
      (task) =>
        task.programIdx === programIdx &&
        task.projectIdx === projectIdx &&
        task.activityIdx === activityIdx,
    );
    const proposalTitle =
      sibling?.proposalTitle ||
      pdfFileName.replace(/\.pdf$/i, "") ||
      "Imported Proposal";
    const programTitle = sibling?.programTitle || "Program";
    const projectTitle = sibling?.projectTitle || "Project";
    const activityTitle = sibling?.activityTitle || "Activity";
    const hierarchyIds = buildHierarchyIds(
      proposalTitle,
      programTitle,
      projectTitle,
      activityTitle,
      programIdx,
      projectIdx,
      activityIdx,
    );
    const newKey = `${programIdx}-${projectIdx}-${activityIdx}-${Date.now()}`;

    setDraftTasks((prev) => [
      ...prev,
      {
        key: newKey,
        proposalTitle,
        proposalId: sibling?.proposalId || hierarchyIds.proposalId,
        programIdx,
        projectIdx,
        activityIdx,
        taskIdx: Date.now(),
        programId: sibling?.programId || hierarchyIds.programId,
        programTitle,
        projectId: sibling?.projectId || hierarchyIds.projectId,
        projectTitle,
        activityId: sibling?.activityId || hierarchyIds.activityId,
        activityTitle,
        activitySchedule: sibling?.activitySchedule || "",
        title: "New Task",
        description: "",
        deadline: "",
        priority: "medium",
        requiredSkills: [],
        assignedMemberIds: [],
        leadMemberId: null,
        burnoutWarning: false,
        reasoning: "",
        enabled: true,
      },
    ]);
  };

  const handleCommit = async () => {
    const toCreate = draftTasks.filter((t) => t.enabled);
    if (toCreate.length === 0) return;
    setCommitting(true);
    setCommitMessage("Committing projects and milestones...");

    const batchPrefix =
      toCreate[0]?.proposalId ||
      `proposal-${slugifyFragment(pdfFileName.replace(/\.pdf$/i, ""), "imported")}`;
    const importBatchId = `${batchPrefix}-${Date.now()}`;
    let created = 0;
    let failed = 0;

    // Group by the imported hierarchy id, not title alone. Two programs may
    // legitimately contain projects with the same display title.
    const projectGroups = new Map<
      string,
      {
        projectTitle: string;
        proposalTitle: string;
        proposalId: string;
        programId: string;
        programTitle: string;
        projectId: string;
        activities: Map<string, { activityTitle: string; schedule: string; tasks: typeof toCreate }>;
      }
    >();

    toCreate.forEach((dt) => {
      const projKey =
        dt.projectId ||
        `${dt.proposalId}:${dt.programId}:${dt.projectTitle.trim()}`;
      if (!projectGroups.has(projKey)) {
        projectGroups.set(projKey, {
          projectTitle: dt.projectTitle,
          proposalTitle: dt.proposalTitle,
          proposalId: dt.proposalId,
          programId: dt.programId,
          programTitle: dt.programTitle,
          projectId: dt.projectId,
          activities: new Map(),
        });
      }
      const projGroup = projectGroups.get(projKey)!;

      const actKey = dt.activityTitle.trim();
      if (!projGroup.activities.has(actKey)) {
        projGroup.activities.set(actKey, {
          activityTitle: dt.activityTitle,
          schedule: dt.activitySchedule || "",
          tasks: [],
        });
      }
      projGroup.activities.get(actKey)!.tasks.push(dt);
    });

    try {
      for (const projGroup of projectGroups.values()) {
        const milestonesInput = Array.from(projGroup.activities.values()).map((act) => {
          const isDate = act.schedule && !/month|phase|week/i.test(act.schedule) && !isNaN(Date.parse(act.schedule));
          return {
            title: act.activityTitle.trim(),
            dueDate: isDate ? act.schedule : null,
            description: act.schedule && !isDate ? `Schedule: ${act.schedule}` : "",
          };
        });

        let dbProjectId = "";
        try {
          // Check for existing project to prevent duplicate imports
          let existingQuery = supabase
            .from("projects")
            .select("id")
            .eq("title", projGroup.projectTitle.trim())
            .is("archived_at", null);
          existingQuery = departmentFilter
            ? existingQuery.eq("org_id", departmentFilter)
            : existingQuery.is("org_id", null);
          const { data: existingProjs, error: existingError } =
            await existingQuery;
          if (existingError) throw existingError;

          if (existingProjs && existingProjs.length > 0) {
            dbProjectId = existingProjs[0].id;
          } else {
            const allMemberIds = new Set<string>();
            for (const act of projGroup.activities.values()) {
              for (const dt of act.tasks) {
                dt.assignedMemberIds.forEach((id) => {
                  if (id) allMemberIds.add(id);
                });
              }
            }

            const newProj = await createProject({
              title: projGroup.projectTitle.trim(),
              description: `Imported via proposal: ${projGroup.proposalTitle}`,
              orgId: departmentFilter || null,
              ownerId: currentUserId || null,
              status: "active",
              priority: "medium",
              milestones: milestonesInput,
              memberIds: Array.from(allMemberIds),
            });
            dbProjectId = newProj.id;
          }
        } catch (projErr) {
          console.error("Failed to create/resolve project:", projGroup.projectTitle, projErr);
          // `project_id` is a legacy hierarchy string, not the UUID foreign key
          // used by operational projects. Never write it into linked_project_id.
          failed += Array.from(projGroup.activities.values()).reduce(
            (sum, activity) => sum + activity.tasks.length,
            0,
          );
          continue;
        }

        // Fetch milestone mapping
        let milestoneMap = new Map<string, string>();
        try {
          const dbMilestones = await fetchMilestones(dbProjectId);
          milestoneMap = new Map(dbMilestones.map((m) => [m.title.toLowerCase().trim(), m.id]));
        } catch (mErr) {
          console.error("Failed to fetch milestones for project:", dbProjectId, mErr);
        }

        // Create tasks for each activity
        for (const act of projGroup.activities.values()) {
          const dbMilestoneId = milestoneMap.get(act.activityTitle.toLowerCase().trim()) || "";

          for (const dt of act.tasks) {
            try {
              const selectedTeamMembers = dt.assignedMemberIds
                .map((id) => employeeById[id])
                .filter((member): member is Employee => Boolean(member));
              const leadMember =
                (dt.leadMemberId ? employeeById[dt.leadMemberId] : undefined) ||
                selectedTeamMembers[0];

              const payload: CreateTaskPayload = {
                title: dt.title,
                description: dt.description || "No description provided.",
                deadline: dt.deadline || "",
                priority: dt.priority,
                tags: dt.requiredSkills,
                status: leadMember?.id ? "todo" : "pending_assignment",
                department: departmentFilter || "",
                orgId: departmentFilter || undefined,
                teamId: departmentFilter || "",
                teamName:
                  leadMember?.departmentName ||
                  leadMember?.department ||
                  departmentFilter ||
                  "Imported",
                teamMemberIds: selectedTeamMembers.map((member) => member.id),
                teamMemberNames: selectedTeamMembers.map((member) => member.name),
                assigneeId: leadMember?.id,
                assigneeName: leadMember?.name,
                recommendedEmployeeIds: dt.assignedMemberIds,
                recommendationReasoning: dt.reasoning,
                recommendationSource: "import",
                recommendationLeadId: dt.leadMemberId || undefined,
                burnoutWarning: dt.burnoutWarning,
                proposalId: dt.proposalId,
                proposalTitle: dt.proposalTitle,
                programId: dt.programId,
                programTitle: dt.programTitle,
                projectId: dt.projectId,
                projectTitle: dt.projectTitle,
                activityId: dt.activityId,
                activityTitle: dt.activityTitle,
                activitySchedule: dt.activitySchedule,
                linkedProjectId: dbProjectId,
                milestoneId: dbMilestoneId,
                hierarchyPath: [
                  dt.proposalTitle,
                  dt.programTitle,
                  dt.projectTitle,
                  dt.activityTitle,
                ]
                  .filter(Boolean)
                  .join(" > "),
                importBatchId,
              };

              await createTask(payload);
              created++;
            } catch (err) {
              console.error("Failed to commit task from draft:", dt.title, err);
              failed++;
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed during commit transaction:", err);
    }

    setCommitting(false);
    if (created > 0) {
      toast("Successfully imported proposal. Created projects and tasks.", "success");
      if (onClose) {
        onClose();
      }
    } else {
      setCommitMessage(
        `Created ${created} task${created !== 1 ? "s" : ""}; ${failed} failed to save.`,
      );
    }
  };

  return (
    <div className="p-6 font-['Lexend:Regular',_sans-serif]">
      {/* Importer container */}
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div>
            <h1 className="text-[20px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
              PDF Proposal Importer
            </h1>
            <p className="text-[12px] text-neutral-500 mt-1">
              Decompose a government proposal PDF into Programs, Projects, and Tasks with AI recommendation.
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-500 hover:text-neutral-900"
            >
              Cancel
            </button>
          )}
        </div>

        {/* PDF Import Tab content */}
        <div>
          {/* Idle — drop zone */}
          {pdfPhase === "idle" && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handlePdfFile(f);
              }}
              onClick={() => pdfFileRef.current?.click()}
              className="cursor-pointer rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-14 text-center hover:border-violet-400 hover:bg-violet-50/30 transition group"
            >
              <Upload
                size={40}
                className="mx-auto mb-3 text-neutral-300 group-hover:text-violet-400 transition"
              />
              <div className="text-[15px] font-['Lexend:SemiBold',_sans-serif] text-neutral-700">
                Drop a government proposal PDF here
              </div>
              <div className="text-[12px] text-neutral-400 mt-1">
                or click to browse · AI decomposes it into Programs → Projects → Activities → Tasks
              </div>
              <div className="mt-4 text-[11px] text-neutral-400 bg-white border border-neutral-200 rounded-full px-4 py-1.5 inline-block">
                Results appear here as an editable draft · nothing is saved until you commit
              </div>
              <input
                ref={pdfFileRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePdfFile(f);
                }}
              />
            </div>
          )}

          {/* Extracting / Decomposing */}
          {(pdfPhase === "extracting" ||
            pdfPhase === "decomposing") && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-14 text-center">
              <Loader2
                size={36}
                className="mx-auto mb-4 text-violet-600 animate-spin"
              />
              <div className="text-[16px] font-['Lexend:SemiBold',_sans-serif] text-neutral-800">
                {pdfPhase === "extracting"
                  ? "Extracting text from PDF…"
                  : "AI is decomposing the proposal…"}
              </div>
              <div className="text-[12px] text-neutral-400 mt-1">
                {pdfFileName} ·{" "}
                {pdfPhase === "extracting"
                  ? "Reading pages"
                  : "This may take up to 2 minutes for large proposals"}
              </div>
              <div className="flex justify-center gap-3 mt-6">
                <div
                  className={`w-2 h-2 rounded-full ${pdfPhase === "extracting" ? "bg-violet-600 animate-pulse" : "bg-emerald-500"}`}
                />
                <div
                  className={`w-2 h-2 rounded-full ${pdfPhase === "decomposing" ? "bg-violet-600 animate-pulse" : "bg-neutral-200"}`}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {pdfPhase === "error" && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
              <AlertCircle
                size={32}
                className="mx-auto mb-3 text-red-500"
              />
              <div className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-red-800">
                Import Failed
              </div>
              <div className="text-[12px] text-red-600 mt-1">
                {pdfError}
              </div>
              <button
                onClick={() => {
                  setPdfPhase("idle");
                  setPdfError("");
                }}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-[12px] font-['Lexend:Medium',_sans-serif] rounded-xl hover:bg-red-700 transition"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Review Draft */}
          {pdfPhase === "review" && draftTasks.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="text-[12px] text-neutral-500 font-['Lexend:Regular',_sans-serif]">
                  AI draft loaded from{" "}
                  <span className="text-neutral-800 font-['Lexend:Medium',_sans-serif]">
                    {pdfFileName}
                  </span>{" "}
                  · Review and edit each task before committing.
                </div>
                <button
                  onClick={() => {
                    setPdfPhase("idle");
                    setPdfFileName("");
                    setCommitMessage("");
                    setDraftTasks([]);
                  }}
                  className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-500 hover:text-neutral-800"
                >
                  Import Another
                </button>
              </div>

              <DraftCockpit
                draftTasks={draftTasks}
                employees={deptEmployees}
                allEmployees={allEmployees}
                employeeNotes={employeeNotes}
                onUpdate={handleDraftUpdate}
                onDelete={handleDraftDelete}
                onAdd={handleDraftAdd}
                onOpenModal={(key) => {
                  setAssignModalTaskKey(key);
                  setAssignModalOpen(true);
                }}
                onCommit={handleCommit}
                committing={committing}
                commitMessage={commitMessage}
              />
            </div>
          )}
        </div>
      </div>

      <AssignmentModal
        open={assignModalOpen}
        onClose={() => {
          setAssignModalOpen(false);
          setAssignModalTaskKey(null);
        }}
        employees={allEmployees && allEmployees.length > 0 ? allEmployees : deptEmployees}
        employeeNotes={employeeNotes}
        selectedIds={currentDraftTask?.assignedMemberIds || []}
        leadId={currentDraftTask?.leadMemberId || null}
        onConfirm={(memberIds, leadId) => {
          if (assignModalTaskKey) {
            handleDraftUpdate(assignModalTaskKey, {
              assignedMemberIds: memberIds,
              leadMemberId: leadId,
            });
          }
        }}
      />
    </div>
  );
}

// ─── Draft Task Row Component ─────────────────────────────────────

function DraftTaskRow({
  dt,
  employees,
  employeeNotes: _employeeNotes,
  onUpdate,
  onDelete,
  onOpenModal,
}: {
  dt: DraftTask;
  employees: Employee[];
  employeeNotes?: EmployeeNotesMap;
  onUpdate: (key: string, patch: Partial<DraftTask>) => void;
  onDelete: (key: string) => void;
  onOpenModal: (key: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const assignedEmps = dt.assignedMemberIds
    .map((id) => employees.find((e) => e.id === id))
    .filter((emp): emp is Employee => Boolean(emp));
  const pm = priorityMeta[dt.priority] || priorityMeta.medium;

  return (
    <div
      className={`px-6 py-3 flex items-start gap-3 group transition-all ${
        dt.enabled ? "" : "opacity-40"
      } hover:bg-neutral-50/60`}
    >
      {/* Enable checkbox */}
      <button
        onClick={() => onUpdate(dt.key, { enabled: !dt.enabled })}
        className="shrink-0 mt-0.5"
      >
        {dt.enabled ? (
          <div className="w-4 h-4 rounded bg-neutral-900 border border-neutral-900 flex items-center justify-center">
            <Check size={10} className="text-white" strokeWidth={2.5} />
          </div>
        ) : (
          <div className="w-4 h-4 rounded border-2 border-neutral-300" />
        )}
      </button>

      {/* Priority bar */}
      <div className={`w-1 h-10 rounded-full shrink-0 mt-0.5 ${pm.bar}`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-2">
            <input
              autoFocus
              value={dt.title}
              onChange={(e) => onUpdate(dt.key, { title: e.target.value })}
              className="w-full text-[13px] font-['Lexend:Medium',_sans-serif] text-neutral-900 border border-neutral-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-neutral-500"
            />
            <textarea
              rows={2}
              value={dt.description}
              onChange={(e) =>
                onUpdate(dt.key, { description: e.target.value })
              }
              className="w-full text-[12px] text-neutral-600 border border-neutral-200 rounded-lg px-2.5 py-1.5 resize-none focus:outline-none focus:border-neutral-400"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={dt.deadline}
                onChange={(e) => onUpdate(dt.key, { deadline: e.target.value })}
                className="text-[12px] border border-neutral-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-neutral-400"
              />
              <select
                value={dt.priority}
                onChange={(e) =>
                  onUpdate(dt.key, {
                    priority: e.target.value as "low" | "medium" | "high",
                  })
                }
                className="text-[12px] border border-neutral-200 rounded-lg px-2.5 py-1 focus:outline-none bg-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <button
                onClick={() => setEditing(false)}
                className="text-[11px] font-['Lexend:Medium',_sans-serif] text-white bg-neutral-800 border border-neutral-200 rounded-lg px-3 py-1 hover:bg-neutral-900 transition"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-[13px] font-['Lexend:Medium',_sans-serif] text-neutral-900">
              {dt.title}
            </div>
            {dt.description && (
              <div className="text-[11px] text-neutral-500 mt-0.5 line-clamp-1">
                {dt.description}
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {dt.deadline && (
                <span className="inline-flex items-center gap-1 text-[10px] text-neutral-500 bg-neutral-100 rounded-full px-2 py-0.5">
                  <Clock size={9} />
                  {dt.deadline}
                </span>
              )}
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${pm.badge}`}
              >
                {pm.label}
              </span>
              {dt.requiredSkills.slice(0, 2).map((s) => (
                <span
                  key={s}
                  className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full"
                >
                  {s}
                </span>
              ))}
              {dt.burnoutWarning && (
                <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">
                  <AlertCircle size={9} />
                  Burnout risk
                </span>
              )}
            </div>
          </>
        )}

        {/* Team assignment button */}
        <button
          onClick={() => onOpenModal(dt.key)}
          className="mt-2 flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-dashed border-neutral-300 hover:border-violet-400 hover:bg-violet-50/40 transition group/assign w-full max-w-xs text-left"
        >
          <Users
            size={12}
            className="text-neutral-400 group-hover/assign:text-violet-600 shrink-0"
          />
          {assignedEmps.length === 0 ? (
            <span className="text-[11px] text-neutral-400 group-hover/assign:text-violet-600">
              Assign team members…
            </span>
          ) : (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              {assignedEmps.slice(0, 5).map((emp) => (
                <span
                  key={emp.id}
                  title={emp.name}
                  className={`w-5 h-5 rounded-full text-[9px] text-white flex items-center justify-center font-['Lexend:SemiBold',_sans-serif] shrink-0 ${
                    emp.id === dt.leadMemberId
                      ? "ring-2 ring-amber-400 ring-offset-1"
                      : ""
                  } ${
                    emp.currentWorkload >= 80
                      ? "bg-red-500"
                      : emp.currentWorkload >= 60
                        ? "bg-amber-500"
                        : "bg-neutral-800"
                  }`}
                >
                  {getInitials(emp.name)}
                </span>
              ))}
              {assignedEmps.length > 5 && (
                <span className="text-[10px] text-neutral-400">
                  +{assignedEmps.length - 5}
                </span>
              )}
              <span className="text-[10px] text-neutral-500 ml-1 truncate">
                Lead:{" "}
                {assignedEmps
                  .find((e) => e.id === dt.leadMemberId)
                  ?.name?.split(" ")[0] ||
                  assignedEmps[0]?.name?.split(" ")[0] ||
                  "TBD"}
              </span>
            </div>
          )}
          <ChevronRight
            size={11}
            className="text-neutral-300 ml-auto group-hover/assign:text-violet-400 shrink-0"
          />
        </button>

        {dt.reasoning && !editing && (
          <div className="mt-1.5 text-[10px] text-violet-600 italic line-clamp-1">
            {dt.reasoning}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0 mt-0.5">
        <button
          onClick={() => setEditing(!editing)}
          className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition"
          title="Edit task"
        >
          <Edit2 size={12} />
        </button>
        <button
          onClick={() => onDelete(dt.key)}
          className="p-1.5 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-600 transition"
          title="Delete task"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── Draft Cockpit Component ──────────────────────────────────────

function DraftCockpit({
  draftTasks,
  employees,
  allEmployees,
  employeeNotes,
  onUpdate,
  onDelete,
  onAdd,
  onOpenModal,
  onCommit,
  committing,
  commitMessage,
}: {
  draftTasks: DraftTask[];
  employees: Employee[];
  allEmployees?: Employee[];
  employeeNotes?: EmployeeNotesMap;
  onUpdate: (key: string, patch: Partial<DraftTask>) => void;
  onDelete: (key: string) => void;
  onAdd: (programIdx: number, projectIdx: number, activityIdx: number) => void;
  onOpenModal: (key: string) => void;
  onCommit: () => void;
  committing: boolean;
  commitMessage: string;
}) {
  type ActivityGroup = {
    title: string;
    schedule: string;
    ai: number;
    tasks: DraftTask[];
  };
  type ProjectGroup = {
    title: string;
    pj: number;
    activities: ActivityGroup[];
  };
  type ProgramGroup = {
    title: string;
    pi: number;
    projects: ProjectGroup[];
  };

  const grouped = useMemo(() => {
    const programs: ProgramGroup[] = [];
    draftTasks.forEach((dt) => {
      let program = programs.find((p) => p.pi === dt.programIdx);
      if (!program) {
        program = { title: dt.programTitle, pi: dt.programIdx, projects: [] };
        programs.push(program);
      }
      let project = program.projects.find((p) => p.pj === dt.projectIdx);
      if (!project) {
        project = {
          title: dt.projectTitle,
          pj: dt.projectIdx,
          activities: [],
        };
        program.projects.push(project);
      }
      let activity = project.activities.find((a) => a.ai === dt.activityIdx);
      if (!activity) {
        activity = {
          title: dt.activityTitle,
          schedule: dt.activitySchedule,
          ai: dt.activityIdx,
          tasks: [],
        };
        project.activities.push(activity);
      }
      activity.tasks.push(dt);
    });
    return programs;
  }, [draftTasks]);

  const enabledCount = draftTasks.filter((t) => t.enabled).length;
  const proposalTitle = draftTasks[0]?.proposalTitle || "Imported Proposal";

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-2xl p-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-['Lexend:Medium',_sans-serif]">
            AI Draft — Local State
          </div>
          <div className="text-[15px] font-['Lexend:SemiBold',_sans-serif] text-white mt-0.5">
            Review & edit before committing
          </div>
          <div className="text-[11px] text-violet-200 mt-1">
            Proposal: {proposalTitle}
          </div>
          <div className="text-[12px] text-neutral-400 mt-0.5">
            {enabledCount} of {draftTasks.length} tasks selected · not yet saved
          </div>
        </div>
        <div className="flex items-center gap-3">
          {commitMessage && (
            <div className="text-[12px] text-emerald-400 font-['Lexend:Medium',_sans-serif]">
              {commitMessage}
            </div>
          )}
          <button
            onClick={onCommit}
            disabled={committing || enabledCount === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-neutral-900 text-[13px] font-['Lexend:SemiBold',_sans-serif] rounded-xl hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
          >
            {committing ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Committing…
              </>
            ) : (
              <>
                <Check size={13} /> Commit {enabledCount} Tasks & Projects
              </>
            )}
          </button>
        </div>
      </div>

      {/* Programs tree */}
      {grouped.map((program) => (
        <div
          key={program.pi}
          className="rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-sm"
        >
          {/* Program header */}
          <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-violet-600 to-violet-500">
            <Layers size={14} className="text-violet-200 shrink-0" />
            <div className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-white">
              {program.title}
            </div>
            <span className="ml-auto text-[10px] text-violet-200 uppercase tracking-[0.15em]">
              Program
            </span>
          </div>

          <div className="divide-y divide-neutral-100">
            {program.projects.map((project) => (
              <div key={project.pj}>
                {/* Project header */}
                <div className="flex items-center gap-2 px-5 py-2.5 bg-neutral-50 border-b border-neutral-100">
                  <ChevronRight size={12} className="text-neutral-400" />
                  <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-700">
                    {project.title}
                  </div>
                  <span className="ml-auto text-[10px] text-neutral-400 uppercase tracking-wide">
                    Project
                  </span>
                </div>

                {project.activities.map((activity) => (
                  <div key={activity.ai}>
                    {/* Activity header */}
                    <div className="flex items-center gap-2 px-6 py-2 bg-neutral-50/70">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                      <div className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-600">
                        {activity.title}
                      </div>
                      {activity.schedule && (
                        <span className="inline-flex items-center gap-1 ml-2 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                          <Clock size={9} />
                          {activity.schedule}
                        </span>
                      )}
                      <button
                        onClick={() =>
                          onAdd(program.pi, project.pj, activity.ai)
                        }
                        className="ml-auto flex items-center gap-1 text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-400 hover:text-neutral-700 transition"
                      >
                        <Plus size={11} />
                        Add Task
                      </button>
                    </div>

                    {/* Tasks list */}
                    <div className="divide-y divide-neutral-100">
                      {activity.tasks.map((dt) => (
                        <DraftTaskRow
                          key={dt.key}
                          dt={dt}
                          employees={employees}
                          employeeNotes={employeeNotes}
                          onUpdate={onUpdate}
                          onDelete={onDelete}
                          onOpenModal={onOpenModal}
                        />
                      ))}
                      {activity.tasks.length === 0 && (
                        <div className="text-[11px] text-neutral-400 text-center py-6 italic rounded-xl border border-dashed border-neutral-100 m-4">
                          No tasks inside this activity.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Assignment Modal Component ──────────────────────────────────

function AssignmentModal({
  open,
  onClose,
  employees,
  employeeNotes,
  selectedIds,
  leadId,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
  employeeNotes?: EmployeeNotesMap;
  selectedIds: string[];
  leadId: string | null;
  onConfirm: (memberIds: string[], leadId: string | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<string[]>(selectedIds);
  const [draftLead, setDraftLead] = useState<string | null>(leadId);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setDraft(selectedIds);
      setDraftLead(leadId);
      setSearch("");
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.jobTitle || "").toLowerCase().includes(q) ||
        (e.departmentName || "").toLowerCase().includes(q),
    );
  }, [employees, search]);

  const toggle = (id: string) => {
    setDraft((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      if (draftLead && !next.includes(draftLead)) setDraftLead(next[0] || null);
      return next;
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-[540px] max-h-[82vh] flex flex-col overflow-hidden border border-neutral-200"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "modalIn 0.18s ease" }}
      >
        <style>{`@keyframes modalIn{from{opacity:0;transform:scale(0.96) translateY(6px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>

        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between shrink-0">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-400 font-['Lexend:Medium',_sans-serif]">
              Team Assignment
            </div>
            <div className="text-[16px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mt-0.5">
              Select Team Members
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-lg hover:bg-neutral-100 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2 border-b border-neutral-100 shrink-0">
          <div className="relative flex items-center bg-neutral-50 border border-neutral-200 rounded-xl h-[38px] focus-within:border-neutral-400 focus-within:bg-white transition">
            <Search size={14} className="text-neutral-400 ml-3 shrink-0" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, role, or department…"
              className="flex-1 bg-transparent px-2 text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-800 placeholder:text-neutral-400 focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="pr-2.5 text-neutral-400 hover:text-neutral-700"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Selected chips */}
          {draft.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {draft.map((id) => {
                const emp = employees.find((e) => e.id === id);
                if (!emp) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 bg-violet-50 border border-violet-200 text-violet-700 text-[11px] font-['Lexend:Medium',_sans-serif] px-2 py-1 rounded-full"
                  >
                    {draftLead === id && (
                      <Crown size={10} className="text-amber-500" />
                    )}
                    {getInitials(emp.name)} · {emp.name.split(" ")[0]}
                    <button
                      onClick={() => toggle(id)}
                      className="text-violet-400 hover:text-violet-700 ml-0.5"
                    >
                      <X size={10} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Employee list */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {filtered.length === 0 ? (
            <div className="text-center text-[12px] text-neutral-400 py-10">
              No employees match "{search}"
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((emp) => {
                const selected = draft.includes(emp.id);
                const isLead = draftLead === emp.id;
                const notes = employeeNotes?.[emp.id];
                const tags = notes?.tags?.slice(0, 3) || [];
                const load = emp.currentWorkload;
                return (
                  <div
                    key={emp.id}
                    onClick={() => toggle(emp.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                      selected
                        ? "bg-violet-50 border-violet-200"
                        : "bg-white border-transparent hover:border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-['Lexend:SemiBold',_sans-serif] text-white shrink-0 ${
                        load >= 80
                          ? "bg-red-500"
                          : load >= 60
                            ? "bg-amber-500"
                            : "bg-neutral-800"
                      }`}
                    >
                      {getInitials(emp.name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-['Lexend:Medium',_sans-serif] text-neutral-900 truncate">
                          {emp.name}
                        </span>
                        {selected && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDraftLead(isLead ? null : emp.id);
                            }}
                            className={`p-1 rounded-lg transition shrink-0 ${
                              isLead
                                ? "text-amber-500 hover:text-neutral-400"
                                : "text-neutral-300 hover:text-amber-500"
                            }`}
                            title={isLead ? "Demote from lead" : "Promote to lead"}
                          >
                            <Crown size={12} />
                          </button>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate">
                        {emp.jobTitle} · {emp.departmentName || emp.department || "No Department"}
                      </div>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[9px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right column: workload */}
                    <div className="text-right shrink-0">
                      <div className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-800">
                        {load}% Load
                      </div>
                      <div className="text-[9px] text-neutral-400 mt-0.5">
                        40h weekly capacity
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-neutral-400">
            {draft.length} member{draft.length !== 1 ? "s" : ""} selected
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-500 hover:text-neutral-700 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(draft, draftLead)}
              className="px-4 py-2 bg-neutral-900 text-white text-[12px] font-['Lexend:SemiBold',_sans-serif] rounded-xl hover:bg-neutral-800 transition"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
