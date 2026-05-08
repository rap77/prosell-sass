import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'

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
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar groups={['inventario', 'ventas']} />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden md:ml-64">
        <Header />
        <main className="flex-1 overflow-y-auto bg-muted/20 p-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation - visible only on mobile */}
      <MobileNav />
    </div>
  )
}
