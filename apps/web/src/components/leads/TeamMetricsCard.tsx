"use client";

import { Users, TrendingUp, Clock, AlertCircle } from "lucide-react";
import { useTeamMetrics, type TeamMetricsResponse } from "@/lib/api/leads";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * TeamMetricsCard - Display team lead performance metrics
 *
 * Shows:
 * - Total leads count
 * - New leads in last 24 hours
 * - Conversion rate (leads → appointment_set)
 * - Breakdown by vendedor with individual stats
 */
export function TeamMetricsCard() {
  const { data: metrics, isLoading, error } = useTeamMetrics();

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">Error loading metrics: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !metrics) {
    return <TeamMetricsCardSkeleton />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Leads */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.total_leads}</div>
          <p className="text-xs text-muted-foreground">All time</p>
        </CardContent>
      </Card>

      {/* New Leads (24h) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">New Leads</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.new_leads_last_24h}</div>
          <p className="text-xs text-muted-foreground">Last 24 hours</p>
        </CardContent>
      </Card>

      {/* Conversion Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(metrics.conversion_rate * 100).toFixed(0)}%
          </div>
          <p className="text-xs text-muted-foreground">To appointment set</p>
        </CardContent>
      </Card>

      {/* Top Performer */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {metrics.vendedor_breakdown.length > 0 ? (
            <>
              <div className="text-2xl font-bold truncate">
                {metrics.vendedor_breakdown[0].vendedor_name.split(" ")[0]}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.vendedor_breakdown[0].total_leads} leads
              </p>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">No data</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Vendedor Breakdown */}
      {metrics.vendedor_breakdown.length > 0 && (
        <Card className="md:col-span-2 lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">Performance by Vendedor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.vendedor_breakdown.map((vendedor) => (
                <div
                  key={vendedor.vendedor_id}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <div className="flex-1">
                    <p className="font-medium">{vendedor.vendedor_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {vendedor.new_leads} new in last 24h
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {vendedor.total_leads} leads
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(vendedor.conversion_rate * 100).toFixed(0)}%
                        conversion
                      </p>
                    </div>
                    {/* Conversion rate bar */}
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${vendedor.conversion_rate * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Loading skeleton for TeamMetricsCard
 */
function TeamMetricsCardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
      ))}
      {/* Vendedor breakdown skeleton */}
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b pb-2"
              >
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-2 w-16 h-2 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
