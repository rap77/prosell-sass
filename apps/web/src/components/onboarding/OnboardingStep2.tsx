"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TIMEZONES = [
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (GMT-3)" },
  { value: "America/Bogota", label: "Bogotá (GMT-5)" },
  { value: "America/Mexico_City", label: "Ciudad de México (GMT-6)" },
  { value: "America/Santiago", label: "Santiago (GMT-4)" },
  { value: "America/Lima", label: "Lima (GMT-5)" },
  { value: "America/Caracas", label: "Caracas (GMT-4)" },
];

const CURRENCIES = [
  { value: "ARS", label: "Peso Argentino (ARS)" },
  { value: "USD", label: "Dólar Estadounidense (USD)" },
  { value: "COP", label: "Peso Colombiano (COP)" },
  { value: "MXN", label: "Peso Mexicano (MXN)" },
  { value: "CLP", label: "Peso Chileno (CLP)" },
  { value: "PEN", label: "Sol Peruano (PEN)" },
];

const step2Schema = z.object({
  timezone: z.string().min(1, { message: "Seleccioná una zona horaria" }),
  currency: z.string().min(1, { message: "Seleccioná una moneda" }),
});

export type Step2Data = z.infer<typeof step2Schema>;

interface OnboardingStep2Props {
  onNext: (data: Step2Data) => void;
  onBack: () => void;
  onSkip: () => void;
  isLoading?: boolean;
}

export function OnboardingStep2({
  onNext,
  onBack,
  onSkip,
  isLoading,
}: OnboardingStep2Props) {
  const form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      timezone: "America/Argentina/Buenos_Aires",
      currency: "ARS",
    },
  });

  const timezone = useWatch({ control: form.control, name: "timezone" });
  const currency = useWatch({ control: form.control, name: "currency" });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Configuración inicial</h2>
          <p className="text-sm text-muted-foreground">
            Ajustá la zona horaria y moneda de tu organización
          </p>
        </div>
      </div>

      <form
        className="space-y-4"
        onSubmit={form.handleSubmit(onNext)}
        noValidate
      >
        <div className="space-y-2">
          <Label>Zona horaria</Label>
          <Select
            value={timezone}
            onValueChange={(value) => form.setValue("timezone", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccioná una zona horaria" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.timezone && (
            <p className="text-sm text-destructive">
              {form.formState.errors.timezone.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Moneda</Label>
          <Select
            value={currency}
            onValueChange={(value) => form.setValue("currency", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccioná una moneda" />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.currency && (
            <p className="text-sm text-destructive">
              {form.formState.errors.currency.message}
            </p>
          )}
        </div>

        <div className="flex justify-between pt-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={isLoading}
            >
              Atrás
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onSkip}
              disabled={isLoading}
            >
              Saltar
            </Button>
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Guardando..." : "Continuar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
