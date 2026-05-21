import Link from "next/link";
import Image from "next/image";

const FOOTER_COLS = [
  {
    label: "Producto",
    links: ["Funcionalidades", "Precios", "Integraciones", "Changelog", "Roadmap"],
  },
  {
    label: "Empresa",
    links: ["Sobre nosotros", "Blog", "Prensa", "Careers", "Contacto"],
  },
  {
    label: "Soporte",
    links: ["Documentación", "Centro de ayuda", "Status del sistema", "Términos de uso", "Privacidad"],
  },
] as const;

function LinkedInIcon() {
  return (
    <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" />
      <rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M4 4l16 16M20 4L4 20" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

export function LandingFooter() {
  return (
    <footer style={{ position: "relative", background: "rgb(4,10,26)", borderTop: "1px solid rgba(77,184,255,0.06)", padding: "64px 32px 0", zIndex: 1 }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>

        {/* 4-column grid */}
        <div className="ps-footer-grid" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 48, paddingBottom: 48 }}>

          {/* Brand column */}
          <div>
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 16 }}>
              <Image src="/logo-mark.png" alt="ProSell" width={271} height={294} style={{ height: 30, width: "auto", flexShrink: 0 }} />
              <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ps-text-primary)" }}>ProSell</span>
            </Link>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ps-text-secondary)", maxWidth: 220, margin: "0 0 22px" }}>
              La infraestructura de ventas para equipos que escalan.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              {[
                { label: "LinkedIn",  Icon: LinkedInIcon },
                { label: "X",         Icon: XIcon },
                { label: "Instagram", Icon: InstagramIcon },
              ].map(({ label, Icon }) => (
                <a key={label} href="#" aria-label={label} className="ps-footer-social-link">
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_COLS.map((col) => (
            <div key={col.label}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ps-text-disabled)", marginBottom: 16 }}>
                {col.label}
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="ps-footer-link">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer bar */}
        <div style={{ borderTop: "1px solid rgba(77,184,255,0.06)", padding: "24px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: 12, color: "var(--ps-text-disabled)" }}>
            © {new Date().getFullYear()} ProSell. Todos los derechos reservados.
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ps-text-disabled)" }}>
            <Link href="/terms" className="ps-footer-legal-link">Términos</Link>
            <span style={{ opacity: 0.5 }}>·</span>
            <Link href="/privacy" className="ps-footer-legal-link">Privacidad</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
