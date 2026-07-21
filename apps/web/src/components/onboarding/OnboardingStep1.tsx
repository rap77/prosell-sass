"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const step1Schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "El nombre de la organización es requerido" }),
  description: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  website: z.string().trim().url("URL inválida").optional().or(z.literal("")),
}) as z.ZodType<{
  name: string;
  description?: string;
  phone?: string;
  website?: string;
}>;

export type Step1Data = z.infer<typeof step1Schema>;

interface OnboardingStep1Props {
  defaultValues?: Partial<Step1Data>;
  onNext: (data: Step1Data) => void;
  onSkip: () => void;
  isLoading?: boolean;
}

export function OnboardingStep1({
  defaultValues,
  onNext,
  onSkip,
  isLoading,
}: OnboardingStep1Props) {
  const form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      name: "",
      description: "",
      phone: "",
      website: "",
      ...defaultValues,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Datos de tu organización</h2>
          <p className="text-sm text-muted-foreground">
            Completá la información básica de tu empresa
          </p>
        </div>
      </div>

      <form
        className="space-y-4"
        onSubmit={form.handleSubmit(onNext)}
        noValidate
      >
        <div className="space-y-2">
          <Label htmlFor="name">Nombre de la organización *</Label>
          <Input
            id="name"
            placeholder="Ej: AutoVentas Córdoba"
            {...form.register("name")}
          />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            placeholder="Breve descripción de tu negocio..."
            rows={3}
            {...form.register("description")}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+54 351 123-4567"
              {...form.register("phone")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Sitio web</Label>
            <Input
              id="website"
              type="url"
              placeholder="https://ejemplo.com"
              {...form.register("website")}
            />
            {form.formState.errors.website && (
              <p className="text-sm text-destructive">
                {form.formState.errors.website.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-between pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onSkip}
            disabled={isLoading}
          >
            Saltar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Guardando..." : "Continuar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
