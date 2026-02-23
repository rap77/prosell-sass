/**
 * Create Organization Page
 *
 * Page for creating a new organization.
 * Uses the OrganizationForm component in "create" mode.
 */

import { OrganizationForm } from "@/components/forms";

export default function NewOrganizationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Create Organization
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Set up your organization to get started
          </p>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
          <OrganizationForm mode="create" />
        </div>
      </div>
    </div>
  );
}
