import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, Search, Sparkles, UsersRound } from "lucide-react";
import { PageHeader } from "../../../../components/workflow/primitives";
import { useEmployeeNotes } from "../../../../hooks/useFirebaseData";
import type { Employee } from "../../../employees";
import { buildSkillCoverage } from "../../selectors/teamAnalyticsSelectors";
import { useDepartmentTeamAnalytics } from "../../hooks/useDepartmentTeamAnalytics";
import { EmployeeIntelligencePanel } from "./EmployeeIntelligencePanel";
import { SkillCoveragePanel } from "./SkillCoveragePanel";
import { TeamHealthOverview } from "./TeamHealthOverview";

type View = "overview" | "people" | "skills";

export function TeamIntelligenceWorkspace() {
  const analytics = useDepartmentTeamAnalytics();
  const { notes, loading: notesLoading } = useEmployeeNotes();
  const [view, setView] = useState<View>("overview");
  const [search, setSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>();

  useEffect(() => {
    setSelectedEmployeeId((current) => current && analytics.deptEmployees.some((employee) => employee.id === current) ? current : analytics.deptEmployees[0]?.id);
  }, [analytics.deptEmployees]);

  const storedSkillsFor = (employee: Employee): string[] => {
    const profile = analytics.profilesById.get(employee.id) || (employee.email ? analytics.profilesByEmail.get(employee.email.toLowerCase()) : undefined);
    const rawSkills = profile?.skills;
    if (!rawSkills) return [];
    if (typeof rawSkills === "string") {
      try { return Object.entries(JSON.parse(rawSkills) as Record<string, unknown>).filter(([, enabled]) => enabled === true || enabled === "true").map(([skill]) => skill); } catch { return []; }
    }
    return Object.entries(rawSkills).filter(([, enabled]) => enabled === true).map(([skill]) => skill);
  };
  const skills = useMemo(() => buildSkillCoverage(analytics.deptEmployees, notes), [analytics.deptEmployees, notes]);
  const query = search.trim().toLowerCase();
  const filteredEmployees = analytics.deptEmployees.filter((employee) => !query || `${employee.name} ${employee.jobTitle} ${notes[employee.id]?.tags?.join(" ") || ""}`.toLowerCase().includes(query));
  const selectedEmployee = analytics.deptEmployees.find((employee) => employee.id === selectedEmployeeId);
  const selectedMetric = analytics.memberMetrics.find((metric) => metric.employeeId === selectedEmployeeId);

  if (analytics.loading || notesLoading) return <div className="flex min-h-full items-center justify-center p-8 text-[12px] text-neutral-500">Building team intelligence from workflow history…</div>;

  return (
    <div className="min-h-full p-6 sm:p-8">
      <PageHeader eyebrow="Department · Evidence-based insights" title="Team Intelligence" subtitle="Understand delivery quality, workload concentration, review patterns, and skills while preserving the manager context used by AI assignments." actions={<span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[10px] font-medium text-violet-700"><BrainCircuit size={13} /> AI assignment inputs preserved</span>} />
      {analytics.error && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-800">Historical workflow details are partially unavailable: {analytics.error}</div>}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-1">
          {[ { id: "overview", label: "Department health", icon: <Sparkles size={13} /> }, { id: "people", label: "Employee 360", icon: <UsersRound size={13} /> }, { id: "skills", label: "Skills coverage", icon: <BrainCircuit size={13} /> } ].map((tab) => <button key={tab.id} type="button" onClick={() => setView(tab.id as View)} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition ${view === tab.id ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-neutral-50"}`}>{tab.icon}{tab.label}</button>)}
        </div>
        {view === "people" && <div className="relative"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people or skills…" className="h-9 w-64 rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-[11px] outline-none focus:border-neutral-400" /></div>}
      </div>

      {view === "overview" && <div className="space-y-4"><TeamHealthOverview health={analytics.health} members={analytics.memberMetrics} /><div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4"><div className="flex items-start gap-3"><BrainCircuit size={18} className="mt-0.5 shrink-0 text-blue-600" /><div><h3 className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-blue-900">How to read this page</h3><p className="mt-1 text-[10.5px] leading-5 text-blue-700">Metrics are derived from task and subtask participation, progress, submissions, and decisions. They support supervision and assignment decisions but do not constitute an automatic performance rating. Open Employee 360 to inspect source activity before making a judgment.</p></div></div></div></div>}

      {view === "people" && (
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="rounded-xl border border-neutral-200 bg-white p-2 xl:sticky xl:top-4">
            {filteredEmployees.map((employee) => { const metric = analytics.memberMetrics.find((row) => row.employeeId === employee.id); return <button key={employee.id} type="button" onClick={() => setSelectedEmployeeId(employee.id)} className={`mb-1 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${selectedEmployeeId === employee.id ? "bg-neutral-100" : "hover:bg-neutral-50"}`}><div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-900 text-[9px] font-medium text-white">{employee.initials || "??"}</div><div className="min-w-0 flex-1"><div className="truncate text-[10.5px] font-medium text-neutral-800">{employee.name}</div><div className="truncate text-[9px] text-neutral-400">{employee.jobTitle}</div></div><span className={`text-[9.5px] font-medium ${metric && metric.workloadSignal >= 80 ? "text-red-600" : metric && metric.workloadSignal >= 55 ? "text-amber-600" : "text-emerald-600"}`}>{metric?.workloadSignal ?? 0}</span></button>; })}
            {filteredEmployees.length === 0 && <p className="py-10 text-center text-[10.5px] text-neutral-400">No matching people.</p>}
          </aside>
          {selectedEmployee && selectedMetric ? <EmployeeIntelligencePanel employee={selectedEmployee} metric={selectedMetric} note={notes[selectedEmployee.id]} storedSkills={storedSkillsFor(selectedEmployee)} facts={analytics.facts} tasks={analytics.tasks} updatedBy={analytics.userProfile?.uid} /> : <div className="rounded-xl border border-dashed border-neutral-200 py-20 text-center text-[12px] text-neutral-400">Select an employee.</div>}
        </div>
      )}

      {view === "skills" && <SkillCoveragePanel rows={skills} />}
    </div>
  );
}
