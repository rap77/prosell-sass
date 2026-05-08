"use client";

import { Building2, Check } from "lucide-react";
import { useBranches } from "@/lib/api/branches";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Branch {
  id: string;
  name: string;
  slug: string;
  city?: string;
  state?: string;
}

interface BranchSelectorProps {
  value?: string;
  onChange: (branchId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showStats?: boolean;
}

export function BranchSelector({
  value,
  onChange,
  placeholder = "Select a branch...",
  disabled = false,
  showStats = false,
}: BranchSelectorProps) {
  const { data: branchesData, isLoading, error } = useBranches();
  const branches = branchesData?.items ?? [];

  // Find selected branch
  const selectedBranch = branches.find((d) => d.id === value);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full" aria-label="Select branch">
        {selectedBranch ? (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{selectedBranch.name}</span>
            {selectedBranch.city && (
              <span className="text-sm text-muted-foreground">
                {selectedBranch.city}
                {selectedBranch.state && `, ${selectedBranch.state}`}
              </span>
            )}
          </div>
        ) : (
          <SelectValue placeholder={placeholder} />
        )}
      </SelectTrigger>
      <SelectContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Loading branches...</span>
          </div>
        ) : error ? (
          <div className="px-2 py-4 text-sm text-destructive">
            Failed to load branches
          </div>
        ) : branches.length === 0 ? (
          <div className="px-2 py-4 text-sm text-muted-foreground">
            No branches available
          </div>
        ) : (
          branches.map((branch) => (
            <SelectItem key={branch.id} value={branch.id}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="font-medium">{branch.name}</span>
                    {(branch.city || branch.state) && (
                      <span className="text-xs text-muted-foreground">
                        {[branch.city, branch.state].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </div>
                </div>
                {value === branch.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
