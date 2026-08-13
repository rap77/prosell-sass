import Image from "next/image";
import { Checkbox } from "@/components/ui/checkbox";
import type { Product } from "@/types/product";

interface ReviewQueueTableProps {
  products: Product[];
  selectedIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
}

export function ReviewQueueTable({
  products,
  selectedIds,
  onSelectionChange,
}: ReviewQueueTableProps) {
  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(new Set(products.map((p) => p.id)));
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleToggle = (productId: string, checked: boolean) => {
    const newSelection = new Set(selectedIds);
    if (checked) {
      newSelection.add(productId);
    } else {
      newSelection.delete(productId);
    }
    onSelectionChange(newSelection);
  };

  const allSelected =
    products.length > 0 && selectedIds.size === products.length;
  const someSelected =
    selectedIds.size > 0 && selectedIds.size < products.length;

  return (
    <div className="overflow-x-auto rounded-lg border border-ps-border-default bg-ps-surface">
      <table className="w-full">
        <thead className="border-b border-ps-border-default bg-ps-elevated">
          <tr>
            <th className="w-12 p-4">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleToggleAll}
                aria-label="Seleccionar todos"
                className={
                  someSelected ? "data-[state=checked]:bg-ps-cyan" : ""
                }
              />
            </th>
            <th className="p-4 text-left text-sm font-semibold text-ps-text-primary">
              Producto
            </th>
            <th className="p-4 text-left text-sm font-semibold text-ps-text-primary">
              Precio
            </th>
            <th className="p-4 text-left text-sm font-semibold text-ps-text-primary">
              Enviado
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr
              key={product.id}
              className="border-b border-ps-border-default last:border-0 hover:bg-ps-elevated"
            >
              <td className="p-4">
                <Checkbox
                  checked={selectedIds.has(product.id)}
                  onCheckedChange={(checked) =>
                    handleToggle(product.id, checked as boolean)
                  }
                  aria-label={`Seleccionar ${product.title}`}
                />
              </td>
              <td className="p-4">
                <div className="flex items-center gap-3">
                  {product.image_urls?.[0] && (
                    <Image
                      src={
                        product.image_urls[0].startsWith("http")
                          ? product.image_urls[0]
                          : `${process.env.NEXT_PUBLIC_MINIO_URL || "http://localhost:9002/prosell-assets"}/${product.image_urls[0]}`
                      }
                      alt={product.title}
                      width={48}
                      height={48}
                      className="rounded object-cover"
                    />
                  )}
                  <div>
                    <p className="font-medium text-ps-text-primary">
                      {product.title}
                    </p>
                    <p className="text-sm text-ps-text-tertiary">
                      {product.id.substring(0, 8)}
                    </p>
                  </div>
                </div>
              </td>
              <td className="p-4 text-ps-text-primary">
                ${(product.price_cents / 100).toLocaleString()}
              </td>
              <td className="p-4 text-ps-text-secondary">
                {product.submitted_for_approval_at
                  ? new Date(
                      product.submitted_for_approval_at,
                    ).toLocaleDateString()
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
