import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { MainContentWrapper } from "@/components/layout/MainContentWrapper";
import { NavigationCleanup } from "@/components/layout/NavigationCleanup";

/**
 * Admin-specific layout with full system access.
 *
 * Role: Admin - Infrastructure and global configuration
 * Navigation groups:
 * - Inventario: Catálogo, Publicaciones
 * - Ventas: Leads, Citas
 * - Concesionarios: cross-organization admin view (Subsystem D)
 * - Configuración: Settings, Logs (full access)
 *
 * Server Component by default (minimize client JS).
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* ponytail: clear navigation flag when layout mounts */}
      <NavigationCleanup />
      {/* Sidebar - desktop always visible, mobile drawer */}
      <Sidebar
        groups={[
          "general",
          "inventario",
          "ventas",
          "concesionarios",
          "configuración",
        ]}
      />

      {/* Main content area */}
      <MainContentWrapper>
        <Header />
        {/* FIXED: Added relative z-50 to create stacking context above sidebar (z-40) */}
        <main className="relative z-50 flex-1 overflow-y-auto bg-muted/20 p-6">
          {children}
        </main>
      </MainContentWrapper>

      {/* Mobile bottom navigation - visible only on mobile */}
      <MobileNav />
    </div>
  );
}
