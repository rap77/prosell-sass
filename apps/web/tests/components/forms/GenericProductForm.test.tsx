import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GenericProductForm } from "@/components/forms/GenericProductForm";
import type { CategoryNode } from "@/types/category";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/api/products", () => ({
  useCreateProduct: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/lib/stores/uploadStore", () => {
  const hook = vi.fn(() => ({
    images: [],
    coverImageId: null,
    clearAll: vi.fn(),
  }));
  Object.assign(hook, { getState: vi.fn(() => ({ images: [], coverImageId: null })) });
  return { useUploadStore: hook };
});

vi.mock("@/lib/hooks/useImageUploadOptimized", () => ({
  useImageUploadOptimized: () => ({ uploadImages: vi.fn() }),
}));

vi.mock("@/components/upload/ImageDropzone", () => ({
  ImageDropzone: () => <div data-testid="image-dropzone" />,
}));

vi.mock("@/components/forms/ProductCoverPicker", () => ({
  ProductCoverPicker: () => <div data-testid="cover-picker" />,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

function makeCategory(overrides: Partial<CategoryNode> = {}): CategoryNode {
  return {
    id: "cat-1",
    name: "Ropa",
    slug: "ropa",
    attribute_schema: {
      color: { type: "string", filter_type: "text", label: "Color" },
      talla: {
        type: "select",
        filter_type: "select",
        label: "Talla",
        options: ["S", "M", "L"],
      },
    },
    attribute_groups: [],
    presentation: null,
    filter_fields: [],
    ...overrides,
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("GenericProductForm", () => {
  it("renders dynamic fields from the category schema", () => {
    render(<GenericProductForm category={makeCategory()} />, { wrapper });
    expect(screen.getByLabelText("Color")).toBeInTheDocument();
  });

  it("renders static fields (price, description)", () => {
    render(<GenericProductForm category={makeCategory()} />, { wrapper });
    expect(screen.getByLabelText(/precio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descripción/i)).toBeInTheDocument();
  });

  it("renders a submit button", () => {
    render(<GenericProductForm category={makeCategory()} />, { wrapper });
    expect(
      screen.getByRole("button", { name: /publicar/i }),
    ).toBeInTheDocument();
  });

  it("renders image dropzone", () => {
    render(<GenericProductForm category={makeCategory()} />, { wrapper });
    expect(screen.getByTestId("image-dropzone")).toBeInTheDocument();
  });
});
