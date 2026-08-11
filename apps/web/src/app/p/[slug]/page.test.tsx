import { describe, expect, it, vi } from "vitest";
import PublicProductPage from "./page";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));

vi.mock("@/components/public/ProductPublicView", () => ({
  ProductPublicView: () => null,
}));

describe("PublicProductPage", () => {
  it("fetches signed gallery URLs without caching stale image lists", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "product-1",
            title: "Vehicle",
            attributes: {},
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ product_id: "product-1", images: [] })),
      );
    vi.stubGlobal("fetch", fetchMock);

    await PublicProductPage({ params: Promise.resolve({ slug: "vehicle" }) });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:8000/api/v1/public/products/vehicle/image-urls",
      { cache: "no-store" },
    );
  });
});
