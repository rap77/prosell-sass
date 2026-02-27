/**
 * Organizations List Page
 *
 * Displays all organizations for the current user with pagination.
 * Client component that fetches data from organizationStore.
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useOrganizationStore, useAuthStore } from "@/stores";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function OrganizationsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const tenantId = user?.id || "";

  const {
    organizations,
    pagination,
    isLoading,
    error,
    fetchOrganizations,
    clearError,
  } = useOrganizationStore();

  // Fetch organizations on mount
  useEffect(() => {
    if (tenantId) {
      fetchOrganizations({ tenant_id: tenantId, page: 1, page_size: 20 });
    }
  }, [tenantId, fetchOrganizations]);

  const handleRetry = () => {
    clearError();
    fetchOrganizations({ tenant_id: tenantId, page: 1, page_size: 20 });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Organizations
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Manage your organizations
            </p>
          </div>
          <Button onClick={() => router.push("/dashboard/org/new")}>
            Create Organization
          </Button>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
              <p className="text-slate-600 dark:text-slate-400 mt-4">
                Loading organizations...
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
          {!isLoading && !error && organizations.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                You don't have any organizations yet.
              </p>
              <Button onClick={() => router.push("/dashboard/org/new")}>
                Create Your First Organization
              </Button>
            </div>
          )}

          {/* Organizations List */}
          {!isLoading && !error && organizations.length > 0 && (
            <div className="space-y-4">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between p-6 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Logo placeholder */}
                    {org.logo_url ? (
                      <img
                        src={org.logo_url}
                        alt={org.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                        <span className="text-slate-500 dark:text-slate-400 font-semibold">
                          {org.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}

                    {/* Info */}
                    <div>
                      <Link
                        href={`/dashboard/org/${org.id}`}
                        className="font-semibold text-slate-900 dark:text-slate-100 hover:text-primary dark:hover:text-primary transition-colors"
                      >
                        {org.name}
                      </Link>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {org.description || "No description"}
                      </p>
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center gap-4">
                    <span
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium",
                        org.status === "active" &&
                          "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                        org.status === "pending_verification" &&
                          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
                        org.status === "suspended" &&
                          "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
                        org.status === "rejected" &&
                          "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
                      )}
                    >
                      {org.status.replace(/_/g, " ")}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/org/${org.id}`)}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.total > pagination.page_size && (
            <div className="mt-8 flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Showing {organizations.length} of {pagination.total} organizations
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() =>
                    fetchOrganizations({
                      tenant_id: tenantId,
                      page: pagination.page - 1,
                      page_size: pagination.page_size,
                    })
                  }
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    pagination.page * pagination.page_size >= pagination.total
                  }
                  onClick={() =>
                    fetchOrganizations({
                      tenant_id: tenantId,
                      page: pagination.page + 1,
                      page_size: pagination.page_size,
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
    </main>
  );
}
