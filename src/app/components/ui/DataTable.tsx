// ─── Reusable DataTable Component ────────────────────────────────
import React, { useState, useMemo } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  sortable?: boolean;
  sortValue?: (item: T) => string | number;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  searchPlaceholder?: string;
  searchFilter?: (item: T, query: string) => boolean;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  toolbar?: React.ReactNode;
  totalRecords?: number;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  searchPlaceholder = "Search...",
  searchFilter,
  loading,
  emptyMessage = "No data found",
  emptyIcon,
  toolbar,
  totalRecords,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    let result = data;
    if (search && searchFilter) {
      result = result.filter((item) => searchFilter(item, search.toLowerCase()));
    }
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      if (col?.sortValue) {
        const fn = col.sortValue;
        result = [...result].sort((a, b) => {
          const va = fn(a);
          const vb = fn(b);
          const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
          return sortDir === "asc" ? cmp : -cmp;
        });
      }
    }
    return result;
  }, [data, search, searchFilter, sortKey, sortDir, columns]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      {/* Search */}
      {searchFilter && (
        <div className="px-4 py-3 border-b border-neutral-100">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[260px] flex-1">
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" fill="currentColor">
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85zm-5.242.156a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-neutral-200 text-[12px] font-['Lexend:Regular',_sans-serif] outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-200 bg-neutral-50"
              />
            </div>
            {toolbar}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-2.5 text-left text-[10px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider ${
                    col.sortable ? "cursor-pointer select-none hover:text-neutral-600" : ""
                  }`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      <svg viewBox="0 0 8 8" className="w-2 h-2" fill="currentColor">
                        {sortDir === "asc" ? <path d="M4 1L7 6H1z" /> : <path d="M4 7L1 2h6z" />}
                      </svg>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skel-${i}`} className="border-b border-neutral-50">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-4 bg-neutral-100 rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  {emptyIcon && <div className="flex justify-center mb-3 text-neutral-300">{emptyIcon}</div>}
                  <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-400">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                  className={`border-b border-neutral-50 transition-colors ${
                    onRowClick ? "cursor-pointer hover:bg-neutral-50/70" : ""
                  }`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Row count */}
      {!loading && (
        <div className="px-4 py-2 border-t border-neutral-100 text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-400">
          {filtered.length} of {totalRecords ?? data.length} records
        </div>
      )}
    </div>
  );
}
