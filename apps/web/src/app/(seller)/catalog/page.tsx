import { DataGrid, type Vehicle } from "@/components/datagrid/DataGrid";

// Mock data for development (backend endpoints to be implemented in Phase 2)
const mockVehicles: Vehicle[] = Array.from({ length: 1000 }, (_, i) => ({
  id: `vehicle-${i + 1}`,
  title: `${2020 + (i % 5)} Toyota Camry ${["LE", "SE", "XLE", "XSE"][i % 4]}`,
  price: 20000 + (i % 100) * 100,
  status: (["published", "pending", "failed", "draft", "expired", "online", "sold"] as Vehicle["status"][])[i % 7],
  photo_url: i % 3 === 0 ? `https://via.placeholder.com/60` : undefined,
  year: 2020 + (i % 5),
  make: "Toyota",
  model: "Camry",
}));

export default function CatalogPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Catálogo</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona tu inventario de vehículos
        </p>
      </div>

      <DataGrid data={mockVehicles} />
    </div>
  );
}
