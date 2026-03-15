"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { HeroShotSelector } from "./HeroShotSelector";
import type {
  PublishVehicleRequest,
  PublicationResponse,
} from "@/lib/api/publisherApi";

// ============================================
// VALIDATION SCHEMA
// ============================================

// Per CONTEXT.md (locked): precio > 0, al menos una foto, Facebook Page seleccionada
const publishSchema = z.object({
  title: z.string().min(5, "Título mínimo 5 caracteres").max(500),
  description: z
    .string()
    .min(10, "Descripción mínima 10 caracteres")
    .max(5000)
    .optional(),
  // Price in USD (cents are computed on submit)
  price_usd: z.number().positive("Precio debe ser mayor a 0"),
  facebook_page_id: z.string().min(1, "Seleccioná una página de Facebook"),
  hero_shot_index: z.number().int().min(0),
  zip_code: z.string().min(5, "ZIP code mínimo 5 caracteres").max(10),
  // LOCKED (CONTEXT.md): at least one image required
  image_urls: z
    .array(z.string().url())
    .min(1, "Necesitás al menos una foto"),
});

type PublishFormValues = z.infer<typeof publishSchema>;

// ============================================
// TYPES
// ============================================

interface VehicleData {
  title: string;
  description?: string;
  price_cents: number;
  zip_code: string;
  image_urls: string[];
  tenant_id: string;
}

interface FacebookPage {
  id: string;
  name: string;
}

interface PublishFormProps {
  mode: "publish" | "update";
  vehicleData?: VehicleData;
  currentPublication?: PublicationResponse | null;
  facebookPages?: FacebookPage[];
  onSubmit: (data: PublishVehicleRequest) => void;
  onDelete?: () => void;
  isSubmitting: boolean;
  isDeleting?: boolean;
}

// ============================================
// COMPONENT
// ============================================

export function PublishForm({
  mode,
  vehicleData,
  currentPublication,
  facebookPages = [],
  onSubmit,
  onDelete,
  isSubmitting,
  isDeleting = false,
}: PublishFormProps) {
  const form = useForm<PublishFormValues>({
    resolver: zodResolver(publishSchema),
    defaultValues: {
      title: vehicleData?.title ?? "",
      description: vehicleData?.description ?? "",
      price_usd: vehicleData ? vehicleData.price_cents / 100 : 0,
      zip_code: vehicleData?.zip_code ?? "",
      hero_shot_index: 0,
      image_urls: vehicleData?.image_urls ?? [],
      facebook_page_id: "",
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const imageUrls = watch("image_urls");
  const heroIndex = watch("hero_shot_index");

  // When hero changes: move selected image to index 0, hero_shot_index stays 0
  const handleHeroChange = (newIndex: number) => {
    const reordered = [...imageUrls];
    const hero = reordered.splice(newIndex, 1)[0];
    reordered.unshift(hero);
    setValue("image_urls", reordered, { shouldValidate: true });
    setValue("hero_shot_index", 0);
  };

  const handleFormSubmit = (values: PublishFormValues) => {
    if (!vehicleData) return;

    const payload: PublishVehicleRequest = {
      product_id: vehicleData.tenant_id, // overridden by parent with actual product_id
      tenant_id: vehicleData.tenant_id,
      facebook_page_id: values.facebook_page_id,
      title: values.title,
      description: values.description,
      price_cents: Math.round(values.price_usd * 100),
      zip_code: values.zip_code,
      image_urls: values.image_urls,
      hero_shot_index: values.hero_shot_index,
    };

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
          Título
        </label>
        <input
          id="title"
          type="text"
          {...register("title")}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.title && (
          <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
          Descripción <span className="text-slate-400 font-normal">(opcional)</span>
        </label>
        <textarea
          id="description"
          rows={3}
          {...register("description")}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        />
        {errors.description && (
          <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
        )}
      </div>

      {/* Price row */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label htmlFor="price_usd" className="block text-sm font-medium text-slate-700 mb-1">
            Precio (USD)
          </label>
          <input
            id="price_usd"
            type="number"
            step="0.01"
            min="0.01"
            {...register("price_usd", { valueAsNumber: true })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {errors.price_usd && (
            <p className="mt-1 text-xs text-red-600">{errors.price_usd.message}</p>
          )}
        </div>

        <div className="flex-1">
          <label htmlFor="zip_code" className="block text-sm font-medium text-slate-700 mb-1">
            ZIP Code
          </label>
          <input
            id="zip_code"
            type="text"
            {...register("zip_code")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {errors.zip_code && (
            <p className="mt-1 text-xs text-red-600">{errors.zip_code.message}</p>
          )}
        </div>
      </div>

      {/* Facebook Page */}
      <div>
        <label htmlFor="facebook_page_id" className="block text-sm font-medium text-slate-700 mb-1">
          Página de Facebook
        </label>
        <select
          id="facebook_page_id"
          {...register("facebook_page_id")}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Seleccioná una página...</option>
          {facebookPages.map((page) => (
            <option key={page.id} value={page.id}>
              {page.name}
            </option>
          ))}
        </select>
        {errors.facebook_page_id && (
          <p className="mt-1 text-xs text-red-600">{errors.facebook_page_id.message}</p>
        )}
      </div>

      {/* Hero Shot Selector */}
      <div>
        <p className="block text-sm font-medium text-slate-700 mb-2">
          Fotos — click para elegir portada
        </p>
        <HeroShotSelector
          images={imageUrls}
          heroIndex={heroIndex}
          onHeroChange={handleHeroChange}
        />
        {errors.image_urls && (
          <p className="mt-1 text-xs text-red-600">{errors.image_urls.message}</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-2">
        {mode === "update" && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting || isSubmitting}
            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {isDeleting ? "Eliminando..." : "Eliminar / Finalizar"}
          </button>
        )}

        <button
          type="submit"
          disabled={isSubmitting || isDeleting}
          className="ml-auto px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isSubmitting
            ? "Publicando..."
            : mode === "publish"
              ? "Publicar en Facebook"
              : "Actualizar publicación"}
        </button>
      </div>
    </form>
  );
}
