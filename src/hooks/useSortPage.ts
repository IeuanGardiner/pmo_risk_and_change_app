import { useEffect, useMemo, useState } from "react";

/* ----------------------------------------------------------------------------
   Shared column sorting + pagination for register tables. Accessors should be
   module-level constants so the sort memo stays stable across renders.
   -------------------------------------------------------------------------- */

export type SortDir = "asc" | "desc";

export interface SortState<K extends string> {
  key: K;
  dir: SortDir;
}

export function useSortPage<Row, K extends string>({
  rows,
  accessors,
  initialSort,
  pageSize = 25,
}: {
  rows: Row[];
  accessors: Record<K, (r: Row) => string | number | null>;
  initialSort: SortState<K>;
  pageSize?: number;
}) {
  const [sort, setSort] = useState<SortState<K>>(initialSort);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const acc = accessors[sort.key];
    const mul = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = acc(a);
      const vb = acc(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1; // nulls last, regardless of direction
      if (vb == null) return -1;
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb));
      return cmp * mul;
    });
  }, [rows, sort, accessors]);

  // Filter changes produce a new rows array — snap back to the first page.
  useEffect(() => {
    setPage(0);
  }, [rows]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const clampedPage = Math.min(page, pageCount - 1);
  const pageRows = useMemo(
    () => sorted.slice(clampedPage * pageSize, (clampedPage + 1) * pageSize),
    [sorted, clampedPage, pageSize],
  );

  const toggleSort = (key: K) =>
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );

  return {
    /** Full sorted set (use for CSV export). */
    sorted,
    pageRows,
    sort,
    toggleSort,
    page: clampedPage,
    setPage,
    pageCount,
    pageSize,
    total: sorted.length,
  };
}
