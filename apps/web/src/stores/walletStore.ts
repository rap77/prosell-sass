/**
 * walletStore - Zustand store for wallet state
 *
 * Manages wallet balance and transactions using walletApi for API calls.
 * Uses localStorage for client-side persistence with versioning support.
 *
 * Features:
 * - Wallet balance tracking
 * - Transaction history
 * - Credit and debit operations
 * - Real-time loading and error states
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { walletApi, ApiError, Wallet, WalletTransaction, CreditWalletRequest, DebitWalletRequest } from "@/lib/api/walletApi";
import { logger } from "@/lib/logger";

// ============================================
// TYPES
// ============================================

export interface WalletTransactionsParams {
  org_id: string;
  tenant_id: string;
  skip?: number;
  limit?: number;
}

export interface WalletError {
  message: string;
  code?: string;
}

// ============================================
// STORE INTERFACE
// ============================================

export interface WalletState {
  // State
  wallet: Wallet | null;
  transactions: WalletTransaction[];
  isLoading: boolean;
  error: WalletError | null;
  pagination: {
    total: number;
    skip: number;
    limit: number;
  } | null;

  // Actions
  fetchBalance: (orgId: string, tenantId: string) => Promise<void>;
  fetchTransactions: (params: WalletTransactionsParams) => Promise<void>;
  credit: (data: CreditWalletRequest) => Promise<void>;
  debit: (data: DebitWalletRequest) => Promise<void>;
  setWallet: (wallet: Wallet | null) => void;
  clearError: () => void;
  reset: () => void;
}

// ============================================
// STORE
// ============================================

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      // Initial state
      wallet: null,
      transactions: [],
      isLoading: false,
      error: null,
      pagination: null,

      // Fetch wallet balance
      fetchBalance: async (orgId, tenantId) => {
        set({ isLoading: true, error: null });

        try {
          const wallet = await walletApi.getBalance(orgId, tenantId);

          set({
            wallet,
            isLoading: false,
          });
        } catch (unknownError) {
          const message =
            unknownError instanceof ApiError
              ? unknownError.message
              : unknownError instanceof Error
                ? unknownError.message
                : "Failed to fetch wallet balance";

          logger.error("Failed to fetch wallet balance", unknownError);
          set({
            error: { message },
            isLoading: false,
          });
        }
      },

      // Fetch transaction history
      fetchTransactions: async (params) => {
        set({ isLoading: true, error: null });

        try {
          const response = await walletApi.getTransactions(
            params.org_id,
            params.tenant_id,
            { skip: params.skip, limit: params.limit },
          );

          set({
            transactions: response.transactions,
            pagination: {
              total: response.total,
              skip: response.skip,
              limit: response.limit,
            },
            isLoading: false,
          });
        } catch (unknownError) {
          const message =
            unknownError instanceof ApiError
              ? unknownError.message
              : unknownError instanceof Error
                ? unknownError.message
                : "Failed to fetch transactions";

          logger.error("Failed to fetch transactions", unknownError);
          set({
            error: { message },
            isLoading: false,
          });
        }
      },

      // Credit tokens to wallet
      credit: async (data) => {
        set({ isLoading: true, error: null });

        try {
          const updated = await walletApi.credit(data);

          set({
            wallet: updated,
            isLoading: false,
          });
        } catch (unknownError) {
          const message =
            unknownError instanceof ApiError
              ? unknownError.message
              : unknownError instanceof Error
                ? unknownError.message
                : "Failed to credit wallet";

          logger.error("Failed to credit wallet", unknownError);
          set({
            error: { message },
            isLoading: false,
          });
          throw unknownError;
        }
      },

      // Debit tokens from wallet
      debit: async (data) => {
        set({ isLoading: true, error: null });

        try {
          const updated = await walletApi.debit(data);

          set({
            wallet: updated,
            isLoading: false,
          });
        } catch (unknownError) {
          const message =
            unknownError instanceof ApiError
              ? unknownError.message
              : unknownError instanceof Error
                ? unknownError.message
                : "Failed to debit wallet";

          logger.error("Failed to debit wallet", unknownError);
          set({
            error: { message },
            isLoading: false,
          });
          throw unknownError;
        }
      },

      // Set wallet manually
      setWallet: (wallet) => {
        set({ wallet });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Reset store
      reset: () => {
        set({
          wallet: null,
          transactions: [],
          isLoading: false,
          error: null,
          pagination: null,
        });
      },
    }),
    {
      name: "wallet-storage",
      storage: createJSONStorage(() => localStorage),
      // Only persist essential data
      partialize: (state) => ({
        wallet: state.wallet,
        // Don't persist transactions (fetch fresh on mount)
        // Don't persist error or loading states
      }),
      version: 1,
    },
  ),
);
