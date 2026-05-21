import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'

/**
 * Branch layout — business view and reporting.
 *
 * Navigation groups: inventario + configuración (no ventas).
 * Server Component by default.
 */
export default function BranchLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar groups={['inventario', 'configuración']} />
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
        <Header />
        <main style={{
          position: 'relative',
          zIndex: 50,
          flex: 1,
          overflowY: 'auto',
          background: 'var(--ps-bg-base)',
          padding: 24,
        }}>
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  )
}
