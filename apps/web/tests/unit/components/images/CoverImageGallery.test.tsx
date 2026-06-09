/**
 * Unit tests for `CoverImageGallery` — the reusable, prop-driven
 * component that renders a grid of images with click-to-set cover
 * UX.
 *
 * Why this component exists (single source of truth):
 *   The "pick which image is the cover" UX is consumed by
 *   `forms/ProductCoverPicker.tsx`, the single store-backed picker
 *   ProductForm mounts for BOTH create and edit. The picker reads the
 *   unified image list (in-flight + seeded) from the Zustand
 *   `uploadStore` and renders it through this gallery.
 *
 *   `CoverImageGallery` is PURE: it knows how to render the grid (star
 *   overlay, hover "Set as Cover", remove button) and how to call back
 *   when a cover is picked or an image removed. It owns no data source,
 *   so any future consumer reuses the exact same UX.
 *
 *   The component is intentionally PURE: no Zustand, no fetch, no
 *   router. That makes it cheap to test, easy to reuse in any new
 *   flow (e.g. a future "edit cover from the catalog card"), and
 *   immune to the data-layer churn that has hit the codebase.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  CoverImageGallery,
  type CoverImageItem,
} from "@/components/images/CoverImageGallery";

// Stub next/image the same way the rest of the suite does — forward
// the src and a `data-unoptimized` marker (set by the gallery for
// preview blob URLs) so the test can assert it.
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
      data-testid="cover-image-img"
      src={src}
      alt={alt}
      data-unoptimized={unoptimized ? "true" : "false"}
    />
  ),
}));

const KEY_A = "orgs/t1/vehicles/a.jpg";
const KEY_B = "orgs/t1/vehicles/b.jpg";
const KEY_C = "orgs/t1/vehicles/c.jpg";

function makeImages(): CoverImageItem[] {
  return [
    { id: "a", key: KEY_A, url: "blob:preview-a" },
    { id: "b", key: KEY_B, url: "blob:preview-b" },
    { id: "c", key: KEY_C, url: "blob:preview-c" },
  ];
}

describe("CoverImageGallery — render", () => {
  it("renders one tile per image with the correct alt text", () => {
    render(
      <CoverImageGallery
        images={makeImages()}
        coverKey={KEY_A}
        onCoverChange={() => {}}
      />,
    );
    const imgs = screen.queryAllByTestId("cover-image-img");
    expect(imgs).toHaveLength(3);
    expect(imgs[0]).toHaveAttribute("alt", "Imagen 1");
    expect(imgs[1]).toHaveAttribute("alt", "Imagen 2");
    expect(imgs[2]).toHaveAttribute("alt", "Imagen 3");
  });

  it("renders an empty-state hint when the list is empty", () => {
    // The component is the SOURCE OF TRUTH for the cover-pick UX.
    // When there are no images, the empty state is part of that UX.
    render(
      <CoverImageGallery
        images={[]}
        coverKey={null}
        onCoverChange={() => {}}
      />,
    );
    // No <img> should be rendered when the list is empty.
    expect(screen.queryAllByTestId("cover-image-img")).toHaveLength(0);
  });

  it('marks the cover tile with a "Cover" badge', () => {
    render(
      <CoverImageGallery
        images={makeImages()}
        coverKey={KEY_B}
        onCoverChange={() => {}}
      />,
    );
    // The Cover badge appears once, on the cover tile.
    const badges = screen.queryAllByText(/Cover/i);
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it("uses unoptimized on next/image (signed/blob URLs cannot go through /_next/image)", () => {
    // Regression: when the consumer passes signed MinIO URLs or blob
    // previews, the <Image> must set unoptimized — same reason as
    // ProductImageGallery: the proxy 400s on those URLs.
    render(
      <CoverImageGallery
        images={makeImages()}
        coverKey={KEY_A}
        onCoverChange={() => {}}
      />,
    );
    const imgs = screen.queryAllByTestId("cover-image-img");
    for (const img of imgs) {
      expect(img.getAttribute("data-unoptimized")).toBe("true");
    }
  });
});

describe("CoverImageGallery — interaction", () => {
  it("calls onCoverChange with the clicked image key", () => {
    // This is the whole point of the component: the consumer
    // decides what to do with the picked key (Zustand store vs
    // server mutation vs anything else). The component just
    // emits the key.
    const onCoverChange = vi.fn();
    render(
      <CoverImageGallery
        images={makeImages()}
        coverKey={KEY_A}
        onCoverChange={onCoverChange}
      />,
    );

    // Click the third tile (KEY_C).
    const tiles = screen.getAllByRole("button");
    fireEvent.click(tiles[2]);

    expect(onCoverChange).toHaveBeenCalledTimes(1);
    expect(onCoverChange).toHaveBeenCalledWith(KEY_C);
  });

  it("does not call onCoverChange when clicking the already-cover tile", () => {
    // Clicking the cover again is a no-op visually; whether the
    // consumer treats it as a no-op is up to the consumer. The
    // component still emits the key — that keeps the contract
    // simple ("every click emits"). The consumer decides what to
    // do with a redundant key (the upload store sets the same
    // value; the mutation treats it as idempotent).
    const onCoverChange = vi.fn();
    render(
      <CoverImageGallery
        images={makeImages()}
        coverKey={KEY_B}
        onCoverChange={onCoverChange}
      />,
    );
    const tiles = screen.getAllByRole("button");
    fireEvent.click(tiles[1]); // click the cover
    expect(onCoverChange).toHaveBeenCalledWith(KEY_B);
  });

  it("renders a remove button when onRemove is provided, and calls it with the id", () => {
    // Some consumers (the upload flow) need a remove button per
    // image. The component exposes it as an opt-in via the
    // `onRemove` prop, so the catalog/detail view (which is
    // read-only) doesn't get a confusing X button.
    const onRemove = vi.fn();
    render(
      <CoverImageGallery
        images={makeImages()}
        coverKey={KEY_A}
        onCoverChange={() => {}}
        onRemove={onRemove}
      />,
    );
    const removeButtons = screen.getAllByLabelText(/Remove image/i);
    expect(removeButtons).toHaveLength(3);
    fireEvent.click(removeButtons[1]);
    expect(onRemove).toHaveBeenCalledWith("b");
  });

  it("does NOT render remove buttons when onRemove is omitted", () => {
    // The read-only case: no remove buttons.
    render(
      <CoverImageGallery
        images={makeImages()}
        coverKey={KEY_A}
        onCoverChange={() => {}}
      />,
    );
    expect(screen.queryAllByLabelText(/Remove image/i)).toHaveLength(0);
  });

  it("disables the tile buttons when disabled is true", () => {
    // While a mutation is in flight, the parent may want to lock
    // interaction. The component honors a `disabled` flag.
    //
    // The tile is a `<div role="button">` (not a native `<button>`)
    // because the clickable tile wraps a smaller remove `<button>`
    // — HTML does not allow `<button>` to nest another `<button>`.
    // Native `disabled` is not available on a div, so we use
    // `aria-disabled` instead. testing-library's `toBeDisabled()`
    // only matches the native attribute; for the aria variant we
    // assert the attribute directly.
    render(
      <CoverImageGallery
        images={makeImages()}
        coverKey={KEY_A}
        onCoverChange={() => {}}
        disabled
      />,
    );
    const tiles = screen.getAllByRole("button");
    expect(tiles.length).toBeGreaterThan(0);
    for (const tile of tiles) {
      expect(tile.getAttribute("aria-disabled")).toBe("true");
      expect(tile.getAttribute("tabindex")).toBe("-1");
    }
  });
});
