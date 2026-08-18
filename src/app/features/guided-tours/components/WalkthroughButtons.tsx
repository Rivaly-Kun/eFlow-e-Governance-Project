import { CircleHelp, Compass } from "lucide-react";
import { useGuidedTour } from "./GuidedTourProvider";

export function PageWalkthroughButton() {
  const { isTourActive, startPageTour } = useGuidedTour();
  return (
    <button
      type="button"
      data-tour-id="page-walkthrough"
      onClick={startPageTour}
      disabled={isTourActive}
      className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11.5px] font-['Lexend:Medium',_sans-serif] text-violet-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-violet-100 hover:shadow-md active:translate-y-0 disabled:opacity-40 motion-reduce:transform-none"
    >
      <CircleHelp size={14} /> Walkthrough
    </button>
  );
}

export function SystemWalkthroughButton({ collapsed, onBeforeStart }: { collapsed: boolean; onBeforeStart?: () => void }) {
  const { isTourActive, startSystemTour } = useGuidedTour();
  const start = () => {
    onBeforeStart?.();
    window.setTimeout(startSystemTour, collapsed ? 260 : 0);
  };
  return (
    <button
      type="button"
      data-tour-id="system-walkthrough"
      onClick={start}
      disabled={isTourActive}
      className={`flex items-center gap-3 rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-[13px] font-['Lexend:Medium',_sans-serif] text-violet-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-violet-100 hover:shadow-sm active:translate-y-0 disabled:opacity-40 motion-reduce:transform-none ${collapsed ? "justify-center" : ""}`}
      title={collapsed ? "Start walkthrough" : undefined}
    >
      <Compass size={16} className="shrink-0" />
      {!collapsed && <span className="flex-1 text-left truncate">Start Walkthrough</span>}
    </button>
  );
}
