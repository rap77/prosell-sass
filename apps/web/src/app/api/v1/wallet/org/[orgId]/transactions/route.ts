/**
 * Mock API Route: Wallet Transactions (v1)
 *
 * GET /api/v1/wallet/org/{orgId}/transactions - Get transactions for an organization
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getMockTransactions(): Record<string, any> {
  return (global as any).__mockTransactions || {};
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  const url = new URL(request.url);

  const skip = parseInt(url.searchParams.get("skip") || "0");
  const limit = parseInt(url.searchParams.get("limit") || "20");

  const transactions = Object.values(getMockTransactions()).filter((t: any) => t.organization_id === orgId);
  const paginatedList = transactions.slice(skip, skip + limit);

  return NextResponse.json({
    transactions: paginatedList,
    total: transactions.length,
    skip: skip,
    limit: limit,
  });
}
