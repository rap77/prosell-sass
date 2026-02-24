/**
 * Wallet Page
 *
 * Displays wallet balance, transaction history, and recharge options.
 * Client component that fetches data from walletStore.
 */

"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useWalletStore, useAuthStore } from "@/stores";
import { WalletCard } from "@/components/ui/WalletCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowUpDown, Clock } from "lucide-react";

export default function WalletPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const tenantId = user?.id || "";
  const orgId = (params.id as string) || "";

  const {
    wallet,
    transactions,
    pagination,
    isLoading,
    error,
    fetchBalance,
    fetchTransactions,
    clearError,
  } = useWalletStore();

  // Fetch balance on mount
  useEffect(() => {
    if (orgId && tenantId) {
      fetchBalance(orgId, tenantId);
      fetchTransactions({
        org_id: orgId,
        tenant_id: tenantId,
        skip: 0,
        limit: 20,
      });
    }
  }, [orgId, tenantId, fetchBalance, fetchTransactions]);

  const handleRetry = () => {
    clearError();
    fetchBalance(orgId, tenantId);
    fetchTransactions({
      org_id: orgId,
      tenant_id: tenantId,
      skip: 0,
      limit: 20,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 10); // 10 tokens = $1
  };

  const getTransactionTypeColor = (type: string) => {
    return type === "credit"
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";
  };

  const getTransactionTypeLabel = (type: string) => {
    return type === "credit" ? "Credit" : "Debit";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/dashboard/org/${orgId}`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <ArrowUpDown className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Wallet
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Manage your tokens and view transaction history
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Wallet Card */}
          <div className="lg:col-span-1">
            <WalletCard organizationId={orgId} />
          </div>

          {/* Transactions */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Transaction History
                </h2>
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="text-center py-12">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                  <p className="text-slate-600 dark:text-slate-400 mt-4">
                    Loading transactions...
                  </p>
                </div>
              )}

              {/* Error State */}
              {error && !isLoading && (
                <div className="text-center py-12">
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 inline-block">
                    <p className="text-destructive mb-4">{error.message}</p>
                    <Button onClick={handleRetry} variant="outline">
                      Retry
                    </Button>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!isLoading && !error && transactions.length === 0 && (
                <div className="text-center py-12">
                  <Clock className="h-16 w-16 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">
                    No transactions yet.
                  </p>
                </div>
              )}

              {/* Transactions List */}
              {!isLoading && !error && transactions.length > 0 && (
                <div className="space-y-4">
                  {transactions.map((txn) => (
                    <div
                      key={txn.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-center gap-4">
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          txn.transaction_type === "credit"
                            ? "bg-green-100 dark:bg-green-900"
                            : "bg-red-100 dark:bg-red-900"
                        }`}>
                          <ArrowUpDown className={`h-5 w-5 ${getTransactionTypeColor(txn.transaction_type)}`} />
                        </div>

                        {/* Info */}
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {txn.description || getTransactionTypeLabel(txn.transaction_type)}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {new Date(txn.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-right">
                        <p className={`font-semibold ${getTransactionTypeColor(txn.transaction_type)}`}>
                          {txn.transaction_type === "credit" ? "+" : "-"}
                          {txn.amount.toLocaleString()} tokens
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Balance: {txn.balance_after.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {pagination && pagination.total > pagination.limit && (
                <div className="mt-6 flex items-center justify-between">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Showing {transactions.length} of {pagination.total} transactions
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.skip <= 0}
                      onClick={() =>
                        fetchTransactions({
                          org_id: orgId,
                          tenant_id: tenantId,
                          skip: Math.max(0, pagination.skip - pagination.limit),
                          limit: pagination.limit,
                        })
                      }
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.skip + pagination.limit >= pagination.total}
                      onClick={() =>
                        fetchTransactions({
                          org_id: orgId,
                          tenant_id: tenantId,
                          skip: pagination.skip + pagination.limit,
                          limit: pagination.limit,
                        })
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
