"use client";

import { Building2, Check } from "lucide-react";
import { useDealers } from "@/lib/api/dealers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Dealer {
  id: string;
  name: string;
  slug: string;
  city?: string;
  state?: string;
}

interface DealerSelectorProps {
  value?: string;
  onChange: (dealerId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showStats?: boolean;
}

export function DealerSelector({
  value,
  onChange,
  placeholder = "Select a dealer...",
  disabled = false,
  showStats = false,
}: DealerSelectorProps) {
  const { data: dealersData, isLoading, error } = useDealers();
  const dealers = dealersData?.items ?? [];

  // Find selected dealer
  const selectedDealer = dealers.find((d) => d.id === value);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full" aria-label="Select dealer">
        {selectedDealer ? (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{selectedDealer.name}</span>
            {selectedDealer.city && (
              <span className="text-sm text-muted-foreground">
                {selectedDealer.city}
                {selectedDealer.state && `, ${selectedDealer.state}`}
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
            <span className="ml-2 text-sm text-muted-foreground">Loading dealers...</span>
          </div>
        ) : error ? (
          <div className="px-2 py-4 text-sm text-destructive">
            Failed to load dealers
          </div>
        ) : dealers.length === 0 ? (
          <div className="px-2 py-4 text-sm text-muted-foreground">
            No dealers available
          </div>
        ) : (
          dealers.map((dealer) => (
            <SelectItem key={dealer.id} value={dealer.id}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="font-medium">{dealer.name}</span>
                    {(dealer.city || dealer.state) && (
                      <span className="text-xs text-muted-foreground">
                        {[dealer.city, dealer.state].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </div>
                </div>
                {value === dealer.id && (
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
