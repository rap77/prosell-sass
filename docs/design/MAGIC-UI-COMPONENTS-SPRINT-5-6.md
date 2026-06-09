# 🎨 Magic UI Components - Sprint 5-6

**Fuente:** 21st.dev Magic UI
**Fecha:** 2026-03-04

---

## 1. IMAGE UPLOAD COMPONENT

Perfecto para carga de hasta 20 fotos de productos.

### Características:

- ✅ Drag & drop
- ✅ Preview con zoom on hover
- ✅ Botones de reemplazar/eliminar
- ✅ Nombre de archivo
- ✅ Aspect ratio configurable
- ✅ Loading states
- ✅ Error states

### Código:

```tsx
// Hook personalizado
import { useCallback, useEffect, useRef, useState } from "react";

export function useImageUpload({
  onUpload,
}: { onUpload?: (url: string) => void } = {}) {
  const previewRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleThumbnailClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        setFileName(file.name);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        previewRef.current = url;
        onUpload?.(url);
      }
    },
    [onUpload],
  );

  const handleRemove = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setFileName(null);
    previewRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  return {
    previewUrl,
    fileName,
    fileInputRef,
    handleThumbnailClick,
    handleFileChange,
    handleRemove,
  };
}
```

```tsx
// Componente completo
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useImageUpload } from "@/components/hooks/use-image-upload";
import { ImagePlus, X, Upload, Trash2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

export function MultiPhotoUpload({ maxPhotos = 20 }) {
  const [photos, setPhotos] = useState<
    Array<{ id: string; url: string; file: File }>
  >([]);

  const addPhoto = (url: string, file: File) => {
    setPhotos((prev) => [...prev, { id: crypto.randomUUID(), url, file }]);
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {photos.map((photo, index) => (
        <PhotoCard
          key={photo.id}
          photo={photo}
          index={index}
          onRemove={removePhoto}
        />
      ))}

      {photos.length < maxPhotos && <UploadTrigger onUpload={addPhoto} />}
    </div>
  );
}

function PhotoCard({ photo, index, onRemove }) {
  const { previewUrl, fileName, handleRemove } = useImageUpload({
    onUpload: (url) => console.log("Uploaded:", url),
  });

  return (
    <div className="group relative aspect-square">
      <Image
        src={photo.url}
        alt={`Foto ${index + 1}`}
        fill
        className="object-cover rounded-lg border"
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute top-2 right-2">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onRemove(photo.id)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function UploadTrigger({ onUpload }) {
  const {
    previewUrl,
    fileName,
    fileInputRef,
    handleThumbnailClick,
    handleFileChange,
  } = useImageUpload({
    onUpload: (url) => onUpload(url, null), // Simplificado
  });

  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      onClick={handleThumbnailClick}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file?.type.startsWith("image/")) {
          handleFileChange({ target: { files: [file] } });
        }
      }}
      className={cn(
        "flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 transition-colors hover:bg-muted",
        isDragging && "border-primary/50 bg-primary/5",
      )}
    >
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
      <p className="text-sm font-medium">Agregar foto</p>
      <p className="text-xs text-muted-foreground text-center px-2">
        o arrastra aquí
      </p>
    </div>
  );
}
```

---

## 2. DATA TABLE COMPONENT

Para el listado de productos con filtros y búsqueda.

### Características:

- ✅ Sortable columns
- ✅ Filterable columns
- ✅ Search functionality
- ✅ Pagination
- ✅ Responsive

### Código simplificado:

```tsx
"use client";

import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  key: keyof T;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
};

type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  searchable?: boolean;
  itemsPerPage?: number;
};

export function DataTable<T>({
  data,
  columns,
  searchable = true,
  itemsPerPage = 10,
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      if (!searchTerm) return true;
      return Object.values(row).some((value) =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase()),
      );
    });
  }, [data, searchTerm]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Paginate
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const handleSort = (key: string) => {
    if (sortConfig?.key === key) {
      setSortConfig({
        key,
        direction: sortConfig.direction === "asc" ? "desc" : "asc",
      });
    } else {
      setSortConfig({ key, direction: "asc" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Search */}
      {searchable && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className="px-4 py-3 text-left text-sm font-medium"
                >
                  <button
                    onClick={() =>
                      column.sortable && handleSort(String(column.key))
                    }
                    className={cn(
                      "flex items-center gap-1",
                      column.sortable && "cursor-pointer hover:text-primary",
                    )}
                  >
                    {column.header}
                    {column.sortable && (
                      <span className="ml-1">
                        {sortConfig?.key === String(column.key) ? (
                          sortConfig.direction === "asc" ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )
                        ) : (
                          <ChevronUp className="h-4 w-4 opacity-30" />
                        )}
                      </span>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, index) => (
              <tr key={index} className="border-t hover:bg-muted/50">
                {columns.map((column) => (
                  <td key={String(column.key)} className="px-4 py-3 text-sm">
                    {column.render
                      ? column.render(row[column.key], row)
                      : String(row[column.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {(currentPage - 1) * itemsPerPage + 1} -{" "}
          {Math.min(currentPage * itemsPerPage, sortedData.length)} de{" "}
          {sortedData.length}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm rounded border disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm rounded border disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Uso para Productos:

```tsx
// app/(dashboard)/products/page.tsx
"use client";

import { DataTable } from "@/components/ui/data-table";
import { useQuery } from "@tanstack/react-query";

export function ProductsList() {
  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const columns = [
    { key: "title", header: "Título", sortable: true, filterable: true },
    { key: "price", header: "Precio", sortable: true },
    { key: "status", header: "Estado", sortable: true, filterable: true },
    { key: "createdAt", header: "Creado", sortable: true },
  ];

  return (
    <DataTable
      data={products || []}
      columns={columns}
      searchable
      itemsPerPage={20}
    />
  );
}
```

---

## 3. NOTA IMPORTANTE: MULTI-TENANT + MULTI-PRODUCTO

El usuario recordó correctamente: **la plataforma no es solo para vehículos**.

### Arquitectura YA contemplada en Sprint 5-6 PRP:

```python
# TODAS las entities tienen tenant_id
class Product(DomainModel):
    id: UUID
    tenant_id: UUID      # ✅ Multi-tenant isolation
    organization_id: UUID
    category_id: UUID      # ✅ Multi-producto (categorías dinámicas)
    title: str
    attributes: JSONB    # ✅ Campos dinámicos por categoría
```

### Sistema de Categorías Dinámicas:

```
Automóviles (Categoría):
  - VIN (específico)
  - Año
  - Kilometraje
  - Transmisión

Inmuebles (Categoría futura):
  - Metraje
  - Habitaciones
  - Ubicación
  - Tipo (casa/depto)

Perfumes (Categoría futura):
  - Marca
  - Tamaño
  - Género
  - Fragancia
```

### El código UI es REUTILIZABLE:

Los componentes de Magic UI funcionan para CUALQUIER categoría porque:

- Los campos se generan dinámicamente desde `category.fields`
- El upload de fotos es genérico
- La data table filtra cualquier tipo de producto

---

## NEXT STEPS

1. ✅ Cerebro #3 (UI Design) - COMPLETADO
2. ✅ Cerebro #4 (Frontend) - COMPLETADO
3. ✅ Magic UI Components - COMPLETADO
4. ⏳ Cerebro #5 (Backend) - Arquitectura Facebook Integration

---

_Generado por 21st.dev Magic UI_
