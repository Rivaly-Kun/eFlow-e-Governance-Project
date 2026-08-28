export type ReviewKind = "tasks" | "workplans" | "governance" | "subtasks" | "budget";

export interface ReviewKindSwitchProps {
  active: ReviewKind;
  onChange: (next: ReviewKind) => void;
  includeBudget?: boolean;
  counts?: Partial<Record<ReviewKind, number>>;
}

export function ReviewKindSwitch({
  active,
  onChange,
  includeBudget = false,
  counts = {},
}: ReviewKindSwitchProps) {
  const kinds: { id: ReviewKind; label: string }[] = [
    { id: "workplans", label: "Work Plans" },
    { id: "tasks", label: "Project Tasks" },
    { id: "governance", label: "Governance & Sign-off" },
    { id: "subtasks", label: "Subtasks" },
    ...(includeBudget ? [{ id: "budget" as const, label: "Budget" }] : []),
  ];

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-neutral-200/80 bg-neutral-100/70 p-1 font-['Montserrat',sans-serif]">
      {kinds.map((kind) => {
        const count = counts[kind.id];
        const isActive = active === kind.id;
        return (
          <button
            key={kind.id}
            type="button"
            onClick={() => onChange(kind.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              isActive
                ? "bg-white text-neutral-900 shadow-xs"
                : "text-neutral-500 hover:text-neutral-800 hover:bg-white/40"
            }`}
          >
            <span>{kind.label}</span>
            {typeof count === "number" && count > 0 && (
              <span
                className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "bg-neutral-200/80 text-neutral-600"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
