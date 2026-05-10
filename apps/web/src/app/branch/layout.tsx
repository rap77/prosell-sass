import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'

/**
 * Branch-specific layout with business/financial focus.
 *
 * Role: Branch - Business view and reporting
 * Navigation groups:
 * - Inventario: Catálogo, Publicaciones (inventory focus)
 * - NO Ventas access (no leads/sales data visibility)
 * - Configuración: Settings, Logs (brancheship configuration)
 *
 * Server Component by default (minimize client JS).
 */
export default function BranchLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar groups={['inventario', 'configuración']} />
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
