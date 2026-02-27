/**
 * walletApi Client - HTTP client for wallet endpoints
 *
 * Features:
 * - Direct calls to FastAPI backend (localhost:8000)
 * - httpOnly cookie authentication
 * - TypeScript types matching backend Pydantic DTOs
 * - Error handling with ApiError
 */

// ============================================
// TYPES (matching backend Pydantic DTOs)
// ============================================

export type TransactionType = "credit" | "debit";

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  tenant_id: string;
  transaction_type: TransactionType;
  amount: number;
  balance_after: number;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Wallet {
  id: string;
  organization_id: string;
  tenant_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

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

export interface WalletTransactionsResponse {
  transactions: WalletTransaction[];
  total: number;
  skip: number;
  limit: number;
}

// ============================================
// API CLIENT CONFIGURATION
// ============================================

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? "" : "http://localhost:3000");

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

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: "Error desconocido" }));
    throw new ApiError(
      errorData.detail || errorData.message || "Error en la petición",
      response.status,
    );
  }

  return response.json() as Promise<T>;
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

    return handleResponse<Wallet>(response);
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
    if (params?.skip !== undefined) searchParams.set("skip", params.skip.toString());
    if (params?.limit !== undefined) searchParams.set("limit", params.limit.toString());

    const query = searchParams.toString();
    const url = `${API_BASE_URL}/api/v1/wallet/org/${orgId}/transactions${query ? `?${query}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
    });

    return handleResponse<WalletTransactionsResponse>(response);
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

    return handleResponse<Wallet>(response);
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

    return handleResponse<Wallet>(response);
  },
};
