/**
 * Mock API Route: Wallet by Organization (v1)
 *
 * GET /api/v1/wallet/org/{orgId} - Get wallet for an organization
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
 * TODO: Verify FastAPI WalletResponseDTO returns balance (not balance_cents)
 *
 * Security: No auth/tenant checks - this is TEST code only.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Constants for test data consistency
const TEST_TENANT_ID = "test-user-123";
const INITIAL_TOKEN_BALANCE = 1000; // Start with meaningful test data

type MockWallet = {
  id: string;
  organization_id: string;
  tenant_id: string;
  balance: number; // Token count (API returns converted value, not cents)
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
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;

  const wallets = getMockWallets();
  const walletArray = Object.values(wallets);
  const wallet = walletArray.find((w) => w.organization_id === orgId);

  if (!wallet) {
    // Create a new wallet for this org with initial balance
    const newWallet: MockWallet = {
      id: crypto.randomUUID(),
      organization_id: orgId,
      tenant_id: TEST_TENANT_ID,
      balance: INITIAL_TOKEN_BALANCE,
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
