/**
 * Organization Detail Page
 *
 * Displays detailed information about a single organization.
 * Client component that fetches data from organizationStore.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useOrganizationStore, useAuthStore } from "@/stores";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function OrganizationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orgId = params.id as string;

  const { user } = useAuthStore();
  const tenantId = user?.id || "";

  const {
    currentOrg,
    isLoading,
    error,
    fetchOrganizationById,
    clearError,
  } = useOrganizationStore();

  const [isClient, setIsClient] = useState(false);

  // Fetch organization on mount (client-side only)
  useEffect(() => {
    setIsClient(true);
    if (orgId && tenantId) {
      fetchOrganizationById(orgId, tenantId);
    }
  }, [orgId, tenantId, fetchOrganizationById]);

  const handleRetry = () => {
    clearError();
    fetchOrganizationById(orgId, tenantId);
  };

  // Server-side fallback
  if (!isClient) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
              <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/org")}
          >
            ← Back
          </Button>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Organization Details
          </h1>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
              <p className="text-slate-600 dark:text-slate-400 mt-4">
                Loading organization...
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

          {/* Organization Details */}
          {!isLoading && !error && currentOrg && (
            <div className="space-y-8">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-6">
                  {/* Logo */}
                  {currentOrg.logo_url ? (
                    <img
                      src={currentOrg.logo_url}
                      alt={currentOrg.name}
                      className="w-24 h-24 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                      <span className="text-3xl text-slate-500 dark:text-slate-400 font-bold">
                        {currentOrg.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Name & Status */}
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {currentOrg.name}
                    </h2>
                    <div className="mt-2">
                      <span
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium",
                          currentOrg.status === "active" &&
                            "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                          currentOrg.status === "pending_verification" &&
                            "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
                          currentOrg.status === "suspended" &&
                            "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
                          currentOrg.status === "rejected" &&
                            "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
                        )}
                      >
                        {currentOrg.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                      ID: {currentOrg.id}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/dashboard/org/${orgId}/edit`)}
                  >
                    Edit
                  </Button>
                </div>
              </div>

              {/* Banner */}
              {currentOrg.banner_url && (
                <div className="rounded-lg overflow-hidden">
                  <img
                    src={currentOrg.banner_url}
                    alt="Banner"
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}

              {/* Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Description */}
                {currentOrg.description && (
                  <div className="md:col-span-2">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Description
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      {currentOrg.description}
                    </p>
                  </div>
                )}

                {/* Website */}
                {currentOrg.website && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Website
                    </h3>
                    <a
                      href={currentOrg.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {currentOrg.website}
                    </a>
                  </div>
                )}

                {/* Phone */}
                {currentOrg.phone && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Phone
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      {currentOrg.phone}
                    </p>
                  </div>
                )}

                {/* Created At */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Created
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {new Date(currentOrg.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Verified At */}
                {currentOrg.verified_at && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Verified
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      {new Date(currentOrg.verified_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Teams Card */}
                  <button
                    onClick={() => router.push(`/dashboard/org/${orgId}/teams`)}
                    className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors text-left"
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">Teams</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Manage your teams</p>
                    </div>
                  </button>

                  {/* Wallet Card */}
                  <button
                    onClick={() => router.push(`/dashboard/org/${orgId}/wallet`)}
                    className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors text-left"
                  >
                    <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">Wallet</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">View balance & recharge</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
