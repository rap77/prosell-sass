/**
 * Zod schemas for the team endpoints.
 *
 * Validates the wire shape at the HTTP boundary instead of trusting the
 * generic `handleResponse<T>` cast on `response.json()`. `z.looseObject()`
 * tolerates backend fields the team UI doesn't render yet (mirrors the
 * `leads.ts`/`appointments.ts` schema convention).
 */

import { z } from "zod";

export const TeamMemberRoleSchema = z.enum(["manager", "vendor"]);

export const TeamMemberSchema = z.looseObject({
  id: z.string(),
  team_id: z.string(),
  user_id: z.string(),
  tenant_id: z.string(),
  role: TeamMemberRoleSchema,
  commission_rate: z.number().nullable(),
  joined_at: z.string(),
});

export const TeamSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  tenant_id: z.string(),
  org_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  members: z.array(TeamMemberSchema).optional(),
  member_count: z.number().optional(),
});

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
