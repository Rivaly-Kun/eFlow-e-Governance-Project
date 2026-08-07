import * as React from "react";

export interface ContextMenuState {
  x: number;
  y: number;
  orgId?: string;
}

export function ContextMenu({
  menu,
  onClose,
  onAddChild,
  onEdit,
  onAssignHead,
  onDelete,
  canDelete,
}: {
  menu: ContextMenuState;
  onClose: () => void;
  onAddChild: () => void;
  onEdit: () => void;
  onAssignHead: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.context-menu')) onClose();
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escHandler);
    };
  }, [onClose]);

  return (
    <div
      className="context-menu fixed z-50 bg-white rounded-xl border border-neutral-200 shadow-lg py-1 min-w-[180px]"
      style={{ left: menu.x, top: menu.y }}
    >
      {menu.orgId && (
        <>
          <button
            onClick={() => { onAddChild(); onClose(); }}
            className="w-full text-left px-3 py-2 text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-700 hover:bg-neutral-50 cursor-pointer flex items-center gap-2"
          >
            <span className="text-[14px]">+</span> Add child dept
          </button>
          <button
            onClick={() => { onEdit(); onClose(); }}
            className="w-full text-left px-3 py-2 text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-700 hover:bg-neutral-50 cursor-pointer flex items-center gap-2"
          >
            <span className="text-[14px]">✏️</span> Edit
          </button>
          <button
            onClick={() => { onAssignHead(); onClose(); }}
            className="w-full text-left px-3 py-2 text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-700 hover:bg-neutral-50 cursor-pointer flex items-center gap-2"
          >
            <span className="text-[14px]">👤</span> Assign head
          </button>
          <div className="border-t border-neutral-100 my-1" />
          <button
            onClick={() => { onDelete(); onClose(); }}
            disabled={!canDelete}
            className={`w-full text-left px-3 py-2 text-[12px] font-['Lexend:Medium',_sans-serif] cursor-pointer flex items-center gap-2
              ${canDelete ? 'text-red-600 hover:bg-red-50' : 'text-neutral-300 cursor-not-allowed'}`}
          >
            <span className="text-[14px]">🗑</span> Delete
          </button>
        </>
      )}
      {!menu.orgId && (
        <button
          onClick={() => { onAddChild(); onClose(); }}
          className="w-full text-left px-3 py-2 text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-700 hover:bg-neutral-50 cursor-pointer flex items-center gap-2"
        >
          <span className="text-[14px]">+</span> Add department
        </button>
      )}
    </div>
  );
}

// ─── Add/Edit Org Modal ──────────────────────────────────────────
