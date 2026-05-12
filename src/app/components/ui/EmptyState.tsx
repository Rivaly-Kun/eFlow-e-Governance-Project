// ─── Empty State Component ───────────────────────────────────────
import React from "react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {icon && <div className="text-neutral-300 mb-4">{icon}</div>}
      <h3 className="text-[15px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-700 mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-400 text-center max-w-sm mb-4">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
