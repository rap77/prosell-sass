/**
 * Mock API Route: Wallet Details (v1)
 *
 * GET /api/v1/wallet/{id} - Get wallet with transactions
 *
 * ============================================================
 * MOCK API - For E2E Testing Only
 * ============================================================
 *
 * Type Contract:
 * - balance: number (token count, NOT cents)
 * - amount: number (transaction amount in tokens, NOT cents)
 *
 * Backend Domain Model Difference:
 * - Backend stores: balance_cents (int), amount_cents (int) for precision
 * - Backend computes: balance = Decimal(balance_cents) / 100
 * - API DTO returns: balance, amount (already converted to tokens/dollars)
 *
 * This mock matches the expected API contract, not the internal storage.
 *
 * Security: No auth/tenant checks - this is TEST code only.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Constant for test data consistency
const TEST_TENANT_ID = "test-user-123";

type MockWallet = {
  id: string;
  organization_id: string;
  tenant_id: string;
  balance: number; // Token count (API returns converted value, not cents)
  currency?: string; // Optional - frontend doesn't use it
  created_at: string;
  updated_at: string;
};

type MockWallets = Record<string, MockWallet>;

type MockTransaction = {
  id: string;
  wallet_id: string;
  tenant_id: string;
  transaction_type: string;
  amount: number; // Transaction amount in tokens (API returns converted value, not cents)
  balance_after: number; // Balance after transaction in tokens
  description: string | null; // Nullable description
  metadata: Record<string, unknown> | null;
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
  { params }: { params: Promise<{ id: string }> },
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
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

  return NextResponse.json({
    ...wallet,
    transactions: walletTransactions,
  });
}
