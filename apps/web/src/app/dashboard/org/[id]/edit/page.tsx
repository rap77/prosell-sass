/**
 * Edit Organization Page
 *
 * Page for editing an existing organization.
 * Uses the OrganizationForm component in "edit" mode.
 */

import { useParams } from "next/navigation";
import { OrganizationForm } from "@/components/forms";
import { useOrganizationStore } from "@/stores";
import { useEffect, useState } from "react";

export default function EditOrganizationPage() {
  const params = useParams();
  const orgId = params.id as string;
  const { currentOrg, fetchOrganizationById, isLoading } = useOrganizationStore();
  const [isClient, setIsClient] = useState(false);

  // Fetch organization on mount
  useEffect(() => {
    setIsClient(true);
    if (orgId) {
      fetchOrganizationById(orgId, "test-user-123"); // TODO: get from auth
    }
  }, [orgId, fetchOrganizationById]);

  // Server-side fallback
  if (!isClient) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
        <div className="max-w-2xl mx-auto">
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
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Edit Organization
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Update your organization information
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
              <p className="text-slate-600 dark:text-slate-400 mt-4">
                Loading organization...
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        {!isLoading && currentOrg && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
            <OrganizationForm
              mode="edit"
              organizationId={orgId}
              initialData={{
                name: currentOrg.name,
                description: currentOrg.description || undefined,
                website: currentOrg.website || undefined,
                phone: currentOrg.phone || undefined,
              }}
            />
          </div>
        )}
      </div>
    </main>
  );
}
