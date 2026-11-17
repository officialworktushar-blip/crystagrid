"use client";

import { useCallback, useMemo, useRef, useState } from "react";

export type FilterValue = string | boolean;
export type FilterState = Record<string, FilterValue>;

export function useFilters<T extends FilterState>(initialFilters: T = {} as T) {
  const [filters, setFilters] = useState<T>(initialFilters);
  const initialRef = useRef(initialFilters);

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  }, []);

  const clear = useCallback(() => {
    setFilters(initialRef.current);
  }, []);

  const activeCount = useMemo(
    () =>
      Object.values(filters).filter((value) =>
        typeof value === "boolean" ? value : value.trim().length > 0,
      ).length,
    [filters],
  );

  return { filters, set, clear, activeCount };
}
