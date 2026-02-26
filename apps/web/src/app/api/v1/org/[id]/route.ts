/**
 * Mock API Route: Organization Details (v1)
 *
 * GET /api/v1/org/[id] - Get organization details
 * PATCH /api/v1/org/[id] - Update organization
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getMockOrganizations(): Record<string, any> {
  return (global as any).__mockOrganizations || {};
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const orgs = getMockOrganizations();
  const org = orgs[id];

  if (!org) {
    return NextResponse.json(
      { detail: "Organization not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(org);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const orgs = getMockOrganizations();
  const existing = orgs[id];

  if (!existing) {
    return NextResponse.json(
      { detail: "Organization not found" },
      { status: 404 }
    );
  }

  const body = await request.json();

  const updated = {
    ...existing,
    ...body,
    id: id,
    updated_at: new Date().toISOString(),
  };

  (global as any).__mockOrganizations = (global as any).__mockOrganizations || {};
  (global as any).__mockOrganizations[id] = updated;

  return NextResponse.json(updated);
}
