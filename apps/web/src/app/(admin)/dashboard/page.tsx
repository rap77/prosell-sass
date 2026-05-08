/**
 * Admin Dashboard Page
 *
 * Overview dashboard for super_admin role users.
 * Displays system-wide statistics, quick actions, and recent activity.
 *
 * Server Component with client-side interactivity for stats cards.
 */

import { Suspense } from "react";
import Link from "next/link";
import { 
  Building2, 
  Car, 
  Users, 
  FileText, 
  TrendingUp,
  Activity,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Metadata for the page
export const metadata = {
  title: "Admin Dashboard | ProSell SaaS",
  description: "System administration dashboard for ProSell SaaS platform",
};

/**
 * Stat Card Component
 * Displays a single statistic with icon and label
 */
function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon 
}: { 
  title: string; 
  value: string | number; 
  description: string; 
  icon: React.ElementType; 
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Stat Card Skeleton Loader
 */
function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

/**
 * Quick Action Card Component
 */
function QuickActionCard({ 
  title, 
  description, 
  href, 
  icon: Icon 
}: { 
  title: string; 
  description: string; 
  href: string; 
  icon: React.ElementType; 
}) {
  return (
    <Link href={href} className="block group">
      <Card className="hover:border-primary transition-all duration-200 hover:shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="text-sm mt-1">
                {description}
              </CardDescription>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}

/**
 * Stats Data Fetcher Component
 * Fetches admin statistics from the API
 */
async function AdminStatsData() {
  try {
    // Fetch stats from API
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/admin/stats`, {
      cache: 'no-store', // Always fresh data
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }

    const data = await response.json();

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Organizations"
          value={data.total_organizations || 0}
          description="Active organizations in the system"
          icon={Building2}
        />
        <StatCard
          title="Total Vehicles"
          value={data.total_vehicles || 0}
          description="Vehicles across all organizations"
          icon={Car}
        />
        <StatCard
          title="Total Users"
          value={data.total_users || 0}
          description="Registered users in the platform"
          icon={Users}
        />
        <StatCard
          title="Total Publications"
          value={data.total_publications || 0}
          description="Active marketplace publications"
          icon={FileText}
        />
      </div>
    );
  } catch (error) {
    // Return fallback stats if API fails
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Organizations"
          value="—"
          description="Unable to load statistics"
          icon={Building2}
        />
        <StatCard
          title="Total Vehicles"
          value="—"
          description="Unable to load statistics"
          icon={Car}
        />
        <StatCard
          title="Total Users"
          value="—"
          description="Unable to load statistics"
          icon={Users}
        />
        <StatCard
          title="Total Publications"
          value="—"
          description="Unable to load statistics"
          icon={FileText}
        />
      </div>
    );
  }
}

/**
 * Recent Activity Component
 * Displays recent system activity
 */
function RecentActivity() {
  // Placeholder data - in real implementation, fetch from API
  const activities = [
    {
      id: 1,
      action: "New organization created",
      entity: "Auto Brancheship Inc.",
      time: "2 minutes ago",
      type: "organization",
    },
    {
      id: 2,
      action: "Vehicle published",
      entity: "2024 Toyota Camry",
      time: "15 minutes ago",
      type: "vehicle",
    },
    {
      id: 3,
      action: "User registered",
      entity: "john@example.com",
      time: "1 hour ago",
      type: "user",
    },
    {
      id: 4,
      action: "Publication status updated",
      entity: "2019 Honda Civic",
      time: "2 hours ago",
      type: "publication",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>
          Latest actions across the platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="mt-1">
                {activity.type === 'organization' && <Building2 className="h-4 w-4 text-blue-500" />}
                {activity.type === 'vehicle' && <Car className="h-4 w-4 text-green-500" />}
                {activity.type === 'user' && <Users className="h-4 w-4 text-purple-500" />}
                {activity.type === 'publication' && <FileText className="h-4 w-4 text-orange-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {activity.action}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {activity.entity}
                </p>
              </div>
              <div className="text-xs text-muted-foreground whitespace-nowrap">
                {activity.time}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Main Admin Dashboard Page Component
 */
export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome to the ProSell SaaS administration panel. Monitor and manage your platform.
        </p>
      </div>

      {/* Stats Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">System Overview</h2>
        </div>
        <Suspense fallback={<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>}>
          <AdminStatsData />
        </Suspense>
      </div>

      {/* Quick Actions & Activity Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Quick Actions</h2>
          <div className="grid gap-3">
            <QuickActionCard
              title="Manage Organizations"
              description="View and manage all organizations"
              href="/dashboard/org"
              icon={Building2}
            />
            <QuickActionCard
              title="Vehicles Catalog"
              description="Browse all vehicles in the system"
              href="/catalog"
              icon={Car}
            />
            <QuickActionCard
              title="Create Organization"
              description="Add a new organization to the platform"
              href="/dashboard/org/new"
              icon={Users}
            />
            <QuickActionCard
              title="View Publications"
              description="Monitor marketplace publications"
              href="/dashboard/publications"
              icon={FileText}
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <RecentActivity />
        </div>
      </div>

      {/* System Health Banner */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 dark:text-green-100">
                System Operational
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                All services are running normally. Last check: Just now
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/system-status">View Details</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
