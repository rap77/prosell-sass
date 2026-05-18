/**
 * Mock API Route: Current User's Organization (v1)
 *
 * GET /api/v1/org/me - Get current user's organization
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BACKEND_URL = process.env.API_URL || "http://localhost:8000";

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

declare global {
  var __mockOrganizations: MockOrganizations | undefined
}

function getMockOrganizations(): MockOrganizations {
  return global.__mockOrganizations || {};
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get("tenant_id") || "test-user-123";

  const orgs = getMockOrganizations();
  const orgList = Object.values(orgs).filter((o) => o.tenant_id === tenantId);

  if (orgList.length > 0) {
    return NextResponse.json(orgList[0]);
  }

  try {
    const backendUrl = new URL(`${BACKEND_URL}/api/v1/org/me`);
    request.nextUrl.searchParams.forEach((value, key) => {
      backendUrl.searchParams.set(key, value);
    });

    const cookieHeader = request.headers.get("cookie");
    const response = await fetch(backendUrl.toString(), {
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    });

    return NextResponse.json(await response.json(), {
      status: response.status,
      statusText: response.statusText,
    });
  } catch {
    return NextResponse.json(
      { detail: "Organization not found" },
      { status: 404 }
    );
  }
}
