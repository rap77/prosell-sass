import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { OrgVerticalsResponse } from "@/types/category";

/**
 * Fetch the verticals + their categories for a given organization.
 *
 * Backend: `GET /api/v1/organizations/{organization_id}/verticals`
 * (Foundation, PR #10 + #13).
 *
 * When `organizationId` is `null` (e.g. user is loading), the query is
 * disabled — `data` stays `undefined` and no network call is made.
 */
export function useOrgVerticals(
  organizationId: string | null,
): UseQueryResult<OrgVerticalsResponse, Error> {
  return useQuery({
    queryKey: ["org-verticals", organizationId],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/organizations/${organizationId}/verticals`,
        { credentials: "include" },
      );
      if (!res.ok) {
        const payload = (await res
          .json()
          .catch(() => ({ message: "Failed to fetch verticals" }))) as {
          message?: string;
        };
        throw new Error(payload.message ?? "Failed to fetch verticals");
      }
      return (await res.json()) as OrgVerticalsResponse;
    },
    enabled: Boolean(organizationId),
    staleTime: 5 * 60 * 1000,
  });
}
