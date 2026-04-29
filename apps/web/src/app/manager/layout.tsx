import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'

/**
 * Manager-specific layout with team supervision focus.
 *
 * Role: Manager - Team oversight and performance
 * Navigation groups:
 * - Inventario: Catálogo, Publicaciones
 * - Ventas: Leads, Citas (team view)
 * - NO Configuración access (admin only)
 *
 * Similar to seller but with team-level dashboard widgets.
 * Server Component by default (minimize client JS).
 */
export default function ManagerLayout({
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
      <div className="flex flex-1 flex-col overflow-hidden">
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
