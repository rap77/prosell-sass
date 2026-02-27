/**
 * Mock API Route: Wallet (v1)
 *
 * GET /api/v1/wallet - Get wallet by organization
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type MockWallet = {
  id: string;
  organization_id: string;
  tenant_id: string;
  balance_cents: number;
  currency: string;
  created_at: string;
  updated_at: string;
};

type MockWallets = Record<string, MockWallet>;

function getMockWallets(): MockWallets {
  const globalWithMocks = global as typeof global & {
    __mockWallets?: MockWallets;
  };
  return globalWithMocks.__mockWallets || {};
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get("organization_id");

  const wallets = getMockWallets();
  const walletArray = Object.values(wallets);
  let wallet = walletArray.find((w) => w.organization_id === orgId);

  if (!wallet) {
    return NextResponse.json({ detail: "Wallet not found" }, { status: 404 });
  }

  return NextResponse.json(wallet);
}
