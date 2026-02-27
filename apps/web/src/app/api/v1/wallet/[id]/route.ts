/**
 * Mock API Route: Wallet Details (v1)
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

type MockTransaction = {
  id: string;
  wallet_id: string;
  transaction_type: string;
  amount_cents: number;
  description: string;
  created_at: string;
};

type MockTransactions = Record<string, MockTransaction>;

function getMockWallets(): MockWallets {
  const globalWithMocks = global as typeof global & {
    __mockWallets?: MockWallets;
  };
  return globalWithMocks.__mockWallets || {};
}

function getMockTransactions(): MockTransactions {
  const globalWithMocks = global as typeof global & {
    __mockWalletTransactions?: MockTransactions;
  };
  return globalWithMocks.__mockWalletTransactions || {};
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
    .filter((t) => t.wallet_id === id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json({
    ...wallet,
    transactions: walletTransactions,
  });
}
