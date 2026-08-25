export type ReviewKind = "tasks" | "subtasks" | "budget";

export function ReviewKindSwitch({
  active,
  onChange,
  includeBudget = false,
}: {
  active: ReviewKind;
  onChange: (next: ReviewKind) => void;
  includeBudget?: boolean;
}) {
  const kinds: ReviewKind[] = includeBudget
    ? ["tasks", "subtasks", "budget"]
    : ["tasks", "subtasks"];

  return (
    <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-0.5">
      {kinds.map((kind) => (
        <button
          key={kind}
          type="button"
          onClick={() => onChange(kind)}
          className={`rounded-md px-2.5 py-1 text-[11px] font-['Lexend:Medium',_sans-serif] capitalize ${
            active === kind ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-neutral-50"
          }`}
        >
          {kind}
        </button>
      ))}
    </div>
  );
}
