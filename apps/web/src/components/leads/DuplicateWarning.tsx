"use client";

import { AlertTriangle } from "lucide-react";

/**
 * Represents a single duplicate lead match from the API.
 */
export interface DuplicateMatch {
  lead_id: string;
  match_type: "email" | "phone" | "both";
  confidence: "high" | "medium" | "low";
}

interface DuplicateWarningProps {
  /** List of duplicate matches detected for this lead */
  duplicates: DuplicateMatch[];
  /** Optional callback when user clicks on a duplicate lead link */
  onLeadClick?: (leadId: string) => void;
  className?: string;
}

const CONFIDENCE_LABELS: Record<DuplicateMatch["confidence"], string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const CONFIDENCE_CLASSES: Record<DuplicateMatch["confidence"], string> = {
  high: "text-red-700 bg-red-50 border-red-200",
  medium: "text-yellow-700 bg-yellow-50 border-yellow-200",
  low: "text-blue-700 bg-blue-50 border-blue-200",
};

const MATCH_TYPE_LABELS: Record<DuplicateMatch["match_type"], string> = {
  email: "email match",
  phone: "phone match",
  both: "email + phone match",
};

/**
 * DuplicateWarning - Warns sellers about potential duplicate leads.
 *
 * Displayed when a lead shares contact info (email, phone, or both) with
 * existing leads in the same tenant. Renders nothing when there are no
 * duplicates.
 *
 * Usage:
 *   <DuplicateWarning duplicates={duplicates} onLeadClick={navigateToLead} />
 */
export function DuplicateWarning({
  duplicates,
  onLeadClick,
  className = "",
}: DuplicateWarningProps) {
  if (!duplicates || duplicates.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="duplicate-warning"
      role="alert"
      aria-label="Potential duplicate leads detected"
      className={`rounded-lg border border-yellow-300 bg-yellow-50 p-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600"
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-yellow-800">
            Potential Duplicate{duplicates.length > 1 ? "s" : ""} Detected
          </h3>
          <p className="mt-1 text-sm text-yellow-700">
            {duplicates.length === 1
              ? "This lead may already exist in the system."
              : `${duplicates.length} possible duplicate leads were found in the system.`}
          </p>

          {/* Duplicate list */}
          <ul
            className="mt-3 space-y-2"
            data-testid="duplicate-list"
          >
            {duplicates.map((match) => {
              const confidenceClass = CONFIDENCE_CLASSES[match.confidence];
              const confidenceLabel = CONFIDENCE_LABELS[match.confidence];
              const matchLabel = MATCH_TYPE_LABELS[match.match_type];

              return (
                <li
                  key={match.lead_id}
                  className="flex flex-wrap items-center gap-2 text-sm"
                  data-testid={`duplicate-item-${match.lead_id}`}
                >
                  {/* Lead link or plain ID */}
                  {onLeadClick ? (
                    <button
                      type="button"
                      onClick={() => onLeadClick(match.lead_id)}
                      className="font-mono text-xs text-yellow-900 underline underline-offset-2 hover:text-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-1 rounded"
                      aria-label={`View lead ${match.lead_id}`}
                    >
                      {match.lead_id.slice(0, 8)}...
                    </button>
                  ) : (
                    <span className="font-mono text-xs text-yellow-900">
                      {match.lead_id.slice(0, 8)}...
                    </span>
                  )}

                  {/* Match type */}
                  <span className="text-yellow-700">via {matchLabel}</span>

                  {/* Confidence badge */}
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${confidenceClass}`}
                    aria-label={`Confidence: ${confidenceLabel}`}
                  >
                    {confidenceLabel} confidence
                  </span>
                </li>
              );
            })}
          </ul>

          <p className="mt-3 text-xs text-yellow-600">
            Review the leads above before continuing to avoid creating duplicate
            records.
          </p>
        </div>
      </div>
    </div>
  );
}
