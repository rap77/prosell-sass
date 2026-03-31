"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function DataGridSkeleton() {
  return (
    <div className="w-full border border-border rounded-lg overflow-hidden">
      <div className="h-[600px] overflow-auto">
        <table className="w-full border-collapse">
          <thead className="bg-muted sticky top-0 z-10">
            <tr>
              {[...Array(6)].map((_, i) => (
                <th key={i} className="px-4 py-3 text-left">
                  <Skeleton className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(10)].map((_, i) => (
              <tr key={i} className="border-b border-border">
                {[...Array(6)].map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <Skeleton className="h-8 w-full" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
