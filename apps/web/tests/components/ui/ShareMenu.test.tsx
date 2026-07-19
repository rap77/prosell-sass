/**
 * ShareMenu Component Tests
 */
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShareMenu } from "@/components/ui/ShareMenu";

// ponytail: mock window.open once, assert per test
const mockWindowOpen = vi.fn();
vi.stubGlobal("open", mockWindowOpen);

// Mock clipboard
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: mockWriteText },
  configurable: true,
});

describe("ShareMenu", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://prosellweb.com");
    mockWriteText.mockResolvedValue(undefined);
  });

  it("returns null when productSlug is undefined", () => {
    const { container } = render(
      <ShareMenu
        productTitle="Test Product"
        productSlug={undefined}
        isPublished={true}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null when productSlug is null", () => {
    const { container } = render(
      <ShareMenu
        productTitle="Test Product"
        productSlug={null}
        isPublished={true}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders share button when slug exists", () => {
    render(
      <ShareMenu
        productTitle="Test Product"
        productSlug="test-slug"
        isPublished={true}
      />,
    );
    expect(
      screen.getByRole("button", { name: /compartir/i }),
    ).toBeInTheDocument();
  });

  it("shows all share options in dropdown", async () => {
    const user = userEvent.setup();
    render(
      <ShareMenu
        productTitle="Test Product"
        productSlug="test-slug"
        isPublished={true}
      />,
    );
    await user.click(screen.getByRole("button", { name: /compartir/i }));

    expect(screen.getByText("WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("Facebook")).toBeInTheDocument();
    expect(screen.getByText("X (Twitter)")).toBeInTheDocument();
    expect(screen.getByText("Copiar enlace")).toBeInTheDocument();
  });

  it("filters visible options when visibleOptions prop is set", async () => {
    const user = userEvent.setup();
    render(
      <ShareMenu
        productTitle="Test Product"
        productSlug="test-slug"
        isPublished={true}
        visibleOptions={["whatsapp", "copy-link"]}
      />,
    );
    await user.click(screen.getByRole("button", { name: /compartir/i }));

    expect(screen.getByText("WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("Copiar enlace")).toBeInTheDocument();
    expect(screen.queryByText("Facebook")).not.toBeInTheDocument();
    expect(screen.queryByText("X (Twitter)")).not.toBeInTheDocument();
  });

  it("opens WhatsApp URL when product is published", async () => {
    const user = userEvent.setup();
    render(
      <ShareMenu
        productTitle="Test Product"
        productSlug="test-slug"
        isPublished={true}
      />,
    );
    await user.click(screen.getByRole("button", { name: /compartir/i }));
    await user.click(screen.getByText("WhatsApp"));

    expect(mockWindowOpen).toHaveBeenCalledWith(
      expect.stringContaining("wa.me"),
      "_blank",
      "noopener,noreferrer",
    );
    expect(mockWindowOpen).toHaveBeenCalledWith(
      expect.stringContaining("test-slug"),
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("includes product title in WhatsApp message", async () => {
    const user = userEvent.setup();
    render(
      <ShareMenu
        productTitle="Honda Civic 2024"
        productSlug="test-slug"
        isPublished={true}
      />,
    );
    await user.click(screen.getByRole("button", { name: /compartir/i }));
    await user.click(screen.getByText("WhatsApp"));

    expect(mockWindowOpen).toHaveBeenCalledWith(
      expect.stringContaining("Honda%20Civic%202024"),
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("shows warning dialog when product is not published", async () => {
    const user = userEvent.setup();
    render(
      <ShareMenu
        productTitle="Test Product"
        productSlug="test-slug"
        isPublished={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: /compartir/i }));
    await user.click(screen.getByText("WhatsApp"));

    expect(screen.getByText("Producto no publicado")).toBeInTheDocument();
    expect(mockWindowOpen).not.toHaveBeenCalled();
  });

  it("shares anyway when confirming on warning dialog", async () => {
    const user = userEvent.setup();
    render(
      <ShareMenu
        productTitle="Test Product"
        productSlug="test-slug"
        isPublished={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: /compartir/i }));
    await user.click(screen.getByText("WhatsApp"));
    await user.click(screen.getByText("Compartir igual"));

    expect(mockWindowOpen).toHaveBeenCalledWith(
      expect.stringContaining("wa.me"),
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("cancels share when clicking cancel on warning dialog", async () => {
    const user = userEvent.setup();
    render(
      <ShareMenu
        productTitle="Test Product"
        productSlug="test-slug"
        isPublished={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: /compartir/i }));
    await user.click(screen.getByText("WhatsApp"));
    await user.click(screen.getByText("Cancelar"));

    expect(mockWindowOpen).not.toHaveBeenCalled();
    expect(screen.queryByText("Producto no publicado")).not.toBeInTheDocument();
  });

  it("calls onShare callback for copy-link option", async () => {
    const onShare = vi.fn();
    const user = userEvent.setup();
    render(
      <ShareMenu
        productTitle="Test Product"
        productSlug="test-slug"
        isPublished={true}
        onShare={onShare}
      />,
    );
    await user.click(screen.getByRole("button", { name: /compartir/i }));
    await user.click(screen.getByText("Copiar enlace"));

    // The onShare callback should be called with "copy-link"
    await waitFor(() => {
      expect(onShare).toHaveBeenCalledWith("copy-link");
    });
  });

  it("calls onShare callback with option id", async () => {
    const onShare = vi.fn();
    const user = userEvent.setup();
    render(
      <ShareMenu
        productTitle="Test Product"
        productSlug="test-slug"
        isPublished={true}
        onShare={onShare}
      />,
    );
    await user.click(screen.getByRole("button", { name: /compartir/i }));
    await user.click(screen.getByText("Facebook"));

    expect(onShare).toHaveBeenCalledWith("facebook");
  });

  it("applies custom className to trigger button", () => {
    render(
      <ShareMenu
        productTitle="Test Product"
        productSlug="test-slug"
        isPublished={true}
        className="custom-class"
      />,
    );
    const button = screen.getByRole("button", { name: /compartir/i });
    expect(button.className).toContain("custom-class");
  });
});
