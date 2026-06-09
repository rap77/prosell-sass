import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TeamMetricsCard } from "./TeamMetricsCard";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock fetch globally
global.fetch = vi.fn();

describe("TeamMetricsCard", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("should show loading state initially", () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {}), // Never resolves - loading state
    );

    const { container } = render(<TeamMetricsCard />, { wrapper });
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("should display team metrics when data is loaded", async () => {
    const mockMetrics = {
      total_leads: 150,
      new_leads_last_24h: 12,
      conversion_rate: 0.35,
      vendedor_breakdown: [
        {
          vendedor_id: "1",
          vendedor_name: "Juan Pérez",
          total_leads: 50,
          new_leads: 5,
          conversion_rate: 0.4,
        },
        {
          vendedor_id: "2",
          vendedor_name: "María González",
          total_leads: 60,
          new_leads: 4,
          conversion_rate: 0.33,
        },
        {
          vendedor_id: "3",
          vendedor_name: "Carlos López",
          total_leads: 40,
          new_leads: 3,
          conversion_rate: 0.3,
        },
      ],
    };

    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockMetrics,
    });

    const { container } = render(<TeamMetricsCard />, { wrapper });

    await waitFor(() => {
      expect(container.textContent).toContain("150");
      expect(container.textContent).toContain("12");
      expect(container.textContent).toContain("35%");
    });

    // Check vendedor breakdown
    expect(container.textContent).toContain("Juan Pérez");
    expect(container.textContent).toContain("50");
  });

  it("should display error state when API fails", async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Failed to fetch metrics"),
    );

    const { container } = render(<TeamMetricsCard />, { wrapper });

    await waitFor(() => {
      expect(container.textContent).toContain("Failed to fetch metrics");
    });
  });

  it("should handle empty vendedor breakdown", async () => {
    const mockMetrics = {
      total_leads: 0,
      new_leads_last_24h: 0,
      conversion_rate: 0,
      vendedor_breakdown: [],
    };

    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockMetrics,
    });

    const { container } = render(<TeamMetricsCard />, { wrapper });

    await waitFor(() => {
      expect(container.textContent).toContain("0");
    });
  });
});
