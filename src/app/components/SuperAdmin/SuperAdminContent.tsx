import React, { useState } from "react";
import {
  Renew,
  Filter,
  Download,
  Search,
  Settings,
  Play,
  Save,
  Microphone,
  View,
  Flag,
  CheckmarkOutline,
  Warning,
  User,
  Add,
  Upload,
  Security,
  Time,
  Analytics,
  ChartBar,
  Copy,
  Close,
  DocumentExport,
  ChevronDown,
  Calendar,
} from "@carbon/icons-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
  Legend,
  ComposedChart,
  ScatterChart,
  Scatter,
} from "recharts";

// Shared styles
const pillStyles: Record<string, string> = {
  Healthy: "bg-emerald-100 text-emerald-700",
  Warning: "bg-amber-100 text-amber-700",
  Critical: "bg-red-100 text-red-700",
  Stable: "bg-emerald-100 text-emerald-700",
  Drifting: "bg-amber-100 text-amber-700",
  High: "bg-orange-100 text-orange-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-red-100 text-red-700",
  Resolved: "bg-neutral-100 text-neutral-600",
  Active: "bg-blue-100 text-blue-700",
  Compliant: "bg-emerald-100 text-emerald-700",
  "Non-Compliant": "bg-red-100 text-red-700",
  Pending: "bg-amber-100 text-amber-700",
};

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-['Lexend:Medium',_sans-serif] font-medium ${pillStyles[status] || "bg-neutral-100 text-neutral-600"}`}>
      {status}
    </span>
  );
}

function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="font-['Lexend:SemiBold',_sans-serif] font-semibold text-[20px] text-neutral-900">{title}</h2>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function ActionButton({ children, variant = "default", onClick }: { children: React.ReactNode; variant?: "default" | "primary"; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] font-medium cursor-pointer transition-colors ${
        variant === "primary"
          ? "bg-neutral-900 text-white hover:bg-neutral-800"
          : "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50"
      }`}
    >
      {children}
    </button>
  );
}

function WidgetCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-neutral-200 p-4 ${className}`}>
      <div className="text-[12px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-500 mb-3">{title}</div>
      {children}
    </div>
  );
}

function BatteryWidget({ label, value }: { label: string; value: number }) {
  const color = value > 95 ? "bg-emerald-500" : value > 85 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-16 h-28 rounded-lg border-2 border-neutral-300 relative overflow-hidden flex flex-col justify-end p-1">
        <div className={`${color} rounded-sm transition-all duration-700`} style={{ height: `${value}%` }} />
      </div>
      <div className="text-[18px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-900">{value}%</div>
      <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 text-center">{label}</div>
    </div>
  );
}

function CounterWidget({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4 flex flex-col items-center justify-center">
      <div className="text-[28px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-900">{value}</div>
      {unit && <div className="text-[11px] text-neutral-400">{unit}</div>}
      <div className="text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-500 mt-1">{label}</div>
    </div>
  );
}

// ==================== 1.1 INFRASTRUCTURE HEALTH ====================
const tenantData = [
  { dept: "City Engineering", dbLoad: 42, activeUsers: 128, status: "Healthy", dbQueries: "2,340/min", memoryUsage: "3.2 GB / 8 GB", topQuery: "SELECT * FROM project_status WHERE active = true ORDER BY deadline ASC", avgResponseTime: "45ms" },
  { dept: "Finance & Budget", dbLoad: 67, activeUsers: 95, status: "Healthy", dbQueries: "1,890/min", memoryUsage: "4.1 GB / 8 GB", topQuery: "INSERT INTO ledger_entries (tx_id, amount, dept) VALUES (...)", avgResponseTime: "62ms" },
  { dept: "HRMO", dbLoad: 88, activeUsers: 214, status: "Warning", dbQueries: "4,120/min", memoryUsage: "6.8 GB / 8 GB", topQuery: "UPDATE employee_records SET leave_balance = leave_balance - 1", avgResponseTime: "312ms" },
  { dept: "Business Permits", dbLoad: 94, activeUsers: 342, status: "Critical", dbQueries: "6,780/min", memoryUsage: "7.6 GB / 8 GB", topQuery: "SELECT * FROM permit_applications WHERE status = 'PENDING'", avgResponseTime: "1,240ms" },
  { dept: "Health Services", dbLoad: 35, activeUsers: 67, status: "Healthy", dbQueries: "980/min", memoryUsage: "2.1 GB / 8 GB", topQuery: "SELECT patient_records WHERE last_visit > '2026-01-01'", avgResponseTime: "28ms" },
  { dept: "Assessor's Office", dbLoad: 51, activeUsers: 43, status: "Healthy", dbQueries: "1,120/min", memoryUsage: "2.8 GB / 8 GB", topQuery: "SELECT property_valuations WHERE zone_id IN (12, 15, 18)", avgResponseTime: "55ms" },
  { dept: "City Planning", dbLoad: 73, activeUsers: 89, status: "Warning", dbQueries: "2,560/min", memoryUsage: "5.2 GB / 8 GB", topQuery: "JOIN zoning_maps zm ON zm.parcel_id = p.id WHERE updated", avgResponseTime: "189ms" },
];

const cpuTimelineData = Array.from({ length: 24 }, (_, i) => ({
  time: `${String(i).padStart(2, "0")}:00`,
  cpu: 28 + Math.sin(i * 0.4) * 18 + Math.random() * 8,
}));

const memoryTimelineData = Array.from({ length: 24 }, (_, i) => ({
  time: `${String(i).padStart(2, "0")}:00`,
  memory: 45 + Math.cos(i * 0.3) * 12 + Math.random() * 6,
}));

function MiniSparkline({ data, height, color, fill }: { data: number[]; height: number; color: string; fill?: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 300;
  const h = height;
  const pad = 2;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = pad + ((max - v) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  const fillPoints = fill ? `0,${h} ${points} ${w},${h}` : "";
  // Grid lines
  const gridLines = Array.from({ length: 5 }, (_, i) => pad + (i / 4) * (h - pad * 2));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={height} preserveAspectRatio="none">
      {gridLines.map((y, i) => (
        <line key={`g-${i}`} x1={0} y1={y} x2={w} y2={y} stroke="#f5f5f5" strokeWidth={1} />
      ))}
      {fill && <polygon points={fillPoints} fill={fill} opacity={0.5} />}
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function GaugeWidget({ value, label, color }: { value: number; label: string; color: string }) {
  const radius = 58;
  const circumference = Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;
  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="85" viewBox="0 0 140 85">
        <path d="M 11 80 A 58 58 0 0 1 129 80" fill="none" stroke="#e5e7eb" strokeWidth="10" strokeLinecap="round" />
        <path d="M 11 80 A 58 58 0 0 1 129 80" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${circumference}`} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="text-[28px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-900 -mt-6">{value}%</div>
      <div className="text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-500 mt-1">{label}</div>
    </div>
  );
}

function InfrastructureHealth() {
  const [selectedDept, setSelectedDept] = useState<null | typeof tenantData[0]>(null);
  const [timeFilter, setTimeFilter] = useState("Live (Last 24 Hours)");

  return (
    <div>
      {/* Breadcrumb */}
      <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400 mb-3">
        System Command Center <span className="mx-1.5">/</span> <span className="text-neutral-700">Infrastructure Health</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-['Lexend:SemiBold',_sans-serif] font-semibold text-[20px] text-neutral-900">Infrastructure Health</h2>
        <div className="flex items-center gap-2">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="px-3 py-2 rounded-full border border-neutral-200 text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-600 outline-none cursor-pointer bg-white"
          >
            <option>Live (Last 24 Hours)</option>
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
          </select>
          <ActionButton variant="primary"><Renew size={14} /> Refresh Diagnostics</ActionButton>
          <ActionButton><DocumentExport size={14} /> Export Health Report</ActionButton>
        </div>
      </div>

      {/* Top KPI Widgets */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-neutral-200 p-5 flex flex-col items-center justify-center">
          <div className="text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider mb-3">System Uptime</div>
          <GaugeWidget value={99.98} label="Overall Uptime" color="#10b981" />
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-5 flex flex-col items-center justify-center">
          <div className="text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider mb-3">API Latency</div>
          <div className="text-[42px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-900">124<span className="text-[18px] text-neutral-400 ml-1">ms</span></div>
          <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-1">Avg. Server Response Time</div>
          <div className="flex items-center gap-1 mt-2">
            <div className="size-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-emerald-600">Within acceptable range</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-5 flex flex-col items-center justify-center">
          <div className="text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider mb-3">Active Nodes</div>
          <div className="text-[42px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-emerald-600">12<span className="text-[18px] text-neutral-400 ml-1">/12</span></div>
          <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-1">Nodes Online</div>
          <div className="flex items-center gap-1 mt-2">
            <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-emerald-600">All nodes operational</span>
          </div>
        </div>
      </div>

      {/* Split-View: Tenant Board + Charts */}
      <div className="flex gap-4 relative">
        {/* Left Pane: Tenant Status Board */}
        <div className={`transition-all duration-300 ${selectedDept ? "w-[55%]" : "w-[60%]"}`}>
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
              <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-800">Tenant Status Board</span>
              <span className="text-[10px] text-neutral-400">{tenantData.length} departments</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/50">
                  {["Department Name", "DB Load %", "Active Users", "Status"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tenantData.map((t) => (
                  <tr
                    key={t.dept}
                    onClick={() => setSelectedDept(selectedDept?.dept === t.dept ? null : t)}
                    className={`border-b border-neutral-50 cursor-pointer transition-colors ${selectedDept?.dept === t.dept ? "bg-blue-50/50" : "hover:bg-neutral-50/70"}`}
                  >
                    <td className="px-4 py-3 text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-900">{t.dept}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${t.dbLoad > 90 ? "bg-red-500" : t.dbLoad > 75 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${t.dbLoad}%` }} />
                        </div>
                        <span className="text-[11px] font-mono text-neutral-600">{t.dbLoad}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] font-mono text-neutral-700">{t.activeUsers}</td>
                    <td className="px-4 py-3"><StatusPill status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Pane: Real-Time Charts */}
        <div className={`transition-all duration-300 ${selectedDept ? "w-[20%]" : "w-[40%]"}`}>
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-neutral-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-500 uppercase tracking-wider">CPU Utilization</span>
                <span className="text-[9px] text-neutral-400">Last refreshed: just now</span>
              </div>
              <MiniSparkline data={cpuTimelineData.map(d => d.cpu)} height={130} color="#6366f1" />
            </div>
            <div className="bg-white rounded-xl border border-neutral-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-500 uppercase tracking-wider">Memory Consumption</span>
                <span className="text-[9px] text-neutral-400">Last refreshed: just now</span>
              </div>
              <MiniSparkline data={memoryTimelineData.map(d => d.memory)} height={130} color="#10b981" fill="#d1fae5" />
            </div>
          </div>
        </div>

        {/* Progressive Disclosure Drawer */}
        {selectedDept && (
          <div className="w-[25%] shrink-0 bg-white rounded-xl border border-neutral-200 overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-800">{selectedDept.dept}</span>
              <button onClick={() => setSelectedDept(null)} className="text-neutral-400 hover:text-neutral-600 cursor-pointer"><Close size={16} /></button>
            </div>
            <div className="p-4 flex flex-col gap-4">
              <div>
                <div className="text-[10px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider mb-1">Status</div>
                <StatusPill status={selectedDept.status} />
              </div>
              <div>
                <div className="text-[10px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider mb-1">Database Queries</div>
                <div className="text-[16px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-900">{selectedDept.dbQueries}</div>
              </div>
              <div>
                <div className="text-[10px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider mb-1">Memory Usage</div>
                <div className="text-[14px] font-mono text-neutral-800">{selectedDept.memoryUsage}</div>
                <div className="w-full h-2 bg-neutral-100 rounded-full mt-1.5 overflow-hidden">
                  <div className={`h-full rounded-full ${selectedDept.dbLoad > 90 ? "bg-red-500" : selectedDept.dbLoad > 75 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${selectedDept.dbLoad}%` }} />
                </div>
              </div>
              <div>
                <div className="text-[10px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider mb-1">Avg Response Time</div>
                <div className="text-[14px] font-mono text-neutral-800">{selectedDept.avgResponseTime}</div>
              </div>
              <div>
                <div className="text-[10px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider mb-1">Top Query</div>
                <pre className="bg-neutral-50 border border-neutral-100 rounded-lg p-2.5 text-[10px] font-mono text-neutral-600 whitespace-pre-wrap">{selectedDept.topQuery}</pre>
              </div>
              <div>
                <div className="text-[10px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider mb-1">Active Users</div>
                <div className="text-[14px] font-mono text-neutral-800">{selectedDept.activeUsers}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== 1.2 GLOBAL ERROR LOGS ====================
const errorKanban: Record<string, Array<{ id: string; dept: string; trace: string; severity: string; timestamp: string; assignee: string }>> = {
  "New Alerts": [
    { id: "ERR-8092", dept: "Business Permits Office", trace: "DatabaseTimeoutException: Connection pool exhausted after 30s timeout.\nAffected query: SELECT * FROM permit_applications WHERE status='PENDING'", severity: "Critical", timestamp: "2026-04-02 14:23:01", assignee: "MR" },
    { id: "ERR-8089", dept: "City Engineering", trace: "NullReferenceException at ProjectTracker.computeProgress()\nStack: line 142, module ProcessMining", severity: "Critical", timestamp: "2026-04-02 14:18:44", assignee: "JL" },
    { id: "ERR-8085", dept: "Assessor's Office", trace: "InvalidSchemaException: Property valuation schema v3.2 deprecated\nFallback to v3.1 failed", severity: "High", timestamp: "2026-04-02 14:12:30", assignee: "" },
  ],
  "Investigating": [
    { id: "ERR-8078", dept: "HRMO", trace: "AuthTokenExpired: JWT session invalidated prematurely.\nUser: admin@hrmo.gov - Token TTL mismatch", severity: "High", timestamp: "2026-04-02 13:45:22", assignee: "AS" },
    { id: "ERR-8071", dept: "Health Services", trace: "FileNotFoundException: Report template '/templates/monthly_v2.docx'\nnot found in document store", severity: "Medium", timestamp: "2026-04-02 13:20:15", assignee: "KD" },
  ],
  "Escalated to Developers": [
    { id: "ERR-8065", dept: "Finance & Budget", trace: "ConcurrencyException: Ledger write conflict on transaction TX-44921.\nBlockchain consensus failed after 3 retries", severity: "Critical", timestamp: "2026-04-02 12:55:08", assignee: "RP" },
    { id: "ERR-8058", dept: "City Planning", trace: "MemoryOverflow: NLP Engine heap exceeded 4GB during batch sentiment\nanalysis of 12,000 citizen feedback entries", severity: "High", timestamp: "2026-04-02 12:30:41", assignee: "TM" },
  ],
  "Resolved": [
    { id: "ERR-8044", dept: "City Engineering", trace: "MemoryLeak: Worker pool exhausted after processing 8,400 concurrent\nrequests. Auto-scaled and recovered.", severity: "Medium", timestamp: "2026-04-02 11:10:33", assignee: "JL" },
    { id: "ERR-8039", dept: "Health Services", trace: "SSLCertificateExpiry: Certificate for api.health.gov.ph expired.\nAuto-renewed successfully.", severity: "Low", timestamp: "2026-04-02 10:45:20", assignee: "KD" },
  ],
};

const errorDistData = [
  { name: "Business Permits", value: 31, color: "#ef4444" },
  { name: "City Engineering", value: 22, color: "#6366f1" },
  { name: "Finance & Budget", value: 16, color: "#10b981" },
  { name: "HRMO", value: 13, color: "#f59e0b" },
  { name: "Health Services", value: 10, color: "#ec4899" },
  { name: "Others", value: 8, color: "#94a3b8" },
];

const kanbanColColors: Record<string, string> = {
  "New Alerts": "border-t-red-400",
  "Investigating": "border-t-amber-400",
  "Escalated to Developers": "border-t-violet-400",
  "Resolved": "border-t-emerald-400",
};

const assigneeColors: Record<string, string> = {
  MR: "bg-blue-500", JL: "bg-violet-500", AS: "bg-emerald-500",
  KD: "bg-pink-500", RP: "bg-amber-500", TM: "bg-indigo-500",
};

function GlobalErrorLogs() {
  const [selectedError, setSelectedError] = useState<null | typeof errorKanban["New Alerts"][0]>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const jsonPayload = selectedError ? JSON.stringify({
    errorId: selectedError.id,
    department: selectedError.dept,
    severity: selectedError.severity,
    timestamp: selectedError.timestamp,
    environment: {
      os: "Ubuntu 22.04 LTS",
      runtime: "Node.js 20.11.1",
      memoryUsage: "1.2 GB",
      cpuLoad: "34%",
      containerId: "k8s-pod-lgu-prod-7f8c9d",
    },
    stackTrace: selectedError.trace,
    correlationId: `COR-${selectedError.id.replace("ERR-", "")}`,
    retryCount: 3,
    resolution: null,
  }, null, 2) : "";

  return (
    <div>
      {/* Breadcrumb */}
      <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400 mb-3">
        System Command Center <span className="mx-1.5">/</span> <span className="text-neutral-700">Global Error Logs</span>
      </div>

      {/* Header with Search & Filters */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-['Lexend:SemiBold',_sans-serif] font-semibold text-[20px] text-neutral-900">Global Error Logs</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              placeholder="Search error hash or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-2 rounded-lg border border-neutral-200 text-[11px] w-56 font-['Lexend:Regular',_sans-serif] outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-200"
            />
          </div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-neutral-200 text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-600 outline-none cursor-pointer bg-white"
          >
            <option value="All">Severity: All</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-neutral-200 text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-600 outline-none cursor-pointer bg-white"
          >
            <option value="All">Source: All</option>
            <option value="Process Mining">Process Mining</option>
            <option value="Blockchain Ledger">Blockchain Ledger</option>
            <option value="NLP Engine">NLP Engine</option>
            <option value="Auth Module">Auth Module</option>
          </select>
          <ActionButton><Download size={14} /> Export Logs</ActionButton>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-3 mb-6">
        {Object.entries(errorKanban).map(([col, cards]) => (
          <div key={col} className={`flex-1 bg-neutral-50/80 rounded-xl border border-neutral-200 border-t-4 ${kanbanColColors[col]} overflow-hidden`}>
            <div className="px-3 py-2.5 flex items-center justify-between">
              <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-700">{col}</span>
              <span className="text-[10px] bg-neutral-200 text-neutral-600 rounded-full px-2 py-0.5">{cards.length}</span>
            </div>
            <div className="px-2 pb-2 flex flex-col gap-2">
              {cards.map((card) => (
                <div
                  key={card.id}
                  onClick={() => setSelectedError(card)}
                  className="bg-white rounded-lg border border-neutral-200 p-3 cursor-pointer hover:bg-neutral-50/50 transition-colors"
                >
                  {/* Header: Error ID + Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-['Lexend:Medium',_sans-serif] font-medium text-neutral-900">{card.id}</span>
                    <div className="flex items-center gap-1.5">
                      {card.severity === "Critical" && (
                        <div className="size-2 rounded-full bg-red-500 animate-pulse" />
                      )}
                      <StatusPill status={card.severity} />
                    </div>
                  </div>
                  {/* Body: Dept + Trace snippet */}
                  <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600 mb-1">{card.dept}</div>
                  <div className="text-[10px] font-mono text-neutral-400 line-clamp-2 mb-2">{card.trace.split("\n")[0]}</div>
                  {/* Footer: Timestamp + Avatar */}
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-neutral-400">{card.timestamp}</span>
                    {card.assignee && (
                      <div className={`size-5 rounded-full ${assigneeColors[card.assignee] || "bg-neutral-400"} flex items-center justify-center`}>
                        <span className="text-[8px] text-white font-['Lexend:Medium',_sans-serif] font-medium">{card.assignee}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Error Distribution Doughnut Chart */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4">
        <div className="text-[12px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-700 mb-3">Error Distribution by Department</div>
        <div className="flex items-center gap-8">
          <PieChart width={200} height={180}>
            <Pie key="errPie" data={errorDistData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
              {errorDistData.map((entry) => <Cell key={`errdist-${entry.name}`} fill={entry.color} />)}
            </Pie>
            <Tooltip key="tooltip" contentStyle={{ fontSize: 11 }} />
          </PieChart>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {errorDistData.map((e) => (
              <div key={e.name} className="flex items-center gap-2">
                <div className="size-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{e.name} ({e.value}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Error Detail Modal */}
      {selectedError && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setSelectedError(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[560px] max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[16px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-900">{selectedError.id}</span>
                {selectedError.severity === "Critical" && <div className="size-2.5 rounded-full bg-red-500 animate-pulse" />}
                <StatusPill status={selectedError.severity} />
              </div>
              <button onClick={() => setSelectedError(null)} className="text-neutral-400 hover:text-neutral-600 cursor-pointer"><Close size={20} /></button>
            </div>
            <div className="px-6 py-4 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider mb-1">Department</div>
                  <div className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-900">{selectedError.dept}</div>
                </div>
                <div>
                  <div className="text-[10px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider mb-1">Timestamp</div>
                  <div className="text-[13px] font-mono text-neutral-900">{selectedError.timestamp}</div>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider mb-1">Error Trace</div>
                <pre className="bg-neutral-50 rounded-lg p-3 text-[11px] font-mono text-neutral-700 whitespace-pre-wrap border border-neutral-100">{selectedError.trace}</pre>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[10px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider">Full JSON Payload</div>
                  <button
                    onClick={() => handleCopy(jsonPayload)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-['Lexend:Medium',_sans-serif] font-medium bg-neutral-100 text-neutral-600 hover:bg-neutral-200 cursor-pointer transition-colors"
                  >
                    <Copy size={12} />
                    {copied ? "Copied!" : "Copy to Clipboard"}
                  </button>
                </div>
                <pre className="bg-neutral-900 rounded-lg p-3 text-[11px] font-mono text-emerald-400 whitespace-pre-wrap max-h-56 overflow-auto">{jsonPayload}</pre>
              </div>
              {selectedError.assignee && (
                <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
                  <div className={`size-6 rounded-full ${assigneeColors[selectedError.assignee] || "bg-neutral-400"} flex items-center justify-center`}>
                    <span className="text-[9px] text-white font-['Lexend:Medium',_sans-serif] font-medium">{selectedError.assignee}</span>
                  </div>
                  <span className="text-[11px] text-neutral-600">Assigned investigator</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== 1.1 FITNESS FUNCTION VARIABLES ====================
const fitnessVariables = [
  { name: "Task Deadline Proximity", type: "Float (0–1)", status: "Included", weight: 0.35 },
  { name: "Employee Idle Time", type: "Hours (Float)", status: "Included", weight: 0.20 },
  { name: "Required Skill Match", type: "Boolean/Score", status: "Included", weight: 0.25 },
  { name: "Historical Velocity", type: "Tasks/Week", status: "Included", weight: 0.10 },
  { name: "Team Collaboration Score", type: "Float (0–1)", status: "Excluded", weight: 0.05 },
  { name: "Budget Utilization Rate", type: "Percentage", status: "Included", weight: 0.05 },
];

const fitnessRadarData = [
  { metric: "Speed", value: 78 },
  { metric: "Cost Efficiency", value: 55 },
  { metric: "Skill Alignment", value: 88 },
  { metric: "Deadline Adherence", value: 92 },
  { metric: "Workload Balance", value: 65 },
  { metric: "Resource Utilization", value: 72 },
];

// ==================== 1.2 WORKLOAD WEIGHTING ====================
const ganttTasks = [
  { employee: "J. Santos", mon: 8, tue: 7, wed: 8, thu: 6, fri: 5, capacity: 40 },
  { employee: "M. Cruz", mon: 6, tue: 8, wed: 7, thu: 8, fri: 6, capacity: 40 },
  { employee: "P. Reyes", mon: 4, tue: 5, wed: 6, thu: 7, fri: 8, capacity: 40 },
  { employee: "A. Torres", mon: 8, tue: 8, wed: 8, thu: 8, fri: 8, capacity: 40 },
  { employee: "C. Lim", mon: 3, tue: 4, wed: 3, thu: 5, fri: 4, capacity: 40 },
];

const idleTimeComparison = [
  { dept: "Engineering", projected: 2.4, historical: 4.1 },
  { dept: "Health", projected: 3.8, historical: 5.2 },
  { dept: "Finance", projected: 1.9, historical: 3.5 },
  { dept: "HRMO", projected: 2.1, historical: 3.8 },
  { dept: "Planning", projected: 3.2, historical: 4.9 },
];

// ==================== 1.3 COMPETENCY MAPPING ====================
const competencyDepts: Record<string, { skill: string; employees: { name: string; proficiency: string }[] }[]> = {
  Engineering: [
    { skill: "AutoCAD", employees: [{ name: "J. Santos", proficiency: "Expert" }, { name: "P. Reyes", proficiency: "Advanced" }, { name: "R. Magalona", proficiency: "Intermediate" }] },
    { skill: "Structural Analysis", employees: [{ name: "J. Santos", proficiency: "Expert" }, { name: "M. Cruz", proficiency: "Advanced" }] },
    { skill: "GIS Mapping", employees: [{ name: "P. Reyes", proficiency: "Advanced" }] },
  ],
  Health: [
    { skill: "Epidemiology", employees: [{ name: "M. Tan", proficiency: "Expert" }, { name: "L. Garcia", proficiency: "Intermediate" }] },
    { skill: "Public Health Policy", employees: [{ name: "M. Tan", proficiency: "Advanced" }] },
  ],
  Finance: [
    { skill: "COA Audit", employees: [{ name: "A. Fernandez", proficiency: "Expert" }, { name: "R. Aquino", proficiency: "Advanced" }, { name: "L. Garcia", proficiency: "Intermediate" }] },
    { skill: "Budget Analysis", employees: [{ name: "R. Aquino", proficiency: "Expert" }] },
    { skill: "Financial Forecasting", employees: [{ name: "A. Fernandez", proficiency: "Advanced" }, { name: "R. Aquino", proficiency: "Intermediate" }] },
  ],
};

const skillDistData = [
  { name: "Engineering", value: 35, color: "#6366f1" },
  { name: "Health", value: 15, color: "#10b981" },
  { name: "Finance", value: 25, color: "#f59e0b" },
  { name: "IT", value: 12, color: "#3b82f6" },
  { name: "Admin", value: 13, color: "#94a3b8" },
];

// ==================== 1.4 LOCAL OPTIMA PREVENTION ====================
const convergenceData = Array.from({ length: 200 }, (_, i) => ({
  gen: (i + 1) * 5,
  fitness: 100 - 82 * Math.exp(-i * 0.028) + (Math.random() - 0.5) * 3,
  avgFitness: 100 - 82 * Math.exp(-i * 0.028) - 8 + (Math.random() - 0.5) * 2,
}));

const stagnationSettings = [
  { param: "Mutation Probability", type: "slider", min: 0.01, max: 0.10 },
  { param: "Crossover Strategy", type: "dropdown", options: ["Single-point", "Multi-point", "Uniform"] },
  { param: "Tournament Size", type: "slider", min: 2, max: 10 },
  { param: "Elitism Rate", type: "slider", min: 0, max: 0.2 },
];

const gaStatusPills: Record<string, string> = {
  Optimal: "bg-emerald-100 text-emerald-700",
  "Sub-optimal": "bg-amber-100 text-amber-700",
  Invalid: "bg-red-100 text-red-700",
  Included: "bg-emerald-100 text-emerald-700",
  Excluded: "bg-neutral-100 text-neutral-600",
};

// ==================== 1.1 FITNESS FUNCTION VARIABLES ====================
function FitnessFunctionVariables() {
  const [variables, setVariables] = useState(fitnessVariables.map(v => ({ ...v })));

  const updateWeight = (idx: number, val: number) => {
    const updated = [...variables];
    updated[idx] = { ...updated[idx], weight: val };
    setVariables(updated);
  };

  const toggleStatus = (idx: number) => {
    const updated = [...variables];
    updated[idx] = { ...updated[idx], status: updated[idx].status === "Included" ? "Excluded" : "Included" };
    setVariables(updated);
  };

  const dynamicRadar = fitnessRadarData.map((d, i) => ({
    ...d,
    value: Math.round(d.value * (variables[i % variables.length]?.weight || 0.1) * 3),
  }));

  return (
    <div>
      <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400 mb-3">
        AI Operations <span className="mx-1.5">/</span> Genetic Algorithm Tuning <span className="mx-1.5">/</span> <span className="text-neutral-700">Fitness Function Variables</span>
      </div>
      <PageHeader title="Fitness Function Configuration">
        <ActionButton><Save size={14} /> Save Variable Preset</ActionButton>
        <ActionButton><Download size={14} /> Load Previous Preset</ActionButton>
        <ActionButton variant="primary"><Renew size={14} /> Reset to Default</ActionButton>
      </PageHeader>

      <div className="flex gap-4">
        {/* Configuration Board */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50/50">
              <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-800">Variable Configuration Board</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100">
                  {["Variable Name", "Data Type", "Status", "Weight Multiplier"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {variables.map((v, i) => (
                  <tr key={v.name} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                    <td className="px-4 py-3 text-[12px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-900">{v.name}</td>
                    <td className="px-4 py-3 text-[11px] font-mono text-neutral-600">{v.type}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleStatus(i)} className="cursor-pointer">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-['Lexend:Medium',_sans-serif] font-medium ${gaStatusPills[v.status]}`}>
                          {v.status}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step={0.05}
                        min={0}
                        max={1}
                        value={v.weight}
                        onChange={(e) => updateWeight(i, +e.target.value)}
                        className="w-20 px-2 py-1.5 rounded-lg border border-neutral-200 text-[12px] font-mono text-right outline-none focus:border-violet-400"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="w-[340px] shrink-0">
          <WidgetCard title="FITNESS FUNCTION BALANCE">
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={dynamicRadar}>
                <PolarGrid key="polargrid" stroke="#e5e5e5" />
                <PolarAngleAxis key="angleaxis" dataKey="metric" tick={{ fontSize: 9 }} />
                <PolarRadiusAxis key="radiusaxis" tick={{ fontSize: 8 }} domain={[0, 100]} />
                <Radar key="balance" dataKey="value" stroke="#7c3aed" fill="#c7d2fe" fillOpacity={0.5} strokeWidth={2} name="Balance" />
                <Tooltip key="tooltip" contentStyle={{ fontSize: 10 }} />
              </RadarChart>
            </ResponsiveContainer>
            <div className="text-[10px] text-neutral-500 text-center mt-2">Updates in real-time as weights are adjusted</div>
          </WidgetCard>
        </div>
      </div>
    </div>
  );
}

// ==================== 1.2 WORKLOAD WEIGHTING ====================
function WorkloadWeighting() {
  const [overtimePenalty, setOvertimePenalty] = useState(85);
  const [idlePenalty, setIdlePenalty] = useState(60);
  const [skillMismatch, setSkillMismatch] = useState(70);
  const [deadlinePenalty, setDeadlinePenalty] = useState(90);

  return (
    <div>
      <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400 mb-3">
        AI Operations <span className="mx-1.5">/</span> Genetic Algorithm Tuning <span className="mx-1.5">/</span> <span className="text-neutral-700">Workload Weighting</span>
      </div>
      <PageHeader title="Workload Distribution Weights">
        <ActionButton variant="primary"><Play size={14} /> Run Weighting Simulation</ActionButton>
      </PageHeader>

      {/* Split-View */}
      <div className="flex gap-4 mb-5">
        {/* Left: Penalty Sliders */}
        <div className="w-[38%] shrink-0">
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="text-[12px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-700 mb-4 flex items-center gap-2">
              <Settings size={14} className="text-neutral-400" /> Penalty Weight Configuration
            </div>
            {[
              { label: "Overtime Penalty (>40h/week)", value: overtimePenalty, set: setOvertimePenalty, color: "accent-red-500" },
              { label: "Idle Time Penalty", value: idlePenalty, set: setIdlePenalty, color: "accent-amber-500" },
              { label: "Skill Mismatch Penalty", value: skillMismatch, set: setSkillMismatch, color: "accent-violet-600" },
              { label: "Deadline Proximity Weight", value: deadlinePenalty, set: setDeadlinePenalty, color: "accent-blue-500" },
            ].map(s => (
              <div key={s.label} className="mb-5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700">{s.label}</span>
                  <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-900">{s.value}%</span>
                </div>
                <input type="range" min={0} max={100} value={s.value} onChange={e => s.set(+e.target.value)} className={`w-full h-2 bg-neutral-100 rounded-lg appearance-none cursor-pointer ${s.color}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Right: Gantt-style timeline */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
              <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-800">Projected Team Allocation (This Week)</span>
              <span className="text-[10px] text-emerald-600 font-['Lexend:Medium',_sans-serif] font-medium">● Updates with slider changes</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100">
                  {["Employee", "Mon", "Tue", "Wed", "Thu", "Fri", "Total / Cap"].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[10px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ganttTasks.map(t => {
                  const total = t.mon + t.tue + t.wed + t.thu + t.fri;
                  const adjusted = Math.round(total * (1 - (overtimePenalty > 80 && total > 35 ? 0.15 : 0)));
                  const isOver = adjusted > 38;
                  return (
                    <tr key={t.employee} className="border-b border-neutral-50 hover:bg-neutral-50/50">
                      <td className="px-3 py-2.5 text-[12px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-900">{t.employee}</td>
                      {[t.mon, t.tue, t.wed, t.thu, t.fri].map((h, i) => (
                        <td key={i} className="px-3 py-2.5">
                          <div className="w-full h-5 bg-neutral-50 rounded overflow-hidden">
                            <div className={`h-full rounded ${h >= 8 ? "bg-red-200" : h >= 6 ? "bg-amber-200" : "bg-emerald-200"}`} style={{ width: `${(h / 8) * 100}%` }} />
                          </div>
                          <span className="text-[9px] font-mono text-neutral-500">{h}h</span>
                        </td>
                      ))}
                      <td className="px-3 py-2.5">
                        <span className={`text-[12px] font-mono ${isOver ? "text-red-600" : "text-neutral-700"}`}>{adjusted}h / {t.capacity}h</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Comparative Bar Chart */}
      <WidgetCard title="PROJECTED VS HISTORICAL AVERAGE IDLE TIME (HOURS/WEEK)">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={idleTimeComparison}>
            <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis key="xaxis" dataKey="dept" tick={{ fontSize: 10 }} />
            <YAxis key="yaxis" tick={{ fontSize: 10 }} />
            <Tooltip key="tooltip" contentStyle={{ fontSize: 11 }} />
            <Legend key="legend" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
            <Bar key="projected" dataKey="projected" fill="#6366f1" radius={[4, 4, 0, 0]} name="Projected Idle Time" />
            <Bar key="historical" dataKey="historical" fill="#d4d4d4" radius={[4, 4, 0, 0]} name="Historical Idle Time" />
          </BarChart>
        </ResponsiveContainer>
      </WidgetCard>
    </div>
  );
}

// ==================== 1.3 COMPETENCY MAPPING ====================
function CompetencyMapping() {
  const [drawerSkill, setDrawerSkill] = useState<null | { skill: string; employees: { name: string; proficiency: string }[] }>(null);

  return (
    <div>
      <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400 mb-3">
        AI Operations <span className="mx-1.5">/</span> Genetic Algorithm Tuning <span className="mx-1.5">/</span> <span className="text-neutral-700">Competency Mapping</span>
      </div>
      <PageHeader title="LGU Competency Matrix">
        <ActionButton><Upload size={14} /> Import HR Data</ActionButton>
        <ActionButton variant="primary"><Add size={14} /> Add Skill Tag</ActionButton>
      </PageHeader>

      <div className="flex gap-4 mb-5">
        {/* Kanban by Dept */}
        <div className="flex-1 min-w-0">
          <div className="flex gap-3">
            {Object.entries(competencyDepts).map(([dept, skills]) => (
              <div key={dept} className="flex-1 bg-neutral-50 rounded-xl border border-neutral-200 border-t-4 border-t-violet-400 overflow-hidden">
                <div className="px-3 py-2.5 flex items-center justify-between">
                  <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-700">{dept}</span>
                  <span className="text-[11px] bg-neutral-200 text-neutral-600 rounded-full px-2 py-0.5">{skills.length}</span>
                </div>
                <div className="px-2 pb-2 flex flex-col gap-2">
                  {skills.map(skill => (
                    <div
                      key={skill.skill}
                      onClick={() => setDrawerSkill(skill)}
                      className="bg-white rounded-lg border border-neutral-200 p-3 cursor-pointer hover:shadow-md transition-all"
                    >
                      <div className="text-[12px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-900 mb-1">{skill.skill}</div>
                      <div className="flex items-center gap-1">
                        <User size={12} className="text-neutral-400" />
                        <span className="text-[10px] text-neutral-500">{skill.employees.length} employees</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Donut Chart */}
      <WidgetCard title="SKILL DISTRIBUTION ACROSS LGU WORKFORCE">
        <div className="flex items-center gap-8">
          <PieChart width={180} height={180}>
            <Pie key="skillPie" data={skillDistData} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={2} dataKey="value">
              {skillDistData.map(e => <Cell key={`skill-${e.name}`} fill={e.color} />)}
            </Pie>
            <Tooltip key="tooltip" contentStyle={{ fontSize: 10 }} />
          </PieChart>
          <div className="flex flex-col gap-2">
            {skillDistData.map(e => (
              <div key={e.name} className="flex items-center gap-2">
                <div className="size-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{e.name}</span>
                <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-800 ml-auto">{e.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </WidgetCard>

      {/* Drawer */}
      {drawerSkill && (
        <div className="fixed inset-0 bg-black/30 z-50 flex justify-end" onClick={() => setDrawerSkill(null)}>
          <div className="bg-white w-[400px] h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <div className="text-[10px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider mb-1">Skill Detail</div>
                <div className="text-[16px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-900">{drawerSkill.skill}</div>
              </div>
              <button onClick={() => setDrawerSkill(null)} className="text-neutral-400 hover:text-neutral-600 cursor-pointer"><Close size={20} /></button>
            </div>
            <div className="px-6 py-5">
              <div className="text-[10px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider mb-3">Employees with this Skill</div>
              <div className="flex flex-col gap-3">
                {drawerSkill.employees.map(emp => (
                  <div key={emp.name} className="flex items-center justify-between bg-neutral-50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-full bg-neutral-200 flex items-center justify-center text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-600">
                        {emp.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <span className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-900">{emp.name}</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-['Lexend:Medium',_sans-serif] font-medium ${
                      emp.proficiency === "Expert" ? "bg-emerald-100 text-emerald-700" :
                      emp.proficiency === "Advanced" ? "bg-blue-100 text-blue-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>{emp.proficiency}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== 1.4 LOCAL OPTIMA PREVENTION ====================
function LocalOptimaPrevention() {
  const [mutProb, setMutProb] = useState(0.05);
  const [crossover, setCrossover] = useState("Single-point");
  const [tournamentSize, setTournamentSize] = useState(5);
  const [elitism, setElitism] = useState(0.1);

  const isFlatline = mutProb < 0.03;

  return (
    <div>
      <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400 mb-3">
        AI Operations <span className="mx-1.5">/</span> Genetic Algorithm Tuning <span className="mx-1.5">/</span> <span className="text-neutral-700">Local Optima Prevention</span>
      </div>
      <PageHeader title="Evolutionary Stagnation Controls">
        <ActionButton variant="primary"><Play size={14} /> Test Convergence</ActionButton>
      </PageHeader>

      {/* Settings Board */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 mb-5">
        <div className="text-[12px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-700 mb-4">Stagnation Prevention Parameters</div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700">Mutation Probability</span>
              <span className="text-[12px] font-mono text-neutral-900">{mutProb.toFixed(2)}</span>
            </div>
            <input type="range" min={0.01} max={0.10} step={0.01} value={mutProb} onChange={e => setMutProb(+e.target.value)} className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-violet-600" />
            <div className="flex justify-between mt-1"><span className="text-[9px] text-neutral-400">0.01</span><span className="text-[9px] text-neutral-400">0.10</span></div>
          </div>
          <div>
            <span className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700 block mb-1.5">Crossover Strategy</span>
            <select value={crossover} onChange={e => setCrossover(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-[12px] outline-none cursor-pointer bg-white">
              <option>Single-point</option>
              <option>Multi-point</option>
              <option>Uniform</option>
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700">Tournament Size</span>
              <span className="text-[12px] font-mono text-neutral-900">{tournamentSize}</span>
            </div>
            <input type="range" min={2} max={10} step={1} value={tournamentSize} onChange={e => setTournamentSize(+e.target.value)} className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-violet-600" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700">Elitism Rate</span>
              <span className="text-[12px] font-mono text-neutral-900">{elitism.toFixed(2)}</span>
            </div>
            <input type="range" min={0} max={0.2} step={0.01} value={elitism} onChange={e => setElitism(+e.target.value)} className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-violet-600" />
          </div>
        </div>
      </div>

      {/* Fitness Progression Chart */}
      <WidgetCard title="FITNESS PROGRESSION OVER 1,000 GENERATIONS">
        {isFlatline && (
          <div className="flex items-center gap-2 mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <div className="size-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[11px] text-amber-700 font-['Lexend:Medium',_sans-serif] font-medium">⚠ Potential stagnation detected — consider increasing mutation rate above 0.03</span>
          </div>
        )}
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={convergenceData}>
            <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#f5f5f5" />
            <XAxis key="xaxis" dataKey="gen" tick={{ fontSize: 9 }} label={{ value: "Generation", position: "insideBottom", offset: -4, fontSize: 9 }} />
            <YAxis key="yaxis" tick={{ fontSize: 9 }} domain={[0, 110]} />
            <Tooltip key="tooltip" contentStyle={{ fontSize: 10 }} />
            <Area key="avgFitness" type="monotone" dataKey="avgFitness" stroke="#c4b5fd" fill="#ede9fe" fillOpacity={0.4} strokeWidth={1.5} dot={false} name="Avg Population Fitness" />
            <Area key="fitness" type="monotone" dataKey="fitness" stroke={isFlatline ? "#f59e0b" : "#7c3aed"} fill={isFlatline ? "#fef3c7" : "#ede9fe"} fillOpacity={0.6} strokeWidth={2} dot={false} name="Best Fitness" />
          </AreaChart>
        </ResponsiveContainer>
      </WidgetCard>
    </div>
  );
}

// GA parent component that defaults to Fitness Function Variables
function GeneticAlgorithmTuning() {
  return <FitnessFunctionVariables />;
}

// ==================== 2.1 BURNOUT CLASSIFIERS ====================
const burnoutFeatures = [
  { name: "Cumulative Overtime Hours", weight: 0.34, drift: "Stable", synced: "2026-04-02 14:00" },
  { name: "Task Delay Count (30d)", weight: 0.22, drift: "Stable", synced: "2026-04-02 14:00" },
  { name: "Leave Credit Depletion Rate", weight: 0.18, drift: "Drifting", synced: "2026-04-01 09:30" },
  { name: "Response Latency (Avg)", weight: 0.12, drift: "Stable", synced: "2026-04-02 14:00" },
  { name: "Sentiment Score (NLP)", weight: 0.08, drift: "Stable", synced: "2026-04-02 12:15" },
  { name: "Weekend Login Frequency", weight: 0.06, drift: "Stable", synced: "2026-04-02 14:00" },
];

const rocData = Array.from({ length: 50 }, (_, i) => {
  const fpr = i / 49;
  const tpr = Math.min(1, Math.pow(fpr, 0.3) + (Math.random() - 0.5) * 0.03);
  return { fpr: +(fpr * 100).toFixed(1), tpr: +(tpr * 100).toFixed(1) };
});

const driftPills: Record<string, string> = {
  Stable: "bg-emerald-100 text-emerald-700",
  Warning: "bg-amber-100 text-amber-700",
  Drifting: "bg-red-100 text-red-700",
};

function BurnoutClassifiers() {
  return (
    <div>
      <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400 mb-3">
        AI Operations <span className="mx-1.5">/</span> Predictive Analytics Engine <span className="mx-1.5">/</span> <span className="text-neutral-700">Burnout Classifiers</span>
      </div>
      <PageHeader title="Burnout Risk Classifiers">
        <ActionButton variant="primary"><Renew size={14} /> Retrain Classifier Model</ActionButton>
        <ActionButton><View size={14} /> View Confusion Matrix</ActionButton>
      </PageHeader>

      {/* Feature List */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden mb-5">
        <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50/50">
          <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-800">Random Forest Input Features</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100">
              {["Feature Name", "Weight", "Data Drift Status", "Last Synced"].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {burnoutFeatures.map(f => (
              <tr key={f.name} className="border-b border-neutral-50 hover:bg-neutral-50/50">
                <td className="px-4 py-3 text-[12px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-900">{f.name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full" style={{ width: `${f.weight * 100}%` }} />
                    </div>
                    <span className="text-[11px] font-mono text-neutral-700">{(f.weight * 100).toFixed(0)}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-['Lexend:Medium',_sans-serif] font-medium ${driftPills[f.drift]}`}>{f.drift}</span>
                </td>
                <td className="px-4 py-3 text-[11px] font-mono text-neutral-500">{f.synced}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <WidgetCard title="ROC-AUC CURVE">
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={rocData}>
              <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#f5f5f5" />
              <XAxis key="xaxis" dataKey="fpr" tick={{ fontSize: 9 }} label={{ value: "False Positive Rate (%)", position: "insideBottom", offset: -4, fontSize: 9 }} />
              <YAxis key="yaxis" tick={{ fontSize: 9 }} domain={[0, 100]} label={{ value: "True Positive Rate (%)", angle: -90, position: "insideLeft", fontSize: 9 }} />
              <Tooltip key="tooltip" contentStyle={{ fontSize: 10 }} />
              <Line key="roc" type="monotone" dataKey="tpr" stroke="#7c3aed" strokeWidth={2} dot={false} name="ROC Curve" />
              <Line key="baseline" type="monotone" dataKey="fpr" stroke="#d4d4d4" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Random (baseline)" />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="text-center text-[11px] font-mono text-violet-600 mt-1">AUC = 0.94</div>
        </WidgetCard>

        <WidgetCard title="MODEL ACCURACY">
          <div className="flex items-center justify-center h-[250px]">
            <BatteryWidget label="Current Model Accuracy" value={88} />
          </div>
        </WidgetCard>
      </div>
    </div>
  );
}

// ==================== 2.2 PROJECT FORECASTING ====================
const projectForecasts = [
  { project: "Road Widening Phase 2", portfolio: "Infrastructure", status: "In Progress", aiDate: "2026-08-15", risk: "High" },
  { project: "Health Center Renovation", portfolio: "Healthcare", status: "In Progress", aiDate: "2026-06-20", risk: "Medium" },
  { project: "School Building Repair", portfolio: "Infrastructure", status: "Delayed", aiDate: "2026-09-30", risk: "High" },
  { project: "IT Equipment Procurement", portfolio: "Infrastructure", status: "On Track", aiDate: "2026-05-10", risk: "Low" },
  { project: "Disaster Relief Supplies", portfolio: "Healthcare", status: "On Track", aiDate: "2026-04-28", risk: "Low" },
  { project: "Tourism Center Construction", portfolio: "Infrastructure", status: "In Progress", aiDate: "2026-11-15", risk: "Medium" },
];

const scatterData = projectForecasts.map((p, i) => ({
  name: p.project,
  planned: 100 + i * 30 + Math.random() * 20,
  predicted: 100 + i * 30 + (p.risk === "High" ? 40 : p.risk === "Medium" ? 15 : 0) + Math.random() * 10,
  risk: p.risk,
}));

const riskPills: Record<string, string> = {
  High: "bg-red-100 text-red-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-emerald-100 text-emerald-700",
};

function ProjectForecasting() {
  return (
    <div>
      <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400 mb-3">
        AI Operations <span className="mx-1.5">/</span> Predictive Analytics Engine <span className="mx-1.5">/</span> <span className="text-neutral-700">Project Forecasting</span>
      </div>
      <PageHeader title="Timeline Prediction Models">
        <ActionButton variant="primary"><Play size={14} /> Run Global Forecast</ActionButton>
        <ActionButton><DocumentExport size={14} /> Export to Executive Dashboard</ActionButton>
      </PageHeader>

      {/* Forecasting Board */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden mb-5">
        <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50/50">
          <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-800">Active Project Forecasts</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100">
              {["Project", "Portfolio", "Current Status", "AI Predicted Completion", "Risk of Delay"].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projectForecasts.map(p => (
              <tr key={p.project} className="border-b border-neutral-50 hover:bg-neutral-50/50">
                <td className="px-4 py-3 text-[12px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-900">{p.project}</td>
                <td className="px-4 py-3 text-[11px] text-neutral-600">{p.portfolio}</td>
                <td className="px-4 py-3"><StatusPill status={p.status === "On Track" ? "Healthy" : p.status === "In Progress" ? "Active" : "Warning"} /></td>
                <td className="px-4 py-3 text-[12px] font-mono text-neutral-700">{p.aiDate}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-['Lexend:Medium',_sans-serif] font-medium ${riskPills[p.risk]}`}>{p.risk}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Scatter Plot */}
      <WidgetCard title="PLANNED VS AI-PREDICTED DELIVERY (DAYS FROM START)">
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart>
            <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#f5f5f5" />
            <XAxis key="xaxis" dataKey="planned" name="Planned" tick={{ fontSize: 9 }} label={{ value: "Planned Delivery (Days)", position: "insideBottom", offset: -4, fontSize: 9 }} />
            <YAxis key="yaxis" dataKey="predicted" name="Predicted" tick={{ fontSize: 9 }} label={{ value: "AI Predicted (Days)", angle: -90, position: "insideLeft", fontSize: 9 }} />
            <Tooltip key="tooltip" contentStyle={{ fontSize: 10 }} />
            <Scatter key="projects" data={scatterData} fill="#6366f1" name="Projects">
              {scatterData.map((d, i) => (
                <Cell key={`scatter-${i}`} fill={d.risk === "High" ? "#ef4444" : d.risk === "Medium" ? "#f59e0b" : "#10b981"} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 justify-center">
          {[{ label: "High Risk", color: "#ef4444" }, { label: "Medium Risk", color: "#f59e0b" }, { label: "Low Risk", color: "#10b981" }].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-full" style={{ backgroundColor: l.color }} />
              <span className="text-[10px] text-neutral-500">{l.label}</span>
            </div>
          ))}
        </div>
      </WidgetCard>
    </div>
  );
}

// ==================== 2.3 CONFIDENCE INTERVALS ====================
const confidenceData = Array.from({ length: 20 }, (_, i) => ({
  month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i % 12],
  prediction: 72 + Math.sin(i * 0.4) * 8,
  upper: 72 + Math.sin(i * 0.4) * 8 + 6 + Math.random() * 3,
  lower: 72 + Math.sin(i * 0.4) * 8 - 6 - Math.random() * 3,
}));

function ConfidenceIntervals() {
  const [threshold, setThreshold] = useState(75);
  const [errorMargin, setErrorMargin] = useState(5);

  return (
    <div>
      <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400 mb-3">
        AI Operations <span className="mx-1.5">/</span> Predictive Analytics Engine <span className="mx-1.5">/</span> <span className="text-neutral-700">Confidence Intervals</span>
      </div>
      <PageHeader title="Model Confidence Thresholds">
        <ActionButton variant="primary"><Settings size={14} /> Adjust Error Margins</ActionButton>
      </PageHeader>

      {/* Threshold Configuration */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 mb-5">
        <div className="text-[12px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-700 mb-4">Threshold Configuration</div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700">Minimum Confidence Threshold</span>
              <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-violet-600">{threshold}%</span>
            </div>
            <input type="range" min={50} max={95} step={1} value={threshold} onChange={e => setThreshold(+e.target.value)} className="w-full h-2 bg-violet-100 rounded-lg appearance-none cursor-pointer accent-violet-600" />
            <p className="text-[10px] text-neutral-500 mt-1.5">Predictions below this threshold will be flagged for human validation</p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700">Acceptable Error Margin</span>
              <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-blue-600">±{errorMargin}%</span>
            </div>
            <input type="range" min={1} max={15} step={1} value={errorMargin} onChange={e => setErrorMargin(+e.target.value)} className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
            <p className="text-[10px] text-neutral-500 mt-1.5">Defines the width of confidence bands in forecasting charts</p>
          </div>
        </div>
      </div>

      {/* Confidence Band Chart */}
      <WidgetCard title="BUDGET OVERRUN PREDICTION — CONFIDENCE BAND (12 MONTHS)">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={confidenceData}>
            <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#f5f5f5" />
            <XAxis key="xaxis" dataKey="month" tick={{ fontSize: 9 }} />
            <YAxis key="yaxis" tick={{ fontSize: 9 }} domain={[50, 100]} label={{ value: "Budget Risk %", angle: -90, position: "insideLeft", fontSize: 9 }} />
            <Tooltip key="tooltip" contentStyle={{ fontSize: 10 }} />
            <Area key="upper" type="monotone" dataKey="upper" stroke="none" fill="#c7d2fe" fillOpacity={0.3} name="Upper 95% CI" />
            <Area key="lower" type="monotone" dataKey="lower" stroke="none" fill="#ffffff" fillOpacity={1} name="Lower 95% CI" />
            <Line key="prediction" type="monotone" dataKey="prediction" stroke="#6366f1" strokeWidth={2} dot={false} name="Prediction" />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="text-[10px] text-neutral-500 text-center mt-2">Translucent shading represents the statistical margin of error</div>
      </WidgetCard>
    </div>
  );
}

// ==================== 2.4 FEATURE IMPORTANCE ====================
const featureImportance = [
  { name: "Unliquidated Cash Advances", impact: 92, direction: "Positive" },
  { name: "Procurement Processing Time", impact: 87, direction: "Positive" },
  { name: "Cumulative Overtime Hours", impact: 81, direction: "Positive" },
  { name: "Budget Utilization Rate", impact: 76, direction: "Negative" },
  { name: "Team Size Ratio", impact: 68, direction: "Negative" },
  { name: "Historical Project Velocity", impact: 64, direction: "Negative" },
  { name: "Supplier Response Rate", impact: 58, direction: "Positive" },
  { name: "BAC Review Duration", impact: 52, direction: "Positive" },
  { name: "Scope Change Frequency", impact: 45, direction: "Positive" },
  { name: "Department Workload Index", impact: 38, direction: "Positive" },
];

function FeatureImportance() {
  return (
    <div>
      <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400 mb-3">
        AI Operations <span className="mx-1.5">/</span> Predictive Analytics Engine <span className="mx-1.5">/</span> <span className="text-neutral-700">Feature Importance</span>
      </div>
      <PageHeader title="Predictive Feature Analysis">
        <ActionButton variant="primary"><Renew size={14} /> Recalculate Weights</ActionButton>
      </PageHeader>

      {/* Ranked Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden mb-5">
        <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
          <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-800">Explainable AI Overlay — Feature Rankings</span>
          <span className="text-[10px] text-neutral-400">Top 10 influential features</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100">
              {["#", "Feature Name", "Impact Score", "Correlation Direction"].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {featureImportance.map((f, i) => (
              <tr key={f.name} className="border-b border-neutral-50 hover:bg-neutral-50/50">
                <td className="px-4 py-3 text-[12px] font-mono text-neutral-400">{i + 1}</td>
                <td className="px-4 py-3 text-[12px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-900">{f.name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-3 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${f.impact}%` }} />
                    </div>
                    <span className="text-[11px] font-mono text-neutral-700">{f.impact}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-['Lexend:Medium',_sans-serif] font-medium ${
                    f.direction === "Positive" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                  }`}>{f.direction === "Positive" ? "↑ Positive" : "↓ Negative"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Horizontal Bar Chart */}
      <WidgetCard title="TOP 10 MOST INFLUENTIAL FEATURES">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={featureImportance} layout="vertical">
            <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#f5f5f5" />
            <XAxis key="xaxis" type="number" tick={{ fontSize: 9 }} domain={[0, 100]} />
            <YAxis key="yaxis" type="category" dataKey="name" tick={{ fontSize: 9 }} width={180} />
            <Tooltip key="tooltip" contentStyle={{ fontSize: 10 }} />
            <Bar key="impact" dataKey="impact" fill="#6366f1" radius={[0, 4, 4, 0]} name="Impact Score">
              {featureImportance.map((f, i) => (
                <Cell key={`fi-${i}`} fill={i === 0 ? "#ef4444" : "#6366f1"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {featureImportance[0] && (
          <div className="flex items-center gap-2 mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <Warning size={14} className="text-red-500" />
            <span className="text-[11px] text-red-700">"{featureImportance[0].name}" is currently the #1 driver of AI delay predictions</span>
          </div>
        )}
      </WidgetCard>
    </div>
  );
}

// Predictive Analytics parent - defaults to Burnout Classifiers
function PredictiveAnalyticsEngine() {
  return <BurnoutClassifiers />;
}

// ==================== 3.1 STAND-UP INGESTION ====================
const standUpKanban = {
  "Raw Input": [
    { id: "SU-101", avatar: "RM", name: "R. Magalona", snippet: "Naa mi sa site, ga-inspect sa drainage...", status: "Pending" },
    { id: "SU-102", avatar: "KR", name: "K. Reyes", snippet: "Boss, ang backer sa poste na-shear off...", status: "Failed" },
  ],
  "Entity Extraction": [
    { id: "SU-098", avatar: "JV", name: "J. Villanueva", snippet: "Wa pa abot ang materials para sa roofing...", status: "Processing" },
  ],
  "Summarized": [
    { id: "SU-095", avatar: "MT", name: "M. Tan", snippet: "Gin-check namon ang mga poste sa health center...", status: "Complete" },
    { id: "SU-094", avatar: "PS", name: "P. Santos", snippet: "Nagsugod na kami ug tanom sa mga punoan...", status: "Complete" },
    { id: "SU-093", avatar: "AF", name: "A. Fernandez", snippet: "Budget report ready for review...", status: "Complete" },
  ],
  "Failed Parsing": [
    { id: "SU-097", avatar: "LG", name: "L. Garcia", snippet: "Di ko magets unsay buot ipasabot...", status: "Failed" },
  ],
};

const dailyVolume = Array.from({ length: 14 }, (_, i) => ({
  day: `Mar ${20 + i}`,
  engineering: Math.floor(15 + Math.random() * 10),
  health: Math.floor(8 + Math.random() * 6),
  finance: Math.floor(5 + Math.random() * 5),
}));

const intentDistData = [
  { name: "Task Update", value: 60, color: "#6366f1" },
  { name: "Blocker Alert", value: 30, color: "#ef4444" },
  { name: "Clarification", value: 10, color: "#94a3b8" },
];

const kanbanStatusColors: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-700",
  Processing: "bg-blue-100 text-blue-700",
  Complete: "bg-emerald-100 text-emerald-700",
  Failed: "bg-red-100 text-red-700",
};

const kanbanColumnColors: Record<string, string> = {
  "Raw Input": "border-t-neutral-400",
  "Entity Extraction": "border-t-blue-400",
  "Summarized": "border-t-emerald-400",
  "Failed Parsing": "border-t-red-400",
};

function StandUpIngestion() {
  return (
    <div>
      <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400 mb-3">
        AI Operations <span className="mx-1.5">/</span> NLP Engine Diagnostics <span className="mx-1.5">/</span> <span className="text-neutral-700">Stand-Up Ingestion</span>
      </div>
      <PageHeader title="Daily Stand-Up Logs">
        <ActionButton variant="primary"><Renew size={14} /> Re-run Extraction Pipeline</ActionButton>
      </PageHeader>

      {/* Kanban Board */}
      <div className="flex gap-3 mb-5">
        {Object.entries(standUpKanban).map(([col, cards]) => (
          <div key={col} className={`flex-1 bg-neutral-50 rounded-xl border border-neutral-200 border-t-4 ${kanbanColumnColors[col]} overflow-hidden`}>
            <div className="px-3 py-2.5 flex items-center justify-between">
              <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-700">{col}</span>
              <span className="text-[11px] bg-neutral-200 text-neutral-600 rounded-full px-2 py-0.5">{cards.length}</span>
            </div>
            <div className="px-2 pb-2 flex flex-col gap-2">
              {cards.map(card => (
                <div key={card.id} className="bg-white rounded-lg border border-neutral-200 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="size-6 rounded-full bg-neutral-100 flex items-center justify-center text-[9px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-600">{card.avatar}</div>
                    <span className="text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-900">{card.name}</span>
                  </div>
                  <p className="text-[10px] text-neutral-600 italic line-clamp-2 mb-2">"{card.snippet}"</p>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-['Lexend:Medium',_sans-serif] font-medium ${kanbanStatusColors[card.status]}`}>{card.status}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <WidgetCard title="DAILY STAND-UP VOLUME BY DEPARTMENT">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailyVolume}>
              <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#f5f5f5" />
              <XAxis key="xaxis" dataKey="day" tick={{ fontSize: 9 }} />
              <YAxis key="yaxis" tick={{ fontSize: 9 }} />
              <Tooltip key="tooltip" contentStyle={{ fontSize: 10 }} />
              <Legend key="legend" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
              <Line key="eng" type="monotone" dataKey="engineering" stroke="#6366f1" strokeWidth={2} dot={{ r: 2 }} name="Engineering" />
              <Line key="health" type="monotone" dataKey="health" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} name="Health" />
              <Line key="fin" type="monotone" dataKey="finance" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} name="Finance" />
            </LineChart>
          </ResponsiveContainer>
        </WidgetCard>

        <WidgetCard title="IDENTIFIED INTENT DISTRIBUTION">
          <div className="flex items-center gap-6">
            <PieChart width={180} height={180}>
              <Pie key="intentPie" data={intentDistData} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={2} dataKey="value">
                {intentDistData.map(e => <Cell key={`intent-${e.name}`} fill={e.color} />)}
              </Pie>
              <Tooltip key="tooltip" contentStyle={{ fontSize: 10 }} />
            </PieChart>
            <div className="flex flex-col gap-2">
              {intentDistData.map(e => (
                <div key={e.name} className="flex items-center gap-2">
                  <div className="size-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                  <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{e.name}</span>
                  <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-800 ml-auto">{e.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </WidgetCard>
      </div>
    </div>
  );
}

// ==================== 3.2 VOICE-TO-TEXT PIPELINE ====================
const audioFiles = [
  { id: "AUD-301", worker: "R. Magalona", dept: "Engineering", duration: "0:08", raw: "Naa mi sa site, ga-inspect sa drainage system. Halos tapos na.", transcribed: "We are on site, inspecting the drainage system. Almost finished.", accuracy: 95 },
  { id: "AUD-299", worker: "M. Tan", dept: "Health Services", duration: "0:12", raw: "Gin-check namon ang mga poste sa health center, okay man tanan.", transcribed: "We checked the posts at the health center, everything is okay.", accuracy: 78 },
  { id: "AUD-297", worker: "P. Santos", dept: "Agriculture", duration: "0:15", raw: "Nagsugod na kami ug tanom sa mga punoan sa narra sa barangay road.", transcribed: "We have started planting narra trees along the barangay road.", accuracy: 91 },
  { id: "AUD-295", worker: "K. Reyes", dept: "Engineering", duration: "0:06", raw: "Boss, ang backer sa poste na-shear off. Unsay buhaton?", transcribed: "Boss, the backer on the post has sheared off. What should we do?", accuracy: 34 },
];

const oovData = Array.from({ length: 16 }, (_, i) => ({
  week: `W${i + 1}`,
  oov: i < 12 ? Math.max(2, 8 - i * 0.3 + Math.random() * 2) : 8 + (i - 12) * 3.5 + Math.random() * 2,
}));

function VoiceToTextPipeline() {
  const [selectedAudio, setSelectedAudio] = useState<typeof audioFiles[0] | null>(null);

  return (
    <div>
      <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400 mb-3">
        AI Operations <span className="mx-1.5">/</span> NLP Engine Diagnostics <span className="mx-1.5">/</span> <span className="text-neutral-700">Voice-to-Text Pipeline</span>
      </div>
      <PageHeader title="Audio Transcription Health">
        <ActionButton variant="primary"><Upload size={14} /> Update Regional Dialect Lexicon</ActionButton>
      </PageHeader>

      {/* Split-View */}
      <div className="flex gap-4 mb-5">
        {/* Left: Audio file list */}
        <div className="w-[40%] shrink-0">
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50/50">
              <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-800">Audio Files from Field Workers</span>
            </div>
            {audioFiles.map(a => (
              <div
                key={a.id}
                onClick={() => setSelectedAudio(a)}
                className={`px-4 py-3 border-b border-neutral-50 cursor-pointer transition-colors ${selectedAudio?.id === a.id ? "bg-violet-50" : "hover:bg-neutral-50"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Microphone size={12} className="text-violet-500" />
                  <span className="text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-900">{a.worker}</span>
                  <span className="text-[10px] text-neutral-400">{a.dept}</span>
                  <span className="ml-auto text-[10px] font-mono text-neutral-400">{a.duration}</span>
                </div>
                <div className="flex items-center gap-0.5 ml-5">
                  {Array.from({ length: 16 }, (_, i) => (
                    <div key={i} className="w-0.5 bg-violet-300 rounded-full" style={{ height: `${3 + Math.random() * 8}px` }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Audio detail / transcription */}
        <div className="flex-1 min-w-0">
          {selectedAudio ? (
            <div className="bg-white rounded-xl border border-neutral-200 p-5">
              <div className="text-[12px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-700 mb-4">{selectedAudio.id} — {selectedAudio.worker}</div>

              {/* Mock audio player */}
              <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200 mb-4">
                <div className="flex items-center gap-3">
                  <button className="size-8 rounded-full bg-violet-500 flex items-center justify-center cursor-pointer"><Play size={14} className="text-white ml-0.5" /></button>
                  <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full w-[65%]" />
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500">{selectedAudio.duration}</span>
                </div>
              </div>

              {/* Raw Text */}
              <div className="mb-4">
                <div className="text-[10px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider mb-1">AI Raw Transcription</div>
                <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200 text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-800">{selectedAudio.transcribed}</div>
              </div>

              {/* Editable correction */}
              <div>
                <div className="text-[10px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider mb-1">Manual Correction (feeds back to model)</div>
                <textarea
                  defaultValue={selectedAudio.transcribed}
                  className="w-full bg-white rounded-lg p-3 border border-neutral-200 text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-800 outline-none focus:border-violet-400 resize-none"
                  rows={3}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-neutral-500">Original dialect: "{selectedAudio.raw}"</span>
                  <ActionButton variant="primary"><Save size={14} /> Submit Correction</ActionButton>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-neutral-200 p-12 flex items-center justify-center text-neutral-400">
              <div className="text-center">
                <Microphone size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-[12px]">Select an audio file to view transcription</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <WidgetCard title="TRANSCRIPTION ACCURACY">
          <div className="flex items-center justify-center py-4">
            <GaugeWidget value={96.2} label="Target: >95%" color="#10b981" />
          </div>
        </WidgetCard>

        <WidgetCard title="OUT-OF-VOCABULARY (OOV) WORDS OVER TIME">
          <div className="flex items-center gap-2 mb-2">
            <div className="size-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] text-red-600 font-['Lexend:Medium',_sans-serif] font-medium">OOV spike detected — dialect model retraining recommended</span>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={oovData}>
              <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#f5f5f5" />
              <XAxis key="xaxis" dataKey="week" tick={{ fontSize: 9 }} />
              <YAxis key="yaxis" tick={{ fontSize: 9 }} label={{ value: "OOV %", angle: -90, position: "insideLeft", fontSize: 9 }} />
              <Tooltip key="tooltip" contentStyle={{ fontSize: 10 }} />
              <Line key="oov" type="monotone" dataKey="oov" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} name="OOV Rate %" />
            </LineChart>
          </ResponsiveContainer>
        </WidgetCard>
      </div>
    </div>
  );
}

// ==================== 3.3 VIBER CHATBOT HEALTH ====================
const viberEndpoints = [
  { endpoint: "/webhook/inbound", uptime: "99.97%", latency: 45, payloadSize: "1.2 KB", status: "Healthy" },
  { endpoint: "/webhook/outbound", uptime: "99.92%", latency: 68, payloadSize: "2.1 KB", status: "Healthy" },
  { endpoint: "/api/send-message", uptime: "99.85%", latency: 124, payloadSize: "3.4 KB", status: "Warning" },
  { endpoint: "/api/user-lookup", uptime: "99.99%", latency: 32, payloadSize: "0.8 KB", status: "Healthy" },
  { endpoint: "/webhook/delivery-receipt", uptime: "98.50%", latency: 312, payloadSize: "0.5 KB", status: "Down" },
];

const trafficData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, "0")}:00`,
  incoming: Math.floor(20 + Math.sin(i * 0.5) * 15 + Math.random() * 10),
  outgoing: Math.floor(15 + Math.sin(i * 0.5) * 10 + Math.random() * 8),
}));

const viberStatusPills: Record<string, string> = {
  Healthy: "bg-emerald-100 text-emerald-700",
  Warning: "bg-amber-100 text-amber-700",
  Down: "bg-red-100 text-red-700",
};

function ViberChatbotHealth() {
  return (
    <div>
      <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400 mb-3">
        AI Operations <span className="mx-1.5">/</span> NLP Engine Diagnostics <span className="mx-1.5">/</span> <span className="text-neutral-700">Viber Chatbot Health</span>
      </div>
      <PageHeader title="Viber Integration Status">
        <ActionButton><Play size={14} /> Test Webhook</ActionButton>
        <ActionButton variant="primary"><View size={14} /> View API Logs</ActionButton>
      </PageHeader>

      {/* Monitoring Board */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden mb-5">
        <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50/50">
          <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-800">API Endpoint Monitoring</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100">
              {["Endpoint", "Uptime", "Avg Latency", "Payload Size", "Status"].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {viberEndpoints.map(ep => (
              <tr key={ep.endpoint} className="border-b border-neutral-50 hover:bg-neutral-50/50">
                <td className="px-4 py-3 text-[12px] font-mono text-neutral-900">{ep.endpoint}</td>
                <td className="px-4 py-3 text-[12px] font-mono text-neutral-700">{ep.uptime}</td>
                <td className="px-4 py-3">
                  <span className={`text-[12px] font-mono ${ep.latency > 200 ? "text-red-600" : ep.latency > 100 ? "text-amber-600" : "text-neutral-700"}`}>{ep.latency}ms</span>
                </td>
                <td className="px-4 py-3 text-[12px] font-mono text-neutral-600">{ep.payloadSize}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-['Lexend:Medium',_sans-serif] font-medium ${viberStatusPills[ep.status]}`}>{ep.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Traffic Graph */}
      <WidgetCard title="REAL-TIME MESSAGE TRAFFIC (LAST 24 HOURS)">
        <div className="flex items-center gap-4 mb-2">
          <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-blue-500 rounded" /><span className="text-[10px] text-neutral-500">Incoming Messages</span></div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-emerald-500 rounded" /><span className="text-[10px] text-neutral-500">Outgoing Replies</span></div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={trafficData}>
            <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#f5f5f5" />
            <XAxis key="xaxis" dataKey="hour" tick={{ fontSize: 9 }} />
            <YAxis key="yaxis" tick={{ fontSize: 9 }} />
            <Tooltip key="tooltip" contentStyle={{ fontSize: 10 }} />
            <Area key="incoming" type="monotone" dataKey="incoming" stroke="#3b82f6" fill="#dbeafe" fillOpacity={0.5} strokeWidth={2} name="Incoming" />
            <Area key="outgoing" type="monotone" dataKey="outgoing" stroke="#10b981" fill="#d1fae5" fillOpacity={0.5} strokeWidth={2} name="Outgoing" />
          </AreaChart>
        </ResponsiveContainer>
      </WidgetCard>
    </div>
  );
}

// NLP parent - defaults to Stand-Up Ingestion
function NLPEngineDiagnostics() {
  return <StandUpIngestion />;
}

// ==================== 3.1 LEDGER DIAGNOSTICS ====================
const ledgerRecords = [
  { height: 48291, time: "2026-04-02 14:21:03", dept: "Engineering", hash: "0xa3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9", verified: true },
  { height: 48290, time: "2026-04-02 14:18:47", dept: "Finance", hash: "0xb4c9d3e2f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0", verified: true },
  { height: 48289, time: "2026-04-02 14:15:12", dept: "HRMO", hash: "0xc5d0e4f3a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1", verified: true },
  { height: 48288, time: "2026-04-02 14:11:55", dept: "Health", hash: "0xd6e1f5a4b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2", verified: true },
  { height: 48287, time: "2026-04-02 14:08:30", dept: "Engineering", hash: "0xe7f2a6b5c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3", verified: true },
];

// Network graph as simple hex nodes
function NetworkGraph() {
  const nodes = [
    { x: 200, y: 80, label: "N1", active: true },
    { x: 340, y: 60, label: "N2", active: true },
    { x: 460, y: 100, label: "N3", active: true },
    { x: 130, y: 170, label: "N4", active: true },
    { x: 280, y: 160, label: "N5", active: true },
    { x: 420, y: 180, label: "N6", active: false },
    { x: 540, y: 150, label: "N7", active: true },
  ];
  const edges = [[0,1],[1,2],[0,3],[0,4],[1,4],[2,5],[2,6],[4,5],[3,4],[5,6]];

  return (
    <svg viewBox="0 0 660 240" className="w-full h-full">
      {edges.map(([a,b], i) => (
        <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} stroke="#d4d4d4" strokeWidth={1.5} />
      ))}
      {nodes.map((n, i) => (
        <g key={i}>
          <polygon
            points={hexPoints(n.x, n.y, 22)}
            fill={n.active ? "#ecfdf5" : "#fef2f2"}
            stroke={n.active ? "#10b981" : "#ef4444"}
            strokeWidth={2}
          />
          <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={10} fill={n.active ? "#065f46" : "#991b1b"} fontFamily="monospace">{n.label}</text>
        </g>
      ))}
    </svg>
  );
}

function hexPoints(cx: number, cy: number, r: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(" ");
}

function LedgerDiagnostics() {
  return (
    <div>
      <PageHeader title="Ledger Diagnostics">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input placeholder="Search block hash..." className="pl-8 pr-3 py-2 rounded-lg border border-neutral-200 text-[12px] w-48 font-['Lexend:Regular',_sans-serif] font-mono outline-none focus:border-neutral-400" />
        </div>
        <ActionButton><Download size={14} /> Export Snapshot</ActionButton>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <CounterWidget label="Avg Block Confirmation Time" value="2.4s" />
        <CounterWidget label="Active Network Nodes" value="15/16" unit="online" />
      </div>

      <WidgetCard title="CONSENSUS NETWORK GRAPH" className="mb-6">
        <div className="h-56">
          <NetworkGraph />
        </div>
      </WidgetCard>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-100">
          <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-700">Immutable Transaction Ledger</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100">
              {["Block Height", "Timestamp", "Department", "Transaction Hash", "Verified"].map((h) => (
                <th key={h} className="px-4 py-2 text-left text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ledgerRecords.map((r) => (
              <tr key={r.height} className="border-b border-neutral-50">
                <td className="px-4 py-2.5 text-[13px] font-mono text-neutral-900">{r.height}</td>
                <td className="px-4 py-2.5 text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{r.time}</td>
                <td className="px-4 py-2.5 text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700">{r.dept}</td>
                <td className="px-4 py-2.5 text-[11px] font-mono text-neutral-500 max-w-[200px] truncate">{r.hash}</td>
                <td className="px-4 py-2.5"><CheckmarkOutline size={16} className="text-emerald-500" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== 3.1.1 CONSENSUS HEALTH ====================
const consensusNodes = [
  { id: "N1", dept: "City Treasury", x: 200, y: 70, active: true, blocks: 4821, uptime: "99.98%" },
  { id: "N2", dept: "Mayor's Office", x: 360, y: 50, active: true, blocks: 4819, uptime: "99.95%" },
  { id: "N3", dept: "Engineering", x: 500, y: 90, active: true, blocks: 4821, uptime: "99.99%" },
  { id: "N4", dept: "Health Services", x: 130, y: 160, active: true, blocks: 4820, uptime: "99.92%" },
  { id: "N5", dept: "HRMO", x: 270, y: 155, active: true, blocks: 4821, uptime: "99.97%" },
  { id: "N6", dept: "City Planning", x: 420, y: 170, active: false, blocks: 4790, uptime: "96.40%" },
  { id: "N7", dept: "Finance & Budget", x: 550, y: 140, active: true, blocks: 4821, uptime: "99.96%" },
  { id: "N8", dept: "Social Welfare", x: 160, y: 70, active: true, blocks: 4821, uptime: "99.94%" },
  { id: "N9", dept: "Legal Office", x: 320, y: 120, active: true, blocks: 4818, uptime: "99.88%" },
  { id: "N10", dept: "City Admin", x: 470, y: 45, active: true, blocks: 4821, uptime: "99.99%" },
  { id: "N11", dept: "Assessor's Office", x: 80, y: 120, active: true, blocks: 4821, uptime: "99.93%" },
  { id: "N12", dept: "Tourism Office", x: 590, y: 60, active: true, blocks: 4821, uptime: "99.91%" },
  { id: "N13", dept: "Agriculture", x: 450, y: 130, active: true, blocks: 4820, uptime: "99.90%" },
  { id: "N14", dept: "Market Operations", x: 230, y: 130, active: true, blocks: 4821, uptime: "99.96%" },
  { id: "N15", dept: "Environment Office", x: 370, y: 170, active: true, blocks: 4821, uptime: "99.94%" },
  { id: "N16", dept: "Disaster Risk", x: 530, y: 175, active: true, blocks: 4819, uptime: "99.89%" },
];
const consensusEdges = [[0,1],[1,2],[0,3],[0,4],[1,4],[2,5],[2,6],[4,5],[3,4],[5,6],[0,7],[7,3],[7,10],[1,9],[9,4],[2,12],[6,11],[5,15],[3,13],[8,4],[8,9],[10,3],[11,2],[12,13],[13,5],[14,15],[6,15],[12,6]];

const blockValidationData = [
  { name: "Treasury", value: 18, color: "#7c3aed" },
  { name: "Engineering", value: 15, color: "#3b82f6" },
  { name: "Finance", value: 14, color: "#10b981" },
  { name: "Mayor's Office", value: 12, color: "#f59e0b" },
  { name: "HRMO", value: 11, color: "#6366f1" },
  { name: "Health", value: 10, color: "#ec4899" },
  { name: "Planning", value: 8, color: "#94a3b8" },
  { name: "Others", value: 12, color: "#d4d4d8" },
];

function ConsensusHealth() {
  const [selectedNode, setSelectedNode] = useState<typeof consensusNodes[0] | null>(null);
  const [filterDept, setFilterDept] = useState("All");

  const activeCount = consensusNodes.filter(n => n.active).length;
  const totalCount = consensusNodes.length;
  const batteryPercent = Math.round((activeCount / totalCount) * 100);

  return (
    <div>
      <PageHeader title="Network Consensus Monitoring">
        <ActionButton variant="primary"><Renew size={14} /> Run Diagnostics</ActionButton>
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="px-3 py-2 rounded-lg border border-neutral-200 text-[12px] font-['Lexend:Regular',_sans-serif] outline-none focus:border-neutral-400 cursor-pointer"
        >
          <option value="All">Filter by Department Node</option>
          {consensusNodes.map(n => <option key={n.id} value={n.dept}>{n.dept}</option>)}
        </select>
      </PageHeader>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <WidgetCard title="CONSENSUS BATTERY">
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-10 border-2 border-neutral-300 rounded-lg overflow-hidden">
              <div className={`absolute inset-y-0 left-0 ${batteryPercent === 100 ? 'bg-emerald-500' : batteryPercent > 80 ? 'bg-emerald-400' : 'bg-amber-500'} transition-all`} style={{ width: `${batteryPercent}%` }} />
              <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-1.5 h-4 bg-neutral-300 rounded-r" />
            </div>
            <div>
              <div className="text-[22px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-900">{activeCount}/{totalCount}</div>
              <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">Nodes Synchronized</div>
            </div>
          </div>
        </WidgetCard>
        <CounterWidget label="Current Block Height" value="#48,291" />
        <CounterWidget label="Network Uptime" value="99.94%" unit="avg" />
      </div>

      <WidgetCard title="DEPARTMENT NODE NETWORK" className="mb-6">
        <div className="h-64 relative">
          <svg viewBox="0 0 660 220" className="w-full h-full">
            {consensusEdges.map(([a, b], i) => {
              if (!consensusNodes[a] || !consensusNodes[b]) return null;
              const na = consensusNodes[a], nb = consensusNodes[b];
              const bothActive = na.active && nb.active;
              return (
                <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                  stroke={bothActive ? "#d4d4d8" : "#fca5a5"} strokeWidth={bothActive ? 1.2 : 1.5}
                  strokeDasharray={bothActive ? "none" : "4,3"} opacity={0.7}
                />
              );
            })}
            {consensusNodes.map((n) => {
              const filtered = filterDept !== "All" && n.dept !== filterDept;
              return (
                <g key={n.id} className="cursor-pointer" onClick={() => setSelectedNode(n)} opacity={filtered ? 0.25 : 1}>
                  {n.active && !filtered && (
                    <circle cx={n.x} cy={n.y} r={26} fill={n.active ? "#10b981" : "#ef4444"} opacity={0.08}>
                      <animate attributeName="r" values="24;28;24" dur="3s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.08;0.15;0.08" dur="3s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <polygon points={hexPoints(n.x, n.y, 20)} fill={n.active ? "#ecfdf5" : "#fef2f2"} stroke={n.active ? "#10b981" : "#ef4444"} strokeWidth={2} />
                  <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={8} fill={n.active ? "#065f46" : "#991b1b"} fontFamily="monospace">{n.id}</text>
                </g>
              );
            })}
          </svg>
          {selectedNode && (
            <div className="absolute top-2 right-2 bg-white border border-neutral-200 rounded-xl p-4 shadow-lg w-64">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-900">{selectedNode.dept}</span>
                <button onClick={() => setSelectedNode(null)} className="cursor-pointer"><Close size={14} className="text-neutral-400" /></button>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between"><span className="text-[11px] text-neutral-500">Node ID</span><span className="text-[11px] font-mono text-neutral-900">{selectedNode.id}</span></div>
                <div className="flex justify-between"><span className="text-[11px] text-neutral-500">Status</span><StatusPill status={selectedNode.active ? "Healthy" : "Critical"} /></div>
                <div className="flex justify-between"><span className="text-[11px] text-neutral-500">Blocks Validated</span><span className="text-[11px] font-mono text-neutral-900">{selectedNode.blocks.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-[11px] text-neutral-500">Uptime</span><span className="text-[11px] font-mono text-neutral-900">{selectedNode.uptime}</span></div>
              </div>
            </div>
          )}
        </div>
      </WidgetCard>

      <WidgetCard title="BLOCK VALIDATION DISTRIBUTION">
        <div className="flex items-center gap-8">
          <PieChart width={200} height={180}>
            <Pie key="blockValPie" data={blockValidationData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={2}>
              {blockValidationData.map((e) => <Cell key={`blockval-${e.name}`} fill={e.color} />)}
            </Pie>
            <Tooltip key="blockValTooltip" contentStyle={{ fontSize: 11, fontFamily: "Lexend, sans-serif" }} />
          </PieChart>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {blockValidationData.map((r) => (
              <div key={r.name} className="flex items-center gap-2">
                <div className="size-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{r.name} ({r.value}%)</span>
              </div>
            ))}
          </div>
        </div>
      </WidgetCard>
    </div>
  );
}

// ==================== 3.1.2 BLOCK CONFIRMATION TIMES ====================
const confirmationTimeData = [
  { time: "14:00", avg: 1.8 }, { time: "14:05", avg: 2.1 }, { time: "14:10", avg: 2.0 },
  { time: "14:15", avg: 2.3 }, { time: "14:20", avg: 3.8 }, { time: "14:25", avg: 5.2 },
  { time: "14:30", avg: 4.1 }, { time: "14:35", avg: 2.6 }, { time: "14:40", avg: 2.2 },
  { time: "14:45", avg: 1.9 }, { time: "14:50", avg: 2.0 }, { time: "14:55", avg: 2.1 },
];

const blockConfirmations = [
  { height: "#89402", dept: "City Treasury", confirmTime: 1.2, status: "Fast" },
  { height: "#89401", dept: "Engineering", confirmTime: 2.4, status: "Normal" },
  { height: "#89400", dept: "Finance & Budget", confirmTime: 5.8, status: "Congested" },
  { height: "#89399", dept: "Mayor's Office", confirmTime: 1.8, status: "Fast" },
  { height: "#89398", dept: "HRMO", confirmTime: 2.1, status: "Normal" },
  { height: "#89397", dept: "Health Services", confirmTime: 3.2, status: "Normal" },
  { height: "#89396", dept: "City Planning", confirmTime: 6.1, status: "Congested" },
  { height: "#89395", dept: "Social Welfare", confirmTime: 1.5, status: "Fast" },
];

const confirmPillStyles: Record<string, string> = {
  Fast: "bg-emerald-100 text-emerald-700",
  Normal: "bg-blue-100 text-blue-700",
  Congested: "bg-red-100 text-red-700",
};

function BlockConfirmationTimes() {
  const [timeframe, setTimeframe] = useState(1);
  const currentTPS = 42;
  const maxTPS = 100;
  const tpsAngle = (currentTPS / maxTPS) * 180;

  return (
    <div>
      <PageHeader title="Transaction Throughput & Latency">
        <ActionButton><DocumentExport size={14} /> Export Speed Metrics</ActionButton>
        <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-lg px-3 py-1.5">
          <Time size={14} className="text-neutral-400" />
          <input type="range" min={1} max={3} value={timeframe} onChange={(e) => setTimeframe(+e.target.value)} className="w-28 accent-neutral-900 cursor-pointer" />
          <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600 w-14 text-right">
            {timeframe === 1 ? "1 Hour" : timeframe === 2 ? "24 Hrs" : "7 Days"}
          </span>
        </div>
      </PageHeader>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <CounterWidget label="Avg Confirmation Time" value="2.4s" />
        <CounterWidget label="Peak Latency (Today)" value="6.1s" unit="congested" />
        <WidgetCard title="CURRENT TPS">
          <div className="flex flex-col items-center">
            <svg viewBox="0 0 120 70" className="w-32 h-16">
              <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="#e5e5e5" strokeWidth={8} strokeLinecap="round" />
              <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke={currentTPS > 70 ? "#10b981" : currentTPS > 40 ? "#f59e0b" : "#ef4444"} strokeWidth={8} strokeLinecap="round" strokeDasharray={`${(tpsAngle / 180) * 157} 157`} />
              <line x1="60" y1="60" x2={60 + 40 * Math.cos(Math.PI - (tpsAngle * Math.PI) / 180)} y2={60 - 40 * Math.sin((tpsAngle * Math.PI) / 180)} stroke="#171717" strokeWidth={2} strokeLinecap="round" />
              <circle cx="60" cy="60" r="3" fill="#171717" />
              <text x="60" y="55" textAnchor="middle" fontSize="14" fill="#171717" className="font-['Lexend:SemiBold',_sans-serif]">{currentTPS}</text>
            </svg>
            <span className="text-[11px] text-neutral-500 mt-1">{currentTPS} TPS / {maxTPS} max</span>
          </div>
        </WidgetCard>
      </div>

      <WidgetCard title="AVERAGE CONFIRMATION TIME (REAL-TIME)" className="mb-6">
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={confirmationTimeData}>
              <defs>
                <linearGradient id="confirmGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid key="cg" strokeDasharray="3 3" stroke="#f5f5f5" />
              <XAxis key="xa" dataKey="time" tick={{ fontSize: 10, fill: "#a3a3a3" }} />
              <YAxis key="ya" tick={{ fontSize: 10, fill: "#a3a3a3" }} unit="s" />
              <Tooltip key="tt" contentStyle={{ fontSize: 11, fontFamily: "Lexend, sans-serif" }} />
              <Area key="ar" type="monotone" dataKey="avg" stroke="#6366f1" strokeWidth={2} fill="url(#confirmGrad)" dot={{ r: 3, fill: "#6366f1" }} activeDot={{ r: 5, fill: "#6366f1" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 text-[10px] font-['Lexend:Regular',_sans-serif] text-amber-600 flex items-center gap-1">
          <Warning size={12} /> Spike detected at 14:25 — possible network congestion from batch budget liquidations
        </div>
      </WidgetCard>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-100">
          <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-700">Recent Block Confirmations</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100">
              {["Block Height", "Processing Department", "Time to Confirm", "Network Status"].map(h => (
                <th key={h} className="px-4 py-2 text-left text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {blockConfirmations.map(b => (
              <tr key={b.height} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                <td className="px-4 py-2.5 text-[13px] font-mono text-neutral-900">{b.height}</td>
                <td className="px-4 py-2.5 text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700">{b.dept}</td>
                <td className="px-4 py-2.5 text-[13px] font-mono text-neutral-900">{b.confirmTime}s</td>
                <td className="px-4 py-2.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-['Lexend:Medium',_sans-serif] font-medium ${confirmPillStyles[b.status]}`}>{b.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== 3.1.3 NODE SYNCHRONIZATION ====================
const syncNodes: Record<string, Array<{ dept: string; ip: string; blockHeight: number; syncPercent?: number }>> = {
  "Fully Synced": [
    { dept: "City Treasury", ip: "10.0.1.11", blockHeight: 48291 },
    { dept: "Engineering", ip: "10.0.1.14", blockHeight: 48291 },
    { dept: "HRMO", ip: "10.0.1.17", blockHeight: 48291 },
    { dept: "Finance & Budget", ip: "10.0.1.12", blockHeight: 48291 },
    { dept: "Mayor's Office", ip: "10.0.1.10", blockHeight: 48291 },
    { dept: "Social Welfare", ip: "10.0.1.20", blockHeight: 48291 },
    { dept: "Legal Office", ip: "10.0.1.22", blockHeight: 48291 },
    { dept: "City Admin", ip: "10.0.1.13", blockHeight: 48291 },
    { dept: "Tourism Office", ip: "10.0.1.25", blockHeight: 48291 },
    { dept: "Agriculture", ip: "10.0.1.26", blockHeight: 48291 },
    { dept: "Environment Office", ip: "10.0.1.28", blockHeight: 48291 },
  ],
  "Syncing": [
    { dept: "Health Services", ip: "10.0.1.18", blockHeight: 48285, syncPercent: 88 },
    { dept: "Assessor's Office", ip: "10.0.1.23", blockHeight: 48287, syncPercent: 92 },
  ],
  "Lagging": [
    { dept: "City Planning", ip: "10.0.1.15", blockHeight: 48210, syncPercent: 43 },
    { dept: "Disaster Risk", ip: "10.0.1.30", blockHeight: 48250, syncPercent: 67 },
  ],
  "Disconnected": [
    { dept: "Market Operations", ip: "10.0.1.19", blockHeight: 48100 },
  ],
};

const kanbanColors: Record<string, string> = {
  "Fully Synced": "border-t-emerald-500",
  "Syncing": "border-t-blue-500",
  "Lagging": "border-t-amber-500",
  "Disconnected": "border-t-red-500",
};

function NodeSynchronization() {
  const currentHeight = 48291;

  return (
    <div>
      <PageHeader title="Ledger Sync Status">
        <ActionButton variant="primary"><Renew size={14} /> Force Node Resync</ActionButton>
      </PageHeader>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <CounterWidget label="Fully Synced" value={String(syncNodes["Fully Synced"].length)} />
        <CounterWidget label="Syncing" value={String(syncNodes["Syncing"].length)} />
        <CounterWidget label="Lagging" value={String(syncNodes["Lagging"].length)} />
        <CounterWidget label="Disconnected" value={String(syncNodes["Disconnected"].length)} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        {Object.entries(syncNodes).map(([status, nodes]) => (
          <div key={status} className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-700">{status}</span>
              <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400">{nodes.length}</span>
            </div>
            <div className="flex flex-col gap-2 min-h-[200px]">
              {nodes.map((node) => (
                <div key={node.dept} className={`bg-white rounded-xl border border-neutral-200 border-t-2 ${kanbanColors[status]} p-3`}>
                  <div className="text-[12px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-900 mb-1">{node.dept}</div>
                  <div className="text-[10px] font-mono text-neutral-400 mb-1">{node.ip}</div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">Block Height</span>
                    <span className="text-[10px] font-mono text-neutral-700">#{node.blockHeight.toLocaleString()}</span>
                  </div>
                  {node.syncPercent !== undefined && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-neutral-500">Sync Progress</span>
                        <span className="text-[10px] font-mono text-neutral-700">{node.syncPercent}%</span>
                      </div>
                      <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${node.syncPercent > 80 ? 'bg-blue-500' : node.syncPercent > 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${node.syncPercent}%` }} />
                      </div>
                      <div className="text-[9px] text-neutral-400 mt-1">{currentHeight - node.blockHeight} blocks behind</div>
                    </div>
                  )}
                  {status === "Disconnected" && (
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-red-500">
                      <Warning size={10} /> {currentHeight - node.blockHeight} blocks behind — Last seen 47m ago
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== 3.2 SMART CONTRACT MANAGEMENT ====================
const contractVersions = [
  { version: "v3.2.1", date: "2026-04-01", author: "Admin: J. Santos", change: "Updated max unliquidated advance to 30 days" },
  { version: "v3.2.0", date: "2026-03-15", author: "Admin: M. Cruz", change: "Added auto-return logic for expired funds" },
  { version: "v3.1.0", date: "2026-02-28", author: "Admin: J. Santos", change: "Multi-sig threshold changed to 3-of-5" },
  { version: "v3.0.0", date: "2026-01-10", author: "System", change: "Initial deployment of budget liquidation contracts" },
];

function SmartContractManagement() {
  const [maxDays, setMaxDays] = useState(30);
  const [autoReturn, setAutoReturn] = useState(true);
  const [multiSig, setMultiSig] = useState(3);

  return (
    <div>
      <PageHeader title="Smart Contract Management">
        <ActionButton variant="primary"><Security size={14} /> Deploy Update (Multi-Sig)</ActionButton>
        <ActionButton><View size={14} /> View Audit Trail</ActionButton>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <WidgetCard title="CONTRACT PARAMETERS">
          <div className="flex flex-col gap-5">
            <div>
              <label className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700 mb-1 block">Maximum Unliquidated Cash Advance Limit</label>
              <div className="flex items-center gap-3">
                <input type="number" value={maxDays} onChange={(e) => setMaxDays(+e.target.value)} className="w-20 px-3 py-2 rounded-lg border border-neutral-200 text-[13px] font-mono outline-none focus:border-neutral-400" />
                <span className="text-[12px] text-neutral-500">days</span>
              </div>
            </div>
            <div>
              <label className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700 mb-1 block">Auto-Return Expired Funds</label>
              <button
                onClick={() => setAutoReturn(!autoReturn)}
                className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${autoReturn ? "bg-emerald-500" : "bg-neutral-300"}`}
              >
                <div className={`size-5 bg-white rounded-full shadow transition-transform ${autoReturn ? "translate-x-6.5" : "translate-x-0.5"}`} />
              </button>
            </div>
            <div>
              <label className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700 mb-1 block">Multi-Signature Approval Threshold</label>
              <div className="flex items-center gap-3">
                <input type="number" value={multiSig} onChange={(e) => setMultiSig(+e.target.value)} min={1} max={5} className="w-20 px-3 py-2 rounded-lg border border-neutral-200 text-[13px] font-mono outline-none focus:border-neutral-400" />
                <span className="text-[12px] text-neutral-500">of 5 approvers required</span>
              </div>
            </div>
          </div>
        </WidgetCard>

        <WidgetCard title="DEPLOYMENT VERSION HISTORY">
          <div className="relative pl-4">
            <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-neutral-200" />
            {contractVersions.map((v, i) => (
              <div key={v.version} className="relative pl-5 pb-5 last:pb-0">
                <div className={`absolute left-0 top-1.5 size-3 rounded-full border-2 ${i === 0 ? "bg-violet-500 border-violet-500" : "bg-white border-neutral-300"}`} />
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-900">{v.version}</span>
                  <span className="text-[11px] text-neutral-400">{v.date}</span>
                </div>
                <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mb-0.5">{v.author}</div>
                <div className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700">{v.change}</div>
              </div>
            ))}
          </div>
        </WidgetCard>
      </div>
    </div>
  );
}

// ==================== 3.2.1 BUDGET ALLOCATION LOGIC ====================
const allocationRules = [
  { id: 1, name: "Phase Release Trigger", target: "Engineering", updated: "2026-04-01", status: "Active",
    template: "If [Project Phase] changes to [Implementation], automatically release [20%] of [Total Budget]" },
  { id: 2, name: "Emergency Fund Gate", target: "All Departments", updated: "2026-03-28", status: "Active",
    template: "If [Emergency Declaration] is [True], unlock [Emergency Reserve] up to [PHP 2M]" },
  { id: 3, name: "Quarterly Disbursement", target: "Health Services", updated: "2026-03-20", status: "Active",
    template: "If [Quarter End] is reached, release [25%] of [Annual Allocation]" },
  { id: 4, name: "Procurement Lock", target: "Finance & Budget", updated: "2026-03-15", status: "Deprecated",
    template: "If [Procurement Mode] is [Direct Contracting], cap at [PHP 50K]" },
  { id: 5, name: "Tourism Revenue Share", target: "Tourism Office", updated: "2026-04-01", status: "Pending Deployment",
    template: "If [Revenue Collected] exceeds [PHP 500K], redistribute [10%] to [Community Fund]" },
];

const multiSigApprovers = [
  { name: "City Administrator", initials: "CA", signed: true },
  { name: "City Treasurer", initials: "CT", signed: true },
  { name: "City Mayor", initials: "CM", signed: false },
  { name: "City Accountant", initials: "AC", signed: false },
  { name: "Budget Officer", initials: "BO", signed: false },
];

const allocationPillStyles: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  Deprecated: "bg-neutral-100 text-neutral-600",
  "Pending Deployment": "bg-amber-100 text-amber-700",
};

function BudgetAllocationLogic() {
  const [selectedPortfolio, setSelectedPortfolio] = useState("All");

  return (
    <div>
      <PageHeader title="Programmable Allocation Rules">
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] font-medium cursor-pointer transition-colors bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200">
          <Warning size={14} /> Propose Logic Update
        </button>
        <select value={selectedPortfolio} onChange={(e) => setSelectedPortfolio(e.target.value)} className="px-3 py-2 rounded-lg border border-neutral-200 text-[12px] font-['Lexend:Regular',_sans-serif] outline-none cursor-pointer">
          <option value="All">Target Portfolio: All</option>
          <option value="Engineering">Engineering</option>
          <option value="Health Services">Health Services</option>
          <option value="Tourism Office">Tourism Office</option>
        </select>
      </PageHeader>

      <WidgetCard title="MULTI-SIGNATURE DEPLOYMENT STATUS" className="mb-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            {multiSigApprovers.map(a => (
              <div key={a.initials} className="flex flex-col items-center gap-1">
                <div className={`size-10 rounded-full flex items-center justify-center text-[11px] font-['Lexend:Medium',_sans-serif] font-medium transition-all ${a.signed ? "bg-emerald-500 text-white border-2 border-emerald-500" : "bg-white text-neutral-400 border-2 border-dashed border-neutral-300"}`}>
                  {a.initials}
                </div>
                <span className="text-[9px] font-['Lexend:Regular',_sans-serif] text-neutral-500 max-w-[60px] text-center leading-tight">{a.name}</span>
              </div>
            ))}
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <div className="text-[12px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-700">2 of 5 signatures collected</div>
            <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">Contract update requires 3 signatures to execute. Waiting for CM, AC, or BO.</div>
            <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: "40%" }} />
            </div>
          </div>
        </div>
      </WidgetCard>

      <div className="flex flex-col gap-3">
        {allocationRules.filter(r => selectedPortfolio === "All" || r.target === selectedPortfolio).map(rule => (
          <div key={rule.id} className="bg-white rounded-xl border border-neutral-200 p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-900">{rule.name}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-['Lexend:Medium',_sans-serif] font-medium ${allocationPillStyles[rule.status]}`}>{rule.status}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400">Target: {rule.target}</span>
                <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400">{rule.updated}</span>
              </div>
            </div>
            <div className="bg-neutral-50 rounded-lg px-4 py-3 text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700">
              {rule.template.split(/(\[.*?\])/).map((part, i) => (
                part.startsWith("[") ? (
                  <span key={i} className="inline-flex items-center px-2 py-0.5 mx-0.5 bg-blue-100 text-blue-700 rounded text-[11px] font-['Lexend:Medium',_sans-serif] font-medium cursor-pointer hover:bg-blue-200 transition-colors">
                    {part.slice(1, -1)} <ChevronDown size={10} className="ml-0.5" />
                  </span>
                ) : <span key={i}>{part}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== 3.2.2 AUTOMATED FUND RETURNS ====================
const escrowContracts = [
  { leader: "Engr. Juan Santos", amount: 450000, deadline: "2026-04-15", daysLeft: 13, status: "Awaiting Liquidation", hash: "" },
  { leader: "Maria Cruz", amount: 280000, deadline: "2026-04-08", daysLeft: 6, status: "Awaiting Liquidation", hash: "" },
  { leader: "Pedro Reyes", amount: 120000, deadline: "2026-04-05", daysLeft: 3, status: "Awaiting Liquidation", hash: "" },
  { leader: "Ana Torres", amount: 95000, deadline: "2026-03-28", daysLeft: 0, status: "Funds Auto-Swept", hash: "0x7f2a9b8c3d4e5f6a1b2c3d4e5f6a7b8c9d0e1f2a" },
  { leader: "Carlos Lim", amount: 175000, deadline: "2026-03-25", daysLeft: 0, status: "Funds Auto-Swept", hash: "0x8a3b0c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b" },
  { leader: "Rosa Aquino", amount: 310000, deadline: "2026-03-20", daysLeft: 0, status: "Funds Auto-Swept", hash: "0x9b4c1d0e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c" },
];

const fundReturnPills: Record<string, string> = {
  "Awaiting Liquidation": "bg-amber-100 text-amber-700",
  "Funds Auto-Swept": "bg-emerald-100 text-emerald-700",
};

function AutomatedFundReturns() {
  const totalRecovered = escrowContracts.filter(c => c.status === "Funds Auto-Swept").reduce((sum, c) => sum + c.amount, 0);

  return (
    <div>
      <PageHeader title="Unliquidated Advance Recovery">
        <ActionButton variant="primary"><Renew size={14} /> Trigger Manual Sweep</ActionButton>
        <ActionButton><DocumentExport size={14} /> Export Return Logs to COA</ActionButton>
      </PageHeader>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <WidgetCard title="RECOVERED FUNDS THIS MONTH">
          <div className="text-center py-2">
            <div className="text-[28px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-emerald-600">PHP {totalRecovered.toLocaleString()}</div>
            <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-1">Auto-swept back to City Treasury</div>
          </div>
        </WidgetCard>
        <CounterWidget label="Active Escrow Contracts" value={String(escrowContracts.filter(c => c.status === "Awaiting Liquidation").length)} />
        <CounterWidget label="COA 30-Day Limit" value="30 days" unit="standard" />
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-100">
          <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-700">Active Escrow Contracts</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100">
              {["Project Leader", "Advance Amount", "Deadline", "Countdown", "Status", "Hash"].map(h => (
                <th key={h} className="px-4 py-2 text-left text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {escrowContracts.map((c, i) => (
              <tr key={i} className={`border-b border-neutral-50 transition-colors ${c.status === "Funds Auto-Swept" ? "bg-neutral-50/50" : "hover:bg-neutral-50/50"}`}>
                <td className="px-4 py-2.5 text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-900">{c.leader}</td>
                <td className="px-4 py-2.5 text-[13px] font-mono text-neutral-900">PHP {c.amount.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{c.deadline}</td>
                <td className="px-4 py-2.5">
                  {c.daysLeft > 0 ? (
                    <span className={`text-[12px] font-mono ${c.daysLeft <= 5 ? "text-red-600" : c.daysLeft <= 10 ? "text-amber-600" : "text-neutral-700"}`}>{c.daysLeft}d remaining</span>
                  ) : (
                    <span className="text-[12px] font-mono text-neutral-400">Expired</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-['Lexend:Medium',_sans-serif] font-medium ${fundReturnPills[c.status]}`}>{c.status}</span>
                </td>
                <td className="px-4 py-2.5">
                  {c.hash ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-mono text-neutral-400 max-w-[140px] truncate">{c.hash}</span>
                      <Copy size={10} className="text-neutral-400 cursor-pointer hover:text-neutral-600" />
                    </div>
                  ) : (
                    <span className="text-[10px] text-neutral-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== 3.2.3 AUDIT PARAMETERS ====================
const auditConstraints = [
  { id: 1, name: "Max Expense Variance", threshold: "5%", action: "Flag for Review", lastUpdated: "2026-04-01", updatedBy: "J. Santos" },
  { id: 2, name: "Single Transaction Ceiling", threshold: "PHP 500,000", action: "Block Transaction", lastUpdated: "2026-03-28", updatedBy: "M. Cruz" },
  { id: 3, name: "Procurement Bypass Detection", threshold: "Any", action: "Escalate to Legal", lastUpdated: "2026-03-25", updatedBy: "System" },
  { id: 4, name: "Cash Advance Overdue", threshold: "30 days", action: "Flag for Review", lastUpdated: "2026-03-20", updatedBy: "J. Santos" },
  { id: 5, name: "Budget Reallocation Limit", threshold: "10%", action: "Block Transaction", lastUpdated: "2026-03-18", updatedBy: "R. Aquino" },
  { id: 6, name: "Emergency Fund Access", threshold: "PHP 2,000,000", action: "Escalate to Legal", lastUpdated: "2026-03-15", updatedBy: "System" },
  { id: 7, name: "Duplicate Receipt Detection", threshold: "95% similarity", action: "Flag for Review", lastUpdated: "2026-03-10", updatedBy: "M. Cruz" },
];

const actionPillStyles: Record<string, string> = {
  "Flag for Review": "bg-amber-100 text-amber-700",
  "Block Transaction": "bg-red-100 text-red-700",
  "Escalate to Legal": "bg-violet-100 text-violet-700",
};

const parameterHistory = [
  { date: "2026-04-01", who: "Admin: J. Santos", param: "Max Expense Variance", from: "8%", to: "5%", hash: "0xabc123..." },
  { date: "2026-03-28", who: "Admin: M. Cruz", param: "Single Transaction Ceiling", from: "PHP 1,000,000", to: "PHP 500,000", hash: "0xdef456..." },
  { date: "2026-03-25", who: "System", param: "Procurement Bypass Detection", from: "Disabled", to: "Enabled", hash: "0xghi789..." },
  { date: "2026-03-20", who: "Admin: J. Santos", param: "Cash Advance Overdue", from: "45 days", to: "30 days", hash: "0xjkl012..." },
  { date: "2026-03-18", who: "Admin: R. Aquino", param: "Budget Reallocation Limit", from: "15%", to: "10%", hash: "0xmno345..." },
];

function AuditParameters() {
  const [showLineage, setShowLineage] = useState(false);

  return (
    <div>
      <PageHeader title="Cryptographic Audit Constraints">
        <ActionButton variant="primary"><Add size={14} /> Add New Constraint</ActionButton>
        <ActionButton onClick={() => setShowLineage(!showLineage)}>
          <Time size={14} /> {showLineage ? "Hide" : "View"} Parameter Lineage
        </ActionButton>
      </PageHeader>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden mb-6">
        <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-100">
          <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-700">Compliance Alert Triggers</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100">
              {["Parameter Name", "Threshold Limit", "Action", "Last Updated", "Updated By"].map(h => (
                <th key={h} className="px-4 py-2 text-left text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {auditConstraints.map(c => (
              <tr key={c.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors cursor-pointer">
                <td className="px-4 py-2.5 text-[12px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-900">{c.name}</td>
                <td className="px-4 py-2.5 text-[13px] font-mono text-neutral-700">{c.threshold}</td>
                <td className="px-4 py-2.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-['Lexend:Medium',_sans-serif] font-medium ${actionPillStyles[c.action]}`}>{c.action}</span>
                </td>
                <td className="px-4 py-2.5 text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{c.lastUpdated}</td>
                <td className="px-4 py-2.5 text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{c.updatedBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showLineage && (
        <WidgetCard title="PARAMETER VERSION LINEAGE">
          <div className="relative">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-100">
              <span className="text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-500">March 2026</span>
              <div className="flex-1 h-px bg-neutral-200" />
              <span className="text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-500">April 2026</span>
            </div>
            {parameterHistory.map((h, i) => (
              <div key={i} className="flex items-start gap-4 mb-4 last:mb-0">
                <div className="flex flex-col items-center pt-1">
                  <div className={`size-3 rounded-full border-2 ${i === 0 ? "bg-violet-500 border-violet-500" : "bg-white border-neutral-300"}`} />
                  {i < parameterHistory.length - 1 && <div className="w-0.5 h-12 bg-neutral-200 mt-1" />}
                </div>
                <div className="flex-1 bg-neutral-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-900">{h.param}</span>
                    <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-400">{h.date}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{h.who}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded font-mono">{h.from}</span>
                    <span className="text-neutral-400">-&gt;</span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded font-mono">{h.to}</span>
                    <span className="ml-auto text-[9px] font-mono text-neutral-400">{h.hash}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </WidgetCard>
      )}
    </div>
  );
}

// ==================== 4.1 GLOBAL RBAC CONFIGURATION (OVERVIEW) ====================

const roleDistribution = [
  { name: "Super Admin", value: 5, color: "#7c3aed" },
  { name: "Executive", value: 8, color: "#6366f1" },
  { name: "Legislative", value: 4, color: "#8b5cf6" },
  { name: "Dept Head", value: 15, color: "#3b82f6" },
  { name: "Project Leader", value: 12, color: "#10b981" },
  { name: "HRMO Staff", value: 6, color: "#f59e0b" },
  { name: "Regular Employee", value: 50, color: "#94a3b8" },
];

function GlobalRBACConfiguration() {
  return (
    <div>
      <PageHeader title="Global RBAC Configuration">
        <ActionButton variant="primary"><Add size={14} /> Create Custom Role</ActionButton>
        <ActionButton><Settings size={14} /> Edit Permissions</ActionButton>
        <ActionButton><Upload size={14} /> Bulk Assign Users</ActionButton>
      </PageHeader>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Active Users", value: "1,247" },
          { label: "Custom Roles Defined", value: "23" },
          { label: "Pending Role Requests", value: "8" },
          { label: "Avg. Permissions/User", value: "14.3" },
        ].map(m => <CounterWidget key={m.label} label={m.label} value={m.value} />)}
      </div>

      <WidgetCard title="ROLE DISTRIBUTION ACROSS CITY HALL" className="mb-6">
        <div className="flex items-center gap-8">
          <PieChart width={200} height={160}>
            <Pie key="rolePie" data={roleDistribution} cx="50%" cy="50%" outerRadius={70} dataKey="value">
              {roleDistribution.map((e) => <Cell key={`role-${e.name}`} fill={e.color} />)}
            </Pie>
            <Tooltip key="roleTooltip" contentStyle={{ fontSize: 11 }} />
          </PieChart>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {roleDistribution.map((r) => (
              <div key={r.name} className="flex items-center gap-2">
                <div className="size-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{r.name} ({r.value}%)</span>
              </div>
            ))}
          </div>
        </div>
      </WidgetCard>

      <div className="grid grid-cols-3 gap-4">
        <WidgetCard title="RECENT ROLE CHANGES">
          <div className="flex flex-col gap-3">
            {[
              { user: "Maria Cruz", from: "Staff", to: "Dept Head", time: "2h ago" },
              { user: "Pedro Reyes", from: "Regular", to: "Project Leader", time: "5h ago" },
              { user: "Ana Torres", from: "Intern", to: "HRMO Staff", time: "1d ago" },
            ].map(c => (
              <div key={c.user} className="flex items-center gap-3 py-2 border-b border-neutral-50 last:border-0">
                <div className="size-7 rounded-full bg-neutral-100 flex items-center justify-center text-[10px] font-medium text-neutral-600">{c.user.split(" ").map(n => n[0]).join("")}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-neutral-900 truncate">{c.user}</div>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded">{c.from}</span>
                    <span className="text-neutral-400">→</span>
                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded">{c.to}</span>
                  </div>
                </div>
                <span className="text-[10px] text-neutral-400">{c.time}</span>
              </div>
            ))}
          </div>
        </WidgetCard>
        <WidgetCard title="TOP PERMISSION GROUPS">
          <div className="flex flex-col gap-2">
            {[
              { group: "Budget Ledger Access", users: 342, level: "Read" },
              { group: "Project Portfolio Mgmt", users: 215, level: "Write" },
              { group: "HR Records (Sensitive)", users: 28, level: "Full Access" },
              { group: "System Configuration", users: 5, level: "Full Access" },
            ].map(g => (
              <div key={g.group} className="flex items-center gap-3 py-2 border-b border-neutral-50 last:border-0">
                <div className="flex-1">
                  <div className="text-[12px] text-neutral-900">{g.group}</div>
                  <div className="text-[10px] text-neutral-400">{g.users} users</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${g.level === "Full Access" ? "bg-red-100 text-red-700" : g.level === "Write" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{g.level}</span>
              </div>
            ))}
          </div>
        </WidgetCard>
        <WidgetCard title="SECURITY ALERTS">
          <div className="flex flex-col gap-2">
            {[
              { msg: "3 users with Full Access haven't logged in 30+ days", sev: "Critical" },
              { msg: "HRMO role inheritance updated successfully", sev: "Healthy" },
              { msg: "Bulk import of 45 new employee accounts completed", sev: "Healthy" },
              { msg: "Orphaned permission group detected: 'Legacy Admin'", sev: "Warning" },
            ].map((a, i) => (
              <div key={i} className="flex items-start gap-2 py-1.5">
                <div className={`size-2 rounded-full mt-1.5 shrink-0 ${a.sev === "Critical" ? "bg-red-500" : a.sev === "Warning" ? "bg-amber-500" : "bg-emerald-500"}`} />
                <span className="text-[11px] text-neutral-700">{a.msg}</span>
              </div>
            ))}
          </div>
        </WidgetCard>
      </div>
    </div>
  );
}

// ==================== 4.1.1 ROLE ASSIGNMENT ====================
const resourceRolesDirectory = [
  { name: "Full Access", code: "system-full-access", type: "Resource" as const, source: "Annotated Class" as const, scope: ["UI", "API"] },
  { name: "Basic Employee", code: "role-basic-employee", type: "Resource" as const, source: "Database" as const, scope: ["UI"] },
  { name: "Department Manager", code: "role-dept-manager", type: "Resource" as const, source: "Database" as const, scope: ["UI", "API"] },
  { name: "Project Leader", code: "role-project-leader", type: "Resource" as const, source: "Database" as const, scope: ["UI"] },
  { name: "Finance Read-Only", code: "role-finance-ro", type: "Resource" as const, source: "Database" as const, scope: ["UI", "API"] },
  { name: "HRMO Admin", code: "role-hrmo-admin", type: "Resource" as const, source: "Database" as const, scope: ["UI", "API"] },
  { name: "Audit Inspector", code: "role-audit-inspector", type: "Resource" as const, source: "Annotated Class" as const, scope: ["API"] },
  { name: "System Owner", code: "role-system-owner", type: "Resource" as const, source: "Database" as const, scope: ["UI", "API"] },
];

const entityPermissions = [
  { entity: "Customer", allowAll: false, create: true, read: true, update: true, delete: false },
  { entity: "Order", allowAll: false, create: true, read: true, update: false, delete: false },
  { entity: "Project_Budget", allowAll: false, create: false, read: true, update: false, delete: false },
  { entity: "Employee_Record", allowAll: false, create: false, read: true, update: true, delete: false },
  { entity: "Liquidation_Entry", allowAll: false, create: true, read: true, update: true, delete: true },
  { entity: "Permit_Application", allowAll: true, create: true, read: true, update: true, delete: true },
  { entity: "Asset_Registry", allowAll: false, create: false, read: true, update: false, delete: false },
  { entity: "Audit_Trail", allowAll: false, create: false, read: true, update: false, delete: false },
];

const baseRolesAvailable = [
  { name: "Basic Employee Role", code: "role-basic-employee", selected: false },
  { name: "Department Manager", code: "role-dept-manager", selected: true },
  { name: "Finance Read-Only", code: "role-finance-ro", selected: false },
  { name: "Project Leader", code: "role-project-leader", selected: true },
  { name: "Audit Inspector", code: "role-audit-inspector", selected: false },
];

const viewPolicies = [
  { screen: "Dashboard Overview", access: "Allow" },
  { screen: "Project Portfolio List", access: "Allow" },
  { screen: "Budget Ledger Detail", access: "Deny" },
  { screen: "HR Analytics Panel", access: "Deny" },
  { screen: "Permit Processing Queue", access: "Allow" },
];

const permissionMatrix = {
  roles: [
    { name: "City Administrator", level: "senior" },
    { name: "City Engineer Admin", level: "senior" },
    { name: "BPLO Inspector", level: "mid" },
    { name: "Finance Officer", level: "mid" },
    { name: "HRMO Staff", level: "mid" },
    { name: "Project Leader", level: "junior" },
    { name: "Regular Employee", level: "junior" },
  ],
  modules: ["Project Portfolios", "Budget Ledgers", "HR Analytics", "Permit System", "Asset Mgmt", "Audit Logs"],
  permissions: [
    ["Full Access", "Full Access", "Full Access", "Full Access", "Full Access", "Full Access"],
    ["Full Access", "Read", "Read", "Write", "Full Access", "Read"],
    ["Read", "—", "—", "Full Access", "Read", "—"],
    ["Read", "Full Access", "Read", "—", "Write", "Read"],
    ["Read", "Read", "Full Access", "—", "—", "Read"],
    ["Write", "Read", "—", "Write", "Write", "—"],
    ["Read", "—", "—", "Read", "Read", "—"],
  ],
};

const permCellStyle: Record<string, string> = {
  "Full Access": "bg-red-100 text-red-700",
  "Write": "bg-amber-100 text-amber-700",
  "Read": "bg-emerald-100 text-emerald-700",
  "—": "bg-neutral-50 text-neutral-300",
};

const inheritanceTree = [
  { role: "City Administrator", children: [
    { role: "City Engineer Admin", children: [
      { role: "Project Leader", children: [{ role: "Regular Employee", children: [] }] },
    ]},
    { role: "Finance Officer", children: [{ role: "Regular Employee", children: [] }] },
    { role: "HRMO Staff", children: [{ role: "Regular Employee", children: [] }] },
    { role: "BPLO Inspector", children: [] },
  ]},
];

function RoleAssignment() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showResourceDrawer, setShowResourceDrawer] = useState(false);
  const [resourceDrawerTab, setResourceDrawerTab] = useState<"base" | "policies">("policies");
  const [directorySearch, setDirectorySearch] = useState("");
  const [expandedAccordion, setExpandedAccordion] = useState<string | null>(null);
  const [attrModalEntity, setAttrModalEntity] = useState<string | null>(null);
  const fullAccessCount = permissionMatrix.permissions.flat().filter(p => p === "Full Access").length;
  const totalCells = permissionMatrix.permissions.flat().filter(p => p !== "—").length;
  const leastPrivIndex = Math.round(100 - (fullAccessCount / totalCells) * 100);
  const gaugeColor = leastPrivIndex > 80 ? "#10b981" : leastPrivIndex > 60 ? "#f59e0b" : "#ef4444";

  const filteredRoles = resourceRolesDirectory.filter(r =>
    r.name.toLowerCase().includes(directorySearch.toLowerCase()) ||
    r.code.toLowerCase().includes(directorySearch.toLowerCase())
  );

  function renderTree(nodes: typeof inheritanceTree, depth: number = 0): React.ReactNode {
    return nodes.map(n => (
      <div key={n.role} style={{ marginLeft: depth * 24 }} className="py-1.5">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${depth === 0 ? "bg-violet-50 border border-violet-200" : "bg-neutral-50 border border-neutral-200"}`}>
          <div className={`size-2.5 rounded-full ${depth === 0 ? "bg-violet-500" : "bg-neutral-400"}`} />
          <span className="text-[12px] text-neutral-900">{n.role}</span>
          <span className="ml-auto text-[10px] text-neutral-400">{n.children.length > 0 ? "inherits ↓" : ""}</span>
        </div>
        {n.children.length > 0 && renderTree(n.children, depth + 1)}
      </div>
    ));
  }

  return (
    <div>
      <PageHeader title="Access Control Directory">
        <div className="relative">
          <button onClick={() => setShowResourceDrawer(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] font-medium cursor-pointer transition-colors bg-neutral-900 text-white hover:bg-neutral-800">
            <Add size={14} /> Create Role <ChevronDown size={12} />
          </button>
        </div>
        <ActionButton><User size={14} /> Assign to Users</ActionButton>
        <ActionButton><DocumentExport size={14} /> Export as JSON</ActionButton>
        <ActionButton><Upload size={14} /> Import</ActionButton>
      </PageHeader>

      {/* Quick stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <CounterWidget label="Total Active Roles" value={String(resourceRolesDirectory.length)} />
        <CounterWidget label="Resource Roles" value={String(resourceRolesDirectory.filter(r => r.type === "Resource").length)} />
        <CounterWidget label="Recently Modified" value="3" />
        <WidgetCard title="LEAST PRIVILEGE INDEX">
          <div className="flex flex-col items-center">
            <svg viewBox="0 0 120 70" className="w-28 h-14">
              <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="#e5e5e5" strokeWidth={8} strokeLinecap="round" />
              <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke={gaugeColor} strokeWidth={8} strokeLinecap="round" strokeDasharray={`${(leastPrivIndex / 100) * 157} 157`} />
              <text x="60" y="55" textAnchor="middle" fontSize="16" fill="#171717" className="font-['Lexend:SemiBold',_sans-serif]">{leastPrivIndex}%</text>
            </svg>
            <span className="text-[10px] text-neutral-500 mt-1">{leastPrivIndex > 80 ? "Secure" : leastPrivIndex > 60 ? "Needs Review" : "HIGH RISK"}</span>
          </div>
        </WidgetCard>
      </div>

      {/* Access Control Directory DataGrid */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden mb-6">
        <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between">
          <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-700">RESOURCE ROLE DIRECTORY</span>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input value={directorySearch} onChange={e => setDirectorySearch(e.target.value)} placeholder="Search roles..." className="pl-7 pr-3 py-1.5 rounded-lg border border-neutral-200 text-[11px] font-['Lexend:Regular',_sans-serif] outline-none w-48 focus:border-neutral-400 transition-colors" />
            </div>
          </div>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100">
              {["Name", "Code", "Type", "Source", "Scope"].map(h => (
                <th key={h} className="px-4 py-2 text-left text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRoles.map(r => (
              <tr key={r.code} onClick={() => setShowResourceDrawer(true)} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors cursor-pointer">
                <td className="px-4 py-2.5 text-[12px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-900">{r.name}</td>
                <td className="px-4 py-2.5 text-[11px] font-mono text-neutral-500">{r.code}</td>
                <td className="px-4 py-2.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">Resource</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 w-fit ${r.source === "Annotated Class" ? "bg-neutral-100 text-neutral-600" : "bg-violet-100 text-violet-700"}`}>
                    {r.source === "Annotated Class" && <Security size={10} />}
                    {r.source}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    {r.scope.map(s => (
                      <span key={s} className="px-2 py-0.5 rounded text-[9px] font-medium bg-neutral-100 text-neutral-600">{s}</span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Permission Matrix */}
      <div className={`grid ${selectedRole ? "grid-cols-2" : "grid-cols-1"} gap-4 mb-6`}>
        <div className="bg-white rounded-xl border border-neutral-200 overflow-auto">
          <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-100">
            <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-700">PERMISSION MATRIX</span>
            <span className="ml-2 text-[10px] text-neutral-400">Click a role to view inheritance tree</span>
          </div>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="px-3 py-2 text-left font-medium text-neutral-400 uppercase tracking-wider sticky left-0 bg-white">Role</th>
                {permissionMatrix.modules.map(m => (
                  <th key={m} className="px-2 py-2 text-center font-medium text-neutral-400 uppercase tracking-wider whitespace-nowrap">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissionMatrix.roles.map((role, ri) => (
                <tr key={role.name} onClick={() => setSelectedRole(selectedRole === role.name ? null : role.name)} className={`border-b border-neutral-50 cursor-pointer transition-colors ${selectedRole === role.name ? "bg-violet-50" : "hover:bg-neutral-50/50"}`}>
                  <td className="px-3 py-2.5 font-['Lexend:Medium',_sans-serif] font-medium text-neutral-900 sticky left-0 bg-inherit whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className={`size-2 rounded-full ${role.level === "senior" ? "bg-red-500" : role.level === "mid" ? "bg-amber-500" : "bg-emerald-500"}`} />
                      {role.name}
                    </div>
                  </td>
                  {permissionMatrix.permissions[ri].map((perm, ci) => (
                    <td key={`${role.name}-${permissionMatrix.modules[ci]}`} className="px-2 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${permCellStyle[perm]}`}>{perm}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedRole && (
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-violet-50 border-b border-violet-100 flex items-center justify-between">
              <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-violet-800">INVERTED INHERITANCE TREE</span>
              <button onClick={() => setSelectedRole(null)} className="text-neutral-400 hover:text-neutral-600 cursor-pointer"><Close size={14} /></button>
            </div>
            <div className="p-4 overflow-auto max-h-[400px]">
              <div className="text-[11px] text-neutral-500 mb-3">Showing permission inheritance for: <span className="font-medium text-neutral-900">{selectedRole}</span></div>
              {renderTree(inheritanceTree)}
            </div>
          </div>
        )}
      </div>

      {/* ===== Resource Role Designer Drawer ===== */}
      {showResourceDrawer && (
        <div className="fixed inset-0 bg-black/30 z-50 flex justify-end">
          <div className="w-[720px] bg-white h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 z-10 flex items-center justify-between">
              <div>
                <div className="text-[16px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-900">Resource Role Designer</div>
                <div className="text-[11px] text-neutral-500 mt-0.5">Define CRUD permissions for system entities and UI views</div>
              </div>
              <div className="flex items-center gap-2">
                <ActionButton variant="primary"><Save size={14} /> Save Role</ActionButton>
                <button onClick={() => setShowResourceDrawer(false)} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"><Close size={16} /></button>
              </div>
            </div>

            <div className="p-6">
              {/* Role Definition */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-500 mb-1.5 block">Name</label>
                  <input defaultValue="System Owner" className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-[12px] outline-none focus:border-neutral-400 transition-colors" />
                </div>
                <div>
                  <label className="text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-500 mb-1.5 block">Code</label>
                  <input defaultValue="role-system-owner" className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-[12px] font-mono outline-none focus:border-neutral-400 transition-colors" />
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-500 mb-1.5 block">Description</label>
                  <input defaultValue="Combined role for senior system administrators with full CRUD across all entities" className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-[12px] outline-none focus:border-neutral-400 transition-colors" />
                </div>
                <div>
                  <label className="text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-500 mb-1.5 block">Scope</label>
                  <div className="flex gap-3">
                    {["UI", "API"].map(s => (
                      <label key={s} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" defaultChecked className="accent-violet-600 size-3.5" />
                        <span className="text-[12px] text-neutral-700">{s}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-4 border-b border-neutral-200">
                {([["base", "Base Roles"], ["policies", "Resource Policies"]] as const).map(([key, label]) => (
                  <button key={key} onClick={() => setResourceDrawerTab(key)} className={`px-4 py-2.5 text-[12px] font-['Lexend:Medium',_sans-serif] font-medium cursor-pointer transition-colors border-b-2 -mb-px ${resourceDrawerTab === key ? "border-violet-600 text-violet-700" : "border-transparent text-neutral-500 hover:text-neutral-700"}`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab 1: Base Roles */}
              {resourceDrawerTab === "base" && (
                <div>
                  <div className="text-[11px] text-neutral-500 mb-3">Combine existing roles to build coarse-grained permissions. Selected roles will be inherited.</div>
                  <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                    {baseRolesAvailable.map(br => (
                      <div key={br.code} className={`flex items-center gap-3 px-4 py-3 border-b border-neutral-50 last:border-0 hover:bg-neutral-50/50 transition-colors cursor-pointer ${br.selected ? "bg-violet-50/50" : ""}`}>
                        <input type="checkbox" defaultChecked={br.selected} className="accent-violet-600 size-3.5 cursor-pointer" />
                        <div className="flex-1">
                          <div className="text-[12px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-900">{br.name}</div>
                          <div className="text-[10px] font-mono text-neutral-400">{br.code}</div>
                        </div>
                        {br.selected && <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-violet-100 text-violet-700">Inherited</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 2: Resource Policies (Split-View) */}
              {resourceDrawerTab === "policies" && (
                <div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {/* Left: Role Hierarchy Tree */}
                    <div className="col-span-1 bg-neutral-50 rounded-xl border border-neutral-200 p-3">
                      <div className="text-[11px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-600 mb-2 uppercase tracking-wider">Role Hierarchy</div>
                      {renderTree(inheritanceTree)}
                    </div>

                    {/* Right: Entity Permissions Grid */}
                    <div className="col-span-2 bg-white rounded-xl border border-neutral-200 overflow-hidden">
                      <div className="px-3 py-2 bg-neutral-50 border-b border-neutral-100">
                        <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-600 uppercase tracking-wider">Entity Permissions</span>
                      </div>
                      <div className="overflow-auto">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="border-b border-neutral-100">
                              <th className="px-3 py-2 text-left font-medium text-neutral-400 uppercase tracking-wider">Entity</th>
                              {["All", "Create", "Read", "Update", "Delete", "Attr"].map(h => (
                                <th key={h} className="px-1.5 py-2 text-center font-medium text-neutral-400 uppercase tracking-wider">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {entityPermissions.map(ep => (
                              <tr key={ep.entity} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                                <td className="px-3 py-2 font-mono text-neutral-900">{ep.entity}</td>
                                {[ep.allowAll, ep.create, ep.read, ep.update, ep.delete].map((val, i) => (
                                  <td key={i} className="px-1.5 py-2 text-center">
                                    <input type="checkbox" defaultChecked={val} className="accent-violet-600 size-3.5 cursor-pointer" />
                                  </td>
                                ))}
                                <td className="px-1.5 py-2 text-center">
                                  <button onClick={() => setAttrModalEntity(ep.entity)} className="p-1 hover:bg-neutral-100 rounded transition-colors cursor-pointer">
                                    <Settings size={12} className="text-neutral-400" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Accordion Sections */}
                  {[
                    { key: "view", title: "View Policy", desc: "Which UI screens this role can access", items: viewPolicies.map(v => `${v.screen}: ${v.access}`) },
                    { key: "menu", title: "Menu Policy", desc: "Which sidebar items render for this role", items: ["Dashboard", "Projects", "Permits", "Reports"] },
                    { key: "specific", title: "Specific Policy", desc: "Custom application functions", items: ["rest.enabled = true", "customer.notify = false", "export.allowed = true"] },
                  ].map(sec => (
                    <div key={sec.key} className="mb-2 border border-neutral-200 rounded-xl overflow-hidden">
                      <button onClick={() => setExpandedAccordion(expandedAccordion === sec.key ? null : sec.key)} className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer">
                        <div>
                          <span className="text-[12px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-700">{sec.title}</span>
                          <span className="ml-2 text-[10px] text-neutral-400">{sec.desc}</span>
                        </div>
                        <ChevronDown size={14} className={`text-neutral-400 transition-transform ${expandedAccordion === sec.key ? "rotate-180" : ""}`} />
                      </button>
                      {expandedAccordion === sec.key && (
                        <div className="px-4 py-3 border-t border-neutral-100">
                          {sec.items.map((item, i) => (
                            <div key={i} className="flex items-center gap-2 py-1.5 text-[11px]">
                              <CheckmarkOutline size={12} className="text-emerald-500" />
                              <span className="font-mono text-neutral-700">{item}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Entity Attribute Policy Modal */}
          {attrModalEntity && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
              <div className="bg-white rounded-2xl border border-neutral-200 p-6 w-[480px] shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-[14px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-900">Entity Attribute Policy</div>
                    <div className="text-[11px] font-mono text-neutral-500 mt-0.5">{attrModalEntity}</div>
                  </div>
                  <button onClick={() => setAttrModalEntity(null)} className="p-1 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"><Close size={14} /></button>
                </div>
                <div className="text-[11px] text-neutral-500 mb-3">Restrict access to specific field-level attributes for this entity.</div>
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-neutral-100">
                      <th className="px-3 py-2 text-left font-medium text-neutral-400 uppercase tracking-wider">Attribute</th>
                      <th className="px-3 py-2 text-left font-medium text-neutral-400 uppercase tracking-wider">Access Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {["id", "name", "status", "created_date", "amount", "credit_limit", "department_id", "notes"].map(attr => (
                      <tr key={attr} className="border-b border-neutral-50">
                        <td className="px-3 py-2 font-mono text-neutral-700">{attr}</td>
                        <td className="px-3 py-2">
                          <select defaultValue={attr === "credit_limit" ? "View Only" : "Full Access"} className="px-2 py-1 rounded-lg border border-neutral-200 text-[11px] outline-none cursor-pointer bg-white">
                            <option>Full Access</option>
                            <option>View Only</option>
                            <option>Hidden</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex gap-2 justify-end mt-4">
                  <button onClick={() => setAttrModalEntity(null)} className="px-4 py-2 bg-neutral-100 text-neutral-700 text-[12px] rounded-lg cursor-pointer hover:bg-neutral-200 transition-colors">Cancel</button>
                  <button onClick={() => setAttrModalEntity(null)} className="px-4 py-2 bg-neutral-900 text-white text-[12px] rounded-lg cursor-pointer hover:bg-neutral-800 transition-colors">Apply Restrictions</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== 4.1.2 HRMO INTEGRATION ====================
const hrSyncEvents = [
  { id: "HR-2401", name: "Elena Vasquez", type: "New Hire", oldDept: "—", newDept: "City Engineering", proposedRole: "Regular Employee", status: "Pending HR Approval" },
  { id: "HR-2402", name: "Marco Delgado", type: "Promotion", oldDept: "Finance & Budget", newDept: "Finance & Budget", proposedRole: "Dept Head", status: "Successfully Synced" },
  { id: "HR-2403", name: "Lisa Tan", type: "Transfer", oldDept: "HRMO", newDept: "Social Welfare", proposedRole: "Project Leader", status: "Successfully Synced" },
  { id: "HR-2404", name: "Carlos Mendez", type: "New Hire", oldDept: "—", newDept: "Health Services", proposedRole: "Regular Employee", status: "Pending HR Approval" },
  { id: "HR-2405", name: "Ana Reyes", type: "Promotion", oldDept: "City Planning", newDept: "City Planning", proposedRole: "Project Leader", status: "Role Mismatch" },
  { id: "HR-2406", name: "Roberto Cruz", type: "Suspension", oldDept: "Business Permits", newDept: "Business Permits", proposedRole: "Suspended", status: "Pending HR Approval" },
];

const syncStatusStyles: Record<string, string> = {
  "Pending HR Approval": "bg-amber-100 text-amber-700",
  "Successfully Synced": "bg-emerald-100 text-emerald-700",
  "Role Mismatch": "bg-red-100 text-red-700",
};

const hrEventColors: Record<string, string> = {
  "New Hire": "bg-blue-100 text-blue-700",
  "Promotion": "bg-violet-100 text-violet-700",
  "Transfer": "bg-indigo-100 text-indigo-700",
  "Suspension": "bg-red-100 text-red-700",
};

const onboardingTimeline = [
  { name: "Elena Vasquez", dept: "Engineering", start: 0, duration: 3, status: "in-progress" },
  { name: "Carlos Mendez", dept: "Health", start: 1, duration: 2, status: "in-progress" },
  { name: "Marco Delgado", dept: "Finance", start: 0, duration: 1, status: "complete" },
  { name: "Lisa Tan", dept: "Social Welfare", start: 0, duration: 2, status: "complete" },
  { name: "Juan Morales", dept: "Tourism", start: 2, duration: 4, status: "pending" },
];

function HRMOIntegration() {
  return (
    <div>
      <PageHeader title="HRIS Active Sync">
        <ActionButton variant="primary"><Renew size={14} /> Force Manual Sync</ActionButton>
        <ActionButton><Warning size={14} /> Review Sync Conflicts</ActionButton>
      </PageHeader>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <CounterWidget label="New Hires (This Month)" value="4" />
        <CounterWidget label="Promotions/Transfers" value="3" />
        <CounterWidget label="Suspensions" value="1" />
        <CounterWidget label="Avg Onboarding Time" value="2.1d" />
      </div>

      {(["New Hire", "Promotion", "Suspension"] as const).map(eventType => {
        const filtered = hrSyncEvents.filter(e => e.type === eventType || (eventType === "Promotion" && e.type === "Transfer"));
        if (filtered.length === 0) return null;
        return (
          <div key={eventType} className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${hrEventColors[eventType]}`}>{eventType === "Promotion" ? "Promotions / Transfers" : eventType === "New Hire" ? "New Hires" : eventType + "s"}</span>
              <span className="text-[11px] text-neutral-400">{filtered.length} records</span>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-100">
                    {["Employee Name", "Old Department", "New Department", "Proposed Role", "Sync Status", "Action"].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="text-[12px] text-neutral-900">{e.name}</div>
                        <div className="text-[10px] font-mono text-neutral-400">{e.id}</div>
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-neutral-600">{e.oldDept}</td>
                      <td className="px-4 py-2.5 text-[12px] text-neutral-900">{e.newDept}</td>
                      <td className="px-4 py-2.5 text-[12px] font-medium text-neutral-900">{e.proposedRole}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${syncStatusStyles[e.status] || "bg-neutral-100 text-neutral-600"}`}>{e.status}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        {e.status === "Pending HR Approval" && <button className="px-3 py-1 bg-neutral-900 text-white text-[11px] rounded-lg cursor-pointer hover:bg-neutral-800 transition-colors">Validate Change</button>}
                        {e.status === "Role Mismatch" && <button className="px-3 py-1 bg-amber-600 text-white text-[11px] rounded-lg cursor-pointer hover:bg-amber-700 transition-colors">Resolve</button>}
                        {e.status === "Successfully Synced" && <span className="text-[11px] text-emerald-600 flex items-center gap-1"><CheckmarkOutline size={12} /> Done</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      <WidgetCard title="ONBOARDING PROVISIONING SPEED (DAYS)" className="mt-6">
        <div className="flex flex-col gap-2">
          {onboardingTimeline.map(t => (
            <div key={t.name} className="flex items-center gap-3">
              <div className="w-32 shrink-0">
                <div className="text-[11px] text-neutral-900 truncate">{t.name}</div>
                <div className="text-[10px] text-neutral-400">{t.dept}</div>
              </div>
              <div className="flex-1 h-6 bg-neutral-50 rounded relative">
                <div className={`absolute top-0.5 bottom-0.5 rounded ${t.status === "complete" ? "bg-emerald-400" : t.status === "in-progress" ? "bg-blue-400" : "bg-neutral-300"}`} style={{ left: `${(t.start / 7) * 100}%`, width: `${(t.duration / 7) * 100}%` }} />
                {Array.from({ length: 7 }, (_, i) => <div key={i} className="absolute top-0 bottom-0 border-l border-neutral-200" style={{ left: `${(i / 7) * 100}%` }} />)}
              </div>
              <span className={`text-[10px] font-medium shrink-0 w-16 text-right ${t.status === "complete" ? "text-emerald-600" : t.status === "in-progress" ? "text-blue-600" : "text-neutral-400"}`}>
                {t.status === "complete" ? "Done" : t.status === "in-progress" ? "In Progress" : "Pending"}
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3 pt-2 border-t border-neutral-100">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => <span key={d} className="text-[9px] text-neutral-400 flex-1 text-center">{d}</span>)}
        </div>
      </WidgetCard>
    </div>
  );
}

// ==================== 4.1.3 OFFBOARDING AUTOMATION ====================
const offboardingCards: Record<string, Array<{ id: string; name: string; dept: string; reason: string; date: string; systems: Array<{ name: string; revoked: boolean }> }>> = {
  "Notice Received": [
    { id: "OFF-101", name: "Diego Ramos", dept: "City Planning", reason: "Resignation", date: "2026-04-02", systems: [
      { name: "eFlow DB", revoked: false }, { name: "Viber Integration", revoked: false }, { name: "Shared Drive", revoked: false }, { name: "Email Account", revoked: false }, { name: "VPN Access", revoked: false },
    ]},
  ],
  "Access Throttled": [
    { id: "OFF-098", name: "Linda Gomez", dept: "Business Permits", reason: "End of Contract", date: "2026-03-31", systems: [
      { name: "eFlow DB", revoked: true }, { name: "Viber Integration", revoked: false }, { name: "Shared Drive", revoked: false }, { name: "Email Account", revoked: false }, { name: "VPN Access", revoked: true },
    ]},
  ],
  "Fully Revoked": [
    { id: "OFF-095", name: "Ramon Aquino", dept: "Assessor's Office", reason: "Retirement", date: "2026-03-28", systems: [
      { name: "eFlow DB", revoked: true }, { name: "Viber Integration", revoked: true }, { name: "Shared Drive", revoked: true }, { name: "Email Account", revoked: true }, { name: "VPN Access", revoked: true },
    ]},
    { id: "OFF-094", name: "Carmen Dela Cruz", dept: "Health Services", reason: "Transfer Out", date: "2026-03-27", systems: [
      { name: "eFlow DB", revoked: true }, { name: "Viber Integration", revoked: true }, { name: "Shared Drive", revoked: true }, { name: "Email Account", revoked: true }, { name: "VPN Access", revoked: true },
    ]},
  ],
  "Data Reassigned": [
    { id: "OFF-090", name: "Jose Villanueva", dept: "Engineering", reason: "Resignation", date: "2026-03-20", systems: [
      { name: "eFlow DB", revoked: true }, { name: "Viber Integration", revoked: true }, { name: "Shared Drive", revoked: true }, { name: "Email Account", revoked: true }, { name: "VPN Access", revoked: true },
    ]},
  ],
};

const offboardKanbanColors: Record<string, string> = {
  "Notice Received": "border-t-amber-500",
  "Access Throttled": "border-t-orange-500",
  "Fully Revoked": "border-t-emerald-500",
  "Data Reassigned": "border-t-blue-500",
};

function OffboardingAutomation() {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const orphanedAccounts = 3;
  const orphanedRisk = orphanedAccounts > 5 ? 40 : orphanedAccounts > 2 ? 65 : 90;

  return (
    <div>
      <PageHeader title="Automated Access Revocation">
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] font-medium cursor-pointer transition-colors bg-red-600 text-white hover:bg-red-700">
          <Security size={14} /> Trigger Emergency Lockout
        </button>
        <ActionButton><DocumentExport size={14} /> Export Revocation Log</ActionButton>
      </PageHeader>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <CounterWidget label="Pending Offboards" value={String(offboardingCards["Notice Received"].length + offboardingCards["Access Throttled"].length)} />
        <CounterWidget label="Completed This Month" value={String(offboardingCards["Fully Revoked"].length + offboardingCards["Data Reassigned"].length)} />
        <WidgetCard title="ORPHANED ACCOUNT RISK">
          <div className="flex items-center gap-4">
            <BatteryWidget label="Account Safety" value={orphanedRisk} />
            <div className="flex-1">
              <div className="text-[12px] text-neutral-900 mb-1">{orphanedAccounts} orphaned accounts detected</div>
              <div className="text-[10px] text-neutral-500 mb-2">Active eFlow accounts with no matching HR profile</div>
              <button className="px-3 py-1.5 bg-red-50 text-red-700 text-[11px] rounded-lg cursor-pointer hover:bg-red-100 transition-colors border border-red-200">Review & Delete Ghost Accounts</button>
            </div>
          </div>
        </WidgetCard>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {Object.entries(offboardingCards).map(([status, cards]) => (
          <div key={status} className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-700">{status}</span>
              <span className="text-[11px] text-neutral-400">{cards.length}</span>
            </div>
            <div className="flex flex-col gap-2 min-h-[200px]">
              {cards.map(card => (
                <div key={card.id} className={`bg-white rounded-xl border border-neutral-200 border-t-2 ${offboardKanbanColors[status]} p-3`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-900">{card.name}</span>
                    <span className="text-[9px] font-mono text-neutral-400">{card.id}</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 mb-1">{card.dept} — {card.reason}</div>
                  <div className="text-[10px] text-neutral-400 mb-2">{card.date}</div>
                  <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(card.systems.filter(s => s.revoked).length / card.systems.length) * 100}%` }} />
                  </div>
                  <div className="text-[9px] text-neutral-400 mb-2">{card.systems.filter(s => s.revoked).length}/{card.systems.length} systems revoked</div>
                  <button onClick={() => setExpandedCard(expandedCard === card.id ? null : card.id)} className="text-[10px] text-blue-600 cursor-pointer hover:text-blue-700 flex items-center gap-1">
                    <ChevronDown size={10} className={`transition-transform ${expandedCard === card.id ? "rotate-180" : ""}`} />
                    {expandedCard === card.id ? "Hide" : "View"} Systems
                  </button>
                  {expandedCard === card.id && (
                    <div className="mt-2 flex flex-col gap-1.5 pt-2 border-t border-neutral-100">
                      {card.systems.map(sys => (
                        <div key={sys.name} className="flex items-center gap-2 text-[10px]">
                          {sys.revoked ? <CheckmarkOutline size={12} className="text-emerald-500" /> : <div className="size-3 rounded-full border-2 border-neutral-300" />}
                          <span className={sys.revoked ? "text-neutral-400 line-through" : "text-neutral-700"}>{sys.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== 4.2 TENANT ISOLATION CONTROLS (OVERVIEW) ====================
const tenants = [
  { id: "TEN-001", name: "City Engineering", dbSize: "2.4 GB", compliance: "Compliant", tables: 34 },
  { id: "TEN-002", name: "HRMO", dbSize: "1.1 GB", compliance: "Compliant", tables: 22 },
  { id: "TEN-003", name: "Finance & Budget", dbSize: "3.8 GB", compliance: "Compliant", tables: 41 },
  { id: "TEN-004", name: "Health Office", dbSize: "0.9 GB", compliance: "Compliant", tables: 18 },
  { id: "TEN-005", name: "Assessor's Office", dbSize: "1.6 GB", compliance: "Non-Compliant", tables: 25 },
  { id: "TEN-006", name: "Business Permits", dbSize: "2.8 GB", compliance: "Compliant", tables: 38 },
  { id: "TEN-007", name: "City Planning", dbSize: "1.9 GB", compliance: "Compliant", tables: 29 },
];

const securityAlerts = [
  { time: "14:21", event: "Cross-tenant query blocked: Engineering → Health", severity: "Critical" },
  { time: "13:45", event: "Shared resource access audit completed", severity: "Healthy" },
  { time: "12:10", event: "Assessor's Office data partition check failed", severity: "Warning" },
  { time: "10:30", event: "Tenant boundary refresh completed for all departments", severity: "Healthy" },
  { time: "09:15", event: "RLS policy updated for Finance & Budget tables", severity: "Healthy" },
];

function TenantIsolationControls() {
  return (
    <div>
      <PageHeader title="Tenant Isolation Controls">
        <ActionButton variant="primary"><Security size={14} /> Audit Tenant Boundaries</ActionButton>
        <ActionButton><Settings size={14} /> Re-index Databases</ActionButton>
      </PageHeader>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <CounterWidget label="Active Tenants" value={String(tenants.length)} />
        <CounterWidget label="RLS Policies Active" value="187" />
        <CounterWidget label="Cross-Dept Exceptions" value="12" />
        <CounterWidget label="Compliance Rate" value="85.7%" />
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden mb-6">
        <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-100">
          <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-700">Shared Schema with Tenant ID Architecture</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100">
              {["Tenant ID", "Department", "Database Size", "Tables", "Privacy Compliance"].map((h) => (
                <th key={h} className="px-4 py-2 text-left text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                <td className="px-4 py-2.5 text-[12px] font-mono text-neutral-700">{t.id}</td>
                <td className="px-4 py-2.5 text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-900">{t.name}</td>
                <td className="px-4 py-2.5 text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{t.dbSize}</td>
                <td className="px-4 py-2.5 text-[13px] font-mono text-neutral-600">{t.tables}</td>
                <td className="px-4 py-2.5"><StatusPill status={t.compliance} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <WidgetCard title="SECURITY ALERT TIMELINE">
        <div className="flex flex-col gap-3">
          {securityAlerts.map((a, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-[11px] font-mono text-neutral-400 shrink-0 pt-0.5">{a.time}</span>
              <div className={`size-2 rounded-full mt-1.5 shrink-0 ${a.severity === "Critical" ? "bg-red-500" : a.severity === "Warning" ? "bg-amber-500" : "bg-emerald-500"}`} />
              <span className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700">{a.event}</span>
            </div>
          ))}
        </div>
      </WidgetCard>
    </div>
  );
}

// ==================== 4.2.1 DATA PARTITIONING ====================
const rlsTables = [
  { table: "Project_Tasks", enforced: true, tenantCol: "dept_id" },
  { table: "Liquidations", enforced: true, tenantCol: "dept_id" },
  { table: "Employee_Records", enforced: true, tenantCol: "dept_id" },
  { table: "Permit_Applications", enforced: true, tenantCol: "dept_id" },
  { table: "Budget_Entries", enforced: true, tenantCol: "dept_id" },
  { table: "Employee_Health_Records", enforced: true, tenantCol: "dept_id" },
  { table: "Asset_Inventory", enforced: false, tenantCol: "dept_id" },
  { table: "Shared_Announcements", enforced: false, tenantCol: "—" },
];

const storageByDept = [
  { dept: "Engineering", size: 2.4 },
  { dept: "Finance", size: 3.8 },
  { dept: "HRMO", size: 1.1 },
  { dept: "Health", size: 0.9 },
  { dept: "Assessor", size: 1.6 },
  { dept: "BPLO", size: 2.8 },
  { dept: "Planning", size: 1.9 },
];

const storageColors = ["#6366f1", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

const rowLevelRolesDirectory = [
  { name: "Same Region", code: "rl-same-region", source: "Database" as const, entity: "Order", policyType: "JPQL", clause: "{E}.region = :current_user_region" },
  { name: "Own Department Only", code: "rl-own-dept", source: "Database" as const, entity: "Project_Budget", policyType: "JPQL", clause: "{E}.dept_id = :current_user_dept_id" },
  { name: "Own Records", code: "rl-own-records", source: "Database" as const, entity: "Employee_Record", policyType: "JPQL", clause: "{E}.createdBy = :current_user_username" },
  { name: "Non-Confidential", code: "rl-non-confidential", source: "Annotated Class" as const, entity: "Document", policyType: "Predicate", clause: "!{E}.confidential" },
  { name: "Active Projects Only", code: "rl-active-projects", source: "Database" as const, entity: "Project_Task", policyType: "JPQL", clause: "{E}.status IN ('ACTIVE', 'IN_PROGRESS')" },
  { name: "Fiscal Year Scope", code: "rl-fiscal-year", source: "Database" as const, entity: "Liquidation_Entry", policyType: "JPQL", clause: "{E}.fiscal_year = :current_fiscal_year" },
];

function DataPartitioning() {
  const [rlsState, setRlsState] = useState<Record<string, boolean>>(
    Object.fromEntries(rlsTables.map(t => [t.table, t.enforced]))
  );
  const [showMultiSig, setShowMultiSig] = useState<string | null>(null);
  const [showRLDrawer, setShowRLDrawer] = useState(false);
  const [rlDrawerTab, setRLDrawerTab] = useState<"base" | "policies">("policies");
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyType, setPolicyType] = useState<"JPQL" | "Predicate">("JPQL");
  const sensitiveTables = ["Employee_Health_Records", "Employee_Records", "Liquidations"];

  const handleToggle = (table: string) => {
    if (sensitiveTables.includes(table) && rlsState[table]) {
      setShowMultiSig(table);
    } else {
      setRlsState(prev => ({ ...prev, [table]: !prev[table] }));
    }
  };

  return (
    <div>
      <PageHeader title="Row-Level Security (RLS) Manager">
        <ActionButton variant="primary"><Security size={14} /> Audit Tenant Boundaries</ActionButton>
        <ActionButton><Renew size={14} /> Re-index Databases</ActionButton>
      </PageHeader>

      {showMultiSig && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 w-[420px] shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <Security size={20} className="text-red-600" />
              <span className="text-[16px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-900">Multi-Signature Required</span>
            </div>
            <div className="text-[12px] text-neutral-600 mb-4">
              Disabling RLS on <span className="font-mono font-medium text-red-600">{showMultiSig}</span> requires approval from another administrator.
            </div>
            <div className="flex flex-col gap-3 mb-4">
              {["Admin: J. Santos", "Admin: M. Cruz", "Admin: R. Aquino"].map((admin, i) => (
                <div key={admin} className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                  <div className="size-8 rounded-full bg-neutral-200 flex items-center justify-center text-[10px] font-medium text-neutral-600">{admin.split(": ")[1].split(" ").map(n => n[0]).join("")}</div>
                  <span className="text-[12px] text-neutral-700 flex-1">{admin}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${i === 0 ? "bg-amber-100 text-amber-700" : "bg-neutral-100 text-neutral-400"}`}>{i === 0 ? "Awaiting" : "Not Requested"}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowMultiSig(null)} className="px-4 py-2 bg-neutral-100 text-neutral-700 text-[12px] rounded-lg cursor-pointer hover:bg-neutral-200 transition-colors">Cancel</button>
              <button className="px-4 py-2 bg-red-600 text-white text-[12px] rounded-lg cursor-not-allowed opacity-50">Request Approval (0/2)</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden mb-6">
        <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-100">
          <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-700">SECURITY POLICY BOARD</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100">
              {["Database Table", "Tenant Column", "RLS Enforced", "Sensitivity"].map(h => (
                <th key={h} className="px-4 py-2 text-left text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rlsTables.map(t => (
              <tr key={t.table} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                <td className="px-4 py-2.5 text-[12px] font-mono text-neutral-900">{t.table}</td>
                <td className="px-4 py-2.5 text-[12px] font-mono text-neutral-500">{t.tenantCol}</td>
                <td className="px-4 py-2.5">
                  <button onClick={() => handleToggle(t.table)} className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${rlsState[t.table] ? "bg-emerald-500" : "bg-neutral-300"}`}>
                    <div className={`size-4 bg-white rounded-full shadow transition-transform ${rlsState[t.table] ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${sensitiveTables.includes(t.table) ? "bg-red-100 text-red-700" : "bg-neutral-100 text-neutral-600"}`}>
                    {sensitiveTables.includes(t.table) ? "HIGH" : "Standard"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Row-Level Role Directory */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden mb-6">
        <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between">
          <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-700">ROW-LEVEL ROLE DIRECTORY</span>
          <button onClick={() => setShowRLDrawer(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-['Lexend:Medium',_sans-serif] font-medium cursor-pointer bg-neutral-900 text-white hover:bg-neutral-800 transition-colors">
            <Add size={12} /> Create Row-Level Role
          </button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100">
              {["Name", "Code", "Source", "Target Entity", "Policy Type", "Where Clause"].map(h => (
                <th key={h} className="px-4 py-2 text-left text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowLevelRolesDirectory.map(r => (
              <tr key={r.code} onClick={() => setShowRLDrawer(true)} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors cursor-pointer">
                <td className="px-4 py-2.5 text-[12px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-900">{r.name}</td>
                <td className="px-4 py-2.5 text-[11px] font-mono text-neutral-500">{r.code}</td>
                <td className="px-4 py-2.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 w-fit ${r.source === "Annotated Class" ? "bg-neutral-100 text-neutral-600" : "bg-purple-100 text-purple-700"}`}>
                    {r.source === "Annotated Class" && <Security size={10} />}
                    {r.source}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-[11px] font-mono text-neutral-700">{r.entity}</td>
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${r.policyType === "JPQL" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{r.policyType}</span>
                </td>
                <td className="px-4 py-2.5 text-[10px] font-mono text-neutral-500 max-w-[200px] truncate">{r.clause}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <WidgetCard title="DATABASE STORAGE BY DEPARTMENT TENANT">
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={storageByDept}>
              <CartesianGrid key="dp-grid" strokeDasharray="3 3" stroke="#f5f5f5" />
              <XAxis key="dp-x" dataKey="dept" tick={{ fontSize: 10, fill: "#a3a3a3" }} />
              <YAxis key="dp-y" tick={{ fontSize: 10, fill: "#a3a3a3" }} unit=" GB" />
              <Tooltip key="dp-tt" contentStyle={{ fontSize: 11, fontFamily: "Lexend, sans-serif" }} />
              <Bar key="dp-bar" dataKey="size" radius={[4, 4, 0, 0]}>
                {storageByDept.map((_, i) => <Cell key={`storage-${i}`} fill={storageColors[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </WidgetCard>

      {/* ===== Row-Level Role Designer Drawer ===== */}
      {showRLDrawer && (
        <div className="fixed inset-0 bg-black/30 z-50 flex justify-end">
          <div className="w-[680px] bg-white h-full shadow-2xl overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 z-10 flex items-center justify-between">
              <div>
                <div className="text-[16px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-900">Row-Level Role Designer</div>
                <div className="text-[11px] text-neutral-500 mt-0.5">Define data isolation policies so users only see rows belonging to their scope</div>
              </div>
              <div className="flex items-center gap-2">
                <ActionButton variant="primary"><Save size={14} /> Save Role</ActionButton>
                <button onClick={() => setShowRLDrawer(false)} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"><Close size={16} /></button>
              </div>
            </div>

            <div className="p-6">
              {/* Role Definition */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-500 mb-1.5 block">Name</label>
                  <input defaultValue="See Data of Their Region" className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-[12px] outline-none focus:border-neutral-400 transition-colors" />
                </div>
                <div>
                  <label className="text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-500 mb-1.5 block">Code</label>
                  <input defaultValue="rl-same-region" className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-[12px] font-mono outline-none focus:border-neutral-400 transition-colors" />
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-500 mb-1.5 block">Description</label>
                  <input defaultValue="Restricts visibility to rows matching the current user's assigned region" className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-[12px] outline-none focus:border-neutral-400 transition-colors" />
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-4 border-b border-neutral-200">
                {([["base", "Base Roles"], ["policies", "Row-Level Policies"]] as const).map(([key, label]) => (
                  <button key={key} onClick={() => setRLDrawerTab(key)} className={`px-4 py-2.5 text-[12px] font-['Lexend:Medium',_sans-serif] font-medium cursor-pointer transition-colors border-b-2 -mb-px ${rlDrawerTab === key ? "border-purple-600 text-purple-700" : "border-transparent text-neutral-500 hover:text-neutral-700"}`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab 1: Base Roles */}
              {rlDrawerTab === "base" && (
                <div>
                  <div className="text-[11px] text-neutral-500 mb-3">Inherit row-level policies from existing roles.</div>
                  <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                    {rowLevelRolesDirectory.slice(0, 4).map(rl => (
                      <div key={rl.code} className="flex items-center gap-3 px-4 py-3 border-b border-neutral-50 last:border-0 hover:bg-neutral-50/50 transition-colors cursor-pointer">
                        <input type="checkbox" defaultChecked={rl.code === "rl-own-dept"} className="accent-purple-600 size-3.5 cursor-pointer" />
                        <div className="flex-1">
                          <div className="text-[12px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-900">{rl.name}</div>
                          <div className="text-[10px] font-mono text-neutral-400">{rl.code}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${rl.policyType === "JPQL" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{rl.policyType}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 2: Row-Level Policies */}
              {rlDrawerTab === "policies" && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[11px] text-neutral-500">Active row-level filters applied to this role.</div>
                    <button onClick={() => setShowPolicyModal(true)} className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-[11px] rounded-lg cursor-pointer hover:bg-purple-700 transition-colors">
                      <Add size={12} /> Add Policy
                    </button>
                  </div>

                  {/* Existing policies list */}
                  <div className="flex flex-col gap-3">
                    {rowLevelRolesDirectory.slice(0, 3).map(p => (
                      <div key={p.code} className="bg-white rounded-xl border border-neutral-200 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-900">{p.entity}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${p.policyType === "JPQL" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{p.policyType}</span>
                          </div>
                          <button className="text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"><Close size={14} /></button>
                        </div>
                        {/* Code block */}
                        <div className="bg-neutral-900 rounded-lg p-3 font-mono text-[11px]">
                          <div className="text-neutral-500 mb-1">-- Where Clause</div>
                          <div className="text-emerald-400">{p.clause}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Policy Configuration Modal */}
          {showPolicyModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
              <div className="bg-white rounded-2xl border border-neutral-200 p-6 w-[540px] shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[14px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-900">Add Row-Level Policy</div>
                  <button onClick={() => setShowPolicyModal(false)} className="p-1 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"><Close size={14} /></button>
                </div>

                <div className="space-y-4">
                  {/* Target Entity */}
                  <div>
                    <label className="text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-500 mb-1.5 block">Target Entity</label>
                    <select className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-[12px] outline-none cursor-pointer bg-white">
                      <option>Order.class</option>
                      <option>Customer.class</option>
                      <option>Project_Budget.class</option>
                      <option>Employee_Record.class</option>
                      <option>Liquidation_Entry.class</option>
                      <option>Permit_Application.class</option>
                    </select>
                  </div>

                  {/* Policy Type Toggle */}
                  <div>
                    <label className="text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-500 mb-1.5 block">Policy Type</label>
                    <div className="flex gap-2">
                      {(["JPQL", "Predicate"] as const).map(t => (
                        <button key={t} onClick={() => setPolicyType(t)} className={`flex-1 py-2 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] font-medium cursor-pointer transition-colors border ${policyType === t ? (t === "JPQL" ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-amber-50 border-amber-300 text-amber-700") : "bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50"}`}>
                          {t === "JPQL" ? "JPQL Policy" : "Predicate Policy"}
                        </button>
                      ))}
                    </div>
                    <div className="text-[10px] text-neutral-400 mt-1.5">
                      {policyType === "JPQL" ? "Filters data directly at the database SQL level for performance" : "Filters data in-memory using Groovy scripts for complex boolean evaluations"}
                    </div>
                  </div>

                  {/* Code Editor Block */}
                  {policyType === "JPQL" && (
                    <>
                      <div>
                        <label className="text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-500 mb-1.5 block">Join Clause <span className="text-neutral-400">(optional)</span></label>
                        <div className="bg-neutral-900 rounded-lg overflow-hidden">
                          <div className="px-3 py-1.5 border-b border-neutral-700 flex items-center gap-2">
                            <div className="size-2 rounded-full bg-red-500" /><div className="size-2 rounded-full bg-amber-500" /><div className="size-2 rounded-full bg-emerald-500" />
                            <span className="text-[9px] text-neutral-500 ml-2">JPQL</span>
                          </div>
                          <textarea defaultValue="join {E}.customer c" className="w-full px-3 py-2.5 bg-transparent text-emerald-400 text-[12px] font-mono outline-none resize-none h-10" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-500 mb-1.5 block">Where Clause <span className="text-red-500">*</span></label>
                        <div className="bg-neutral-900 rounded-lg overflow-hidden">
                          <div className="px-3 py-1.5 border-b border-neutral-700 flex items-center gap-2">
                            <div className="size-2 rounded-full bg-red-500" /><div className="size-2 rounded-full bg-amber-500" /><div className="size-2 rounded-full bg-emerald-500" />
                            <span className="text-[9px] text-neutral-500 ml-2">JPQL</span>
                          </div>
                          <textarea defaultValue="{E}.region = :current_user_region" className="w-full px-3 py-2.5 bg-transparent text-emerald-400 text-[12px] font-mono outline-none resize-none h-10" />
                        </div>
                      </div>
                    </>
                  )}
                  {policyType === "Predicate" && (
                    <div>
                      <label className="text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-500 mb-1.5 block">Predicate Expression <span className="text-red-500">*</span></label>
                      <div className="bg-neutral-900 rounded-lg overflow-hidden">
                        <div className="px-3 py-1.5 border-b border-neutral-700 flex items-center gap-2">
                          <div className="size-2 rounded-full bg-red-500" /><div className="size-2 rounded-full bg-amber-500" /><div className="size-2 rounded-full bg-emerald-500" />
                          <span className="text-[9px] text-neutral-500 ml-2">Groovy</span>
                        </div>
                        <textarea defaultValue="!{E}.confidential" className="w-full px-3 py-2.5 bg-transparent text-amber-400 text-[12px] font-mono outline-none resize-none h-16" />
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-1.5">Supports Groovy scripts and Java lambda expressions with Spring bean access.</div>
                    </div>
                  )}

                  {/* Session Attributes Hint */}
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <div className="text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-blue-700 mb-1">Available Session Attributes</div>
                    <div className="flex flex-wrap gap-2">
                      {[":current_user_region", ":current_user_dept_id", ":current_user_username", ":current_fiscal_year"].map(attr => (
                        <span key={attr} className="px-2 py-0.5 bg-white border border-blue-200 rounded font-mono text-[10px] text-blue-600">{attr}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end mt-5">
                  <button onClick={() => setShowPolicyModal(false)} className="px-4 py-2 bg-neutral-100 text-neutral-700 text-[12px] rounded-lg cursor-pointer hover:bg-neutral-200 transition-colors">Cancel</button>
                  <button onClick={() => setShowPolicyModal(false)} className="px-4 py-2 bg-purple-600 text-white text-[12px] rounded-lg cursor-pointer hover:bg-purple-700 transition-colors">Add Policy</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== 4.2.2 PRIVACY COMPLIANCE ====================
const dataFields = [
  { field: "Salary Grade", dataType: "Confidential", encryption: "AES-256", masked: true, maskRule: "Hidden unless HR role" },
  { field: "Home Address", dataType: "Confidential", encryption: "AES-256", masked: true, maskRule: "Show city only" },
  { field: "Contact Number", dataType: "Internal", encryption: "AES-256", masked: true, maskRule: "Show last 4 digits" },
  { field: "Employee Name", dataType: "Internal", encryption: "None", masked: false, maskRule: "Full visibility" },
  { field: "TIN Number", dataType: "Confidential", encryption: "AES-256", masked: true, maskRule: "Show last 4 digits" },
  { field: "Birth Date", dataType: "Internal", encryption: "AES-256", masked: true, maskRule: "Year only" },
  { field: "Email Address", dataType: "Internal", encryption: "None", masked: false, maskRule: "Full visibility" },
  { field: "Medical Records", dataType: "Confidential", encryption: "AES-256", masked: true, maskRule: "Hidden unless Health role" },
  { field: "Bank Account", dataType: "Confidential", encryption: "AES-256", masked: true, maskRule: "Hidden unless Finance role" },
  { field: "Department", dataType: "Public", encryption: "None", masked: false, maskRule: "Full visibility" },
];

const dataTypeStyles: Record<string, string> = {
  "Public": "bg-emerald-100 text-emerald-700",
  "Internal": "bg-blue-100 text-blue-700",
  "Confidential": "bg-red-100 text-red-700",
};

function PrivacyCompliance() {
  const confidentialSecured = dataFields.filter(f => f.dataType === "Confidential" && f.encryption === "AES-256" && f.masked).length;
  const confidentialTotal = dataFields.filter(f => f.dataType === "Confidential").length;
  const complianceScore = Math.round((confidentialSecured / confidentialTotal) * 100);
  const compScoreColor = complianceScore >= 99 ? "#10b981" : complianceScore >= 90 ? "#f59e0b" : "#ef4444";

  return (
    <div>
      <PageHeader title="Data Privacy Act Conformance">
        <ActionButton variant="primary"><Search size={14} /> Run PII Scan</ActionButton>
        <ActionButton><DocumentExport size={14} /> Export Compliance Log</ActionButton>
      </PageHeader>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <CounterWidget label="Fields Tracked" value={String(dataFields.length)} />
        <CounterWidget label="Encrypted Fields" value={String(dataFields.filter(f => f.encryption === "AES-256").length)} />
        <CounterWidget label="Masked Fields" value={String(dataFields.filter(f => f.masked).length)} />
        <WidgetCard title="COMPLIANCE SCORE">
          <div className="flex flex-col items-center">
            <div className="relative">
              <PieChart width={120} height={120}>
                <Pie key="compPie" data={[{ value: complianceScore }, { value: 100 - complianceScore }]} cx="50%" cy="50%" innerRadius={40} outerRadius={55} startAngle={90} endAngle={-270} dataKey="value" stroke="none">
                  <Cell key="comp-filled" fill={compScoreColor} />
                  <Cell key="comp-empty" fill="#f5f5f5" />
                </Pie>
              </PieChart>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[18px] font-['Lexend:SemiBold',_sans-serif] font-semibold" style={{ color: compScoreColor }}>{complianceScore}%</span>
              </div>
            </div>
            <span className="text-[10px] text-neutral-500 mt-1">All Confidential Fields Secured</span>
          </div>
        </WidgetCard>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-100">
          <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-700">DATA MASKING BOARD</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100">
              {["Data Field", "Data Type", "Encryption Status", "Masking Rule"].map(h => (
                <th key={h} className="px-4 py-2 text-left text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataFields.map(f => (
              <tr key={f.field} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                <td className="px-4 py-2.5 text-[12px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-900">{f.field}</td>
                <td className="px-4 py-2.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium ${dataTypeStyles[f.dataType]}`}>{f.dataType}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`text-[11px] font-mono ${f.encryption === "AES-256" ? "text-emerald-600" : "text-neutral-400"}`}>
                    {f.encryption === "AES-256" ? "AES-256" : "—"}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <select className="px-2 py-1 rounded-lg border border-neutral-200 text-[11px] font-['Lexend:Regular',_sans-serif] outline-none cursor-pointer bg-white" defaultValue={f.maskRule}>
                    <option>Full visibility</option>
                    <option>Show last 4 digits</option>
                    <option>Show city only</option>
                    <option>Year only</option>
                    <option>Hidden unless HR role</option>
                    <option>Hidden unless Finance role</option>
                    <option>Hidden unless Health role</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== 4.2.3 CROSS-DEPT ISOLATION ====================
const intrusionLog = [
  { id: "QRY-4421", user: "J. Reyes", originDept: "City Planning", targetDept: "City Treasurer", data: "SELECT * FROM budget_allocations", action: "Blocked by RLS", time: "14:32" },
  { id: "QRY-4420", user: "M. Santos", originDept: "Engineering", targetDept: "Finance & Budget", data: "SELECT clearance_status FROM budget_clearance", action: "Approved Exception", time: "14:18" },
  { id: "QRY-4419", user: "L. Aquino", originDept: "Health Services", targetDept: "HRMO", data: "SELECT employee_health_records WHERE dept_id != 4", action: "Blocked by RLS", time: "13:55" },
  { id: "QRY-4418", user: "R. Delgado", originDept: "Business Permits", targetDept: "City Planning", data: "SELECT zoning_data WHERE restricted = true", action: "Flagged", time: "13:40" },
  { id: "QRY-4417", user: "A. Cruz", originDept: "HRMO", targetDept: "Finance & Budget", data: "SELECT payroll_data WHERE month = 'March'", action: "Approved Exception", time: "13:22" },
  { id: "QRY-4416", user: "C. Tan", originDept: "Assessor's Office", targetDept: "Engineering", data: "SELECT project_costs WHERE year = 2026", action: "Blocked by RLS", time: "12:58" },
];

const actionStyles: Record<string, string> = {
  "Blocked by RLS": "bg-red-100 text-red-700",
  "Flagged": "bg-amber-100 text-amber-700",
  "Approved Exception": "bg-emerald-100 text-emerald-700",
};

const deptNodes = [
  { id: "eng", label: "Engineering", x: 300, y: 50 },
  { id: "fin", label: "Finance", x: 500, y: 50 },
  { id: "hrmo", label: "HRMO", x: 150, y: 150 },
  { id: "health", label: "Health", x: 650, y: 150 },
  { id: "bplo", label: "BPLO", x: 200, y: 280 },
  { id: "plan", label: "Planning", x: 400, y: 300 },
  { id: "assess", label: "Assessor", x: 600, y: 280 },
  { id: "treas", label: "Treasury", x: 400, y: 170 },
];

const dataFlows = [
  { from: "eng", to: "fin", type: "approved" },
  { from: "hrmo", to: "fin", type: "approved" },
  { from: "plan", to: "treas", type: "blocked" },
  { from: "health", to: "hrmo", type: "blocked" },
  { from: "bplo", to: "plan", type: "flagged" },
  { from: "assess", to: "eng", type: "blocked" },
  { from: "eng", to: "treas", type: "approved" },
];

function CrossDeptIsolation() {
  return (
    <div>
      <PageHeader title="Inter-Department Boundary Log">
        <ActionButton variant="primary"><CheckmarkOutline size={14} /> Approve Data Sharing Exception</ActionButton>
        <ActionButton><Security size={14} /> Block Origin IP</ActionButton>
      </PageHeader>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <CounterWidget label="Queries Today" value={String(intrusionLog.length)} />
        <CounterWidget label="Blocked" value={String(intrusionLog.filter(l => l.action === "Blocked by RLS").length)} />
        <CounterWidget label="Flagged" value={String(intrusionLog.filter(l => l.action === "Flagged").length)} />
        <CounterWidget label="Approved Exceptions" value={String(intrusionLog.filter(l => l.action === "Approved Exception").length)} />
      </div>

      <WidgetCard title="INTER-DEPARTMENT DATA FLOW MAP" className="mb-6">
        <svg viewBox="0 0 800 340" className="w-full rounded-lg" style={{ background: "#0f172a" }}>
          {dataFlows.map((flow, i) => {
            const from = deptNodes.find(n => n.id === flow.from)!;
            const to = deptNodes.find(n => n.id === flow.to)!;
            const color = flow.type === "approved" ? "#3b82f6" : flow.type === "blocked" ? "#ef4444" : "#f59e0b";
            return (
              <g key={`flow-${i}`}>
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={color} strokeWidth={flow.type === "approved" ? 3 : 2} opacity={flow.type === "approved" ? 0.7 : 1} strokeDasharray={flow.type === "blocked" ? "6 3" : "none"} />
                {flow.type === "blocked" && (
                  <circle cx={(from.x + to.x) / 2} cy={(from.y + to.y) / 2} r={6} fill="#ef4444">
                    <animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite" />
                  </circle>
                )}
                {flow.type === "flagged" && (
                  <circle cx={(from.x + to.x) / 2} cy={(from.y + to.y) / 2} r={5} fill="#f59e0b">
                    <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          })}
          {deptNodes.map(node => (
            <g key={node.id}>
              <circle cx={node.x} cy={node.y} r={28} fill="#1e293b" stroke="#334155" strokeWidth={2} />
              <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize={10} fill="#e2e8f0" fontFamily="Lexend, sans-serif">{node.label}</text>
            </g>
          ))}
          <g transform="translate(20, 310)">
            <line x1={0} y1={0} x2={20} y2={0} stroke="#3b82f6" strokeWidth={3} />
            <text x={25} y={4} fontSize={9} fill="#94a3b8">Approved</text>
            <line x1={90} y1={0} x2={110} y2={0} stroke="#ef4444" strokeWidth={2} strokeDasharray="6 3" />
            <text x={115} y={4} fontSize={9} fill="#94a3b8">Blocked</text>
            <line x1={170} y1={0} x2={190} y2={0} stroke="#f59e0b" strokeWidth={2} />
            <text x={195} y={4} fontSize={9} fill="#94a3b8">Flagged</text>
          </g>
        </svg>
      </WidgetCard>

      <div className="bg-neutral-900 rounded-xl border border-neutral-700 overflow-hidden">
        <div className="px-4 py-2.5 bg-neutral-800 border-b border-neutral-700">
          <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-200">INTRUSION DETECTION LOG</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-700">
              {["Time", "User", "Origin Dept", "Target Dept", "Data Requested", "Action"].map(h => (
                <th key={h} className="px-4 py-2 text-left text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {intrusionLog.map(l => (
              <tr key={l.id} className="border-b border-neutral-800 hover:bg-neutral-800/50 transition-colors">
                <td className="px-4 py-2.5 text-[11px] font-mono text-neutral-400">{l.time}</td>
                <td className="px-4 py-2.5 text-[12px] text-neutral-200">{l.user}</td>
                <td className="px-4 py-2.5 text-[12px] text-neutral-300">{l.originDept}</td>
                <td className="px-4 py-2.5 text-[12px] text-neutral-300">{l.targetDept}</td>
                <td className="px-4 py-2.5 text-[10px] font-mono text-neutral-400 max-w-[200px] truncate">{l.data}</td>
                <td className="px-4 py-2.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium ${actionStyles[l.action]}`}>{l.action}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== 5.1 DISCOVERY VISUALIZATIONS ====================
function DiscoveryVisualizations() {
  return <HeuristicGraphs />;
}

function HeuristicGraphs() {
  const [threshold, setThreshold] = useState(0.6);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const stages = [
    { id: "s1", label: "Purchase Request Filed", x: 100, y: 100, status: "ok", wait: "2 hrs", personnel: ["M. Cruz"] },
    { id: "s2", label: "Dept Head Approval", x: 280, y: 50, status: "ok", wait: "1 day", personnel: ["J. Santos"] },
    { id: "s3", label: "Budget Office Review", x: 460, y: 100, status: "critical", wait: "14 days", personnel: ["A. Fernandez"] },
    { id: "s4", label: "Mayor's Approval", x: 640, y: 60, status: "ok", wait: "3 days", personnel: ["L. Garcia"] },
    { id: "s5", label: "PO Issuance", x: 640, y: 160, status: "delay", wait: "7 days", personnel: ["P. Reyes"] },
    { id: "s6", label: "Supplier Delivery", x: 820, y: 110, status: "ok", wait: "5 days", personnel: ["External"] },
  ];

  const flows = [
    { from: 0, to: 1, freq: 95, critical: false },
    { from: 1, to: 2, freq: 90, critical: false },
    { from: 2, to: 3, freq: 85, critical: true },
    { from: 2, to: 4, freq: 30, critical: false },
    { from: 3, to: 5, freq: 80, critical: false },
    { from: 4, to: 5, freq: 25, critical: false },
  ];

  return (
    <div>
      <PageHeader title="Process Discovery & Topology">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-neutral-500">Heuristic Threshold:</span>
          <input type="range" min={0} max={1} step={0.05} value={threshold} onChange={(e) => setThreshold(+e.target.value)} className="w-24 accent-violet-600" />
        </div>
        <ActionButton><DocumentExport size={14} /> Export to BPMN</ActionButton>
      </PageHeader>

      <div className="flex gap-4 mb-5">
        <WidgetCard title="PROCESS STANDARDIZATION" className="w-[250px] shrink-0">
          <BatteryWidget label="Happy Path Conformance" value={82} />
          <div className="text-[10px] text-neutral-400 text-center mt-3">18% of cases take undocumented detours</div>
        </WidgetCard>

        <WidgetCard title="INTERACTIVE HEURISTIC GRAPH" className="flex-1 min-w-0 relative overflow-hidden">
          <div className="w-full h-[280px] overflow-auto bg-neutral-50 rounded-lg border border-neutral-200">
            <svg viewBox="0 0 950 240" className="w-full h-full min-w-[900px]">
              <defs>
                <marker id="arrow-norm" viewBox="0 0 10 10" refX="10" refY="5" markerWidth={6} markerHeight={6} orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                </marker>
                <marker id="arrow-crit" viewBox="0 0 10 10" refX="10" refY="5" markerWidth={6} markerHeight={6} orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
                </marker>
              </defs>
              {flows.map((f, i) => {
                const s1 = stages[f.from];
                const s2 = stages[f.to];
                const stroke = f.critical ? "#ef4444" : "#cbd5e1";
                const marker = f.critical ? "url(#arrow-crit)" : "url(#arrow-norm)";
                const strokeW = Math.max(1, (f.freq / 100) * 5);
                return (
                  <g key={`flow-${i}`}>
                    <line x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke={stroke} strokeWidth={strokeW} markerEnd={marker} className={f.critical ? "animate-pulse" : ""} />
                    <text x={(s1.x + s2.x)/2} y={(s1.y + s2.y)/2 - 5} fontSize={9} fill={stroke} textAnchor="middle">{f.freq}%</text>
                  </g>
                );
              })}
              {stages.map((s) => {
                const isCrit = s.status === "critical";
                const isSel = selectedNode === s.id;
                return (
                  <g key={s.id} onClick={() => setSelectedNode(s.id)} className="cursor-pointer">
                    <rect x={s.x - 60} y={s.y - 20} width={120} height={40} rx={4} fill={isSel ? "#e0e7ff" : "#ffffff"} stroke={isCrit ? "#ef4444" : isSel ? "#6366f1" : "#cbd5e1"} strokeWidth={isSel ? 2 : 1} className="transition-all hover:stroke-violet-400" />
                    <text x={s.x} y={s.y + 4} textAnchor="middle" fontSize={10} fill="#171717" fontFamily="Lexend, sans-serif" className="pointer-events-none">{s.label}</text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Side Drawer for Node Details */}
          {selectedNode && (
            <div className="absolute top-0 right-0 w-[240px] h-full bg-white border-l border-neutral-200 shadow-xl p-4 animate-in slide-in-from-right duration-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-800">Node Analytics</span>
                <button onClick={() => setSelectedNode(null)} className="text-neutral-400 hover:text-neutral-600"><Close size={16} /></button>
              </div>
              {stages.filter(s => s.id === selectedNode).map(s => (
                <div key={s.id}>
                  <div className="text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-500 uppercase tracking-wider mb-1">Activity</div>
                  <div className="text-[13px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-900 mb-4">{s.label}</div>
                  
                  <div className="text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-500 uppercase tracking-wider mb-1">Avg Wait Time</div>
                  <div className={`text-[18px] font-mono mb-4 ${s.status === 'critical' ? 'text-red-600' : 'text-neutral-800'}`}>{s.wait}</div>
                  
                  <div className="text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-500 uppercase tracking-wider mb-1">Personnel Involved</div>
                  <div className="flex flex-wrap gap-1">
                    {s.personnel.map(p => (
                      <span key={p} className="px-2 py-1 bg-neutral-100 rounded text-[10px] text-neutral-700">{p}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </WidgetCard>
      </div>
    </div>
  );
}

function ExecutionPaths() {
  const variants = [
    { id: "VAR-001", freq: 452, duration: "14.2 days", path: ["PR Filed", "Dept Head Approval", "Budget Review", "Mayor's Approval", "PO Issuance"], standard: true },
    { id: "VAR-002", freq: 128, duration: "22.5 days", path: ["PR Filed", "Dept Head Approval", "Budget Review", "Returned to Dept", "Budget Review", "PO Issuance"], standard: false },
    { id: "VAR-003", freq: 84, duration: "8.1 days", path: ["PR Filed", "Emergency Approval", "PO Issuance"], standard: false },
    { id: "VAR-004", freq: 56, duration: "35.0 days", path: ["PR Filed", "Dept Head Approval", "BAC Review", "Public Bidding", "Mayor's Approval", "PO Issuance"], standard: true },
  ];

  const topPaths = variants.map(v => ({ name: v.id, value: v.freq }));

  return (
    <div>
      <PageHeader title="Variant Analysis">
        <select className="px-3 py-2 rounded-lg border border-neutral-200 text-[11px] outline-none cursor-pointer bg-white">
          <option>Filter by Department Tenant</option>
          <option>Engineering</option>
          <option>Health</option>
        </select>
        <ActionButton variant="primary"><View size={14} /> Compare Selected Variants</ActionButton>
      </PageHeader>

      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
              <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-800">Process Variant Board</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100">
                  {["Variant ID", "Frequency", "Avg Duration", "Path Sequence"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {variants.map(v => (
                  <tr key={v.id} className="border-b border-neutral-50 hover:bg-neutral-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" className="rounded border-neutral-300" />
                        <span className="text-[12px] font-mono text-neutral-900">{v.id}</span>
                        {v.standard && <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] rounded-full">Standard</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] font-mono text-neutral-600">{v.freq}</td>
                    <td className="px-4 py-3 text-[12px] font-mono text-neutral-600">{v.duration}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center flex-wrap gap-1">
                        {v.path.map((step, i) => (
                          <span key={i} className="flex items-center gap-1">
                            <span className="px-2 py-1 bg-neutral-100 border border-neutral-200 rounded-md text-[10px] text-neutral-700 whitespace-nowrap">{step}</span>
                            {i < v.path.length - 1 && <span className="text-[10px] text-neutral-400">➡️</span>}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="w-[300px] shrink-0">
          <WidgetCard title="TOP EXECUTION PATHS">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topPaths} layout="vertical">
                <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis key="xaxis" type="number" tick={{ fontSize: 10 }} />
                <YAxis key="yaxis" type="category" dataKey="name" tick={{ fontSize: 10 }} width={60} />
                <Tooltip key="tooltip" contentStyle={{ fontSize: 11 }} />
                <Bar key="bar" dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} name="Frequency" />
              </BarChart>
            </ResponsiveContainer>
          </WidgetCard>
        </div>
      </div>
    </div>
  );
}

function EventLogAnalysis() {
  const logs = [
    { case: "PR-2026-041", act: "Purchase Request Filed", time: "2026-04-02 08:15:22", res: "user_104", life: "Complete" },
    { case: "PR-2026-041", act: "Dept Head Approval", time: "2026-04-02 10:42:11", res: "user_022", life: "Complete" },
    { case: "PR-2026-039", act: "Budget Office Review", time: "2026-04-02 11:05:00", res: "user_045", life: "Start" },
    { case: "PR-2026-042", act: "Purchase Request Filed", time: "2026-04-02 11:30:14", res: "user_118", life: "Complete" },
    { case: "PR-2026-039", act: "Budget Office Review", time: "2026-04-02 14:20:00", res: "user_045", life: "Complete" },
    { case: "PR-2026-038", act: "Mayor's Approval", time: "2026-04-02 15:10:44", res: "user_001", life: "Complete" },
  ];

  const overTime = Array.from({length: 12}, (_, i) => ({ time: `${8+i}:00`, events: Math.floor(Math.random() * 50) + 10 }));

  return (
    <div>
      <PageHeader title="Raw Telemetry & Event Logs">
        <ActionButton><Upload size={14} /> Upload XES/CSV Log</ActionButton>
        <ActionButton variant="primary"><Renew size={14} /> Trigger Database Sync</ActionButton>
      </PageHeader>

      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
              <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-800">Telemetry Grid</span>
              <span className="text-[10px] text-neutral-400">Total Events: 142,891</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100">
                  {["Case ID", "Activity Name", "Timestamp", "Resource", "Lifecycle"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider cursor-pointer hover:text-neutral-600">{h} ↕</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={i} className="border-b border-neutral-50 hover:bg-neutral-50/50">
                    <td className="px-4 py-3 text-[12px] font-mono text-neutral-900">{l.case}</td>
                    <td className="px-4 py-3 text-[12px] text-neutral-700">{l.act}</td>
                    <td className="px-4 py-3 text-[11px] font-mono text-neutral-500">{l.time}</td>
                    <td className="px-4 py-3 text-[12px] font-mono text-neutral-600">{l.res}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${l.life === 'Complete' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{l.life}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="w-[320px] shrink-0">
          <WidgetCard title="EVENTS OVER TIME (TODAY)">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={overTime}>
                <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis key="xaxis" dataKey="time" tick={{ fontSize: 10 }} />
                <YAxis key="yaxis" tick={{ fontSize: 10 }} />
                <Tooltip key="tooltip" contentStyle={{ fontSize: 11 }} />
                <Area key="area" type="step" dataKey="events" stroke="#10b981" fill="#d1fae5" name="Event Volume" />
              </AreaChart>
            </ResponsiveContainer>
          </WidgetCard>
        </div>
      </div>
    </div>
  );
}

// ==================== 5.2 GLOBAL COMPLIANCE ALERTS ====================
function GlobalComplianceAlerts() {
  return <ProcedureDeviations />;
}

function ProcedureDeviations() {
  const [selectedDev, setSelectedDev] = useState<string>("CMP-301");
  const deviations = [
    { id: "CMP-301", project: "Road Widening Phase 2", issue: "Bypassed mandatory public bidding (RA 9184)", dept: "Engineering", type: "Skipped" },
    { id: "CMP-298", project: "School Building Repair", issue: "Liquidation exceeded 30-day limit", dept: "Engineering", type: "Unauthorized" },
    { id: "CMP-295", project: "Health Center Renovation", issue: "Missing BAC resolution attachment", dept: "Health", type: "Out-of-Order" },
  ];

  const donutData = [
    { name: "Skipped Approvals", value: 40, color: "#ef4444" },
    { name: "Out-of-Order Execution", value: 35, color: "#f59e0b" },
    { name: "Unauthorized Resource", value: 25, color: "#3b82f6" },
  ];

  return (
    <div>
      <PageHeader title="Conformance & Deviation Tracking">
        <ActionButton><DocumentExport size={14} /> Update Normative Legal Model</ActionButton>
        <ActionButton variant="primary"><CheckmarkOutline size={14} /> Acknowledge Alerts</ActionButton>
      </PageHeader>

      <div className="flex gap-4">
        {/* Left Pane */}
        <div className="w-[320px] shrink-0">
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden mb-4">
            <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-800">Flagged Projects Inbox</span>
            </div>
            <div className="flex flex-col">
              {deviations.map(d => (
                <div key={d.id} onClick={() => setSelectedDev(d.id)} className={`p-4 border-b border-neutral-50 cursor-pointer transition-colors ${selectedDev === d.id ? 'bg-red-50/50 border-l-4 border-l-red-500' : 'hover:bg-neutral-50/80 border-l-4 border-l-transparent'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-mono text-neutral-900">{d.id}</span>
                    <span className="text-[10px] text-neutral-500">{d.dept}</span>
                  </div>
                  <div className="text-[12px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-800 mb-1">{d.project}</div>
                  <div className="text-[11px] text-red-600 line-clamp-2">{d.issue}</div>
                </div>
              ))}
            </div>
          </div>
          
          <WidgetCard title="DEVIATION BREAKDOWN">
            <div className="flex items-center gap-4">
              <PieChart width={100} height={100}>
                <Pie key="pie" data={donutData} cx="50%" cy="50%" innerRadius={30} outerRadius={45} paddingAngle={2} dataKey="value">
                  {donutData.map((e, i) => <Cell key={`cell-${i}`} fill={e.color} />)}
                </Pie>
                <Tooltip key="tooltip" contentStyle={{ fontSize: 10 }} />
              </PieChart>
              <div className="flex flex-col gap-1">
                {donutData.map(e => (
                  <div key={e.name} className="flex items-center gap-1.5">
                    <div className="size-2 rounded-full" style={{ backgroundColor: e.color }} />
                    <span className="text-[9px] text-neutral-600">{e.name} ({e.value}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </WidgetCard>
        </div>

        {/* Right Pane */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-neutral-200 h-full p-4 relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[14px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-900">BPMN Conformance Overlay</div>
                <div className="text-[11px] text-neutral-500 mt-1">Comparing Expected Model vs Actual Execution</div>
              </div>
              <div className="flex gap-3">
                <div className="flex items-center gap-1"><div className="w-4 h-1.5 bg-neutral-300 rounded" /><span className="text-[10px] text-neutral-600">Expected Path</span></div>
                <div className="flex items-center gap-1"><div className="w-4 h-1.5 bg-blue-500 rounded" /><span className="text-[10px] text-neutral-600">Actual Path</span></div>
              </div>
            </div>

            {selectedDev === "CMP-301" && (
              <div className="relative h-[300px] mt-8 bg-neutral-50 rounded-lg border border-neutral-200 flex items-center justify-center p-8">
                {/* Visualizing skipped step */}
                <div className="flex items-center justify-between w-full relative">
                  {/* Lines */}
                  <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-1.5 bg-neutral-300 z-0"></div>
                  <div className="absolute left-10 right-[60%] top-1/2 -translate-y-1/2 h-1.5 bg-blue-500 z-0"></div>
                  
                  {/* Nodes */}
                  <div className="z-10 flex flex-col items-center gap-2">
                    <div className="w-24 h-10 bg-white border-2 border-blue-500 rounded-lg flex items-center justify-center text-[10px] font-['Lexend:Medium',_sans-serif] shadow-sm">PR Filed</div>
                    <span className="text-[9px] text-blue-600 font-mono">Executed</span>
                  </div>
                  <div className="z-10 flex flex-col items-center gap-2 relative">
                    <div className="w-24 h-10 bg-white border-2 border-orange-500 border-dashed rounded-lg flex items-center justify-center text-[10px] font-['Lexend:Medium',_sans-serif] shadow-sm opacity-60">Public Bidding</div>
                    <div className="absolute -top-3 -right-3 size-6 bg-orange-500 rounded-full text-white flex items-center justify-center animate-bounce shadow-md">
                      <Warning size={12} />
                    </div>
                    <span className="text-[9px] text-orange-600 font-mono font-bold uppercase tracking-wider">Missing!</span>
                  </div>
                  <div className="z-10 flex flex-col items-center gap-2">
                    <div className="w-24 h-10 bg-white border-2 border-blue-500 rounded-lg flex items-center justify-center text-[10px] font-['Lexend:Medium',_sans-serif] shadow-sm">Award</div>
                    <span className="text-[9px] text-blue-600 font-mono">Executed</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CircumventionFlags() {
  const cards = {
    "New Flags": [
      { id: "FLG-102", user: "E. Cruz", avatar: "EC", score: 92, risk: "Critical", desc: "Split Purchase Order (₱499,000 x 3)" },
      { id: "FLG-105", user: "R. Tan", avatar: "RT", score: 85, risk: "High", desc: "Backdated Approval Signature" }
    ],
    "Under Investigation": [
      { id: "FLG-089", user: "J. Reyes", avatar: "JR", score: 76, risk: "High", desc: "Supplier Conflict of Interest" }
    ],
    "Escalated": [
      { id: "FLG-045", user: "M. Lim", avatar: "ML", score: 98, risk: "Critical", desc: "Ghost Delivery Pattern" }
    ],
    "Cleared": [
      { id: "FLG-012", user: "A. Santos", avatar: "AS", score: 25, risk: "Low", desc: "Valid Emergency Proc" }
    ]
  };

  const heatmap = [
    { x: "Eng", y: "Split PO", z: 12 }, { x: "Eng", y: "Ghost Del", z: 2 }, { x: "Health", y: "Backdate", z: 8 },
    { x: "IT", y: "Conflict", z: 4 }, { x: "Finance", y: "Split PO", z: 3 }, { x: "HR", y: "Backdate", z: 1 }
  ];

  return (
    <div>
      <PageHeader title="Fraud & Anomaly Detection">
        <ActionButton variant="primary"><span className="text-red-50 font-['Lexend:Medium',_sans-serif] bg-red-600 px-3 py-1.5 rounded-lg w-full flex items-center gap-1.5"><Warning size={14} /> Escalate to City Legal/COA</span></ActionButton>
      </PageHeader>

      <div className="flex gap-4 mb-6">
        {Object.entries(cards).map(([col, list]) => (
          <div key={col} className={`flex-1 bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden`}>
            <div className="px-3 py-2.5 flex items-center justify-between border-b border-neutral-200">
              <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-700">{col}</span>
              <span className="text-[11px] bg-neutral-200 text-neutral-600 rounded-full px-2 py-0.5">{list.length}</span>
            </div>
            <div className="px-2 py-2 flex flex-col gap-2">
              {list.map(c => (
                <div key={c.id} className="bg-white rounded-lg border border-neutral-200 p-3 shadow-sm hover:shadow transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-neutral-500">{c.id}</span>
                    <div className={`px-2 py-0.5 rounded text-[10px] font-['Lexend:SemiBold',_sans-serif] ${c.score > 90 ? 'bg-red-100 text-red-700' : c.score > 70 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>Score: {c.score}</div>
                  </div>
                  <div className="text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-800 mb-2 leading-tight">{c.desc}</div>
                  <div className="flex items-center gap-1.5">
                    <div className="size-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[8px] font-bold">{c.avatar}</div>
                    <span className="text-[10px] text-neutral-600">{c.user}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <WidgetCard title="DEPARTMENTAL RISK HEATMAP (HOTSPOTS)">
        <ResponsiveContainer width="100%" height={220}>
          <ScatterChart>
            <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis key="xaxis" dataKey="x" type="category" name="Department" tick={{ fontSize: 10 }} />
            <YAxis key="yaxis" dataKey="y" type="category" name="Anomaly" tick={{ fontSize: 10 }} width={80} />
            <Tooltip key="tooltip" cursor={{ strokeDasharray: '3 3' }} contentStyle={{ fontSize: 11 }} />
            <Scatter key="scatter" name="Anomalies" data={heatmap} fill="#ef4444">
              {heatmap.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.z > 10 ? "#991b1b" : entry.z > 5 ? "#ef4444" : "#fca5a5"} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </WidgetCard>
    </div>
  );
}

function AuditFeed() {
  const feed = [
    { id: "PR-2026-112", rule: "Public Bidding Threshold (RA 9184)", result: "Pass", time: "10:45:12 AM" },
    { id: "PR-2026-112", rule: "Vendor Blacklist Check", result: "Pass", time: "10:45:13 AM" },
    { id: "PR-2026-113", rule: "Budget Availability (GAA)", result: "Pass", time: "10:46:01 AM" },
    { id: "PR-2026-114", rule: "Split PO Detection", result: "Fail", time: "10:48:22 AM" },
    { id: "PR-2026-114", rule: "Historical Pricing Check", result: "Pass", time: "10:48:25 AM" },
    { id: "PR-2026-115", rule: "Liquidation Period (30 Days)", result: "Fail", time: "10:52:10 AM" },
  ];

  return (
    <div>
      <div className="flex flex-col items-center justify-center mb-6 bg-white rounded-xl border border-neutral-200 py-6">
        <div className="text-[12px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-500 tracking-widest uppercase mb-2">Global Compliance Score</div>
        <div className="text-[48px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-emerald-600 flex items-baseline">98.5<span className="text-[20px] text-neutral-400 ml-1">%</span></div>
        <div className="flex items-center gap-1.5 mt-1 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
          <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-emerald-700">Real-time LGU-wide compliance</span>
        </div>
      </div>

      <PageHeader title="Real-Time Compliance Ledger">
        <select className="px-3 py-2 rounded-lg border border-neutral-200 text-[11px] outline-none cursor-pointer bg-white">
          <option>Filter by Violation Type</option>
          <option>Only Fails</option>
        </select>
        <ActionButton><DocumentExport size={14} /> Export to PDF/Excel</ActionButton>
      </PageHeader>

      <div className="bg-[#0a0a0a] rounded-xl border border-neutral-800 p-4 font-mono text-[12px] h-[400px] overflow-y-auto shadow-inner relative">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <div className="size-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] text-green-500 tracking-wider">LIVE</span>
        </div>
        {feed.map((f, i) => (
          <div key={i} className="mb-2 py-1 border-b border-neutral-800/50 flex items-center gap-3">
            <span className="text-neutral-500 w-24 shrink-0">{f.time}</span>
            <span className="text-blue-400 w-24 shrink-0">[{f.id}]</span>
            <span className="text-neutral-300 flex-1">Evaluated against {f.rule}</span>
            <span className="text-neutral-500 mr-2">Result:</span>
            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider w-14 text-center ${f.result === 'Pass' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
              {f.result}
            </span>
          </div>
        ))}
        <div className="mt-4 text-neutral-600 animate-pulse">_ Waiting for next event...</div>
      </div>
    </div>
  );
}

// ==================== MAIN EXPORT ====================

// Map section+subpage to components
const superAdminPages: Record<string, Record<string, React.ComponentType>> = {
  scc: {
    "Infrastructure Health": InfrastructureHealth,
    "Global Error Logs": GlobalErrorLogs,
  },
  ai: {
    "Genetic Algorithm Tuning": GeneticAlgorithmTuning,
    "Fitness Function Variables": FitnessFunctionVariables,
    "Workload Weighting": WorkloadWeighting,
    "Competency Mapping": CompetencyMapping,
    "Local Optima Prevention": LocalOptimaPrevention,
    "Predictive Analytics Engine": PredictiveAnalyticsEngine,
    "Burnout Classifiers": BurnoutClassifiers,
    "Project Forecasting": ProjectForecasting,
    "Confidence Intervals": ConfidenceIntervals,
    "Feature Importance": FeatureImportance,
    "NLP Engine Diagnostics": NLPEngineDiagnostics,
    "Stand-Up Ingestion": StandUpIngestion,
    "Voice-to-Text Pipeline": VoiceToTextPipeline,
    "Viber Chatbot Health": ViberChatbotHealth,
  },
  blockchain: {
    "Ledger Diagnostics": LedgerDiagnostics,
    "Consensus Health": ConsensusHealth,
    "Block Confirmation Times": BlockConfirmationTimes,
    "Node Synchronization": NodeSynchronization,
    "Smart Contract Management": SmartContractManagement,
    "Budget Allocation Logic": BudgetAllocationLogic,
    "Automated Fund Returns": AutomatedFundReturns,
    "Audit Parameters": AuditParameters,
  },
  iam: {
    "Global RBAC Configuration": GlobalRBACConfiguration,
    "Role Assignment": RoleAssignment,
    "HRMO Integration": HRMOIntegration,
    "Offboarding Automation": OffboardingAutomation,
    "Tenant Isolation Controls": TenantIsolationControls,
    "Data Partitioning": DataPartitioning,
    "Privacy Compliance": PrivacyCompliance,
    "Cross-Dept Isolation": CrossDeptIsolation,
  },
  pm: {
    "Discovery Visualizations": DiscoveryVisualizations,
    "Heuristic Graphs": HeuristicGraphs,
    "Execution Paths": ExecutionPaths,
    "Event Log Analysis": EventLogAnalysis,
    "Global Compliance Alerts": GlobalComplianceAlerts,
    "Procedure Deviations": ProcedureDeviations,
    "Circumvention Flags": CircumventionFlags,
    "Audit Feed": AuditFeed,
  },
};

// Default pages per section
export const defaultPages: Record<string, string> = {
  scc: "Infrastructure Health",
  ai: "Genetic Algorithm Tuning",
  blockchain: "Ledger Diagnostics",
  iam: "Global RBAC Configuration",
  pm: "Discovery Visualizations",
};

export function SuperAdminContent({ activeSection, activePage }: { activeSection: string; activePage?: string }) {
  const section = superAdminPages[activeSection];
  if (!section) return <PlaceholderContent section={activeSection} />;

  const pageName = activePage || defaultPages[activeSection] || Object.keys(section)[0];
  const PageComponent = section[pageName];
  if (!PageComponent) {
    const fallback = Object.values(section)[0];
    if (fallback) {
      const FallbackComp = fallback;
      return <FallbackComp />;
    }
    return <PlaceholderContent section={activeSection} />;
  }
  return <PageComponent />;
}

function PlaceholderContent({ section }: { section: string }) {
  return (
    <div className="flex items-center justify-center h-full text-neutral-400">
      <div className="text-center">
        <Settings size={40} className="mx-auto mb-3 opacity-30" />
        <p className="text-[14px] font-['Lexend:Regular',_sans-serif]">Select a page from the sidebar</p>
        <p className="text-[12px] mt-1">Section: {section}</p>
      </div>
    </div>
  );
}

export { superAdminPages };
