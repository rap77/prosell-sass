/**
 * ProductImageGallery component tests
 *
 * Following TDD: RED → GREEN → REFACTOR
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { ProductImageGallery } from "../ProductImageGallery";
import type { ProductImage } from "@/types/product-image";

vi.mock("next/image", () => ({
  // Intentional plain <img> stub for next/image; alt is forwarded via props.
  default: ({
    fill: _fill,
    unoptimized: _unoptimized,
    ...props
  }: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="" {...props} />;
  },
}));

// Mock images for testing
const mockImages: ProductImage[] = [
  {
    id: "1",
    product_id: "prod-1",
    url: "https://example.com/image1.jpg",
    thumbnail_url: "https://example.com/thumb1.jpg",
    sort_order: 0,
    is_primary: true,
    alt_text: "Front view",
    width: 800,
    height: 600,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    product_id: "prod-1",
    url: "https://example.com/image2.jpg",
    thumbnail_url: "https://example.com/thumb2.jpg",
    sort_order: 1,
    is_primary: false,
    alt_text: "Side view",
    width: 800,
    height: 600,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "3",
    product_id: "prod-1",
    url: "https://example.com/image3.jpg",
    thumbnail_url: "https://example.com/thumb3.jpg",
    sort_order: 2,
    is_primary: false,
    alt_text: "Rear view",
    width: 800,
    height: 600,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

describe("ProductImageGallery", () => {
  describe("Rendering", () => {
    it("should render main image prominently", () => {
      render(<ProductImageGallery images={mockImages} />);

      // Main image is the first one with this alt text (has full URL, not thumbnail)
      const mainImages = screen.getAllByAltText("Front view");
      expect(mainImages[0]).toBeInTheDocument();
      expect(mainImages[0]).toHaveAttribute(
        "src",
        "https://example.com/image1.jpg",
      );
    });

    it("should display thumbnails below main image", () => {
      render(<ProductImageGallery images={mockImages} />);

      // Should have 4 images total (1 main + 3 thumbnails)
      const images = screen.getAllByRole("img");
      expect(images).toHaveLength(4);
    });

    it("should highlight selected thumbnail", () => {
      render(<ProductImageGallery images={mockImages} />);

      // First thumbnail button should have ring-blue-500 class
      const firstThumbnail = screen.getByLabelText("Ver imagen 1: Front view");
      expect(firstThumbnail).toHaveAttribute("aria-current", "true");
    });

    it("should be responsive - stack thumbnails on mobile", () => {
      render(<ProductImageGallery images={mockImages} />);

      const gallery = screen.getByTestId("image-gallery");
      // Gallery uses flex flex-col Tailwind classes for column direction
      expect(gallery.className).toContain("flex-col");
    });
  });

  describe("Navigation", () => {
    it("should show next button when there are more images", () => {
      render(<ProductImageGallery images={mockImages} />);

      const nextButton = screen.getByLabelText("Imagen siguiente");
      expect(nextButton).toBeInTheDocument();
      expect(nextButton).not.toBeDisabled();
    });

    it("should show previous button when not on first image", async () => {
      render(<ProductImageGallery images={mockImages} />);

      // Click next to move to second image
      const nextButton = screen.getByLabelText("Imagen siguiente");
      fireEvent.click(nextButton);

      await waitFor(() => {
        const prevButton = screen.getByLabelText("Imagen anterior");
        expect(prevButton).not.toBeDisabled();
      });
    });

    it("should disable previous button on first image", () => {
      render(<ProductImageGallery images={mockImages} />);

      const prevButton = screen.getByLabelText("Imagen anterior");
      expect(prevButton).toBeDisabled();
    });

    it("should disable next button on last image", async () => {
      render(<ProductImageGallery images={mockImages} />);

      // Navigate to last image
      const nextButton = screen.getByLabelText("Imagen siguiente");
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);

      await waitFor(() => {
        const nextBtn = screen.getByLabelText("Imagen siguiente");
        expect(nextBtn).toBeDisabled();
      });
    });

    it("should update main image when next button is clicked", async () => {
      render(<ProductImageGallery images={mockImages} />);

      const nextButton = screen.getByLabelText("Imagen siguiente");
      fireEvent.click(nextButton);

      await waitFor(() => {
        const mainImages = screen.getAllByAltText("Side view");
        expect(mainImages[0]).toBeInTheDocument();
        expect(mainImages[0]).toHaveAttribute(
          "src",
          "https://example.com/image2.jpg",
        );
      });
    });

    it("should update main image when previous button is clicked", async () => {
      render(<ProductImageGallery images={mockImages} />);

      // Go to second image
      const nextButton = screen.getByLabelText("Imagen siguiente");
      fireEvent.click(nextButton);

      // Go back to first
      await waitFor(() => {
        const prevButton = screen.getByLabelText("Imagen anterior");
        fireEvent.click(prevButton);

        const mainImages = screen.getAllByAltText("Front view");
        expect(mainImages[0]).toBeInTheDocument();
        expect(mainImages[0]).toHaveAttribute(
          "src",
          "https://example.com/image1.jpg",
        );
      });
    });
  });

  describe("Thumbnail Selection", () => {
    it("should update main image when thumbnail is clicked", async () => {
      render(<ProductImageGallery images={mockImages} />);

      const thirdThumbnail = screen.getByLabelText("Ver imagen 3: Rear view");
      fireEvent.click(thirdThumbnail);

      await waitFor(() => {
        const mainImages = screen.getAllByAltText("Rear view");
        expect(mainImages[0]).toBeInTheDocument();
        expect(mainImages[0]).toHaveAttribute(
          "src",
          "https://example.com/image3.jpg",
        );
      });
    });

    it("should update thumbnail highlight when clicked", async () => {
      render(<ProductImageGallery images={mockImages} />);

      const secondThumbnail = screen.getByLabelText("Ver imagen 2: Side view");
      fireEvent.click(secondThumbnail);

      await waitFor(() => {
        expect(secondThumbnail).toHaveAttribute("aria-current", "true");
      });
    });
  });

  describe("Keyboard Navigation", () => {
    it("should go to next image when right arrow is pressed", async () => {
      render(<ProductImageGallery images={mockImages} />);

      const gallery = screen.getByTestId("image-gallery");
      fireEvent.keyDown(gallery, { key: "ArrowRight" });

      await waitFor(() => {
        const mainImages = screen.getAllByAltText("Side view");
        expect(mainImages[0]).toBeInTheDocument();
        expect(mainImages[0]).toHaveAttribute(
          "src",
          "https://example.com/image2.jpg",
        );
      });
    });

    it("should go to previous image when left arrow is pressed", async () => {
      render(<ProductImageGallery images={mockImages} />);

      // First go to second image
      const nextButton = screen.getByLabelText("Imagen siguiente");
      fireEvent.click(nextButton);

      // Then go back with keyboard
      await waitFor(() => {
        const gallery = screen.getByTestId("image-gallery");
        fireEvent.keyDown(gallery, { key: "ArrowLeft" });

        const mainImages = screen.getAllByAltText("Front view");
        expect(mainImages[0]).toBeInTheDocument();
        expect(mainImages[0]).toHaveAttribute(
          "src",
          "https://example.com/image1.jpg",
        );
      });
    });

    it("should not navigate when other keys are pressed", () => {
      render(<ProductImageGallery images={mockImages} />);

      const gallery = screen.getByTestId("image-gallery");
      fireEvent.keyDown(gallery, { key: "Enter" });

      // Should still show first image (main image is first with this alt text)
      const mainImages = screen.getAllByAltText("Front view");
      expect(mainImages[0]).toBeInTheDocument();
      expect(mainImages[0]).toHaveAttribute(
        "src",
        "https://example.com/image1.jpg",
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty images array gracefully", () => {
      render(<ProductImageGallery images={[]} />);

      const gallery = screen.getByTestId("image-gallery");
      expect(gallery).toBeInTheDocument();
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });

    it("should handle single image", () => {
      const singleImage = [mockImages[0]];
      render(<ProductImageGallery images={singleImage} />);

      const mainImage = screen.getByAltText("Front view");
      expect(mainImage).toBeInTheDocument();

      // With single image, navigation buttons should not be rendered
      expect(
        screen.queryByLabelText("Imagen siguiente"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByLabelText("Imagen anterior"),
      ).not.toBeInTheDocument();
    });

    it("should handle images without alt text", () => {
      const imagesWithoutAlt: ProductImage[] = [
        {
          ...mockImages[0],
          alt_text: undefined,
        },
      ];

      render(<ProductImageGallery images={imagesWithoutAlt} />);

      // Image with empty alt text gets role="presentation" and won't be found by getByRole('img')
      // Use getByAltText with empty string instead
      const mainImage = screen.getByAltText("");
      expect(mainImage).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels", () => {
      render(<ProductImageGallery images={mockImages} />);

      expect(screen.getByLabelText("Imagen anterior")).toBeInTheDocument();
      expect(screen.getByLabelText("Imagen siguiente")).toBeInTheDocument();
      expect(screen.getByTestId("image-gallery")).toHaveAttribute(
        "role",
        "region",
      );
    });

    it("should support keyboard navigation", () => {
      render(<ProductImageGallery images={mockImages} />);

      const gallery = screen.getByTestId("image-gallery");
      expect(gallery).toHaveAttribute("tabIndex", "0");
    });
  });
});
