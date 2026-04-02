/**
 * Team Detail Page
 *
 * Displays detailed information about a single team.
 * Client component that fetches data from teamStore.
 */

"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTeamStore, useAuthStore } from "@/stores";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

export default function TeamDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orgId = params.id as string;
  const teamId = params.teamId as string;

  const { user } = useAuthStore();
  const tenantId = user?.id || "";

  const {
    currentTeam,
    isLoading,
    error,
    fetchTeamById,
    clearError,
  } = useTeamStore();

  // Fetch team on mount
  useEffect(() => {
    if (teamId && tenantId) {
      fetchTeamById(teamId, tenantId);
    }
  }, [teamId, tenantId, fetchTeamById]);

  const handleRetry = () => {
    clearError();
    fetchTeamById(teamId, tenantId);
  };

  // Loading state
  if (isLoading) {
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
            onClick={() => router.push(`/dashboard/org/${orgId}/teams`)}
          >
            ← Back
          </Button>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Team Details
          </h1>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
              <p className="text-slate-600 dark:text-slate-400 mt-4">
                Loading team...
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

          {/* Team Details */}
          {!isLoading && !error && currentTeam && (
            <div className="space-y-8">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-6">
                  {/* Icon */}
                  <div className="w-24 h-24 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="h-12 w-12 text-primary" />
                  </div>

                  {/* Name */}
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {currentTeam.name}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                      ID: {currentTeam.id}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/dashboard/org/${orgId}/teams/${teamId}/edit`)}
                  >
                    Edit
                  </Button>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Organization ID */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Organization ID
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {currentTeam.organization_id}
                  </p>
                </div>

                {/* Member Count */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Members
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {currentTeam.member_count ?? 0} members
                  </p>
                </div>

                {/* Created At */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Created
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {new Date(currentTeam.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Updated At */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Updated
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {new Date(currentTeam.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Members List */}
              {currentTeam.members && currentTeam.members.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                    Team Members
                  </h3>
                  <div className="space-y-2">
                    {currentTeam.members.map((member: any) => (
                      <div
                        key={member.id}
                        className="p-3 rounded-lg border border-slate-200 dark:border-slate-700"
                      >
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {member.user_id}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {member.role}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
