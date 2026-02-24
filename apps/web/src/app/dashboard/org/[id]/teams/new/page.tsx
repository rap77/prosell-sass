/**
 * Create Team Page
 *
 * Page for creating a new team within an organization.
 * Uses the TeamForm component in "create" mode.
 */

"use client";

import { useRouter, useParams } from "next/navigation";
import { TeamForm } from "@/components/forms";
import { Users, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NewTeamPage() {
  const router = useRouter();
  const params = useParams();
  const orgId = (params.id as string) || "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/dashboard/org/${orgId}/teams`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Users className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Create Team
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Add a new team to your organization
          </p>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
          <TeamForm
            mode="create"
            organizationId={orgId}
            onSuccess={() => router.push(`/dashboard/org/${orgId}/teams`)}
          />
        </div>
      </div>
    </div>
  );
}
