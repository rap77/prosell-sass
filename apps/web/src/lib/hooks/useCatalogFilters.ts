"use client";

import { useSearchParams, useRouter } from "next/navigation";
import type { FilterField } from "@/types/category";

export function useCatalogFilters(fields: FilterField[]) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const values: Record<string, string> = {};
  for (const f of fields) {
    if (f.filter_type === "range") {
      values[`${f.key}_min`] = searchParams.get(`${f.key}_min`) ?? "";
      values[`${f.key}_max`] = searchParams.get(`${f.key}_max`) ?? "";
    } else {
      values[f.key] = searchParams.get(f.key) ?? "";
    }
  }

  const setFilter = (key: string, value: string | string[]) => {
    const params = new URLSearchParams(searchParams);
    const next = Array.isArray(value) ? value.join(",") : value;
    if (next) params.set(key, next);
    else params.delete(key);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const clearAll = () => router.push("?", { scroll: false });

  return { values, setFilter, clearAll };
}
