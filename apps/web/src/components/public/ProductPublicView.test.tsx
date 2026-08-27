import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductPublicView } from "./ProductPublicView";

// FR5.3 regression: the WhatsApp link must route to the contact's
// whatsapp number (not a generic share link) and the message text must
// include the contact name + address — never a phone.

vi.mock("jszip", () => ({ default: class {} }));

const baseProduct = {
  id: "product-1",
  title: "2020 Toyota Camry",
  slug: "2020-toyota-camry",
  description: null,
  price_cents: 2500000,
  currency: "USD",
  attributes: {},
  image_urls: [],
  cover_image_key: null,
  location_city: "Caracas",
  location_state: "Distrito Capital",
  organization_id: "org-1",
  contact_name: null as string | null,
  contact_whatsapp: null as string | null,
  contact_address: null as string | null,
};

describe("ProductPublicView WhatsApp link", () => {
  it("routes to the contact's whatsapp number and includes name + address in the text", () => {
    render(
      <ProductPublicView
        product={{
          ...baseProduct,
          contact_name: "Juan Pérez",
          contact_whatsapp: "+58 412-123-4567",
          contact_address: "Av. Principal 123, Caracas",
        }}
        imageUrls={[]}
        coverImageUrl={null}
      />,
    );

    const whatsappLink = screen.getByRole("link", { name: /whatsapp/i });
    const href = whatsappLink.getAttribute("href") ?? "";

    // Digits-only phone segment, no + / spaces / dashes.
    expect(href.startsWith("https://wa.me/584121234567?text=")).toBe(true);

    const text = decodeURIComponent(href.split("text=")[1] ?? "");
    expect(text).toContain("Contacto: Juan Pérez");
    expect(text).toContain("Av. Principal 123, Caracas");
    expect(text).not.toMatch(/tel[eé]fono/i);
  });

  it("falls back to an empty destinatario when the product has no whatsapp contact", () => {
    render(
      <ProductPublicView
        product={baseProduct}
        imageUrls={[]}
        coverImageUrl={null}
      />,
    );

    const whatsappLink = screen.getByRole("link", { name: /whatsapp/i });
    expect(whatsappLink.getAttribute("href")).toMatch(
      /^https:\/\/wa\.me\/\?text=/,
    );
  });
});
