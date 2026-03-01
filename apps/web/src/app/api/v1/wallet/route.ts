/**
 * Mock API Route: Wallet (v1)
 *
 * GET /api/v1/wallet - Get wallet by organization
 *
 * ============================================================
 * MOCK API - For E2E Testing Only
 * ============================================================
 *
 * Type Contract:
 * - balance: number (token count, NOT cents)
 *
 * Backend Domain Model Difference:
 * - Backend stores: balance_cents (int) for precision
 * - Backend computes: balance = Decimal(balance_cents) / 100
 * - API DTO returns: balance (already converted to tokens/dollars)
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
