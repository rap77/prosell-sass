/**
 * Zod schemas for the team endpoints.
 *
 * Validates the wire shape at the HTTP boundary instead of trusting the
 * generic `handleResponse<T>` cast on `response.json()`. `.passthrough()`
 * tolerates backend fields the team UI doesn't render yet (mirrors the
 * `leads.ts`/`appointments.ts` schema convention).
 */

import { z } from "zod";

export const TeamMemberRoleSchema = z.enum(["manager", "vendor"]);

export const TeamMemberSchema = z
  .object({
    id: z.string(),
    team_id: z.string(),
    user_id: z.string(),
    tenant_id: z.string(),
    role: TeamMemberRoleSchema,
    commission_rate: z.number().nullable(),
    joined_at: z.string(),
  })
  .passthrough();

export const TeamSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    tenant_id: z.string(),
    organization_id: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    members: z.array(TeamMemberSchema).optional(),
    member_count: z.number().optional(),
  })
  .passthrough();

export const TeamListResponseSchema = z.object({
  teams: z.array(TeamSchema),
  total: z.number(),
  skip: z.number(),
  limit: z.number(),
});

export type TeamMemberRole = z.infer<typeof TeamMemberRoleSchema>;
export type TeamMember = z.infer<typeof TeamMemberSchema>;
export type Team = z.infer<typeof TeamSchema>;
export type TeamListResponse = z.infer<typeof TeamListResponseSchema>;
