/**
 * Mock API Route: Wallet Transactions (v1)
 *
 * GET /api/v1/wallet/org/{orgId}/transactions - Get transactions for an organization
 *
 * ============================================================
 * MOCK API - For E2E Testing Only
 * ============================================================
 *
 * Type Contract:
 * - amount: number (transaction amount in tokens, NOT cents)
 * - balance_after: number (balance after transaction in tokens)
 * - description: string | null (nullable description)
 *
 * Backend Domain Model Difference:
 * - Backend stores: amount_cents (int) for precision
 * - Backend computes: amount = Decimal(amount_cents) / 100
 * - API DTO returns: amount (already converted to tokens/dollars)
 *
 * This mock matches the expected API contract, not the internal storage.
 *
 * TODO: Verify FastAPI WalletTransactionResponseDTO matches this contract
 *
 * Security: No auth/tenant checks - this is TEST code only.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Constants for test data consistency
const TEST_TENANT_ID = "test-user-123";
const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const ONE_HALF_DAY_MS = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

type MockTransaction = {
  id: string;
  wallet_id: string;
  tenant_id: string;
  transaction_type: string;
  amount: number; // Transaction amount in tokens (API returns converted value, not cents)
  balance_after: number; // Balance after transaction in tokens
  description: string | null; // Nullable description (matches frontend type)
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type MockTransactions = Record<string, MockTransaction>;

function getMockTransactions(): MockTransactions {
  const globalWithMocks = global as typeof global & {
    __mockWalletTransactions?: MockTransactions;
  };
  return globalWithMocks.__mockWalletTransactions || {};
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  const url = new URL(request.url);

  const skip = parseInt(url.searchParams.get("skip") || "0");
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const createMock = url.searchParams.get("create_mock") === "true";

  // SIMPLIFICATION: In this mock, wallet_id == orgId for testing purposes.
  // In the real API, we would first lookup the wallet by organization_id,
  // then filter transactions by wallet_id. This simplification is acceptable
  // for E2E tests where we control the test data.
  let transactions = Object.values(getMockTransactions()).filter(
    (t) => t.wallet_id === orgId,
  );

  // Create mock transactions if requested and none exist
  if (createMock && transactions.length === 0) {
    const globalWithMocks = global as typeof global & {
      __mockWalletTransactions?: MockTransactions;
    };
    globalWithMocks.__mockWalletTransactions =
      globalWithMocks.__mockWalletTransactions || {};

    // Create sample transactions with realistic timestamps
    const sampleTransactions: MockTransaction[] = [
      {
        id: crypto.randomUUID(),
        wallet_id: orgId,
        tenant_id: TEST_TENANT_ID,
        transaction_type: "credit",
        amount: 1000,
        balance_after: 1000,
        description: "Initial purchase",
        metadata: null,
        created_at: new Date(Date.now() - ONE_DAY_MS).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        wallet_id: orgId,
        tenant_id: TEST_TENANT_ID,
        transaction_type: "debit",
        amount: 100,
        balance_after: 900,
        description: "Listing fee",
        metadata: null,
        created_at: new Date(Date.now() - ONE_HALF_DAY_MS).toISOString(),
      },
    ];

    for (const txn of sampleTransactions) {
      globalWithMocks.__mockWalletTransactions[txn.id] = txn;
    }

    transactions = sampleTransactions;
  }

  const paginatedList = transactions.slice(skip, skip + limit);

  return NextResponse.json({
    transactions: paginatedList,
    total: transactions.length,
    skip: skip,
    limit: limit,
  });
}
