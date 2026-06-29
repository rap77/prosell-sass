"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageDropzone } from "@/components/upload/ImageDropzone";
import { ProductCoverPicker } from "@/components/forms/ProductCoverPicker";
import { GenericFormFields } from "@/components/forms/GenericFormFields";
import { useCreateProduct } from "@/lib/api/products";
import { useUploadStore } from "@/lib/stores/uploadStore";
import { useImageUploadOptimized } from "@/lib/hooks/useImageUploadOptimized";
import type { CategoryNode } from "@/types/category";

interface GenericProductFormProps {
  category: CategoryNode;
}

export function GenericProductForm({ category }: GenericProductFormProps) {
  const router = useRouter();
  const createProduct = useCreateProduct();
  const { uploadImages } = useImageUploadOptimized();
  const { images, coverImageId, clearAll } = useUploadStore();
  const [isPending, startTransition] = useTransition();

  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [dynamicValues, setDynamicValues] = useState<Record<string, unknown>>({});

  useEffect(() => {
    clearAll();
  }, [clearAll]);

  function handleFieldChange(key: string, value: unknown) {
    setDynamicValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await uploadImages();
        const { images: imgs, coverImageId: coverId } =
          useUploadStore.getState();
        const imageKeys = imgs
          .map((img) => img.storageKey)
          .filter((k): k is string => Boolean(k));
        const coverKey = coverId
          ? (imgs.find((img) => img.id === coverId)?.storageKey ?? null)
          : null;

        await createProduct.mutateAsync({
          title: `${category.name} — ${Object.values(dynamicValues).filter(Boolean).slice(0, 2).join(" ")}`.trim(),
          price_cents: Math.round(parseFloat(price || "0") * 100),
          category_id: category.id,
          description: description || undefined,
          attributes: { category: "generic", ...dynamicValues },
          image_urls: imageKeys,
          cover_image_key: coverKey,
        });

        toast.success("Producto publicado");
        router.push("/catalog");
      } catch {
        toast.error("Error al publicar el producto");
      }
    });
  }

  const isDisabled = isPending || createProduct.isPending;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {/* Images */}
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">Fotos</h2>
        <ImageDropzone />
        {images.length > 0 && <ProductCoverPicker />}
      </section>

      {/* Static fields */}
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">Información General</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="gen-price">Precio</Label>
            <Input
              id="gen-price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              min={0}
              step={0.01}
              disabled={isDisabled}
              aria-label="Precio"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="gen-description">Descripción</Label>
          <Textarea
            id="gen-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describí tu producto..."
            rows={4}
            disabled={isDisabled}
            aria-label="Descripción"
          />
        </div>
      </section>

      {/* Dynamic schema fields */}
      {Object.keys(category.attribute_schema).length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold">Atributos</h2>
          <GenericFormFields
            schema={category.attribute_schema}
            groups={category.attribute_groups}
            values={dynamicValues}
            onChange={handleFieldChange}
            disabled={isDisabled}
          />
        </section>
      )}

      <Button type="submit" disabled={isDisabled || !price}>
        {isDisabled ? "Publicando..." : "Publicar producto"}
      </Button>
    </form>
  );
}
