/**
 * Mock API Route: Wallet Details (v1)
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getMockWallets(): Record<string, any> {
  return (global as any).__mockWallets || {};
}

function getMockTransactions(): Record<string, any> {
  return (global as any).__mockWalletTransactions || {};
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const wallets = getMockWallets();
  const wallet = wallets[id];

  if (!wallet) {
    return NextResponse.json({ detail: "Wallet not found" }, { status: 404 });
  }

  // Get transactions
  const transactions = getMockTransactions();
  const walletTransactions = Object.values(transactions)
    .filter((t: any) => t.wallet_id === id)
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json({
    ...wallet,
    transactions: walletTransactions,
  });
}
