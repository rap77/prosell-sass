"use client";

/**
 * BulkUploadErrorModal — modal shown after a bulk CSV upload completes
 * with partial failures.
 *
 * Renders a summary (`X uploaded, Y failed`) plus a scrollable table of
 * error rows (row_number, column, message). Users can download the full
 * error report via `GET /api/v1/products/bulk-upload/errors.csv?upload_id={id}`
 * (backend PR1, 24h-retention table).
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { BulkUploadUploadResult } from "@/lib/api/schemas/bulkUpload";

interface BulkUploadErrorModalProps {
  result: BulkUploadUploadResult;
  open: boolean;
  onClose: () => void;
}

export function BulkUploadErrorModal({
  result,
  open,
  onClose,
}: BulkUploadErrorModalProps) {
  const handleDownload = async () => {
    const res = await fetch(
      `/api/v1/products/bulk-upload/errors.csv?upload_id=${result.upload_id}`,
      { credentials: "include" },
    );
    if (!res.ok) return;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bulk-upload-errors-${result.upload_id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl" aria-label="Upload errors">
        <DialogHeader>
          <DialogTitle>Upload complete with errors</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          <span className="text-foreground font-medium">
            {result.created_count} uploaded
          </span>
          {" — "}
          <span className="text-destructive font-medium">
            {result.failed_count} failed
          </span>
          {" (out of "}
          {result.total_rows}
          {" rows)"}
        </p>

        <div className="max-h-72 overflow-y-auto rounded border">
          <table className="w-full text-sm">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="w-16 px-3 py-2 text-left font-medium">Row</th>
                <th className="px-3 py-2 text-left font-medium">Column</th>
                <th className="px-3 py-2 text-left font-medium">Error</th>
              </tr>
            </thead>
            <tbody>
              {result.errors.map((err) => (
                <tr
                  key={`${err.row_number}-${err.column ?? "unknown"}`}
                  className="border-t"
                >
                  <td className="px-3 py-2 font-mono text-xs">
                    {err.row_number}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {err.column ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-destructive">{err.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleDownload}
            aria-label="Download errors CSV"
          >
            Download CSV
          </Button>
          <Button onClick={onClose} aria-label="Done">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
