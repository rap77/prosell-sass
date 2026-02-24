/**
 * Teams List Page
 *
 * Displays all teams for an organization with pagination.
 * Client component that fetches data from teamStore.
 */

"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTeamStore, useAuthStore } from "@/stores";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Users, Plus } from "lucide-react";

export default function TeamsPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const tenantId = user?.id || "";
  const orgId = (params.id as string) || "";

  const {
    teams,
    pagination,
    isLoading,
    error,
    fetchTeamsByOrg,
    clearError,
  } = useTeamStore();

  // Fetch teams on mount
  useEffect(() => {
    if (orgId && tenantId) {
      fetchTeamsByOrg({
        org_id: orgId,
        tenant_id: tenantId,
        skip: 0,
        limit: 20,
      });
    }
  }, [orgId, tenantId, fetchTeamsByOrg]);

  const handleRetry = () => {
    clearError();
    fetchTeamsByOrg({
      org_id: orgId,
      tenant_id: tenantId,
      skip: 0,
      limit: 20,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
              >
                <Users className="h-5 w-5" />
              </Button>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                Teams
              </h1>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mt-2 ml-14">
              Manage teams for this organization
            </p>
          </div>
          <Button onClick={() => router.push(`/dashboard/org/${orgId}/teams/new`)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Team
          </Button>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
              <p className="text-slate-600 dark:text-slate-400 mt-4">
                Loading teams...
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
          {!isLoading && !error && teams.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto text-slate-400 mb-4" />
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                You don't have any teams yet.
              </p>
              <Button onClick={() => router.push(`/dashboard/org/${orgId}/teams/new`)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Team
              </Button>
            </div>
          )}

          {/* Teams List */}
          {!isLoading && !error && teams.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="p-6 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer"
                  onClick={() => router.push(`/dashboard/org/${orgId}/teams/${team.id}`)}
                >
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-primary" />
                  </div>

                  {/* Info */}
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    {team.name}
                  </h3>

                  {/* Member count */}
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Users className="h-4 w-4" />
                    <span>{team.member_count ?? 0} members</span>
                  </div>

                  {/* Created date */}
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
                    Created {new Date(team.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.total > pagination.limit && (
            <div className="mt-8 flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Showing {teams.length} of {pagination.total} teams
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.skip <= 0}
                  onClick={() =>
                    fetchTeamsByOrg({
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
                    fetchTeamsByOrg({
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
  );
}
