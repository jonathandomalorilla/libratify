import { useEffect, useMemo, useState } from "react";

export function useSort<K extends string>(initial: K, dir: "asc" | "desc" = "asc") {
  const [sort, setSort] = useState<{ key: K; dir: "asc" | "desc" }>({ key: initial, dir });
  const onSort = (key: K) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  return { sort, onSort };
}

export function sortBy<T>(rows: T[], get: (r: T) => string | number, dir: "asc" | "desc") {
  const m = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = get(a), y = get(b);
    return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * m;
  });
}

export function usePagination<T>(rows: T[], pageSize = 10, resetKey?: unknown) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  useEffect(() => setPage(1), [resetKey]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);
  const pageRows = useMemo(() => rows.slice((page - 1) * pageSize, page * pageSize), [rows, page, pageSize]);
  return { page, setPage, pageCount, pageRows, total: rows.length, pageSize };
}
