"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { HeroShotSelector } from "./HeroShotSelector";
import type {
  PublishVehicleRequest,
  PublicationResponse,
} from "@/lib/api/publisherApi";
import {
  FB_VEHICLE_TYPES,
  FB_BRANDS,
  FB_BODY_STYLES,
  FB_EXTERIOR_COLORS,
  FB_INTERIOR_COLORS,
  FB_VEHICLE_CONDITIONS,
  FB_FUEL_TYPES,
  FB_TRANSMISSIONS,
  FB_YEARS,
  type FbOption,
} from "@/lib/constants/fbVehicleOptions";

// ============================================
// VALIDATION SCHEMA
// ============================================

const publishSchema = z.object({
  // Core publish fields (locked per CONTEXT.md)
  title: z.string().min(5, "Título mínimo 5 caracteres").max(500),
  description: z
    .string()
    .min(10, "Descripción mínima 10 caracteres")
    .max(5000)
    .optional(),
  price_usd: z.number().positive("Precio debe ser mayor a 0"),
  facebook_page_id: z.string().min(1, "Seleccioná una página de Facebook"),
  hero_shot_index: z.number().int().min(0),
  zip_code: z.string().min(5, "ZIP code mínimo 5 caracteres").max(10),
  image_urls: z
    .array(z.string().url())
    .min(1, "Necesitás al menos una foto"),

  // Vehicle fields (required by Facebook Marketplace)
  vehicle_type: z.string().min(1, "Seleccioná el tipo de vehículo"),
  year: z.number().int().min(1900, "Año inválido").max(2026, "Año inválido"),
  make: z.string().min(1, "Seleccioná la marca"),
  model: z.string().min(1, "Ingresá el modelo"),
  mileage: z.number().int().min(0, "Millaje inválido"),
  body_style: z.string().optional(),
  exterior_color: z.string().optional(),
  interior_color: z.string().optional(),
  vehicle_condition: z.string().optional(),
  fuel_type: z.string().optional(),
  transmission: z.string().optional(),
  clean_title: z.boolean().default(true),
  vin: z.string().optional(),
});

type PublishFormValues = z.infer<typeof publishSchema>;

// ============================================
// TYPES
// ============================================

export interface VehicleData {
  id: string;  // Vehicle UUID for publish API
  title: string;
  description?: string;
  price_cents: number;
  zip_code: string;
  image_urls: string[];
  tenant_id: string;
  // Vehicle specifics
  year?: number;
  make?: string;
  model?: string;
  mileage?: number;
  body_style?: string;
  exterior_color?: string;
  interior_color?: string;
  vehicle_condition?: string;
  fuel_type?: string;
  transmission?: string;
  clean_title?: boolean;
  vin?: string;
  vehicle_type?: string;
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
// HELPERS
// ============================================

function SelectField({
  id,
  label,
  options,
  error,
  required,
  ...props
}: {
  id: string;
  label: string;
  options: FbOption[];
  error?: string;
  required?: boolean;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      <select
        id={id}
        {...props}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
      >
        <option value="">Seleccioná...</option>
        {options.map((opt) => (
          <option key={opt.key} value={opt.key}>
            {opt.es}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function InputField({
  id,
  label,
  error,
  required,
  ...props
}: {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      <input
        id={id}
        {...props}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ============================================
// COMPONENT
// ============================================

export function PublishForm({
  mode,
  vehicleData,
  currentPublication: _currentPublication,
  facebookPages = [],
  onSubmit,
  onDelete,
  isSubmitting,
  isDeleting = false,
}: PublishFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<PublishFormValues>({
    resolver: zodResolver(publishSchema),
    defaultValues: {
      title: vehicleData?.title ?? "",
      description: vehicleData?.description ?? "",
      price_usd: vehicleData ? vehicleData.price_cents / 100 : 0,
      zip_code: vehicleData?.zip_code ?? "",
      hero_shot_index: 0,
      image_urls: vehicleData?.image_urls ?? [],
      facebook_page_id: "",
      // Vehicle fields pre-filled from vehicle data
      vehicle_type: vehicleData?.vehicle_type ?? "",
      year: vehicleData?.year ?? new Date().getFullYear(),
      make: vehicleData?.make ?? "",
      model: vehicleData?.model ?? "",
      mileage: vehicleData?.mileage ?? 0,
      body_style: vehicleData?.body_style ?? "",
      exterior_color: vehicleData?.exterior_color ?? "",
      interior_color: vehicleData?.interior_color ?? "",
      vehicle_condition: vehicleData?.vehicle_condition ?? "",
      fuel_type: vehicleData?.fuel_type ?? "",
      transmission: vehicleData?.transmission ?? "",
      clean_title: vehicleData?.clean_title ?? true,
      vin: vehicleData?.vin ?? "",
    },
  });

  const imageUrls = useWatch({ control, name: "image_urls" });
  const heroIndex = useWatch({ control, name: "hero_shot_index" });

  const handleHeroChange = (newIndex: number) => {
    const reordered = [...imageUrls];
    const hero = reordered.splice(newIndex, 1)[0];
    reordered.unshift(hero);
    setValue("image_urls", reordered, { shouldValidate: true });
    setValue("hero_shot_index", 0);
  };

  const handleFormSubmit = (values: PublishFormValues) => {
    if (!vehicleData) return;

    const productId = vehicleData.id || vehicleData.tenant_id;

    const payload: PublishVehicleRequest = {
      product_id: productId,
      tenant_id: vehicleData.tenant_id,
      facebook_page_id: values.facebook_page_id,
      title: values.title,
      description: values.description,
      price_cents: Math.round(values.price_usd * 100),
      zip_code: values.zip_code,
      image_urls: values.image_urls,
      hero_shot_index: values.hero_shot_index,
      vehicle_type: values.vehicle_type,
      year: values.year,
      make: values.make,
      model: values.model,
      mileage: values.mileage,
      body_style: values.body_style,
      exterior_color: values.exterior_color,
      interior_color: values.interior_color,
      vehicle_condition: values.vehicle_condition,
      fuel_type: values.fuel_type,
      transmission: values.transmission,
      clean_title: values.clean_title,
      vin: values.vin,
    };

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">

      {/* ── FOTOS ── */}
      <div>
        <p className="block text-sm font-medium text-slate-700 mb-2">
          Fotos <span className="text-red-600">*</span>
          <span className="font-normal text-slate-400 ml-1">— click para elegir portada</span>
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

      {/* ── TÍTULO Y DESCRIPCIÓN ── */}
      <div className="border-t border-slate-100 pt-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Publicación</p>

        <InputField
          id="title"
          label="Título"
          required
          type="text"
          {...register("title")}
          error={errors.title?.message}
        />

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

        <div className="grid grid-cols-2 gap-4">
          <InputField
            id="price_usd"
            label="Precio (USD)"
            required
            type="number"
            step="0.01"
            min="0.01"
            {...register("price_usd", { valueAsNumber: true })}
            error={errors.price_usd?.message}
          />
          <InputField
            id="zip_code"
            label="ZIP Code"
            required
            type="text"
            {...register("zip_code")}
            error={errors.zip_code?.message}
          />
        </div>
      </div>

      {/* ── DATOS DEL VEHÍCULO ── */}
      <div className="border-t border-slate-100 pt-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Datos del vehículo</p>

        <div className="grid grid-cols-2 gap-4">
          <SelectField
            id="vehicle_type"
            label="Tipo de vehículo"
            required
            options={FB_VEHICLE_TYPES}
            {...register("vehicle_type")}
            error={errors.vehicle_type?.message}
          />

          <div>
            <label htmlFor="year" className="block text-sm font-medium text-slate-700 mb-1">
              Año <span className="text-red-600">*</span>
            </label>
            <select
              id="year"
              {...register("year", { valueAsNumber: true })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="">Seleccioná...</option>
              {FB_YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            {errors.year && <p className="mt-1 text-xs text-red-600">{errors.year.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SelectField
            id="make"
            label="Marca"
            required
            options={FB_BRANDS}
            {...register("make")}
            error={errors.make?.message}
          />
          <InputField
            id="model"
            label="Modelo"
            required
            type="text"
            placeholder="ej: Corolla, Civic, F-150"
            {...register("model")}
            error={errors.model?.message}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <InputField
            id="mileage"
            label="Millaje"
            required
            type="number"
            min="0"
            placeholder="ej: 45000"
            {...register("mileage", { valueAsNumber: true })}
            error={errors.mileage?.message}
          />
          <SelectField
            id="body_style"
            label="Carrocería"
            options={FB_BODY_STYLES}
            {...register("body_style")}
            error={errors.body_style?.message}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SelectField
            id="exterior_color"
            label="Color exterior"
            options={FB_EXTERIOR_COLORS}
            {...register("exterior_color")}
            error={errors.exterior_color?.message}
          />
          <SelectField
            id="interior_color"
            label="Color interior"
            options={FB_INTERIOR_COLORS}
            {...register("interior_color")}
            error={errors.interior_color?.message}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SelectField
            id="vehicle_condition"
            label="Estado del vehículo"
            options={FB_VEHICLE_CONDITIONS}
            {...register("vehicle_condition")}
            error={errors.vehicle_condition?.message}
          />
          <SelectField
            id="fuel_type"
            label="Tipo de combustible"
            options={FB_FUEL_TYPES}
            {...register("fuel_type")}
            error={errors.fuel_type?.message}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SelectField
            id="transmission"
            label="Transmisión"
            options={FB_TRANSMISSIONS}
            {...register("transmission")}
            error={errors.transmission?.message}
          />
          <InputField
            id="vin"
            label="VIN"
            type="text"
            placeholder="17 caracteres"
            maxLength={17}
            {...register("vin")}
            error={errors.vin?.message}
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register("clean_title")}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700">Título limpio (Clean Title)</span>
        </label>
      </div>

      {/* ── FACEBOOK ── */}
      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">Facebook</p>

        <div>
          <label htmlFor="facebook_page_id" className="block text-sm font-medium text-slate-700 mb-1">
            Página de Facebook <span className="text-red-600">*</span>
          </label>
          <select
            id="facebook_page_id"
            {...register("facebook_page_id")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
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
      </div>

      {/* ── BOTONES ── */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
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
