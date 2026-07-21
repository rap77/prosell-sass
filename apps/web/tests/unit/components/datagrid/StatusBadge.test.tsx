import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/datagrid/StatusBadge";

describe("StatusBadge", () => {
  it("renders published status badge", () => {
    render(<StatusBadge status="published" />);
    expect(screen.getByTestId("vehicle-status")).toBeInTheDocument();
    expect(screen.getByText("Publicado")).toBeInTheDocument();
  });

  it("renders all 7 status states correctly", () => {
    const statuses = [
      { status: "published", label: "Publicado" },
      { status: "pending", label: "Pendiente" },
      { status: "failed", label: "Fallido" },
      { status: "draft", label: "Borrador" },
      { status: "expired", label: "Expirado" },
      { status: "online", label: "Online" },
      { status: "sold", label: "Vendido" },
    ] as const;

    statuses.forEach(({ status, label }) => {
      const { unmount } = render(<StatusBadge status={status} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    });
  });

  it("includes icon (aria-hidden) and sr-only text for accessibility", () => {
    render(<StatusBadge status="published" />);

    const badge = screen.getByTestId("vehicle-status");
    const icon = badge.querySelector("svg");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute("aria-hidden", "true");

    const srText = screen.getByText("published:", { selector: ".sr-only" });
    expect(srText).toBeInTheDocument();
  });

  it("applies rounded styling via Tailwind class", () => {
    const { container } = render(<StatusBadge status="published" />);
    const badge = container.querySelector(
      '[data-testid="vehicle-status"]',
    ) as HTMLElement;
    expect(badge).toBeTruthy();
    // Styled with Tailwind rounded-full class
    expect(badge.className).toContain("rounded-full");
  });
});
