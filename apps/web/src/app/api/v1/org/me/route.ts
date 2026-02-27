/**
 * Mock API Route: Current User's Organization (v1)
 *
 * GET /api/v1/org/me - Get current user's organization
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

type MockOrganizations = Record<string, MockOrganization>;

function getMockOrganizations(): MockOrganizations {
  const globalWithMocks = global as typeof global & {
    __mockOrganizations?: MockOrganizations;
  };
  return globalWithMocks.__mockOrganizations || {};
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get("tenant_id") || "test-user-123";

  const orgs = getMockOrganizations();
  const orgList = Object.values(orgs).filter((o) => o.tenant_id === tenantId);

  if (orgList.length === 0) {
    return NextResponse.json(
      { detail: "Organization not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(orgList[0]);
}
