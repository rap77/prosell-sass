/**
 * Mock API Route: Teams (v1)
 *
 * GET /api/v1/teams - List teams
 * POST /api/v1/teams - Create team
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getMockTeams(): Record<string, any> {
  return (global as any).__mockTeams || {};
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get("organization_id");

  const teams = getMockTeams();
  let teamList = Object.values(teams);

  if (orgId) {
    teamList = teamList.filter((t: any) => t.organization_id === orgId);
  }

  return NextResponse.json({
    teams: teamList,
    total: teamList.length,
    page: 1,
    page_size: 100,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || body.name.length < 2) {
      return NextResponse.json(
        { detail: "Name must be at least 2 characters" },
        { status: 400 }
      );
    }

    const teamId = crypto.randomUUID();
    const now = new Date().toISOString();

    const team = {
      id: teamId,
      organization_id: body.organization_id,
      name: body.name,
      description: body.description || null,
      created_at: now,
      updated_at: now,
    };

    (global as any).__mockTeams = (global as any).__mockTeams || {};
    (global as any).__mockTeams[teamId] = team;

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500 }
    );
  }
}
