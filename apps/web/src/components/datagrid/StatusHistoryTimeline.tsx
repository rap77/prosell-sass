"use client";

import { Clock } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/format";
import { StatusBadge } from "./StatusBadge";

export interface StatusHistoryItem {
  status: "published" | "pending" | "failed" | "draft" | "expired" | "online" | "sold";
  changed_at: string;
  changed_by?: string;
  note?: string;
}

interface StatusHistoryTimelineProps {
  history: StatusHistoryItem[];
  vehicleTitle: string;
}

export function StatusHistoryTimeline({
  history,
  vehicleTitle,
}: StatusHistoryTimelineProps) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No status history available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-foreground">
        Status History for {vehicleTitle}
      </h3>
      <div className="relative pl-6 border-l-2 border-border">
        {history.map((item, index) => (
          <div key={index} className="mb-6 last:mb-0 relative">
            {/* Timeline dot */}
            <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-background border-2 border-primary" />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <StatusBadge status={item.status} />
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(item.changed_at)}
                </span>
              </div>

              <div className="text-sm">
                {item.changed_by && (
                  <span className="text-muted-foreground">
                    Changed by {item.changed_by}
                  </span>
                )}
                {item.changed_by && item.note && <span className="mx-2">•</span>}
                {item.note && (
                  <span className="text-muted-foreground italic">{item.note}</span>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                {new Date(item.changed_at).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
