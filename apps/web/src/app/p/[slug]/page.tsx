/**
 * Public product detail page.
 * Server Component with generateMetadata for Open Graph (WhatsApp preview).
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductPublicView } from "@/components/public/ProductPublicView";

const API_URL = process.env.API_URL || "http://localhost:8000";

interface ProductData {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  price_cents: number;
  currency: string;
  attributes: Record<string, unknown>;
  image_urls: string[];
  cover_image_key: string | null;
  location_city: string | null;
  location_state: string | null;
  organization_id: string;
}

interface ImageUrlItem {
  key: string;
  url: string;
  expires_in: number;
}

interface ImageUrlsData {
  product_id: string;
  images: ImageUrlItem[];
}

async function getProduct(slug: string): Promise<ProductData | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/public/products/${slug}`, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getImageUrls(slug: string): Promise<ImageUrlsData | null> {
  try {
    const res = await fetch(
      `${API_URL}/api/v1/public/products/${slug}/image-urls`,
      {
        next: { revalidate: 300 }, // Cache signed URLs for 5 minutes
      },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function formatPrice(cents: number, currency: string): string {
  const amount = cents / 100;
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Generate Open Graph metadata for WhatsApp preview
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  const imageData = await getImageUrls(slug);

  if (!product) {
    return {
      title: "Producto no encontrado",
    };
  }

  const price = formatPrice(product.price_cents, product.currency);
  const description =
    product.description?.slice(0, 160) ||
    `${product.title} disponible en ProSell`;

  // Get brand/model/year from attributes if available
  const brand = product.attributes?.brand as string | undefined;
  const model = product.attributes?.model as string | undefined;
  const year = product.attributes?.year as number | undefined;

  const fullTitle =
    brand && model ? `${brand} ${model} ${year || ""}`.trim() : product.title;

  // Get first image URL for Open Graph
  const coverImageUrl = imageData?.images?.[0]?.url;

  return {
    title: `${fullTitle} - ${price}`,
    description,
    openGraph: {
      title: `${fullTitle} - ${price}`,
      description,
      type: "website",
      images: coverImageUrl
        ? [
            {
              url: coverImageUrl,
              width: 1200,
              height: 630,
              alt: fullTitle,
            },
          ]
        : undefined,
      locale: "es_VE",
      siteName: "ProSell",
    },
    twitter: {
      card: "summary_large_image",
      title: `${fullTitle} - ${price}`,
      description,
      images: coverImageUrl ? [coverImageUrl] : undefined,
    },
  };
}

export default async function PublicProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, imageData] = await Promise.all([
    getProduct(slug),
    getImageUrls(slug),
  ]);

  if (!product) {
    notFound();
  }

  // Extract URLs from image data
  const imageUrls = imageData?.images?.map((img) => img.url) || [];
  const coverImageUrl = imageUrls[0] || null;

  return (
    <ProductPublicView
      product={product}
      imageUrls={imageUrls}
      coverImageUrl={coverImageUrl}
    />
  );
}
