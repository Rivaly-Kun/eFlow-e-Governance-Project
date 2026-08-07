import { Settings } from "@carbon/icons-react";
import { RolePageRouter, type RolePageSections } from "../../components/Layout/RolePageRouter";
import { DepartmentRiskFlags } from "./components/DepartmentRiskFlags";
import { EquitableDistribution } from "./components/EquitableDistribution";
import { GAAllocationReview } from "./components/GAAllocationReview";
import { WorkloadVelocityOverview } from "./components/WorkloadVelocityOverview";
import { AutomatedAlerts } from "./components/AutomatedAlerts";
import { WellnessInterventions } from "./components/WellnessInterventions";
import { StressDebriefing } from "./components/StressDebriefing";
import { TerminalLeaveCredits } from "./components/TerminalLeaveCredits";
import { Monetization } from "./components/Monetization";
import { OvertimeClaims } from "./components/OvertimeClaims";
import { PayrollPreAudit } from "./components/PayrollPreAudit";
import { CSCAppraisals } from "./components/CSCAppraisals";
import { TaskCompletionRates } from "./components/TaskCompletionRates";
import { EflowDataIntegration } from "./components/EflowDataIntegration";
import { WellnessOverview } from "./components/OverviewPages";
import { LeaveAttendanceOverview } from "./components/OverviewPages";

export const hrmoPages: RolePageSections = {
  workforce: {
    "Burnout Prediction Radar": DepartmentRiskFlags,
    "Department Risk Flags": DepartmentRiskFlags,
    "Response Latencies": DepartmentRiskFlags,
    "Cumulative Work Experience": DepartmentRiskFlags,
    "Logged Project Hours": DepartmentRiskFlags,
    "Workload Velocity Metrics": WorkloadVelocityOverview,
    "Task Completion Velocity": WorkloadVelocityOverview,
    "Equitable Distribution": EquitableDistribution,
    "GA Allocation Review": GAAllocationReview,
  },
  compliance: {
    "Performance Evaluations": CSCAppraisals,
    "CSC Appraisals": CSCAppraisals,
    "Task Completion Rates": TaskCompletionRates,
    "eFlow Data Integration": EflowDataIntegration,
  },
  wellness: {
    "Preemptive Interventions": WellnessOverview,
    "Automated Alerts": AutomatedAlerts,
    "Wellness Interventions": WellnessInterventions,
    "Stress Debriefing": StressDebriefing,
    "Leave & Attendance Management": LeaveAttendanceOverview,
    "Terminal Leave Credits": TerminalLeaveCredits,
    "Monetization": Monetization,
    "Overtime Claims": OvertimeClaims,
    "Payroll Pre-Audit": PayrollPreAudit,
  },
};

export const hrmoDefaultPages: Record<string, string> = {
  workforce: "Burnout Prediction Radar",
  wellness: "Automated Alerts",
  compliance: "CSC Appraisals",
};

export function HRMOContent({ activeSection, activePage }: { activeSection: string; activePage?: string }) {
  return (
    <RolePageRouter
      sections={hrmoPages}
      defaults={hrmoDefaultPages}
      activeSection={activeSection}
      activePage={activePage}
      fallback={(section) => (
        <div className="flex h-full items-center justify-center text-neutral-400">
          <div className="text-center"><Settings size={40} className="mx-auto mb-3 opacity-30" /><p className="text-[14px]">Section unavailable</p><p className="mt-1 text-[12px]">{section}</p></div>
        </div>
      )}
    />
  );
}
