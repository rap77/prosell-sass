"use client";

/**
 * ProductPublicView — Public product detail page for WhatsApp sharing.
 *
 * Mobile-first design with:
 *   - Image gallery
 *   - Title + price
 *   - Location + dealer info
 *   - Vehicle attributes grid
 *   - Sticky "Share on WhatsApp" button
 */

import { useState } from "react";
import Image from "next/image";
import { MapPin, Share2, ChevronLeft, ChevronRight } from "lucide-react";

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

interface ProductPublicViewProps {
  product: ProductData;
  imageUrls: string[];
  coverImageUrl: string | null;
}

function formatPrice(cents: number, currency: string): string {
  const amount = cents / 100;
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Attribute display config
const VEHICLE_ATTRS = [
  { key: "year", label: "Año" },
  { key: "brand", label: "Marca" },
  { key: "model", label: "Modelo" },
  { key: "mileage", label: "Kilometraje", format: (v: number) => `${v.toLocaleString()} km` },
  { key: "engine", label: "Motor" },
  { key: "transmission", label: "Transmisión" },
  { key: "fuel_type", label: "Combustible" },
  { key: "color", label: "Color" },
  { key: "vin", label: "VIN" },
] as const;

export function ProductPublicView({
  product,
  imageUrls,
  coverImageUrl,
}: ProductPublicViewProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Build image list: cover first if available, then rest
  const images = coverImageUrl
    ? [coverImageUrl, ...imageUrls.filter((u) => u !== coverImageUrl)]
    : imageUrls;

  const hasPrevious = currentImageIndex > 0;
  const hasNext = currentImageIndex < images.length - 1;

  const goToPrevious = () => hasPrevious && setCurrentImageIndex((i) => i - 1);
  const goToNext = () => hasNext && setCurrentImageIndex((i) => i + 1);

  // Build WhatsApp share URL
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const brand = product.attributes?.brand as string | undefined;
  const model = product.attributes?.model as string | undefined;
  const year = product.attributes?.year as number | undefined;
  const vehicleName = brand && model ? `${brand} ${model} ${year || ""}`.trim() : product.title;
  const price = formatPrice(product.price_cents, product.currency);
  const location = [product.location_city, product.location_state].filter(Boolean).join(", ");

  const whatsappText = `
🚗 ${vehicleName}
💰 ${price}
${location ? `📍 ${location}` : ""}

${shareUrl}
`.trim();

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

  // Filter attributes that have values
  const displayAttrs = VEHICLE_ATTRS.filter(
    (attr) => product.attributes?.[attr.key] != null
  );

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 16px 100px" }}>
      {/* Image Gallery */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16/10",
          borderRadius: 16,
          overflow: "hidden",
          background: "var(--ps-bg-muted)",
          marginTop: 24,
        }}
      >
        {images.length > 0 ? (
          <>
            <Image
              src={images[currentImageIndex]}
              alt={vehicleName}
              fill
              style={{ objectFit: "cover" }}
              priority
              sizes="(max-width: 800px) 100vw, 800px"
            />
            {/* Navigation arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={goToPrevious}
                  disabled={!hasPrevious}
                  aria-label="Imagen anterior"
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    border: "none",
                    background: "rgba(0,0,0,0.5)",
                    color: "#fff",
                    cursor: hasPrevious ? "pointer" : "default",
                    opacity: hasPrevious ? 1 : 0.3,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={goToNext}
                  disabled={!hasNext}
                  aria-label="Siguiente imagen"
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    border: "none",
                    background: "rgba(0,0,0,0.5)",
                    color: "#fff",
                    cursor: hasNext ? "pointer" : "default",
                    opacity: hasNext ? 1 : 0.3,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
            {/* Image counter */}
            {images.length > 1 && (
              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  right: 12,
                  padding: "6px 12px",
                  borderRadius: 20,
                  background: "rgba(0,0,0,0.6)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {currentImageIndex + 1} / {images.length}
              </div>
            )}
          </>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--ps-text-muted)",
            }}
          >
            Sin imágenes
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 12,
            overflowX: "auto",
            paddingBottom: 8,
          }}
        >
          {images.map((url, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentImageIndex(idx)}
              style={{
                flexShrink: 0,
                width: 64,
                height: 48,
                borderRadius: 8,
                overflow: "hidden",
                border:
                  idx === currentImageIndex
                    ? "2px solid var(--ps-accent)"
                    : "2px solid transparent",
                cursor: "pointer",
                padding: 0,
                background: "var(--ps-bg-muted)",
              }}
            >
              <Image
                src={url}
                alt={`Miniatura ${idx + 1}`}
                width={64}
                height={48}
                style={{ objectFit: "cover", width: "100%", height: "100%" }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Title + Price */}
      <div style={{ marginTop: 24 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "var(--ps-text-primary)",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {vehicleName}
        </h1>
        <p
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: "var(--ps-accent)",
            margin: "8px 0 0",
          }}
        >
          {price}
        </p>
      </div>

      {/* Location */}
      {location && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 16,
            color: "var(--ps-text-muted)",
            fontSize: 16,
          }}
        >
          <MapPin size={18} />
          <span>{location}</span>
        </div>
      )}

      {/* Attributes Grid */}
      {displayAttrs.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "var(--ps-text-primary)",
              marginBottom: 16,
              borderBottom: "1px solid var(--ps-border-subtle)",
              paddingBottom: 8,
            }}
          >
            Detalles
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "12px 24px",
            }}
          >
            {displayAttrs.map((attr) => {
              const value = product.attributes?.[attr.key];
              const displayValue =
                attr.format && typeof value === "number"
                  ? attr.format(value)
                  : String(value);
              return (
                <div key={attr.key}>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--ps-text-muted)",
                      marginBottom: 2,
                    }}
                  >
                    {attr.label}
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 500,
                      color: "var(--ps-text-primary)",
                    }}
                  >
                    {displayValue}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Description */}
      {product.description && (
        <div style={{ marginTop: 32 }}>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "var(--ps-text-primary)",
              marginBottom: 16,
              borderBottom: "1px solid var(--ps-border-subtle)",
              paddingBottom: 8,
            }}
          >
            Descripción
          </h2>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.6,
              color: "var(--ps-text-secondary)",
              whiteSpace: "pre-wrap",
            }}
          >
            {product.description}
          </p>
        </div>
      )}

      {/* Sticky WhatsApp Button */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "16px",
          background: "var(--ps-bg-base)",
          borderTop: "1px solid var(--ps-border-subtle)",
          zIndex: 100,
        }}
      >
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            width: "100%",
            maxWidth: 400,
            margin: "0 auto",
            padding: "14px 24px",
            borderRadius: 12,
            background: "#25D366",
            color: "#fff",
            fontSize: 17,
            fontWeight: 600,
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          <Share2 size={20} />
          Compartir por WhatsApp
        </a>
      </div>
    </div>
  );
}
