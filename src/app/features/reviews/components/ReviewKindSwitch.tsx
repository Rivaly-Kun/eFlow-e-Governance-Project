export function ReviewKindSwitch({
  active,
  onChange,
}: {
  active: "tasks" | "subtasks";
  onChange: (next: "tasks" | "subtasks") => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-0.5">
      {(["tasks", "subtasks"] as const).map((kind) => (
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
