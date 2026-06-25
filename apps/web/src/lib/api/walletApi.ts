/**
 * walletApi Client - HTTP client for wallet endpoints
 *
 * Features:
 * - Direct calls to FastAPI backend (localhost:8000)
 * - httpOnly cookie authentication
 * - TypeScript types matching backend Pydantic DTOs
 * - Error handling with ApiError
 */

import type { z } from "zod";
import {
  WalletSchema,
  WalletTransactionsResponseSchema,
  type Wallet,
  type WalletTransactionsResponse,
} from "./schemas/walletApi";

export type {
  TransactionType,
  WalletTransaction,
  Wallet,
  WalletTransactionsResponse,
} from "./schemas/walletApi";

// ============================================
// TYPES (matching backend Pydantic DTOs)
// ============================================

export interface CreditWalletRequest {
  org_id: string;
  tenant_id: string;
  amount: number;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface DebitWalletRequest {
  org_id: string;
  tenant_id: string;
  amount: number;
  description?: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// API CLIENT CONFIGURATION
// ============================================

// Relative URL — Next.js rewrites proxy /api/:path* to the backend container.
// See apps/web/next.config.ts and PR #3 for context.
const API_BASE_URL = "";

// ============================================
// ERROR HANDLING
// ============================================

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(
  response: Response,
  schema: z.ZodType<T>,
): Promise<T> {
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: "Error desconocido" }));
    let message: string;
    if (Array.isArray(errorData.detail)) {
      message = errorData.detail.map((e: { msg: string }) => e.msg).join(", ");
    } else if (typeof errorData.detail === "string") {
      message = errorData.detail;
    } else {
      message = errorData.message || "Error en la petición";
    }

    throw new ApiError(message, response.status);
  }

  return schema.parse(await response.json());
}

// ============================================
// WALLET API CLIENT
// ============================================

export const walletApi = {
  /**
   * Get wallet balance for organization
   * GET /api/v1/wallet/org/{org_id}
   */
  async getBalance(orgId: string, tenantId: string): Promise<Wallet> {
    const searchParams = new URLSearchParams();
    searchParams.set("tenant_id", tenantId);

    const query = searchParams.toString();
    const url = `${API_BASE_URL}/api/v1/wallet/org/${orgId}${query ? `?${query}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
    });

    return handleResponse(response, WalletSchema);
  },

  /**
   * Get wallet transaction history
   * GET /api/v1/wallet/org/{org_id}/transactions
   */
  async getTransactions(
    orgId: string,
    tenantId: string,
    params?: {
      skip?: number;
      limit?: number;
    },
  ): Promise<WalletTransactionsResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set("tenant_id", tenantId);
    if (params?.skip !== undefined)
      searchParams.set("skip", params.skip.toString());
    if (params?.limit !== undefined)
      searchParams.set("limit", params.limit.toString());

    const query = searchParams.toString();
    const url = `${API_BASE_URL}/api/v1/wallet/org/${orgId}/transactions${query ? `?${query}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
    });

    return handleResponse(response, WalletTransactionsResponseSchema);
  },

  /**
   * Credit tokens to wallet (recharge)
   * POST /api/v1/wallet/credit
   */
  async credit(data: CreditWalletRequest): Promise<Wallet> {
    const response = await fetch(`${API_BASE_URL}/api/v1/wallet/credit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      credentials: "include",
    });

    return handleResponse(response, WalletSchema);
  },

  /**
   * Debit tokens from wallet (spend)
   * POST /api/v1/wallet/debit
   */
  async debit(data: DebitWalletRequest): Promise<Wallet> {
    const response = await fetch(`${API_BASE_URL}/api/v1/wallet/debit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      credentials: "include",
    });

    return handleResponse(response, WalletSchema);
  },
};
