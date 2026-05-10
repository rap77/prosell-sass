/**
 * Mock API Route: Organization Details (v1)
 *
 * GET /api/v1/org/[id] - Get organization details
 * PATCH /api/v1/org/[id] - Update organization
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type MockOrganization = {
  id: string;
  name: string;
  tenant_id: string;
  status: string;
  description: string | null;
  website: string | null;
  phone: string | null;
  logo_url: string | null;
  banner_url: string | null;
  wallet_id: string | null;
  created_at: string;
  updated_at: string;
  verified_at: string | null;
  verified_by: string | null;
};

type MockOrganizationStore = Record<string, MockOrganization>;

declare global {
  // eslint-disable-next-line no-var
  var __mockOrganizations: MockOrganizationStore | undefined
}

function getMockOrganizations(): MockOrganizationStore {
  return global.__mockOrganizations || {};
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

  global.__mockOrganizations = global.__mockOrganizations || {};
  global.__mockOrganizations[id] = updated as MockOrganization;

  return NextResponse.json(updated);
}
