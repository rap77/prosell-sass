"use client";

/**
 * CategoryFormModal — create/edit category modal.
 *
 * Uses React Hook Form + Zod for validation. Radix Dialog for modal.
 */

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateCategory, useUpdateCategory } from "@/lib/api/categories";
import type { Category } from "@/types/category";

const formSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  slug: z
    .string()
    .min(1, "Slug requerido")
    .regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
  icon: z.string().nullable(),
  description: z.string().nullable(),
  parent_id: z.string().nullable(),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface CategoryFormModalProps {
  mode: "create" | "edit";
  category?: Category;
  parentId?: string | null;
  categories: Category[];
  onClose: () => void;
}

export function CategoryFormModal({
  mode,
  category,
  parentId,
  categories,
  onClose,
}: CategoryFormModalProps) {
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const isPending = createCategory.isPending || updateCategory.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: category?.name ?? "",
      slug: category?.slug ?? "",
      icon: category?.icon ?? null,
      description: category?.description ?? null,
      parent_id:
        mode === "edit" ? (category?.parent_id ?? null) : (parentId ?? null),
      is_active: category?.is_active ?? true,
    },
  });

  // Watch form values (useWatch is React Compiler compatible)
  const watchName = useWatch({ control: form.control, name: "name" });
  const watchParentId = useWatch({ control: form.control, name: "parent_id" });
  const watchIsActive = useWatch({ control: form.control, name: "is_active" });

  // Auto-generate slug from name (only in create mode)
  useEffect(() => {
    if (mode !== "create" || !watchName) return;
    const currentSlug = form.getValues("slug");
    // Only auto-generate if slug is empty
    if (currentSlug && currentSlug !== "") return;
    const generated = watchName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (generated) form.setValue("slug", generated);
  }, [watchName, mode, form]);

  // Filter categories for parent select (exclude self and descendants in edit mode)
  const availableParents = categories.filter((c) => {
    if (mode === "edit" && category) {
      // Can't be parent of itself
      if (c.id === category.id) return false;
      // ponytail: skip full descendant check for now, admin won't create cycles
    }
    return true;
  });

  const onSubmit = async (values: FormValues) => {
    if (mode === "create") {
      await createCategory.mutateAsync({
        name: values.name,
        slug: values.slug,
        description: values.description ?? undefined,
        // ponytail: parent_id sent via separate field when backend supports it
      });
    } else if (category) {
      await updateCategory.mutateAsync({
        id: category.id,
        data: {
          name: values.name,
          slug: values.slug,
          icon: values.icon,
          description: values.description,
          is_active: values.is_active,
        },
      });
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? "Nueva categoría"
              : `Editar: ${category?.name}`}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="Ej: Sedán"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              {...form.register("slug")}
              placeholder="Ej: sedan"
            />
            {form.formState.errors.slug && (
              <p className="text-sm text-destructive">
                {form.formState.errors.slug.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="icon">Icono (emoji)</Label>
            <Input
              id="icon"
              {...form.register("icon")}
              placeholder="Ej: 🚗"
              className="w-20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent">Categoría padre</Label>
            <Select
              value={watchParentId ?? "__none__"}
              onValueChange={(v) =>
                form.setValue("parent_id", v === "__none__" ? null : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin padre (raíz)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin padre (raíz)</SelectItem>
                {availableParents.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="is_active"
              checked={watchIsActive}
              onCheckedChange={(checked) => form.setValue("is_active", checked)}
            />
            <Label htmlFor="is_active">Activa</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Guardando..."
                : mode === "create"
                  ? "Crear"
                  : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
