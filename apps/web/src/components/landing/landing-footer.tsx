import Link from "next/link";
import Image from "next/image";

const FOOTER_COLS = [
  {
    label: "Producto",
    links: [
      "Funcionalidades",
      "Precios",
      "Integraciones",
      "Changelog",
      "Roadmap",
    ],
  },
  {
    label: "Empresa",
    links: ["Sobre nosotros", "Blog", "Prensa", "Careers", "Contacto"],
  },
  {
    label: "Soporte",
    links: [
      "Documentación",
      "Centro de ayuda",
      "Status del sistema",
      "Términos de uso",
      "Privacidad",
    ],
  },
] as const;

function LinkedInIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path d="M4 4l16 16M20 4L4 20" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

export function LandingFooter() {
  return (
    <footer className="relative bg-ps-sidebar border-t border-ps-border-subtle pt-16 px-8 z-[1]">
      <div className="max-w-[1280px] mx-auto">
        <div className="ps-footer-grid grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-12 pb-12">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 no-underline mb-4"
            >
              <Image
                src="/logo-mark.png"
                alt="ProSell"
                width={271}
                height={294}
                className="h-[30px] w-auto shrink-0"
              />
              <span className="text-[17px] font-bold tracking-[-0.02em] text-ps-text-primary">
                ProSell
              </span>
            </Link>
            <p className="text-[13px] leading-relaxed text-ps-text-secondary max-w-[220px] mb-[22px]">
              La infraestructura de ventas para equipos que escalan.
            </p>
            <div className="flex gap-2.5">
              {[
                { label: "LinkedIn", Icon: LinkedInIcon },
                { label: "X", Icon: XIcon },
                { label: "Instagram", Icon: InstagramIcon },
              ].map(({ label, Icon }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="ps-footer-social-link"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {FOOTER_COLS.map((col) => (
            <div key={col.label}>
              <div className="text-xs font-bold uppercase tracking-[0.08em] text-ps-tertiary mb-4">
                {col.label}
              </div>
              <ul className="list-none p-0 m-0 flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="ps-footer-link">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-ps-border-subtle py-6 flex items-center justify-between flex-wrap gap-3">
          <span className="text-xs text-ps-tertiary">
            © {new Date().getFullYear()} ProSell. Todos los derechos reservados.
          </span>
          <div className="flex items-center gap-2 text-xs text-ps-tertiary">
            <Link href="/terms" className="ps-footer-legal-link">
              Términos
            </Link>
            <span className="opacity-50">·</span>
            <Link href="/privacy" className="ps-footer-legal-link">
              Privacidad
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
