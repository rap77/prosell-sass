import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'

/**
 * Admin-specific layout with full system access.
 *
 * Role: Admin - Infrastructure and global configuration
 * Navigation groups:
 * - Inventario: Catálogo, Publicaciones
 * - Ventas: Leads, Citas
 * - Configuración: Settings, Logs (full access)
 *
 * Server Component by default (minimize client JS).
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar groups={['inventario', 'ventas', 'configuración']} />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        {/* FIXED: Added relative z-50 to create stacking context above sidebar (z-40) */}
        <main className="relative z-50 flex-1 overflow-y-auto bg-muted/20 p-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation - visible only on mobile */}
      <MobileNav />
    </div>
  )
}
