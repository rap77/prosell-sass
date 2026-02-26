/**
 * Mock API Route: Team Details (v1)
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getMockTeams(): Record<string, any> {
  return (global as any).__mockTeams || {};
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
