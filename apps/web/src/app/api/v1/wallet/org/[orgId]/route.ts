/**
 * Mock API Route: Wallet by Organization (v1)
 *
 * GET /api/v1/wallet/org/{orgId} - Get wallet for an organization
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getMockWallets(): Record<string, any> {
  return (global as any).__mockWallets || {};
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;

  const wallets = getMockWallets();
  const wallet = Object.values(wallets).find((w: any) => w.organization_id === orgId);

  if (!wallet) {
    // Create a new wallet for this org
    const newWallet = {
      id: crypto.randomUUID(),
      organization_id: orgId,
      balance: 0,
      currency: "USD",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    (global as any).__mockWallets = (global as any).__mockWallets || {};
    (global as any).__mockWallets[newWallet.id] = newWallet;
    return NextResponse.json(newWallet);
  }

  return NextResponse.json(wallet);
}
