import Link from "next/link";
import Image from "next/image";

export function LandingNav() {
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50, height: 72,
      display: "flex", alignItems: "center",
      background: "rgba(6,13,36,0.72)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      borderBottom: "1px solid rgba(77,184,255,0.08)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 40,
        width: "100%", maxWidth: 1280, margin: "0 auto", padding: "0 32px",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <Image src="/logo-mark.png" alt="ProSell" width={271} height={294} style={{ height: 34, width: "auto", flexShrink: 0 }} />
          <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ps-text-primary)" }}>ProSell</span>
        </Link>

        <nav className="ps-nav-links" style={{ display: "flex", gap: 32, flex: 1, justifyContent: "center" }}>
          {["Producto", "Soluciones", "Precios", "Blog"].map((l) => (
            <a key={l} href="#" className="ps-nav-link">{l}</a>
          ))}
        </nav>

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginLeft: "auto" }}>
          <Link href="/auth/login" className="ps-btn-ghost" style={{ padding: "9px 16px", fontSize: 13 }}>Iniciar sesión</Link>
          <Link href="/auth/register" className="ps-btn-primary" style={{ padding: "9px 16px", fontSize: 13 }}>Empezar gratis</Link>
        </div>
      </div>
    </header>
  );
}
