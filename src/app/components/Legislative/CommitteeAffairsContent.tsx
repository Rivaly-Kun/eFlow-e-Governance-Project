import React, { useState, useRef, useEffect } from "react";
import {
  CheckmarkOutline,
  Warning,
  Filter,
  Search,
  Send,
  Time,
  User,
  Analytics,
  ChevronDown,
  ChevronRight,
  Settings,
  Flag,
  Task,
  UserMultiple,
  Report,
  DocumentAdd,
  Group,
  View,
  Locked,
} from "@carbon/icons-react";
import {
  AlertCircle,
  MessageSquare,
  Users,
  FileText,
  Clock,
  Zap,
  TrendingUp,
  Edit3,
  Eye,
  ChevronLeft,
  Plus,
  Check,
  X,
  AlertTriangle,
  BookOpen,
} from "lucide-react";

// ==================== SHARED ====================

function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-[22px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{title}</h1>
        <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">{subtitle || "Sangguniang Panlungsod · Ormoc City"}</p>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}

function Btn({ icon, label, variant = "secondary", onClick, disabled }: { icon: React.ReactNode; label: string; variant?: "primary" | "secondary" | "danger" | "success"; onClick?: () => void; disabled?: boolean }) {
  const s: Record<string, string> = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50",
    danger: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] cursor-pointer transition-colors ${s[variant]} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      {icon}{label}
    </button>
  );
}

function Pill({ status, className }: { status: string; className?: string }) {
  const pillMap: Record<string, string> = {
    Healthy: "bg-emerald-100 text-emerald-700",
    "At Risk": "bg-amber-100 text-amber-700",
    Overdue: "bg-red-100 text-red-700",
    Active: "bg-emerald-100 text-emerald-700",
    Pending: "bg-amber-100 text-amber-700",
    Draft: "bg-blue-100 text-blue-700",
    Adopted: "bg-emerald-100 text-emerald-700",
    "Under Review": "bg-violet-100 text-violet-700",
    Available: "bg-emerald-100 text-emerald-700",
    Insufficient: "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-['Lexend:Medium',_sans-serif] whitespace-nowrap ${pillMap[status] || "bg-neutral-100 text-neutral-600"} ${className || ""}`}>
      {status}
    </span>
  );
}

function StatCard({ label, value, sub, trend }: { label: string; value: string; sub?: string; trend?: "up" | "down" | "flat" }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4 flex-1 min-w-[155px]">
      <p className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">{label}</p>
      <p className="text-[24px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mt-1">{value}</p>
      {sub && (
        <p className={`text-[11px] font-['Lexend:Regular',_sans-serif] mt-0.5 ${trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-600" : "text-neutral-500"}`}>
          {trend === "up" ? "↑ " : trend === "down" ? "↓ " : ""}{sub}
        </p>
      )}
    </div>
  );
}

// ==================== 8.1.A PROPOSED MUNICIPAL BUDGET ====================

const budgetTreeData = [
  { name: "General Services", fullName: "General Public Services", size: 520, color: "#3B82F6", pct: 26, yoy: "+4%", aiNote: "Administrative overhead is within 28% benchmark. Personnel Services consume 72% of this allocation, consistent with national LGU averages." },
  { name: "Health", fullName: "Health Services", size: 300, color: "#10B981", pct: 15, yoy: "+12%", aiNote: "The proposed ₱300M Health budget is a 12% increase from last year, aligning with the projected population growth of Ormoc. Burn-rate history suggests 98% utilization." },
  { name: "Infrastructure", fullName: "Infrastructure Development", size: 450, color: "#F59E0B", pct: 22.5, yoy: "+8%", aiNote: "₱450M earmarked for disaster risk reduction, road widening, and drainage. 35% allocated to the Eco-Park Tourism Zone. Contractor pre-qualification completed for 3 of 5 major projects." },
  { name: "Education", fullName: "Education, Culture & Sports", size: 200, color: "#8B5CF6", pct: 10, yoy: "+6%", aiNote: "Scholarship Fund (ORD-2024-048) consumes 22% of this block. New allocation for digital literacy program in 15 barangays." },
  { name: "Social Welfare", fullName: "Social Welfare & Development", size: 180, color: "#EC4899", pct: 9, yoy: "+3%", aiNote: "Stable allocation. DSWD co-funding covers 40% of conditional cash transfer programs. No audit flags." },
  { name: "Eco & Tourism", fullName: "Economic & Tourism Dev.", size: 150, color: "#06B6D4", pct: 7.5, yoy: "+18%", aiNote: "Largest YoY increase driven by the Sustainable Tourism Eco-Park Zone (ORD-2026-042). Marine Litter Interception Program (₱5M) included under environmental sub-line." },
  { name: "Public Safety", fullName: "Public Order & Safety", size: 120, color: "#F97316", pct: 6, yoy: "+2%", aiNote: "CCTV Surveillance Network (ORD-2026-047, ₱12M) is the major new item. Disaster preparedness training (₱3M) for all barangays pending committee clearance." },
  { name: "Debt Service", fullName: "Debt Service Fund", size: 80, color: "#6B7280", pct: 4, yoy: "-5%", aiNote: "Declining as scheduled. Final tranche of the 2019 municipal bond matures in Q3 2027." },
];

const budgetComments = [
  { id: "c1", author: "Hon. J. Cruz", initials: "JC", department: "Health", text: "Requesting a ₱5M cut here to move to the Eco-Park fund. The 12% increase is already above the 5-year average.", time: "Apr 12, 2:30 PM", resolved: false },
  { id: "c2", author: "Hon. L. Santos", initials: "LS", department: "Infrastructure", text: "The ₱450M must include the flood control channel rehabilitation. Confirm with DPWH co-funding status.", time: "Apr 11, 4:15 PM", resolved: false },
  { id: "c3", author: "Hon. R. Almario", initials: "RA", department: "Eco & Tourism", text: "Eco-Park tourism revenue projections need to be attached before second reading.", time: "Apr 10, 10:00 AM", resolved: true },
];

// Simple squarified treemap layout algorithm
function computeTreemapLayout(data: typeof budgetTreeData, width: number, height: number) {
  const total = data.reduce((s, d) => s + d.size, 0);
  const sorted = [...data].sort((a, b) => b.size - a.size);
  const rects: { x: number; y: number; w: number; h: number; item: typeof budgetTreeData[0] }[] = [];
  
  let cx = 0, cy = 0, cw = width, ch = height;
  // Use a simple strip layout
  let remaining = [...sorted];
  let remainingArea = width * height;
  
  while (remaining.length > 0) {
    const isWide = cw >= ch;
    // Take items for this strip
    const stripItems: typeof remaining = [];
    let stripTotal = 0;
    const firstRatio = remaining[0].size / total;
    const stripSize = isWide ? ch : cw;
    
    // Greedy: add items while aspect ratio improves
    for (const item of remaining) {
      stripItems.push(item);
      stripTotal += item.size;
      if (stripItems.length >= 2) {
        const stripLen = (stripTotal / total) * (isWide ? cw : ch) * (isWide ? ch : cw) / stripSize;
        const lastH = ((item.size / stripTotal) * stripSize);
        const ar = Math.max(stripLen / lastH, lastH / stripLen);
        if (ar > 4 && remaining.length > stripItems.length) {
          stripItems.pop();
          stripTotal -= item.size;
          break;
        }
      }
    }
    
    remaining = remaining.slice(stripItems.length);
    const stripFraction = stripTotal / total;
    const stripWidth = isWide ? cw * stripFraction : cw;
    const stripHeight = isWide ? ch : ch * stripFraction;
    
    let offset = 0;
    for (const item of stripItems) {
      const itemFrac = item.size / stripTotal;
      const itemLen = isWide ? stripHeight * itemFrac : stripWidth * itemFrac;
      rects.push({
        x: isWide ? cx : cx + offset,
        y: isWide ? cy + offset : cy,
        w: isWide ? stripWidth : itemLen,
        h: isWide ? itemLen : stripHeight,
        item,
      });
      offset += itemLen;
    }
    
    if (isWide) { cx += stripWidth; cw -= stripWidth; }
    else { cy += stripHeight; ch -= stripHeight; }
    
    // Recalculate total for remaining
    const remTotal = remaining.reduce((s, d) => s + d.size, 0);
    if (remTotal > 0) {
      const scale = (cw * ch) / (remainingArea * (remTotal / (total)));
    }
    remainingArea = cw * ch;
  }
  
  return rects;
}

function ProposedMunicipalBudget() {
  const [selectedBlock, setSelectedBlock] = useState<typeof budgetTreeData[0] | null>(null);
  const [showComments, setShowComments] = useState(true);
  const totalBudget = budgetTreeData.reduce((a, b) => a + b.size, 0);
  const treemapRects = computeTreemapLayout(budgetTreeData, 100, 100);

  return (
    <div>
      <PageHeader
        title="Annual Budget Scrutiny"
        subtitle="FY 2027 Executive Budget · Submitted by the Office of the City Mayor"
        actions={
          <>
            <Btn icon={<View size={14} />} label="Departmental Breakdown" />
            <Btn icon={<Zap size={14} />} label="AI Forecast" variant="primary" />
          </>
        }
      />

      {/* Stats */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <StatCard label="Total Budget" value={`₱${(totalBudget / 1000).toFixed(1)}B`} sub="FY 2027 Proposed" />
        <StatCard label="YoY Change" value="+6.8%" sub="vs FY 2026 ₱1.87B" trend="up" />
        <StatCard label="Committee Comments" value={`${budgetComments.filter(c => !c.resolved).length}`} sub={`${budgetComments.filter(c => c.resolved).length} resolved`} />
        <StatCard label="AI Risk Score" value="Low" sub="No unfunded mandates detected" trend="up" />
      </div>

      {/* Tree Map + Detail Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5 mb-6">
        {/* Tree Map */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Budget Allocation Tree-Map</h3>
            <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400">Click a block to inspect</span>
          </div>
          <div className="h-[340px] relative rounded-lg overflow-hidden">
            {treemapRects.map((r, i) => (
              <div
                key={`tm-${i}`}
                onClick={() => setSelectedBlock(r.item)}
                className="absolute cursor-pointer transition-all duration-200 hover:brightness-110 hover:z-10 flex flex-col justify-center px-3 py-2"
                style={{
                  left: `${r.x}%`,
                  top: `${r.y}%`,
                  width: `${r.w}%`,
                  height: `${r.h}%`,
                  backgroundColor: r.item.color,
                  opacity: selectedBlock?.name === r.item.name ? 1 : 0.85,
                  outline: selectedBlock?.name === r.item.name ? "3px solid #1e293b" : "2px solid #fff",
                  outlineOffset: "-2px",
                  borderRadius: "6px",
                }}
              >
                {r.w > 12 && r.h > 12 && (
                  <>
                    <span className="text-white text-[12px] font-['Lexend:Medium',_sans-serif] leading-tight truncate">{r.item.name}</span>
                    <span className="text-white/70 text-[10px] font-['Lexend:Regular',_sans-serif] mt-0.5">₱{r.item.size}M · {r.item.pct}%</span>
                  </>
                )}
              </div>
            ))}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-neutral-100">
            {budgetTreeData.map(d => (
              <button key={d.name} onClick={() => setSelectedBlock(d)} className="flex items-center gap-1.5 cursor-pointer hover:opacity-70 transition-opacity">
                <div className="size-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{d.name} ({d.pct}%)</span>
              </button>
            ))}
          </div>
        </div>

        {/* AI Fiscal Note Panel */}
        <div className="flex flex-col gap-4">
          {selectedBlock ? (
            <div className="bg-white rounded-xl border border-neutral-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="size-3 rounded-sm" style={{ backgroundColor: selectedBlock.color }} />
                <h4 className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{selectedBlock.fullName}</h4>
              </div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-[28px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">₱{selectedBlock.size}M</span>
                <span className={`text-[12px] font-['Lexend:Medium',_sans-serif] ${selectedBlock.yoy.startsWith("+") ? "text-emerald-600" : selectedBlock.yoy.startsWith("-") ? "text-blue-600" : "text-neutral-500"}`}>
                  {selectedBlock.yoy} YoY
                </span>
              </div>
              {/* AI Note */}
              <div className="bg-violet-50 border border-violet-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Zap size={12} className="text-violet-600" />
                  <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-violet-700">AI Fiscal Note</span>
                </div>
                <p className="text-[12px] font-['Lexend:Regular',_sans-serif] text-violet-800 leading-relaxed">
                  {selectedBlock.aiNote}
                </p>
              </div>
              {/* Allocation Bar */}
              <div className="mb-2">
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">Share of Total Budget</span>
                  <span className="text-[10px] font-['Lexend:SemiBold',_sans-serif] text-neutral-700">{selectedBlock.pct}%</span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${selectedBlock.pct}%`, backgroundColor: selectedBlock.color }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-neutral-200 p-5 flex flex-col items-center justify-center text-center h-[260px]">
              <Analytics size={32} className="text-neutral-200 mb-3" />
              <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-400">Click a budget block to view</p>
              <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-300 mt-1">AI Fiscal Note & details</p>
            </div>
          )}

          {/* Quick Comparison */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <h4 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">FY 2027 vs FY 2026</h4>
            <div className="flex flex-col gap-2.5">
              {budgetTreeData.slice(0, 5).map(d => {
                const fy27 = d.size;
                const fy26 = Math.round(d.size / (1 + parseFloat(d.yoy) / 100));
                const max = Math.max(...budgetTreeData.slice(0, 5).map(x => x.size));
                return (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="text-[9px] font-['Lexend:Regular',_sans-serif] text-neutral-500 w-[60px] shrink-0 truncate">{d.name}</span>
                    <div className="flex-1 flex flex-col gap-0.5">
                      <div className="h-[8px] bg-neutral-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#D1D5DB] rounded-full" style={{ width: `${(fy26 / max) * 100}%` }} />
                      </div>
                      <div className="h-[8px] bg-neutral-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(fy27 / max) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-[9px] font-['Lexend:Medium',_sans-serif] text-neutral-700 w-[32px] text-right">{fy27}M</span>
                  </div>
                );
              })}
              <div className="flex items-center gap-3 pt-2 border-t border-neutral-100">
                <div className="flex items-center gap-1"><div className="size-2 rounded-sm bg-[#D1D5DB]" /><span className="text-[8px] font-['Lexend:Regular',_sans-serif] text-neutral-400">FY 2026</span></div>
                <div className="flex items-center gap-1"><div className="size-2 rounded-sm bg-blue-500" /><span className="text-[8px] font-['Lexend:Regular',_sans-serif] text-neutral-400">FY 2027</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Committee Comments */}
      <div className="bg-white rounded-xl border border-neutral-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <MessageSquare size={14} className="text-neutral-500" />
            <h3 className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Committee Inline Comments</h3>
            <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400">
              {budgetComments.filter(c => !c.resolved).length} open
            </span>
          </div>
          <Btn icon={<Plus size={12} />} label="Add Comment" />
        </div>
        <div className="divide-y divide-neutral-50">
          {budgetComments.map(c => (
            <div key={c.id} className={`px-5 py-4 ${c.resolved ? "opacity-50" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-['Lexend:SemiBold',_sans-serif] text-blue-700">{c.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{c.author}</span>
                    <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-400">on {c.department}</span>
                    <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-400">· {c.time}</span>
                    {c.resolved && <Pill status="Resolved" className="!text-[9px] !py-0" />}
                  </div>
                  <p className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700 leading-relaxed">{c.text}</p>
                </div>
                {!c.resolved && (
                  <button className="text-[10px] font-['Lexend:Medium',_sans-serif] text-emerald-600 hover:underline cursor-pointer whitespace-nowrap">Mark Resolved</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== 8.1.B BUDGET LEGISLATION ====================

const treasuryFunds = [
  { fund: "General Fund — Unappropriated", available: 142_500_000, status: "Available" },
  { fund: "Calamity Fund (20% Reserve)", available: 67_500_000, status: "Available" },
  { fund: "Special Education Fund", available: 28_000_000, status: "Available" },
  { fund: "Gender & Development Fund", available: 15_200_000, status: "Available" },
  { fund: "Local DRRM Fund (Remaining)", available: 8_500_000, status: "Insufficient" },
];

const draftOrdinanceText = `ORDINANCE NO. 2026-___

AN ORDINANCE APPROPRIATING THE SUM OF TEN MILLION PESOS (₱10,000,000.00) FOR THE ESTABLISHMENT OF THE ORMOC CITY DIGITAL GOVERNANCE AND eFLOW IMPLEMENTATION FUND

Be it ordained by the Sangguniang Panlungsod of the City of Ormoc, in session assembled:

SECTION 1. Short Title. — This ordinance shall be known as the "eFlow Digital Governance Fund Ordinance of 2026."

SECTION 2. Purpose. — To establish a dedicated fund for the implementation of the eFlow Digital Governance Platform, including:
  a) Cloud infrastructure and hosting services
  b) AI/ML model training and deployment
  c) Blockchain node maintenance and cryptographic ledger operations
  d) Staff training and digital literacy programs
  e) Hardware procurement for department terminals

SECTION 3. Appropriation. — An amount of TEN MILLION PESOS (₱10,000,000.00) is hereby appropriated from the General Fund — Unappropriated Balance for FY 2026.

SECTION 4. Fund Management. — The City Treasurer shall manage the fund in accordance with existing COA regulations and the City's Financial Management Code.

SECTION 5. Reporting. — Quarterly utilization reports shall be submitted to the Committee on Appropriations & Finance.

SECTION 6. Effectivity. — This ordinance shall take effect fifteen (15) days after its publication.`;

function BudgetLegislation() {
  const [editorText, setEditorText] = useState(draftOrdinanceText);
  const [appropriationAmount, setAppropriationAmount] = useState(10_000_000);
  const selectedFund = treasuryFunds[0]; // General Fund
  const isOverBudget = appropriationAmount > selectedFund.available;
  const isFundSufficient = !isOverBudget;

  // Detect appropriation amount from text
  useEffect(() => {
    const match = editorText.match(/(?:₱|PHP?\s*)([\d,]+(?:\.\d{2})?)/);
    if (match) {
      const num = parseInt(match[1].replace(/,/g, ""));
      if (!isNaN(num) && num > 0) setAppropriationAmount(num);
    }
  }, [editorText]);

  return (
    <div>
      <PageHeader
        title="Appropriation Drafting"
        subtitle="Committee on Appropriations & Finance"
        actions={
          <>
            <Btn icon={<Locked size={14} />} label="Live Link: Treasury General Fund" variant="success" />
            <Btn icon={<CheckmarkOutline size={14} />} label="Submit Favorable Report" variant="primary" disabled={isOverBudget} />
          </>
        }
      />

      {/* Fiscal Alert */}
      {isOverBudget && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-red-800">Unfunded Mandate Detected</p>
            <p className="text-[12px] font-['Lexend:Regular',_sans-serif] text-red-700 mt-1">
              The appropriation amount of ₱{appropriationAmount.toLocaleString()} exceeds the available balance of ₱{selectedFund.available.toLocaleString()} in the {selectedFund.fund}. The Submit button is disabled until the amount is corrected or an alternative fund source is identified.
            </p>
          </div>
        </div>
      )}

      {/* Split View */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5">
        {/* Left: Text Editor */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 bg-neutral-50/50">
            <div className="flex items-center gap-2">
              <Edit3 size={14} className="text-neutral-500" />
              <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-700">Ordinance Draft Editor</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-400">Auto-saved 30s ago</span>
              <div className="size-2 rounded-full bg-emerald-400" />
            </div>
          </div>
          <div className="p-5">
            <textarea
              value={editorText}
              onChange={(e) => setEditorText(e.target.value)}
              className={`w-full min-h-[520px] bg-transparent text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-700 leading-relaxed outline-none resize-none ${
                isOverBudget ? "selection:bg-red-100" : ""
              }`}
              style={{ whiteSpace: "pre-wrap" }}
            />
          </div>
          {/* Highlight warning bar */}
          {isOverBudget && (
            <div className="px-5 py-3 bg-red-50 border-t border-red-200 flex items-center gap-2">
              <Warning size={14} className="text-red-500" />
              <span className="text-[11px] font-['Lexend:Medium',_sans-serif] text-red-700">
                ₱{appropriationAmount.toLocaleString()} exceeds available ₱{selectedFund.available.toLocaleString()} — Text flagged in red
              </span>
            </div>
          )}
        </div>

        {/* Right: Treasury Live Feed */}
        <div className="flex flex-col gap-4">
          {/* Live Treasury Connection */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">City Treasury — Live Ledger</span>
            </div>
            <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-400 mb-3">
              Real-time fund availability via blockchain API
            </p>
            <div className="flex flex-col gap-2">
              {treasuryFunds.map((f, i) => (
                <div key={i} className={`p-3 rounded-lg border ${f.status === "Insufficient" ? "border-red-200 bg-red-50/50" : "border-neutral-100 bg-neutral-50/30"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-700">{f.fund}</span>
                    <Pill status={f.status} />
                  </div>
                  <span className="text-[16px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">₱{f.available.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Fiscal Math Box */}
          <div className={`rounded-xl border p-5 ${isFundSufficient ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
            <h4 className={`text-[12px] font-['Lexend:SemiBold',_sans-serif] mb-3 ${isFundSufficient ? "text-emerald-800" : "text-red-800"}`}>
              Fiscal Gatekeeper Check
            </h4>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">Requested Amount</span>
                <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">₱{appropriationAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">Available (General Fund)</span>
                <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">₱{selectedFund.available.toLocaleString()}</span>
              </div>
              <div className="h-px bg-neutral-200 my-1" />
              <div className="flex justify-between">
                <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">Remaining After</span>
                <span className={`text-[11px] font-['Lexend:SemiBold',_sans-serif] ${isFundSufficient ? "text-emerald-700" : "text-red-700"}`}>
                  ₱{(selectedFund.available - appropriationAmount).toLocaleString()}
                </span>
              </div>
            </div>
            <div className={`mt-3 flex items-center gap-1.5 text-[11px] font-['Lexend:Medium',_sans-serif] ${isFundSufficient ? "text-emerald-700" : "text-red-700"}`}>
              {isFundSufficient ? <Check size={14} /> : <X size={14} />}
              {isFundSufficient ? "Funds verified — Submit enabled" : "Insufficient funds — Submit disabled"}
            </div>
          </div>

          {/* Blockchain Verification */}
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Locked size={12} className="text-neutral-500" />
              <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-neutral-700">Blockchain Sync</span>
            </div>
            <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
              Last treasury block: #48,294 · Synced 8s ago · All balances hash-verified
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 8.2.A COMMITTEE CHAIRMANSHIPS ====================

interface CommitteeCard {
  id: string;
  name: string;
  chair: string;
  chairInitials: string;
  activeMeasures: number;
  avgDays: number;
  status: "Healthy" | "At Risk" | "Overdue";
  overdueMeasures: number;
  nextHearing?: string;
}

const committeeCards: CommitteeCard[] = [
  { id: "c1", name: "Committee on Appropriations & Finance", chair: "Hon. J. Cruz", chairInitials: "JC", activeMeasures: 6, avgDays: 12, status: "Healthy", overdueMeasures: 0, nextHearing: "Apr 22, 2026" },
  { id: "c2", name: "Committee on Tourism & Environment", chair: "Hon. L. Santos", chairInitials: "LS", activeMeasures: 4, avgDays: 18, status: "Healthy", overdueMeasures: 0, nextHearing: "Apr 23, 2026" },
  { id: "c3", name: "Committee on Public Order & Safety", chair: "Hon. P. Garcia", chairInitials: "PG", activeMeasures: 3, avgDays: 45, status: "Overdue", overdueMeasures: 2, nextHearing: undefined },
  { id: "c4", name: "Committee on Education, Culture & Sports", chair: "Hon. A. Reyes", chairInitials: "AR", activeMeasures: 2, avgDays: 22, status: "Healthy", overdueMeasures: 0, nextHearing: "Apr 25, 2026" },
  { id: "c5", name: "Committee on Health & Social Welfare", chair: "Hon. M. Delgado", chairInitials: "MD", activeMeasures: 5, avgDays: 30, status: "At Risk", overdueMeasures: 1 },
  { id: "c6", name: "Committee on Infrastructure & Public Works", chair: "Hon. B. Navarro", chairInitials: "BN", activeMeasures: 4, avgDays: 16, status: "Healthy", overdueMeasures: 0, nextHearing: "Apr 24, 2026" },
  { id: "c7", name: "Committee on Rules & Privileges", chair: "Hon. R. Almario", chairInitials: "RA", activeMeasures: 1, avgDays: 8, status: "Healthy", overdueMeasures: 0 },
  { id: "c8", name: "Committee on Ways & Means", chair: "Hon. E. Lim", chairInitials: "EL", activeMeasures: 3, avgDays: 28, status: "At Risk", overdueMeasures: 1, nextHearing: "Apr 28, 2026" },
];

const statusColors: Record<string, { border: string; bg: string; indicator: string }> = {
  Healthy: { border: "border-emerald-200", bg: "hover:bg-emerald-50/30", indicator: "bg-emerald-400" },
  "At Risk": { border: "border-amber-200", bg: "hover:bg-amber-50/30", indicator: "bg-amber-400" },
  Overdue: { border: "border-red-200", bg: "hover:bg-red-50/30", indicator: "bg-red-400" },
};

function CommitteeChairmanships() {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [nudgeSent, setNudgeSent] = useState<Set<string>>(new Set());

  const filtered = filterStatus === "all" ? committeeCards : committeeCards.filter(c => c.status === filterStatus);
  const overdue = committeeCards.filter(c => c.status === "Overdue").length;
  const atRisk = committeeCards.filter(c => c.status === "At Risk").length;

  return (
    <div>
      <PageHeader
        title="Committee Roster & SLA Tracking"
        subtitle="Office of the Vice Mayor · Sangguniang Panlungsod"
        actions={
          <>
            <Btn icon={<Filter size={14} />} label="Overdue Measures" variant="danger" onClick={() => setFilterStatus(filterStatus === "Overdue" ? "all" : "Overdue")} />
            <Btn icon={<Report size={14} />} label="Export Report" />
          </>
        }
      />

      {/* Stats */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <StatCard label="Total Committees" value={`${committeeCards.length}`} sub="Standing committees" />
        <StatCard label="Active Measures" value={`${committeeCards.reduce((a, b) => a + b.activeMeasures, 0)}`} sub="Across all committees" />
        <StatCard label="Overdue" value={`${overdue}`} sub={`${atRisk} at risk`} trend={overdue > 0 ? "down" : "up"} />
        <StatCard label="Avg. Committee Time" value={`${Math.round(committeeCards.reduce((a, b) => a + b.avgDays, 0) / committeeCards.length)}d`} sub="Target: ≤30 days" />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-5">
        {["all", "Healthy", "At Risk", "Overdue"].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-['Lexend:Medium',_sans-serif] cursor-pointer transition-colors ${
              filterStatus === s ? "bg-neutral-900 text-white" : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
            }`}
          >
            {s === "all" ? "All" : s}
          </button>
        ))}
      </div>

      {/* Committee Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(c => {
          const sc = statusColors[c.status];
          return (
            <div key={c.id} className={`bg-white rounded-xl border ${sc.border} p-5 ${sc.bg} transition-colors`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-blue-700">{c.chairInitials}</span>
                  </div>
                  <div>
                    <h4 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{c.name}</h4>
                    <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">Chair: {c.chair}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`size-2 rounded-full ${sc.indicator}`} />
                  <Pill status={c.status} />
                </div>
              </div>

              {/* Metrics Row */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-neutral-50 rounded-lg p-2.5 text-center">
                  <p className="text-[16px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{c.activeMeasures}</p>
                  <p className="text-[9px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">Active Measures</p>
                </div>
                <div className={`rounded-lg p-2.5 text-center ${c.avgDays > 30 ? "bg-red-50" : c.avgDays > 20 ? "bg-amber-50" : "bg-neutral-50"}`}>
                  <p className={`text-[16px] font-['Lexend:SemiBold',_sans-serif] ${c.avgDays > 30 ? "text-red-700" : c.avgDays > 20 ? "text-amber-700" : "text-neutral-900"}`}>{c.avgDays}d</p>
                  <p className="text-[9px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">Avg. Time</p>
                </div>
                <div className={`rounded-lg p-2.5 text-center ${c.overdueMeasures > 0 ? "bg-red-50" : "bg-neutral-50"}`}>
                  <p className={`text-[16px] font-['Lexend:SemiBold',_sans-serif] ${c.overdueMeasures > 0 ? "text-red-700" : "text-neutral-900"}`}>{c.overdueMeasures}</p>
                  <p className="text-[9px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">Overdue</p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                {c.nextHearing ? (
                  <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500 flex items-center gap-1">
                    <Clock size={10} /> Next Hearing: {c.nextHearing}
                  </span>
                ) : (
                  <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-red-500 flex items-center gap-1">
                    <AlertCircle size={10} /> No hearing scheduled
                  </span>
                )}
                {(c.status === "Overdue" || c.status === "At Risk") && (
                  <button
                    onClick={() => setNudgeSent(prev => new Set(prev).add(c.id))}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-['Lexend:Medium',_sans-serif] cursor-pointer transition-colors ${
                      nudgeSent.has(c.id)
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                    }`}
                  >
                    {nudgeSent.has(c.id) ? (
                      <><Check size={10} /> Update Requested</>
                    ) : (
                      <><Send size={12} /> Request Update</>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== 8.2.B WORKING DOCUMENTS ====================

interface DocVersion {
  id: string;
  author: string;
  initials: string;
  action: string;
  timestamp: string;
  detail: string;
}

const docVersions: DocVersion[] = [
  { id: "v1", author: "Hon. R. Almario", initials: "RA", action: "Added", timestamp: "Apr 14, 3:45 PM", detail: "Added penalty clause: Section 7 — Fines for non-compliance" },
  { id: "v2", author: "SP Secretariat (A. Villanueva)", initials: "AV", action: "Formatted", timestamp: "Apr 14, 2:10 PM", detail: "Applied standard ordinance formatting template" },
  { id: "v3", author: "Hon. L. Santos", initials: "LS", action: "Revised", timestamp: "Apr 14, 11:30 AM", detail: "Changed appropriation from ₱8M to ₱5M per fiscal note" },
  { id: "v4", author: "NLP Engine", initials: "AI", action: "Flagged", timestamp: "Apr 14, 11:00 AM", detail: "Cross-check: Reference to RA 9003 in Section 2(c) is outdated — suggest RA 11898" },
  { id: "v5", author: "Hon. M. Delgado", initials: "MD", action: "Created", timestamp: "Apr 13, 9:00 AM", detail: "Initial draft submitted for committee deliberation" },
];

const collaborators = [
  { name: "Hon. R. Almario", initials: "RA", color: "bg-blue-500", active: true },
  { name: "Hon. L. Santos", initials: "LS", color: "bg-emerald-500", active: true },
  { name: "A. Villanueva (Secretariat)", initials: "AV", color: "bg-violet-500", active: true },
  { name: "Hon. M. Delgado", initials: "MD", color: "bg-amber-500", active: false },
];

const workingDocText = `ORDINANCE NO. 2026-___

AN ORDINANCE APPROPRIATING THE SUM OF FIVE MILLION PESOS (₱5,000,000.00) FOR THE MARINE LITTER INTERCEPTION PROGRAM OF ORMOC CITY (#SHInEOrmoc Phase 2)

Author: Hon. M. Delgado
Committee: Tourism & Environment
Status: Under Committee Deliberation

EXPLANATORY NOTE

The Ormoc City Solid Waste Management Board has reported that approximately 2,400 metric tons of marine litter enter the Ormoc Bay watershed annually. The #SHInEOrmoc initiative (Solid Waste Handling & Interception Network) has successfully reduced land-based littering by 34% since ORD-2025-035 was enacted.

Phase 2 focuses on:
  (a) Installation of 12 trash trap interceptors at major drainage outfalls
  (b) Deployment of 3 solar-powered river skimmer units
  (c) Establishment of a community-based litter monitoring network across 8 coastal barangays
  (d) Public awareness campaign and school engagement program

BE IT ORDAINED by the Sangguniang Panlungsod of the City of Ormoc, in session assembled:

SECTION 1. Short Title. — This ordinance shall be known as the "#SHInEOrmoc Phase 2 Appropriation Ordinance."

SECTION 2. Appropriation. — The sum of FIVE MILLION PESOS (₱5,000,000.00) is hereby appropriated from the General Fund for the implementation of the Marine Litter Interception Program.

SECTION 3. Implementation. — The City Environment and Natural Resources Office (CENRO), in coordination with the City Engineering Office, shall implement the program components within twelve (12) months from effectivity.

SECTION 4. Monitoring. — Quarterly progress reports shall be submitted to the Committee on Tourism & Environment.

SECTION 5. Separability Clause. — If any provision of this Ordinance is declared unconstitutional or invalid, the remaining provisions shall continue in full force and effect.

SECTION 6. Repealing Clause. — All ordinances, rules, and regulations inconsistent herewith are hereby repealed or modified accordingly.

SECTION 7. Penalties. — Any person or entity found violating the provisions of this ordinance shall be penalized as follows:
  (a) First Offense: Fine of ₱5,000.00
  (b) Second Offense: Fine of ₱10,000.00 and community service
  (c) Third Offense: Fine of ₱25,000.00 and imprisonment of not more than thirty (30) days

SECTION 8. Effectivity. — This ordinance shall take effect fifteen (15) days after its complete publication in a newspaper of general circulation.`;

function WorkingDocuments() {
  const [text, setText] = useState(workingDocText);
  const [aiCheck, setAiCheck] = useState(true);
  const [showAdopt, setShowAdopt] = useState(false);

  return (
    <div>
      <PageHeader
        title="Collaborative Drafting"
        subtitle="Committee on Tourism & Environment · ORD-2026-044"
        actions={
          <>
            <button
              onClick={() => setAiCheck(!aiCheck)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] cursor-pointer transition-colors ${
                aiCheck ? "bg-violet-100 text-violet-700 border border-violet-200" : "bg-white text-neutral-600 border border-neutral-200"
              }`}
            >
              <Zap size={14} /> AI Legal Cross-Check: {aiCheck ? "ON" : "OFF"}
            </button>
            <button
              onClick={() => setShowAdopt(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] cursor-pointer transition-colors bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <CheckmarkOutline size={14} /> Adopt Committee Report
            </button>
          </>
        }
      />

      {/* Collaborators Bar */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-neutral-200 px-5 py-3 mb-5">
        <div className="flex items-center gap-3">
          <Users size={14} className="text-neutral-500" />
          <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-700">Live Collaborators</span>
          <div className="flex -space-x-2">
            {collaborators.filter(c => c.active).map((c, i) => (
              <div key={i} className={`size-7 rounded-full ${c.color} flex items-center justify-center border-2 border-white`} title={c.name}>
                <span className="text-[9px] text-white font-['Lexend:SemiBold',_sans-serif]">{c.initials}</span>
              </div>
            ))}
          </div>
          <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-400">
            {collaborators.filter(c => c.active).length} editing now
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">All changes auto-saved</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
        {/* Editor */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 bg-neutral-50/50">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-neutral-500" />
              <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-700">ORD-2026-044 — Marine Litter Interception</span>
              <Pill status="Under Review" />
            </div>
          </div>

          {/* AI Flag Banner */}
          {aiCheck && (
            <div className="px-5 py-2.5 bg-violet-50 border-b border-violet-100 flex items-start gap-2">
              <Zap size={12} className="text-violet-600 mt-0.5 shrink-0" />
              <div>
                <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-violet-700">AI Legal Cross-Check Active</span>
                <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-violet-600 mt-0.5">
                  1 flag: Reference to RA 9003 in Section 2(c) may be outdated — consider updating to RA 11898 (Extended Producer Responsibility Act of 2022)
                </p>
              </div>
            </div>
          )}

          <div className="p-5">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full min-h-[560px] bg-transparent text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-700 leading-relaxed outline-none resize-none"
              style={{ whiteSpace: "pre-wrap" }}
            />
          </div>
        </div>

        {/* Version History + Collaborator Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Version Control Timeline */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <h4 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-4">Version History</h4>
            <div className="flex flex-col gap-0">
              {docVersions.map((v, i) => {
                const isAI = v.initials === "AI";
                return (
                  <div key={v.id} className="flex gap-3 relative">
                    {/* Timeline Line */}
                    {i < docVersions.length - 1 && (
                      <div className="absolute left-[15px] top-[32px] bottom-0 w-px bg-neutral-200" />
                    )}
                    <div className={`size-8 rounded-full flex items-center justify-center shrink-0 z-10 ${
                      isAI ? "bg-violet-100" : "bg-blue-100"
                    }`}>
                      <span className={`text-[9px] font-['Lexend:SemiBold',_sans-serif] ${isAI ? "text-violet-700" : "text-blue-700"}`}>{v.initials}</span>
                    </div>
                    <div className="pb-5 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{v.author}</span>
                        <span className={`text-[9px] font-['Lexend:Medium',_sans-serif] px-1.5 py-0.5 rounded-full ${
                          v.action === "Added" ? "bg-emerald-100 text-emerald-700"
                          : v.action === "Revised" ? "bg-amber-100 text-amber-700"
                          : v.action === "Flagged" ? "bg-violet-100 text-violet-700"
                          : v.action === "Created" ? "bg-blue-100 text-blue-700"
                          : "bg-neutral-100 text-neutral-600"
                        }`}>
                          {v.action}
                        </span>
                      </div>
                      <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600 leading-relaxed">{v.detail}</p>
                      <p className="text-[9px] font-['Lexend:Regular',_sans-serif] text-neutral-400 mt-1">{v.timestamp}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Document Info */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <h4 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Document Info</h4>
            <div className="flex flex-col gap-2.5">
              {[
                ["Tracking No.", "ORD-2026-044"],
                ["Author", "Hon. M. Delgado"],
                ["Committee", "Tourism & Environment"],
                ["Date Filed", "Mar 12, 2026"],
                ["Current Stage", "Committee Level"],
                ["Appropriation", "₱5,000,000"],
                ["Total Revisions", "5"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{k}</span>
                  <span className="text-[10px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* BPA Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <Zap size={14} className="text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-blue-800 mb-1">BPA Engine Ready</p>
                <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-blue-700 leading-relaxed">
                  Clicking "Adopt Committee Report" will trigger the BPA Engine to automatically move this measure to the Plenary Agenda for the next Tuesday session.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Adopt Committee Report Modal */}
      {showAdopt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backdropFilter: "blur(8px)", background: "rgba(0,0,0,0.25)" }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-[420px] shadow-2xl mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <CheckmarkOutline size={24} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-[16px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Adopt Committee Report?</h3>
                <p className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-500">This action is recorded on the blockchain</p>
              </div>
            </div>
            <div className="bg-neutral-50 rounded-lg p-4 mb-4">
              <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mb-1">MEASURE</p>
              <p className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">ORD-2026-044 — Marine Litter Interception Program</p>
              <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-2 mb-1">NEXT STEP</p>
              <p className="text-[12px] font-['Lexend:Medium',_sans-serif] text-emerald-700">→ Plenary Agenda (Second Reading)</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAdopt(false)} className="flex-1 py-2.5 bg-neutral-100 text-neutral-600 rounded-lg text-[13px] font-['Lexend:Medium',_sans-serif] cursor-pointer hover:bg-neutral-200 transition-colors">
                Cancel
              </button>
              <button onClick={() => setShowAdopt(false)} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-[13px] font-['Lexend:Medium',_sans-serif] cursor-pointer hover:bg-emerald-700 transition-colors">
                Confirm & Adopt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== EXPORTS ====================

export const committeePages: Record<string, Record<string, React.ComponentType>> = {
  committee: {
    "Appropriations & Finance": ProposedMunicipalBudget,
    "Proposed Municipal Budget": ProposedMunicipalBudget,
    "Budget Legislation": BudgetLegislation,
    "Sectoral Committees": CommitteeChairmanships,
    "Committee Chairmanships": CommitteeChairmanships,
    "Working Documents": WorkingDocuments,
  },
};

export const committeeDefaultPages: Record<string, string> = {
  committee: "Proposed Municipal Budget",
};