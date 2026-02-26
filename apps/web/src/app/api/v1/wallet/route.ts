/**
 * Mock API Route: Wallet (v1)
 *
 * GET /api/v1/wallet - Get wallet by organization
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getMockWallets(): Record<string, any> {
  return (global as any).__mockWallets || {};
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get("organization_id");

  const wallets = getMockWallets();
  let wallet = Object.values(wallets).find((w: any) => w.organization_id === orgId);

  if (!wallet) {
    return NextResponse.json({ detail: "Wallet not found" }, { status: 404 });
  }

  return NextResponse.json(wallet);
}
