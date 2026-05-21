import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'

/**
 * Vendedor layout — wraps all /vendedor/* routes with the ProSell app shell.
 * Groups: general (Dashboard) + ventas (Leads, Pipeline, Analytics).
 * Server Component by default.
 */
export default function VendedorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden md:block">
        <Sidebar groups={['general', 'ventas']} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="relative z-50 flex-1 overflow-y-auto bg-muted/20 p-6">
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  )
}
