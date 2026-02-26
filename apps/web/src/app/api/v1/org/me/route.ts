/**
 * Mock API Route: Current User's Organization (v1)
 *
 * GET /api/v1/org/me - Get current user's organization
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getMockOrganizations(): Record<string, any> {
  return (global as any).__mockOrganizations || {};
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get("tenant_id") || "test-user-123";

  const orgs = getMockOrganizations();
  const orgList = Object.values(orgs).filter((o: any) => o.tenant_id === tenantId);

  if (orgList.length === 0) {
    return NextResponse.json(
      { detail: "Organization not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(orgList[0]);
}
