import { MarketplaceAccessManager } from "@/components/admin/MarketplaceAccessManager";

/**
 * Admin page: Marketplace Access Management
 * Route: /admin/organizations/marketplace-access
 *
 * Allows ProSell admins to:
 * - View all marketplace access grants (pending, active, rejected, revoked)
 * - Approve/reject pending requests from inventory owners
 * - Revoke active grants
 */
export default function MarketplaceAccessPage() {
  return (
    <div className="container mx-auto py-6">
      <MarketplaceAccessManager />
    </div>
  );
}
