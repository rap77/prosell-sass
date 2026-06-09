/**
 * Unit tests for `HeroShotSelector` — publisher thumbnail grid that
 * promotes a single image to hero status.
 *
 * Regression context: HeroShotSelector renders signed MinIO URLs the
 * same way the catalog does. The Next.js `/_next/image` optimization
 * proxy runs server-side inside the Docker `web` container, where
 * `localhost:9000` does not resolve to MinIO, so the proxy 400s on
 * every image unless the component opts out via `unoptimized={true}`.
 * This test guards that contract. If a future change drops the prop,
 * the publisher page breaks on first render.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeroShotSelector } from "@/components/publisher/HeroShotSelector";

// Stub next/image and forward `unoptimized` as a data attribute so the
// test can assert the prop was passed. Same pattern as the
// ProductImageGallery test — keeps the assertion blackbox-ish even
// with a mock.
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    unoptimized,
  }: {
    src: string;
    alt: string;
    unoptimized?: boolean;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-testid="next-image"
      src={src}
      alt={alt}
      data-unoptimized={unoptimized ? "true" : "false"}
    />
  ),
}));

const SIGNED = (i: number) =>
  `http://localhost:9000/prosell-assets/orgs/abc/vehicles/hero-${i}.jpg`;

describe("HeroShotSelector", () => {
  it("renders the empty-state message when given no images", () => {
    render(
      <HeroShotSelector images={[]} heroIndex={0} onHeroChange={() => {}} />,
    );
    expect(screen.getByText(/No hay fotos disponibles/i)).toBeInTheDocument();
  });

  it("renders a thumbnail for every image with the correct alt text", () => {
    const images = [SIGNED(1), SIGNED(2), SIGNED(3)];
    render(
      <HeroShotSelector
        images={images}
        heroIndex={0}
        onHeroChange={() => {}}
      />,
    );

    const imgs = screen.queryAllByTestId("next-image");
    expect(imgs).toHaveLength(3);
    expect(imgs[0]).toHaveAttribute("alt", "Foto 1");
    expect(imgs[1]).toHaveAttribute("alt", "Foto 2");
    expect(imgs[2]).toHaveAttribute("alt", "Foto 3");
  });

  it("passes unoptimized={true} to every <Image> (signed URL regression)", () => {
    // This is the actual regression guard. If the prop is dropped from
    // the component, the publisher page 400s on the first signed URL.
    const images = [SIGNED(1), SIGNED(2)];
    render(
      <HeroShotSelector
        images={images}
        heroIndex={0}
        onHeroChange={() => {}}
      />,
    );

    const imgs = screen.queryAllByTestId("next-image");
    expect(imgs).toHaveLength(2);
    for (const img of imgs) {
      expect(img.getAttribute("data-unoptimized")).toBe("true");
    }
  });

  it("calls onHeroChange with the clicked index", () => {
    const onHeroChange = vi.fn();
    const images = [SIGNED(1), SIGNED(2), SIGNED(3)];
    render(
      <HeroShotSelector
        images={images}
        heroIndex={0}
        onHeroChange={onHeroChange}
      />,
    );

    // Click the second thumbnail
    const buttons = screen.getAllByRole("button");
    buttons[1].click();
    expect(onHeroChange).toHaveBeenCalledWith(1);
  });
});
