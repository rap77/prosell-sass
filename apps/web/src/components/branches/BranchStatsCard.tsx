"use client";

import { Car, Eye, FileText, Activity } from "lucide-react";
import { useBranchStats } from "@/lib/api/branches";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface BranchStatsCardProps {
  branchId: string;
  branchName: string;
}

export function BranchStatsCard({ branchId, branchName }: BranchStatsCardProps) {
  const { data: stats, isLoading, error } = useBranchStats(branchId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{branchName}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            Failed to load branch statistics
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No activity yet";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{branchName}</span>
          <div className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span>{formatDate(stats?.last_activity ?? null)}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
            <Car className="h-5 w-5 text-primary mb-2" />
            <span className="text-2xl font-bold">{stats?.total_vehicles ?? 0}</span>
            <span className="text-xs text-muted-foreground">Total Vehicles</span>
          </div>
          <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
            <Eye className="h-5 w-5 text-green-600 mb-2" />
            <span className="text-2xl font-bold">{stats?.published_vehicles ?? 0}</span>
            <span className="text-xs text-muted-foreground">Published</span>
          </div>
          <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
            <FileText className="h-5 w-5 text-yellow-600 mb-2" />
            <span className="text-2xl font-bold">{stats?.draft_vehicles ?? 0}</span>
            <span className="text-xs text-muted-foreground">Draft</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
