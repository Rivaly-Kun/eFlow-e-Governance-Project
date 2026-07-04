import React, { useState, useMemo, useEffect } from "react";
import { Users, FolderUp, ClipboardCheck } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useTasks, useEmployees, useEmployeeNotes } from "../../hooks/useFirebaseData";
import { useOrgs } from "../../hooks/useSupabaseData";
import { getDescendantOrgIds, fetchAllOrgs } from "../../../lib/supabaseService";
import { MondayBoard } from "../ui/MondayBoard";
import ProposalImport from "../DeptHead/ProposalImport";
import { createTask, assignTask, verifyTask, updateTask, deleteTask } from "../../services/taskService";
import { NotificationBell } from "../ui/NotificationBell";

type TeamLeaderTab = "board" | "import" | "workload";

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] transition-colors ${
        active
          ? "bg-neutral-900 text-white"
          : "text-neutral-600 hover:bg-neutral-100"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function TeamWorkloadView({ orgName }: { orgName: string }) {
  const { employees } = useEmployees();

  return (
    <div className="p-6">
      <div className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-800 mb-1">
        Team Workload — {orgName}
      </div>
      <div className="text-[11px] text-neutral-400 mb-4">
        Employees within your section
      </div>
      <div className="space-y-2">
        {employees.map((emp) => {
          const burnout = (emp as any).burnoutLevel || "low";
          const workload = (emp as any).currentWorkload ?? 0;
          const burnoutColor =
            burnout === "high"
              ? "text-red-600 bg-red-50"
              : burnout === "medium"
                ? "text-amber-600 bg-amber-50"
                : "text-emerald-600 bg-emerald-50";
          return (
            <div
              key={emp.id}
              className="flex items-center gap-3 bg-white rounded-xl border border-neutral-200 px-4 py-3"
            >
              <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[11px] font-['Lexend:SemiBold',_sans-serif] shrink-0">
                {emp.initials || "??"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-neutral-800 font-['Lexend:Medium',_sans-serif] truncate">
                  {emp.name}
                </div>
                <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden mt-1 max-w-[160px]">
                  <div
                    className="h-full bg-neutral-800"
                    style={{ width: `${Math.min(workload, 100)}%` }}
                  />
                </div>
              </div>
              <span className="text-[11px] text-neutral-500 shrink-0">{workload}%</span>
              <span
                className={`text-[9px] uppercase px-2 py-0.5 rounded-full shrink-0 ${burnoutColor}`}
              >
                {burnout}
              </span>
            </div>
          );
        })}
        {employees.length === 0 && (
          <div className="text-[12px] text-neutral-400 text-center py-8">
            No employees found in your section.
          </div>
        )}
      </div>
    </div>
  );
}

export function TeamLeaderContent({
  activeSection: _activeSection,
  activePage: _activePage,
}: {
  activeSection?: string;
  activePage?: string;
}) {
  const { userProfile } = useAuth();
  const { tasks } = useTasks();
  const { employees } = useEmployees();
  const { notes } = useEmployeeNotes();
  const { orgs } = useOrgs();
  const [tab, setTab] = useState<TeamLeaderTab>("board");
  const [orgName, setOrgName] = useState<string>("My Section");

  useEffect(() => {
    if (!userProfile?.departmentId) return;
    fetchAllOrgs().then((allOrgs) => {
      const org = allOrgs.find((o) => o.id === userProfile.departmentId);
      if (org) setOrgName(org.name);
    });
  }, [userProfile?.departmentId]);

  const scopedOrgIds = useMemo(
    () => getDescendantOrgIds(orgs, userProfile?.departmentId),
    [orgs, userProfile?.departmentId],
  );

  const scopedTasks = useMemo(() => {
    if (scopedOrgIds.length === 0) return tasks;
    return tasks.filter(
      (t) => !t.orgId || scopedOrgIds.includes(t.orgId) || t.status === "pending_assignment",
    );
  }, [tasks, scopedOrgIds]);

  return (
    <div className="h-full flex flex-col bg-neutral-50">
      <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-neutral-200 bg-white">
        <div>
          <div className="text-[11px] tracking-widest text-neutral-400 uppercase mb-1">
            Team Leader · {orgName}
          </div>
          <h1 className="text-[19px] text-neutral-900 font-['Lexend:SemiBold',_sans-serif]">
            Section Workspace
          </h1>
        </div>
        <NotificationBell userId={userProfile?.uid} />
      </div>

      <div className="flex items-center gap-2 px-6 py-3 bg-white border-b border-neutral-200">
        <TabButton
          active={tab === "board"}
          onClick={() => setTab("board")}
          icon={<ClipboardCheck size={14} />}
          label="Task Board"
        />
        <TabButton
          active={tab === "import"}
          onClick={() => setTab("import")}
          icon={<FolderUp size={14} />}
          label="Import Proposal"
        />
        <TabButton
          active={tab === "workload"}
          onClick={() => setTab("workload")}
          icon={<Users size={14} />}
          label="Team Workload"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "board" && (
          <MondayBoard
            tasks={scopedTasks}
            employees={employees}
            employeeNotes={notes}
            role="depthead"
            departmentFilter={userProfile?.departmentId}
            currentUserId={userProfile?.uid}
            currentUserName={userProfile?.fullName || userProfile?.email || ""}
            onCreateTask={createTask}
            onAssign={assignTask}
            onVerify={(taskId, approve, feedback) =>
              verifyTask(taskId, approve, feedback, {
                id: userProfile?.uid,
                name: userProfile?.fullName || userProfile?.email || "Team Leader",
              })
            }
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
          />
        )}
        {tab === "import" && <ProposalImport />}
        {tab === "workload" && <TeamWorkloadView orgName={orgName} />}
      </div>
    </div>
  );
}

export default TeamLeaderContent;
