/**
 * Unit tests for the public catalog landing section (workbook 4.6).
 * Behavior: renders the buscador and the catalog grid, each card links to
 * its /p/[slug] public page, typing re-queries with the search term, and
 * an API failure shows an error message instead of an empty grid.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LandingCatalog } from "./landing-catalog";

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const mockItem = {
  id: "pub-1",
  title: "Toyota Corolla 2022",
  slug: "toyota-corolla-2022",
  price_cents: 2500000,
  currency: "USD",
  condition: "used",
  status: "published",
  location_city: "Caracas",
  location_state: "Distrito Capital",
  image_urls: [],
  cover_url: null,
  is_featured: false,
};

function listResponse(items: (typeof mockItem)[], total = items.length) {
  return { ok: true, json: async () => ({ items, total, skip: 0, limit: 24 }) };
}

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <LandingCatalog />
    </QueryClientProvider>,
  );
}

describe("LandingCatalog", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("renders the buscador and cards from the public listing", async () => {
    mockFetch.mockResolvedValue(listResponse([mockItem]));
    renderSection();

    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    expect(await screen.findByText("Toyota Corolla 2022")).toBeInTheDocument();
  });

  it("links each card to its public product page", async () => {
    mockFetch.mockResolvedValue(listResponse([mockItem]));
    renderSection();

    const link = await screen.findByRole("link", { name: /toyota corolla/i });
    expect(link).toHaveAttribute("href", "/p/toyota-corolla-2022");
  });

  it("re-queries with the search term when the user types", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue(listResponse([]));
    renderSection();
    await screen.findByRole("searchbox");

    await user.type(screen.getByRole("searchbox"), "corolla");
    await waitFor(
      () => {
        const calls = mockFetch.mock.calls.filter(([url]) =>
          String(url).includes("search=corolla"),
        );
        expect(calls.length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );
  });

  it("shows an error message instead of the grid when the API fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ detail: "Backend down" }),
    });
    renderSection();

    expect(await screen.findByText(/error/i)).toBeInTheDocument();
    expect(screen.queryByText("Toyota Corolla 2022")).not.toBeInTheDocument();
  });
});
