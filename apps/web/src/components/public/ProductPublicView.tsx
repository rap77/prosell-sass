"use client";

/**
 * ProductPublicView — Public product detail page for WhatsApp sharing.
 *
 * Mobile-first design with:
 *   - Image gallery
 *   - Title + price
 *   - Location + organization info
 *   - Vehicle attributes grid
 *   - Sticky "Share on WhatsApp" button
 */

import { useState } from "react";
import Image from "next/image";
import JSZip from "jszip";
import {
  MapPin,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Check,
  Share2,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { cn } from "@/lib/utils";

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
  /** Organization WhatsApp contact (FR5) — never includes a phone. */
  contact_name: string | null;
  contact_whatsapp: string | null;
  contact_address: string | null;
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
  {
    key: "mileage",
    label: "Kilometraje",
    format: (v: number) => `${v.toLocaleString()} km`,
  },
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
  const [copiedText, setCopiedText] = useState(false);
  const [sharing, setSharing] = useState(false);

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
  const brandValue = product.attributes.brand;
  const modelValue = product.attributes.model;
  const yearValue = product.attributes.year;
  const brand = typeof brandValue === "string" ? brandValue : undefined;
  const model = typeof modelValue === "string" ? modelValue : undefined;
  const year = typeof yearValue === "number" ? yearValue : undefined;
  const vehicleName =
    brand && model ? `${brand} ${model} ${year || ""}`.trim() : product.title;
  const price = formatPrice(product.price_cents, product.currency);
  const location = [product.location_city, product.location_state]
    .filter(Boolean)
    .join(", ");

  // FR5.3: the message includes the organization contact's name + full
  // address (never a phone — the DTO the backend sends never carries one).
  // The whatsapp number itself routes the wa.me link to that contact
  // directly instead of a generic "share to anyone" link.
  const contactLines = [
    product.contact_name ? `Contacto: ${product.contact_name}` : "",
    product.contact_address || "",
  ]
    .filter(Boolean)
    .join("\n");

  // ponytail: plain text — emojis break on some WhatsApp clients
  const whatsappText = `${vehicleName}
${price}
${location ? location : ""}
${contactLines ? `\n${contactLines}` : ""}

${shareUrl}`.trim();

  // wa.me requires digits only (no +, spaces, or dashes) in the phone segment.
  const whatsappDigits = product.contact_whatsapp?.replace(/\D/g, "") ?? "";
  const whatsappUrl = `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(whatsappText)}`;

  // Filter attributes that have values
  const displayAttrs = VEHICLE_ATTRS.filter(
    (attr) => product.attributes?.[attr.key] != null,
  );

  // Build structured text for clipboard
  function buildClipboardText() {
    let text = `${vehicleName}\n${price}`;
    if (location) text += `\n${location}`;
    text += "\n";
    displayAttrs.forEach((attr) => {
      const value = product.attributes?.[attr.key];
      const displayValue =
        "format" in attr && typeof value === "number"
          ? attr.format(value)
          : String(value);
      text += `\n${attr.label}: ${displayValue}`;
    });
    if (product.description) {
      text += `\n\n${product.description}`;
    }
    text += `\n\n${shareUrl}`;
    return text;
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(buildClipboardText());
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      // ponytail: fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = buildClipboardText();
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  }

  // Fetch all images as blobs
  async function fetchAllImages(): Promise<File[]> {
    const files: File[] = [];
    for (let i = 0; i < images.length; i++) {
      const response = await fetch(images[i]);
      const blob = await response.blob();
      const ext = blob.type.includes("webp") ? "webp" : "jpg";
      files.push(
        new File([blob], `imagen-${i + 1}.${ext}`, { type: blob.type }),
      );
    }
    return files;
  }

  // Share all images + text (mobile) or download ZIP (desktop)
  async function shareOrDownloadAll() {
    if (images.length === 0) return;
    setSharing(true);
    try {
      const files = await fetchAllImages();
      const text = buildClipboardText();

      // Try Web Share API first (mobile)
      if (navigator.share && navigator.canShare?.({ files })) {
        await navigator.share({ files, text });
      } else {
        // Fallback: download as ZIP
        const zip = new JSZip();
        files.forEach((file) => zip.file(file.name, file));
        zip.file("descripcion.txt", text);
        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${vehicleName.replace(/\s+/g, "-")}.zip`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // ponytail: user cancelled share or download failed — silent fail
    }
    setSharing(false);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28">
      {/* Image Gallery */}
      <div className="relative mt-6 w-full overflow-hidden rounded-2xl bg-ps-bg-muted aspect-[16/10]">
        {images.length > 0 ? (
          <>
            <Image
              src={images[currentImageIndex]}
              alt={vehicleName}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 800px) 100vw, 800px"
              unoptimized // ponytail: signed URLs are host-bound to localhost:9000
            />
            {/* Navigation arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={goToPrevious}
                  disabled={!hasPrevious}
                  aria-label="Imagen anterior"
                  className={cn(
                    "absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border-none bg-black/50 text-white",
                    hasPrevious
                      ? "cursor-pointer opacity-100"
                      : "cursor-default opacity-30",
                  )}
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={goToNext}
                  disabled={!hasNext}
                  aria-label="Siguiente imagen"
                  className={cn(
                    "absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border-none bg-black/50 text-white",
                    hasNext
                      ? "cursor-pointer opacity-100"
                      : "cursor-default opacity-30",
                  )}
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
            {/* Image counter */}
            {images.length > 1 && (
              <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1.5 text-sm font-medium text-white">
                {currentImageIndex + 1} / {images.length}
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-ps-text-muted">
            Sin imágenes
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {images.map((url, idx) => (
            <button
              type="button"
              key={idx}
              onClick={() => setCurrentImageIndex(idx)}
              className={cn(
                "shrink-0 overflow-hidden rounded border-2 bg-ps-bg-muted p-0 cursor-pointer w-16 h-12",
                idx === currentImageIndex
                  ? "border-ps-accent"
                  : "border-transparent",
              )}
            >
              <Image
                src={url}
                alt={`Miniatura ${idx + 1}`}
                width={64}
                height={48}
                className="h-full w-full object-cover"
                unoptimized
              />
            </button>
          ))}
        </div>
      )}

      {/* Title + Price */}
      <div className="mt-6">
        <h1 className="m-0 text-2xl font-bold leading-tight text-ps-text-primary">
          {vehicleName}
        </h1>
        <p className="mt-2 text-3xl font-bold text-ps-accent">{price}</p>
      </div>

      {/* Location */}
      {location && (
        <div className="mt-4 flex items-center gap-2 text-base text-ps-text-muted">
          <MapPin size={18} />
          <span>{location}</span>
        </div>
      )}

      {/* Attributes Grid */}
      {displayAttrs.length > 0 && (
        <div className="mt-8">
          <h2 className="border-b border-ps-border-subtle pb-2 text-lg font-semibold text-ps-text-primary">
            Detalles
          </h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 gap-x-6">
            {displayAttrs.map((attr) => {
              const value = product.attributes?.[attr.key];
              // ponytail: `format` is optional on the union; narrow with `'in'`
              const displayValue =
                "format" in attr && typeof value === "number"
                  ? attr.format(value)
                  : String(value);
              return (
                <div key={attr.key}>
                  <div className="mb-0.5 text-xs text-ps-text-muted">
                    {attr.label}
                  </div>
                  <div className="text-base font-medium text-ps-text-primary">
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
        <div className="mt-8">
          <h2 className="border-b border-ps-border-subtle pb-2 text-lg font-semibold text-ps-text-primary">
            Descripción
          </h2>
          <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-ps-text-secondary">
            {product.description}
          </p>
        </div>
      )}

      {/* Sticky Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-ps-border-subtle bg-ps-bg-base p-4 z-50">
        <div className="mx-auto flex max-w-md gap-2">
          {/* Share/Download All */}
          <button
            onClick={shareOrDownloadAll}
            disabled={sharing}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-ps-bg-muted px-4 py-3.5 text-sm font-semibold text-ps-text-primary disabled:opacity-50"
            title="Compartir o descargar todo"
          >
            {sharing ? (
              <span className="animate-pulse">...</span>
            ) : (
              <>
                <Download size={18} className="hidden sm:block" />
                <Share2 size={18} className="sm:hidden" />
              </>
            )}
            <span className="hidden sm:inline">Descargar</span>
            <span className="sm:hidden">Todo</span>
          </button>
          {/* Copy Text */}
          <button
            onClick={copyText}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-ps-bg-muted px-4 py-3.5 text-sm font-semibold text-ps-text-primary"
            title="Copiar texto"
          >
            {copiedText ? <Check size={18} /> : <Copy size={18} />}
            <span className="hidden sm:inline">
              {copiedText ? "¡Copiado!" : "Texto"}
            </span>
          </button>
          {/* WhatsApp */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-[2] items-center justify-center gap-2 rounded-lg bg-ps-whatsapp px-4 py-3.5 text-sm font-semibold text-white no-underline"
          >
            <WhatsAppIcon className="h-5 w-5" />
            <span className="hidden sm:inline">WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}
