/**
 * Mock API Route: Wallet Transactions (v1)
 *
 * GET /api/v1/wallet/org/{orgId}/transactions - Get transactions for an organization
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type MockTransaction = {
  id: string;
  wallet_id: string;
  tenant_id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description: string;
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
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  const url = new URL(request.url);

  const skip = parseInt(url.searchParams.get("skip") || "0");
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const createMock = url.searchParams.get("create_mock") === "true";

  let transactions = Object.values(getMockTransactions()).filter((t) => t.wallet_id === orgId);

  // Create mock transactions if requested and none exist
  if (createMock && transactions.length === 0) {
    const globalWithMocks = global as typeof global & {
      __mockWalletTransactions?: MockTransactions;
    };
    globalWithMocks.__mockWalletTransactions = globalWithMocks.__mockWalletTransactions || {};

    // Create sample transactions
    const sampleTransactions: MockTransaction[] = [
      {
        id: crypto.randomUUID(),
        wallet_id: orgId,
        tenant_id: "test-user-123",
        transaction_type: "credit",
        amount: 1000,
        balance_after: 1000,
        description: "Initial purchase",
        metadata: null,
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        wallet_id: orgId,
        tenant_id: "test-user-123",
        transaction_type: "debit",
        amount: 100,
        balance_after: 900,
        description: "Listing fee",
        metadata: null,
        created_at: new Date(Date.now() - 43200000).toISOString(),
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
