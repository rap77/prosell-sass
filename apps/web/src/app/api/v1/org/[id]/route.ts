/**
 * Mock API Route: Organization Details (v1)
 *
 * GET /api/v1/org/[id] - Get organization details
 * PATCH /api/v1/org/[id] - Update organization
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

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

type MockOrganizationStore = Record<string, MockOrganization>;

const mockOrganizationPatchSchema = z.object({
  name: z.string().optional(),
  tenant_id: z.string().optional(),
  status: z.string().optional(),
  description: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
  banner_url: z.string().nullable().optional(),
  wallet_id: z.string().nullable().optional(),
  verified_at: z.string().nullable().optional(),
  verified_by: z.string().nullable().optional(),
});

declare global {
  var __mockOrganizations: MockOrganizationStore | undefined;
}

function getMockOrganizations(): MockOrganizationStore {
  return global.__mockOrganizations || {};
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const orgs = getMockOrganizations();
  const org = orgs[id];

  if (org) {
    return NextResponse.json(org);
  }

  try {
    return await proxyOrgRequest(request, id);
  } catch {
    return NextResponse.json(
      { detail: "Organization not found" },
      { status: 404 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const orgs = getMockOrganizations();
  const existing = orgs[id];

  if (existing) {
    const body: unknown = await request.json();
    const patch = mockOrganizationPatchSchema.parse(body);

    const updated = {
      ...existing,
      ...patch,
      id: id,
      updated_at: new Date().toISOString(),
    };

    global.__mockOrganizations = global.__mockOrganizations || {};
    global.__mockOrganizations[id] = updated;

    return NextResponse.json(updated);
  }

  try {
    return await proxyOrgRequest(request, id);
  } catch {
    return NextResponse.json(
      { detail: "Organization not found" },
      { status: 404 },
    );
  }
}

async function proxyOrgRequest(request: NextRequest, id: string) {
  const backendUrl = new URL(`${BACKEND_URL}/api/v1/org/${id}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    backendUrl.searchParams.set(key, value);
  });

  const cookieHeader = request.headers.get("cookie");
  const headers: HeadersInit = {
    "Content-Type": request.headers.get("Content-Type") || "application/json",
  };

  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  const options: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    const body = await request.text();
    if (body) {
      options.body = body;
    }
  }

  const response = await fetch(backendUrl.toString(), options);
  return NextResponse.json(await response.json(), {
    status: response.status,
    statusText: response.statusText,
  });
}
