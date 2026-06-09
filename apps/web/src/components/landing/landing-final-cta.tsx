import Link from "next/link";

export function LandingFinalCta() {
  return (
    <section
      style={{
        position: "relative",
        padding: "120px 32px",
        borderTop: "1px solid rgba(77,184,255,0.08)",
        overflow: "hidden",
        textAlign: "center",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(135deg, rgba(6,13,36,0.8), rgba(13,27,110,0.6), rgba(30,95,212,0.4))",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(60% 50% at 50% 50%, rgba(77,184,255,0.12), transparent 70%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 760,
          margin: "0 auto",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--ps-cyan)",
            marginBottom: 24,
          }}
        >
          <span
            style={{
              position: "relative",
              width: 8,
              height: 8,
              display: "inline-block",
            }}
          >
            <span
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: "var(--ps-cyan)",
              }}
            />
            <span
              style={{
                position: "absolute",
                inset: -3,
                borderRadius: "50%",
                background: "var(--ps-cyan)",
                opacity: 0.4,
                animation: "ps-pulse 1.8s cubic-bezier(0.16,1,0.3,1) infinite",
              }}
            />
          </span>
          Empezá hoy
        </span>

        <h2
          style={{
            fontSize: 52,
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: "-0.03em",
            margin: "0 0 22px",
          }}
        >
          Tu próximo cierre empieza acá.
        </h2>
        <p
          style={{
            fontSize: 18,
            lineHeight: 1.6,
            color: "var(--ps-text-secondary)",
            margin: "0 0 44px",
          }}
        >
          Más de 2.400 equipos ya usan ProSell para vender más sin gastar más.
          Empezá gratis, sin tarjeta, en 10 minutos.
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
            marginBottom: 28,
          }}
        >
          <Link
            href="/auth/register"
            className="ps-btn-primary"
            style={{ padding: "14px 28px", fontSize: 15, gap: 10 }}
          >
            Empezar gratis ahora
            <svg
              style={{ width: 16, height: 16 }}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
          <Link
            href="/auth/login"
            className="ps-btn-ghost"
            style={{ padding: "14px 28px", fontSize: 15, gap: 10 }}
          >
            <svg
              style={{ width: 14, height: 14 }}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M5 5a2 2 0 013.008-1.728l11.997 6.998a2 2 0 01.003 3.458l-12 7A2 2 0 015 19z" />
            </svg>
            Ver demo en vivo
          </Link>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            flexWrap: "wrap",
            fontSize: 13,
            color: "var(--ps-text-disabled)",
          }}
        >
          <span>🔒 Sin tarjeta</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>↩️ Cancelá cuando quieras</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>⚡ Setup en 10 min</span>
        </div>
      </div>
    </section>
  );
}
