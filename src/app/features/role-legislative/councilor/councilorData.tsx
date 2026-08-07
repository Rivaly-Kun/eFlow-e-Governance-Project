import * as Lucide from "lucide-react";

export interface TaskCard {
  id: string;
  priority: "urgent" | "review" | "info";
  type: "Floor Vote" | "Committee Action" | "Reading Material";
  title: string;
  subtitle: string;
  timeInfo?: string;
}

export interface DocNote {
  id: string;
  text: string;
  timestamp: string;
}

// ==================== MOCK DATA ====================
export const mockCouncilor = {
  name: "Hon. Maria Elena D. Santos",
  title: "City Councilor, District II",
};

export const mockTasks: TaskCard[] = [
  {
    id: "t1",
    priority: "urgent",
    type: "Floor Vote",
    title: "Resolution #402 — Supplemental Budget for Disaster Risk Reduction",
    subtitle: "Requires 2/3 majority vote",
    timeInfo: "Starts in 10 mins",
  },
  {
    id: "t2",
    priority: "review",
    type: "Committee Action",
    title: "Draft: Eco-Park Tourism Development Guidelines",
    subtitle: "Committee on Tourism & Environment",
  },
  {
    id: "t3",
    priority: "info",
    type: "Reading Material",
    title: "Agenda for the 143rd Regular Session",
    subtitle: "22 items on the Order of Business",
  },
  {
    id: "t4",
    priority: "review",
    type: "Committee Action",
    title: "Proposed Ordinance: Revised Revenue Code Amendment",
    subtitle: "Committee on Appropriations & Finance",
  },
];

export const mockAISummary = [
  "Appropriates ₱450M for Phase 1 of the Disaster Risk Reduction Infrastructure Program.",
  "Funds sourced from 2026 General Fund with 15% contingency allocation from calamity reserves.",
  "Cleared by City Treasurer on April 10, 2026. No outstanding audit findings.",
];

export const mockFullText = `RESOLUTION NO. 2026-402

A RESOLUTION AUTHORIZING THE SUPPLEMENTAL BUDGET APPROPRIATION OF FOUR HUNDRED FIFTY MILLION PESOS (₱450,000,000.00) FOR THE DISASTER RISK REDUCTION INFRASTRUCTURE PROGRAM, PHASE 1

WHEREAS, the City of Ormoc has been classified as a high-risk area for natural disasters including typhoons, flooding, and landslides;

WHEREAS, the City Disaster Risk Reduction and Management Council (CDRRMC) has identified critical infrastructure gaps in early warning systems, evacuation centers, and flood control mechanisms;

WHEREAS, the City Treasurer has certified the availability of funds from the 2026 General Fund and Calamity Fund reserves;

WHEREAS, the Committee on Appropriations and Finance, after due deliberation, has recommended the approval of said appropriation;

NOW, THEREFORE, BE IT RESOLVED, as it is hereby resolved by the Sangguniang Panlungsod of the City of Ormoc, in session assembled:

SECTION 1. Authorization. — The City Mayor is hereby authorized to implement the Disaster Risk Reduction Infrastructure Program, Phase 1, with a total appropriation of FOUR HUNDRED FIFTY MILLION PESOS (₱450,000,000.00).

SECTION 2. Fund Source. — The funds shall be sourced as follows:
  a) ₱382,500,000.00 from the 2026 General Fund
  b) ₱67,500,000.00 from the Calamity Fund (15% contingency)

SECTION 3. Components. — The program shall cover:
  a) Construction of three (3) multi-purpose evacuation centers
  b) Upgrade of the city-wide early warning system
  c) Rehabilitation of primary and secondary drainage channels
  d) Installation of real-time water level monitoring stations

SECTION 4. Effectivity. — This Resolution shall take effect upon approval.

ADOPTED this ___ day of April 2026.`;

// ==================== CONFIG ====================

export const priorityConfig = {
  urgent: {
    color: "bg-red-500",
    border: "border-red-200",
    bg: "bg-red-50",
    text: "text-red-700",
    icon: <Lucide.AlertCircle size={16} className="text-red-500" />,
  },
  review: {
    color: "bg-amber-400",
    border: "border-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-700",
    icon: <Lucide.Eye size={16} className="text-amber-500" />,
  },
  info: {
    color: "bg-blue-400",
    border: "border-blue-200",
    bg: "bg-blue-50",
    text: "text-blue-700",
    icon: <Lucide.BookOpen size={16} className="text-blue-500" />,
  },
};

// ==================== INBOX VIEW ====================
