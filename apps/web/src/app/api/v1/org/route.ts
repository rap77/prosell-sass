/**
 * Mock API Route: Organizations (v1)
 *
 * GET /api/v1/org - List organizations
 * POST /api/v1/org - Create organization
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Helper to get mock organizations from global store
function getMockOrganizations(): Record<string, any> {
  return (global as any).__mockOrganizations || {};
}

export async function GET(request: NextRequest) {
  const orgs = getMockOrganizations();
  const orgList = Object.values(orgs);

  return NextResponse.json({
    organizations: orgList,
    total: orgList.length,
    page: 1,
    page_size: 100,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Simulate network delay for E2E tests to verify loading states
    await new Promise(resolve => setTimeout(resolve, 100));

    // Validate required fields
    if (!body.name || body.name.length < 2) {
      return NextResponse.json(
        { detail: "Name must be at least 2 characters" },
        { status: 400 }
      );
    }

    // Validate website URL if provided
    if (body.website) {
      try {
        new URL(body.website);
      } catch {
        return NextResponse.json(
          { detail: "Invalid website URL" },
          { status: 400 }
        );
      }
    }

    // Create mock organization
    const orgId = crypto.randomUUID();
    const now = new Date().toISOString();

    const org = {
      id: orgId,
      name: body.name,
      tenant_id: body.tenant_id || "test-user-123",
      status: "pending_verification",
      description: body.description || null,
      website: body.website || null,
      phone: body.phone || null,
      logo_url: null,
      banner_url: null,
      wallet_id: null,
      created_at: now,
      updated_at: now,
      verified_at: null,
      verified_by: null,
    };

    (global as any).__mockOrganizations = (global as any).__mockOrganizations || {};
    (global as any).__mockOrganizations[orgId] = org;

    return NextResponse.json(org, { status: 201 });
  } catch (error) {
    console.error("CREATE ORG ERROR:", error);
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500 }
    );
  }
}
