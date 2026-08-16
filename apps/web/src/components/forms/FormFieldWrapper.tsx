/**
 * FormFieldWrapper - Híbrido que combina:
 * - Flexibilidad de tu implementación actual (schema-driven)
 * - Consistencia de shadcn/ui (labels, errors, descriptions)
 * - Design tokens centralizados (tema consistente)
 */
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { SPACING } from "@/lib/design-tokens";
import { AlertCircle } from "lucide-react";

interface FormFieldWrapperProps {
  /** Unique ID for input (accessibility) */
  id: string;
  /** Field label */
  label: string;
  /** Error message (if any) */
  error?: string;
  /** Helper text below input */
  description?: string;
  /** Required field marker */
  required?: boolean;
  /** Field input component */
  children: React.ReactNode;
  /** Additional wrapper classes */
  className?: string;
}

/**
 * Wrapper consistente para TODOS los campos de form.
 *
 * ANTES (inconsistente):
 * ```tsx
 * <div className="space-y-2">
 *   <Label>Price</Label>
 *   <Input {...field} />
 *   {error && <p className="text-red-500">{error}</p>}
 * </div>
 * ```
 *
 * DESPUÉS (consistente + accesible):
 * ```tsx
 * <FormFieldWrapper id="price" label="Price" error={error}>
 *   <Input {...field} />
 * </FormFieldWrapper>
 * ```
 */
export function FormFieldWrapper({
  id,
  label,
  error,
  description,
  required,
  children,
  className,
}: FormFieldWrapperProps) {
  return (
    <div className={cn(SPACING.form.fieldGap, "flex flex-col", className)}>
      {/* Label con required marker */}
      <Label
        htmlFor={id}
        className={cn(
          "text-sm font-medium",
          error && "text-red-600 dark:text-red-400",
        )}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      {/* Input component (passed as children) */}
      {children}

      {/* Description text (helper) */}
      {description && !error && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Helper para generar field ID consistente.
 * Uso: const fieldId = getFieldId("product", "price") → "product-price"
 */
export function getFieldId(formName: string, fieldName: string): string {
  return `${formName}-${fieldName}`;
}
