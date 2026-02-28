/**
 * Mock API Route: Wallet by Organization (v1)
 *
 * GET /api/v1/wallet/org/{orgId} - Get wallet for an organization
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type MockWallet = {
  id: string;
  organization_id: string;
  tenant_id: string;
  balance: number;
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;

  const wallets = getMockWallets();
  const walletArray = Object.values(wallets);
  const wallet = walletArray.find((w) => w.organization_id === orgId);

  if (!wallet) {
    // Create a new wallet for this org
    const newWallet: MockWallet = {
      id: crypto.randomUUID(),
      organization_id: orgId,
      tenant_id: "test-user-123",
      balance: 1000, // Start with 1000 tokens for testing
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const globalWithMocks = global as typeof global & {
      __mockWallets?: MockWallets;
    };
    globalWithMocks.__mockWallets = globalWithMocks.__mockWallets || {};
    globalWithMocks.__mockWallets[newWallet.id] = newWallet;
    return NextResponse.json(newWallet);
  }

  return NextResponse.json(wallet);
}
