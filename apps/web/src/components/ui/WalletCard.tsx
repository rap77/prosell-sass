/**
 * WalletCard Component
 *
 * Displays wallet balance and provides recharge functionality.
 * Integrates with useWalletStore for balance and credit operations.
 *
 * @example
 * ```tsx
 * <WalletCard organizationId={orgId} />
 * ```
 */

"use client";

import { useEffect, useState } from "react";
import { useWalletStore } from "@/stores";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores";
import { Plus, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// PROPS
// ============================================

export interface WalletCardProps {
  organizationId: string;
  showRefreshButton?: boolean;
  className?: string;
}

// Token packages for recharge
const TOKEN_PACKAGES = [
  { tokens: 100, label: "100 Tokens" },
  { tokens: 500, label: "500 Tokens" },
  { tokens: 1000, label: "1000 Tokens" },
];

// ============================================
// COMPONENT
// ============================================

/**
 * WalletCard component for displaying balance and recharge
 *
 * Features:
 * - Balance display with loading state
 * - Refresh button to fetch latest balance
 * - Recharge button opening Stripe checkout
 * - Error display
 * - Responsive design
 */
export function WalletCard({
  organizationId,
  showRefreshButton = true,
  className,
}: WalletCardProps) {
  const [showRechargeDialog, setShowRechargeDialog] = useState(false);

  // Get tenant_id from auth store
  const { user } = useAuthStore();
  const tenantId = user?.id || ""; // Use user ID as tenant_id for now

  // Get wallet store
  const {
    wallet,
    isLoading,
    error,
    fetchBalance,
    credit,
  } = useWalletStore();

  // Fetch balance on mount
  useEffect(() => {
    if (organizationId && tenantId) {
      fetchBalance(organizationId, tenantId);
    }
  }, [organizationId, tenantId, fetchBalance]);

  // Handle refresh
  const handleRefresh = () => {
    if (organizationId && tenantId) {
      fetchBalance(organizationId, tenantId);
    }
  };

  // Handle recharge (will integrate with Stripe later)
  const handleRecharge = async (tokens: number) => {
    // TODO: Integrate with Stripe checkout
    // For now, just show a console log
    console.log(`Recharge ${tokens} tokens for org ${organizationId}`);
    setShowRechargeDialog(false);
  };

  // Format balance with commas
  const formattedBalance = wallet
    ? wallet.balance.toLocaleString("en-US")
    : "0";

  // ============================================
  // RENDER
  // ============================================

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium">
            Token Balance
          </CardTitle>
          <CardDescription>
            Available tokens for listings
          </CardDescription>
        </div>
        {showRefreshButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-8 w-8"
          >
            <RefreshCw
              className={cn(
                "h-4 w-4",
                isLoading && "animate-spin",
              )}
            />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : formattedBalance}
            </div>
            <div className="text-xs text-muted-foreground">
              tokens
            </div>
          </div>
          <Button
            onClick={() => setShowRechargeDialog(true)}
            disabled={isLoading}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Recharge
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-2 rounded-md bg-destructive/10 border border-destructive/20">
            <p className="text-xs text-destructive">{error.message}</p>
          </div>
        )}

        {/* Recharge Dialog (Simple for now - will be a proper dialog later) */}
        {showRechargeDialog && (
          <div className="mt-4 p-4 rounded-md bg-muted border">
            <p className="text-sm font-medium mb-2">Select token package:</p>
            <div className="flex flex-col gap-2">
              {TOKEN_PACKAGES.map((pkg) => (
                <Button
                  key={pkg.tokens}
                  variant="outline"
                  onClick={() => handleRecharge(pkg.tokens)}
                  className="justify-between"
                >
                  <span>{pkg.label}</span>
                  <span className="text-muted-foreground">
                    ${pkg.tokens / 10}
                  </span>
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRechargeDialog(false)}
              className="mt-2 w-full"
            >
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
