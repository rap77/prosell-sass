/**
 * Mock API Route: Team Details (v1)
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type MockTeam = {
  id: string;
  name: string;
  tenant_id: string;
  organization_id: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  members: unknown[];
  member_count: number;
};

type MockTeams = Record<string, MockTeam>;

function getMockTeams(): MockTeams {
  const globalWithMocks = global as typeof global & {
    __mockTeams?: MockTeams;
  };
  return globalWithMocks.__mockTeams || {};
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const teams = getMockTeams();
  const team = teams[id];

  if (!team) {
    return NextResponse.json({ detail: "Team not found" }, { status: 404 });
  }

  return NextResponse.json(team);
}
