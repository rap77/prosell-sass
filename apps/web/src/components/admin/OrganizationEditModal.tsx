"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Dealer } from "@/lib/api/schemas/dealers";
import { useUpdateDealer } from "@/lib/api/dealers";
import { BrokerManager } from "@/components/admin/BrokerManager";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  description: z.string().optional(),
  website: z.string().url("URL inválida").optional().or(z.literal("")),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  whatsapp: z.string().optional(),
  street_address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  tax_id: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().url("URL inválida").optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

interface OrganizationEditModalProps {
  dealer: Dealer;
  open: boolean;
  onClose: () => void;
}

export function OrganizationEditModal({
  dealer,
  open,
  onClose,
}: OrganizationEditModalProps) {
  const updateDealer = useUpdateDealer();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: dealer.name,
      description: dealer.description ?? "",
      website: dealer.website ?? "",
      phone: dealer.phone ?? "",
      email: dealer.email ?? "",
      whatsapp: dealer.whatsapp ?? "",
      street_address: dealer.street_address ?? "",
      city: dealer.city ?? "",
      state: dealer.state ?? "",
      postal_code: dealer.postal_code ?? "",
      country: dealer.country ?? "",
      tax_id: dealer.tax_id ?? "",
      instagram: dealer.instagram ?? "",
      facebook: dealer.facebook ?? "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    await updateDealer.mutateAsync({
      dealerId: dealer.id,
      data: {
        name: data.name,
        description: data.description || undefined,
        website: data.website || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        whatsapp: data.whatsapp || undefined,
        street_address: data.street_address || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        postal_code: data.postal_code || undefined,
        country: data.country || undefined,
        tax_id: data.tax_id || undefined,
        instagram: data.instagram || undefined,
        facebook: data.facebook || undefined,
      },
    });
    onClose();
  };

  const { errors } = form.formState;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar organización</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Basic Info */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input {...form.register("name")} id="name" />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <textarea
              {...form.register("description")}
              id="description"
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Sitio web</Label>
            <Input
              {...form.register("website")}
              id="website"
              type="url"
              placeholder="https://example.com"
            />
            {errors.website && (
              <p className="text-sm text-destructive">
                {errors.website.message}
              </p>
            )}
          </div>

          {/* Contact */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-3">Contacto</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input {...form.register("phone")} id="phone" type="tel" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input {...form.register("email")} id="email" type="email" />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  {...form.register("whatsapp")}
                  id="whatsapp"
                  type="tel"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-3">Dirección</h3>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="street_address">Calle y número</Label>
                <Input
                  {...form.register("street_address")}
                  id="street_address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input {...form.register("city")} id="city" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Provincia/Estado</Label>
                  <Input {...form.register("state")} id="state" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postal_code">Código postal</Label>
                  <Input {...form.register("postal_code")} id="postal_code" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">País</Label>
                  <Input {...form.register("country")} id="country" />
                </div>
              </div>
            </div>
          </div>

          {/* Legal */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-3">Información fiscal</h3>
            <div className="space-y-2">
              <Label htmlFor="tax_id">CUIT / RUC / NIT</Label>
              <Input {...form.register("tax_id")} id="tax_id" />
            </div>
          </div>

          {/* Social */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-3">Redes sociales</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  {...form.register("instagram")}
                  id="instagram"
                  placeholder="@usuario"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  {...form.register("facebook")}
                  id="facebook"
                  type="url"
                />
                {errors.facebook && (
                  <p className="text-sm text-destructive">
                    {errors.facebook.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Brokers */}
          <div className="border-t pt-4">
            <BrokerManager dealerId={dealer.id} />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="submit"
              disabled={updateDealer.isPending}
              className="flex-1"
            >
              {updateDealer.isPending ? "Guardando..." : "Guardar"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
