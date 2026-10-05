import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { MainContentWrapper } from "@/components/layout/MainContentWrapper";

/**
 * Manager layout — team oversight and performance.
 *
 * Navigation groups: inventario + ventas (no configuración).
 * Server Component by default.
 */
export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      {/* Main content */}
      <MainContentWrapper>
        <Header />
        <main className="relative z-50 flex-1 overflow-y-auto bg-muted/20 p-6">
          {children}
        </main>
      </MainContentWrapper>

      <MobileNav />
    </div>
  );
}
