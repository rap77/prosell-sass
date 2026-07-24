import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ImageDropzone } from "./ImageDropzone";

// Mock upload store
vi.mock("@/lib/stores/uploadStore", () => ({
  useUploadStore: () => ({
    addFile: vi.fn(),
  }),
}));

// Mock clipboard hook
vi.mock("@/lib/hooks/useClipboardPasteImage", () => ({
  useClipboardPasteImage: vi.fn(),
}));

// Mock compression hook (Task 4b)
vi.mock("@/lib/hooks/useImageCompression", () => ({
  useImageCompression: () => ({
    compressImage: vi.fn((file: File) => Promise.resolve(file)), // ponytail: passthrough for tests
  }),
}));

describe("ImageDropzone Mobile Camera", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have capture attribute for mobile camera (rear camera)", () => {
    render(<ImageDropzone />);

    const input = screen
      .getByRole("presentation")
      .querySelector('input[type="file"]');

    expect(input).toBeDefined();
    expect(input?.getAttribute("accept")).toContain("image/*");
    expect(input?.getAttribute("capture")).toBe("environment"); // Rear camera
  });

  it("should accept image/* mime type for camera compatibility", () => {
    render(<ImageDropzone />);

    const input = screen
      .getByRole("presentation")
      .querySelector('input[type="file"]');

    // Camera API requires accept="image/*" to work on iOS/Android
    expect(input?.getAttribute("accept")).toContain("image/*");
  });

  it("should support multiple file selection", () => {
    render(<ImageDropzone />);

    const input = screen
      .getByRole("presentation")
      .querySelector('input[type="file"]');

    // Dealers upload multiple photos per vehicle
    expect(input?.hasAttribute("multiple")).toBe(true);
  });
});

describe("ImageDropzone Desktop Compatibility", () => {
  it("should maintain drag and drop functionality", () => {
    const { container } = render(<ImageDropzone />);

    const dropzone = container.querySelector('[role="presentation"]');

    // Dropzone should still be clickable for desktop users
    expect(dropzone).toBeDefined();
    expect(dropzone?.className).toContain("cursor-pointer");
  });

  it("should show helpful instructions for all input methods", () => {
    render(<ImageDropzone />);

    // Text should mention all 3 methods: drag, browse (camera on mobile), paste
    expect(screen.getByText(/drag.*drop.*browse.*paste/i)).toBeDefined();
  });
});
