import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { MainContentWrapper } from "@/components/layout/MainContentWrapper";

/**
 * Seller-specific layout with role-based navigation access.
 *
 * Role: Seller - Sales execution focus
 * Navigation groups:
 * - Inventario: Catálogo, Publicaciones
 * - Ventas: Leads, Citas
 * - NO Configuración access (admin/branch only)
 *
 * Server Component by default (minimize client JS).
 */
export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar
          groups={[
            "general",
            "inventario",
            "ventas",
            "concesionarios",
            "configuración",
          ]}
        />
      </div>

      {/* Main content area */}
      <MainContentWrapper>
        <Header />
        {/* FIXED: Added relative z-50 to create stacking context above sidebar (z-40) */}
        {/* This ensures calendar events and all interactive elements are clickable */}
        <main className="relative z-50 flex-1 overflow-y-auto bg-muted/20 p-6">
          {children}
        </main>
      </MainContentWrapper>

      {/* Mobile bottom navigation - visible only on mobile */}
      <MobileNav />
    </div>
  );
}
