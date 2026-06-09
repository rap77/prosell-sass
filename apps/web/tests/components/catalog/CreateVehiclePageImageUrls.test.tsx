/**
 * Regression: creating a vehicle must persist STORAGE KEYS (not signed
 * URLs) into product.image_urls, and the cover must be a storage key.
 *
 * Bug history: the create flow once took the signed URL returned by the
 * upload and put it into `image_urls`. Signed URLs expire in 1h and,
 * when re-fed to the image-urls signer, produce malformed URLs.
 *
 * After the single-store refactor the flow is: ImageDropzone → store →
 * ProductForm.submit() uploads in-flight entries (the hook writes the
 * raw `storageKey` back to the store) → the form reads `storageKey`
 * (NEVER the preview url) for `image_urls` + `cover_image_key`. This
 * test pins that end-to-end through the real ProductForm, the real
 * upload store, and the real upload hook — only the network call
 * (`uploadImageDirect`) is mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

// ---------- Mocks ----------------------------------------------------------

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({}),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/lib/logger", () => ({ logger: { debug: vi.fn(), error: vi.fn() } }));

vi.mock("next/image", () => ({
  default: ({ src }: { src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img data-testid="cover-image-img" src={src} />
  ),
}));

const mockCreateMutate = vi.fn(async (_payload: unknown) => ({
  id: "product-1",
  title: "Test",
  status: "draft",
}));
vi.mock("@/lib/api/products", () => ({
  useCreateProduct: () => ({ mutateAsync: mockCreateMutate, isPending: false }),
  useUpdateProduct: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useProduct: () => ({ data: undefined, isLoading: false, error: null }),
  useProductImageUrls: () => ({ data: undefined }),
}));

vi.mock("@/lib/api/categories", () => ({
  useCategories: () => ({
    data: [{ id: "cat-1", name: "Sedans", slug: "sedans" }],
    isLoading: false,
  }),
  useCategoryOptions: () => ({ data: [{ value: "cat-1", label: "Sedans" }] }),
}));

vi.mock("@/lib/api/vehicles", () => ({
  useDecodeVin: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ user: { id: "user-1", organization_id: "org-1" } }),
}));

// The ONLY network mock: the raw upload call. Returns a stale SIGNED
// URL and the raw STORAGE KEY — the contract under test is that the
// key (not the url) ends up in image_urls.
const SIGNED_URL =
  "http://minio:9000/bucket/orgs/tenant-1/vehicles/up-1.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=stale";
const STORAGE_KEY = "orgs/tenant-1/vehicles/up-1.jpg";
vi.mock("@/lib/api/images", () => ({
  uploadImageDirect: vi.fn(async () => ({ url: SIGNED_URL, key: STORAGE_KEY })),
}));

// ---------- SUT ------------------------------------------------------------

import { ProductForm } from "@/components/forms/ProductForm";
import { useUploadStore } from "@/lib/stores/uploadStore";

function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe("Create vehicle — image_urls must be STORAGE KEYS, not signed URLs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUploadStore.setState({ images: [], coverImageId: null });
  });

  it("sends image_urls and cover_image_key with the storage KEY, never the signed URL", async () => {
    // initialData lets the form pass zod validation without driving the
    // Radix category select by hand.
    renderWithQuery(
      <ProductForm
        mode="create"
        initialData={{
          category_id: "cat-1",
          vin: "1HGCM82633A123456",
          price: 10000,
          year: 2020,
          make: "Honda",
          model: "Civic",
          mileage_unit: "mi",
        }}
      />,
    );

    // Seed an in-flight image AFTER mount (the create-mode mount effect
    // clears the store). This simulates the seller having dropped a file
    // into the dropzone.
    act(() => {
      useUploadStore.setState({
        images: [
          {
            id: "up-1",
            file: new File(["bytes"], "photo.jpg", { type: "image/jpeg" }),
            preview: "blob:http://test/preview",
            status: "pending",
          },
        ],
        coverImageId: "up-1",
      });
    });

    await userEvent.click(
      screen.getByRole("button", { name: /create vehicle/i }),
    );

    await waitFor(() => {
      expect(mockCreateMutate).toHaveBeenCalled();
    });

    const payload = mockCreateMutate.mock.calls[0][0] as {
      image_urls?: string[];
      cover_image_key?: string | null;
      tenant_id?: string;
      organization_id?: string;
    };

    // tenant_id / organization_id must NOT be sent from the client — the
    // backend injects them from the JWT. Sending an empty string (when
    // the user has no organization_id) caused a 422 on UUID parsing.
    expect(payload.tenant_id).toBeUndefined();
    expect(payload.organization_id).toBeUndefined();

    // image_urls carries the raw KEY, never the signed URL.
    expect(payload.image_urls).toEqual([STORAGE_KEY]);
    expect(payload.image_urls).not.toContain(SIGNED_URL);
    // The cover is the same storage key (satisfies the backend's
    // "cover ∈ image_urls" invariant).
    expect(payload.cover_image_key).toBe(STORAGE_KEY);
    // Sanity: nothing that looks like a signed URL leaked through.
    for (const u of payload.image_urls ?? []) {
      expect(u).not.toMatch(/\?X-Amz-/);
      expect(u).not.toMatch(/^https?:\/\//);
    }
  });
});
