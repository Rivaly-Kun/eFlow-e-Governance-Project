import { useMigrationToolController } from './useMigrationToolController';

export function MigrationTool() {
  const { blocked, checking, complete, logEndRef, logs, progress, runMigration, running, stats, userProfile } = useMigrationToolController();

if (!userProfile || userProfile.role !== "super_admin") {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#FF3B30]" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className="text-[18px] font-['Lexend:SemiBold',_sans-serif] text-[#323338] mb-1">
            Access Restricted
          </h2>
          <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-[#676879]">
            Only Super Admin accounts can access the Migration Tool.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-['Lexend:Medium',_sans-serif] text-[#676879] uppercase tracking-wider mb-1">
            <svg viewBox="0 0 16 16" className="w-3 h-3" fill="currentColor">
              <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm.5 4.5v5h-1v-5h1zM8 12a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5z" />
            </svg>
            Super Admin · One-Time Utility
          </div>
          <h1 className="text-[22px] font-['Lexend:SemiBold',_sans-serif] text-[#323338]">
            Database Migration Tool
          </h1>
          <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-[#676879] mt-0.5">
            Migrates legacy array-based /departments and /employees to the new keyed-object schema.
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#0085FF]/10 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#0085FF]" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-blue-900 mb-1">
            What this migration does
          </div>
          <ul className="text-[12px] font-['Lexend:Regular',_sans-serif] text-blue-800 space-y-1 list-disc list-inside">
            <li>Reads <code className="bg-blue-100 px-1 py-0.5 rounded text-[11px]">/departments</code> array → rewrites as <code className="bg-blue-100 px-1 py-0.5 rounded text-[11px]">/departments/{"{"} id {"}"}</code></li>
            <li>Reads <code className="bg-blue-100 px-1 py-0.5 rounded text-[11px]">/employees</code> array → creates <code className="bg-blue-100 px-1 py-0.5 rounded text-[11px]">/users/{"{"} uid {"}"}</code> with role mapping</li>
            <li>Links Department Heads to their <code className="bg-blue-100 px-1 py-0.5 rounded text-[11px]">departments/{"{"} id {"}"}/headUid</code></li>
            <li>Legacy <code className="bg-blue-100 px-1 py-0.5 rounded text-[11px]">/employees</code> and <code className="bg-blue-100 px-1 py-0.5 rounded text-[11px]">/projects</code> arrays are kept read-only</li>
          </ul>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <div className="text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-[#676879] mb-1">
            Departments
          </div>
          <div className="text-[28px] font-['Lexend:SemiBold',_sans-serif] text-[#323338] tabular-nums">
            {stats.departments.migrated}
            <span className="text-[14px] text-[#676879] font-normal">
              {" "}/ {stats.departments.total || "—"}
            </span>
          </div>
          {stats.departments.total > 0 && (
            <div className="h-1.5 bg-neutral-100 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-[#0085FF] rounded-full transition-all duration-500"
                style={{
                  width: `${(stats.departments.migrated / stats.departments.total) * 100}%`,
                }}
              />
            </div>
          )}
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <div className="text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-[#676879] mb-1">
            Employees → Users
          </div>
          <div className="text-[28px] font-['Lexend:SemiBold',_sans-serif] text-[#323338] tabular-nums">
            {stats.employees.migrated}
            <span className="text-[14px] text-[#676879] font-normal">
              {" "}/ {stats.employees.total || "—"}
            </span>
          </div>
          {stats.employees.total > 0 && (
            <div className="h-1.5 bg-neutral-100 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-[#00CA72] rounded-full transition-all duration-500"
                style={{
                  width: `${(stats.employees.migrated / stats.employees.total) * 100}%`,
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {(running || complete) && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-['Lexend:Medium',_sans-serif] text-[#676879] uppercase tracking-wider">
              Overall Progress
            </span>
            <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-[#323338] tabular-nums">
              {progress}%
            </span>
          </div>
          <div className="h-2.5 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                complete ? "bg-[#00CA72]" : "bg-[#0085FF]"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex items-center gap-3 mb-6">
        {checking ? (
          <div className="flex items-center gap-2 text-[13px] font-['Lexend:Regular',_sans-serif] text-[#676879]">
            <div className="w-4 h-4 border-2 border-neutral-300 border-t-[#0085FF] rounded-full animate-spin" />
            Checking /users node...
          </div>
        ) : complete ? (
          <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#00CA72] text-white">
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
              <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
            </svg>
            <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif]">
              Migration Complete
            </span>
          </div>
        ) : (
          <button
            id="run-migration-btn"
            onClick={runMigration}
            disabled={running || blocked}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[13px] font-['Lexend:SemiBold',_sans-serif] transition-all cursor-pointer ${
              blocked
                ? "bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed"
                : running
                  ? "bg-[#0085FF]/80 text-white cursor-wait"
                  : "bg-[#0085FF] hover:bg-[#006FD6] active:bg-[#005CB8] text-white shadow-lg shadow-blue-500/20"
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {running ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Running Migration...
              </>
            ) : blocked ? (
              <>
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Migration Blocked
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Run Migration
              </>
            )}
          </button>
        )}

        {blocked && !complete && (
          <p className="text-[12px] font-['Lexend:Regular',_sans-serif] text-[#FF3B30]">
            /users node already has data. Clear it in Firebase Console to re-run.
          </p>
        )}
      </div>

      {/* Log Panel */}
      <div className="bg-[#1e1e2e] rounded-xl border border-neutral-700 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-700 bg-[#181825]">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#FF3B30]" />
            <div className="w-3 h-3 rounded-full bg-[#FFCB00]" />
            <div className="w-3 h-3 rounded-full bg-[#00CA72]" />
          </div>
          <span className="text-[11px] font-mono text-neutral-500 ml-2">
            migration-log — {logs.length} entries
          </span>
        </div>
        <div className="h-[320px] overflow-y-auto p-4 font-mono text-[12px] leading-relaxed space-y-0.5">
          {logs.length === 0 ? (
            <div className="text-neutral-500 italic">
              Waiting for migration to start...
            </div>
          ) : (
            logs.map((entry, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-neutral-600 shrink-0 tabular-nums">
                  [{entry.timestamp}]
                </span>
                <span
                  className={
                    entry.type === "success"
                      ? "text-emerald-400"
                      : entry.type === "error"
                        ? "text-red-400"
                        : entry.type === "warn"
                          ? "text-amber-400"
                          : "text-neutral-300"
                  }
                >
                  {entry.message}
                </span>
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}
