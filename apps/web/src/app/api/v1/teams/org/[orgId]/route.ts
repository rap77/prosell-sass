/**
 * Mock API Route: Teams by Organization (v1)
 *
 * GET /api/v1/teams/org/{orgId} - List teams for an organization
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getMockTeams(): Record<string, any> {
  return (global as any).__mockTeams || {};
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  const url = new URL(request.url);

  const teams = getMockTeams();
  const teamList = Object.values(teams).filter((t: any) => t.organization_id === orgId);

  const skip = parseInt(url.searchParams.get("skip") || "0");
  const limit = parseInt(url.searchParams.get("limit") || "20");

  const paginatedList = teamList.slice(skip, skip + limit);

  return NextResponse.json({
    teams: paginatedList,
    total: teamList.length,
    skip: skip,
    limit: limit,
  });
}
