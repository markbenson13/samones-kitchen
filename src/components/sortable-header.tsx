"use client";

export type SortState<K extends string> = { key: K; dir: "asc" | "desc" } | null;

export function SortableHeader<K extends string>({
  label,
  sortKey,
  currentSort,
  onSort,
  className = "px-4 py-3",
}: {
  label: string;
  sortKey: K;
  currentSort: SortState<K>;
  onSort: (key: K) => void;
  className?: string;
}) {
  const isActive = currentSort?.key === sortKey;

  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 hover:text-brand-red"
      >
        {label}
        <span className="w-2.5 text-[10px] leading-none">
          {isActive ? (currentSort.dir === "asc" ? "▲" : "▼") : ""}
        </span>
      </button>
    </th>
  );
}

// Cycles asc -> desc -> unsorted (null) each time the same column is clicked;
// picking a different column always starts fresh at asc.
export function nextSortState<K extends string>(
  current: SortState<K>,
  key: K
): SortState<K> {
  if (current?.key !== key) return { key, dir: "asc" };
  if (current.dir === "asc") return { key, dir: "desc" };
  return null;
}

export function compareValues(a: string | number, b: string | number) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
