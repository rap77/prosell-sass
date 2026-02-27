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
  organization_id: string;
  transaction_type: string;
  amount_cents: number;
  description: string;
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

  const transactions = Object.values(getMockTransactions()).filter((t) => t.organization_id === orgId);
  const paginatedList = transactions.slice(skip, skip + limit);

  return NextResponse.json({
    transactions: paginatedList,
    total: transactions.length,
    skip: skip,
    limit: limit,
  });
}
