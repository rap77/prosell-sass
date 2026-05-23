const STATS = [
  { num: "43%",   label: "menos leads perdidos",   sub: "vs. gestión manual",      color: "var(--ps-success)" },
  { num: "< 60s", label: "tiempo de respuesta",     sub: "garantizado por sistema", color: "var(--ps-cyan)" },
  { num: "3.2x",  label: "más deals cerrados",      sub: "por rep / por mes",       color: "var(--ps-cyan)" },
  { num: "$15K",  label: "ahorrado en marketing",   sub: "por concesionaria / mes", color: "var(--ps-success)" },
] as const;

export function LandingMetrics() {
  return (
    <section style={{ position: "relative", padding: "100px 32px", borderTop: "1px solid var(--ps-border-subtle)", overflow: "hidden" }}>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(135deg, #060D24, #0D1B6E, #1E5FD4)", opacity: 0.1 }} />
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(50% 40% at 30% 0%, rgba(77,184,255,0.10), transparent 60%), radial-gradient(50% 40% at 70% 100%, rgba(34,211,160,0.06), transparent 60%)" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 64px" }}>
          <span style={{ display: "inline-block", fontSize: 12, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ps-cyan)", marginBottom: 18 }}>Resultados</span>
          <h2 style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.025em", margin: "0 0 18px" }}>Los números que importan</h2>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: "var(--ps-text-secondary)", maxWidth: 520, margin: "0 auto" }}>
            Equipos que usan ProSell cierran más rápido, pierden menos leads y ven el ROI desde el primer mes.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", alignItems: "center", margin: "0 auto 64px" }}>
          {STATS.map((s, idx) => (
            <div key={s.num} style={{ position: "relative", textAlign: "center", padding: "8px 24px" }}>
              {idx > 0 && <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 1, height: 60, background: "rgba(77,184,255,0.1)" }} />}
              <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1, marginBottom: 14, color: s.color }}>{s.num}</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, letterSpacing: "-0.005em" }}>{s.label}</div>
              <div style={{ fontSize: 13, color: "var(--ps-text-secondary)", lineHeight: 1.4 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        <figure style={{ maxWidth: 760, margin: "0 auto", textAlign: "center", padding: "0 24px" }}>
          <span style={{ display: "block", fontFamily: "Georgia, serif", fontSize: 96, lineHeight: 0.6, color: "var(--ps-cyan)", opacity: 0.85, marginBottom: 8 }}>"</span>
          <blockquote style={{ fontSize: 20, fontWeight: 500, fontStyle: "italic", lineHeight: 1.55, maxWidth: 640, margin: "0 auto 28px", letterSpacing: "-0.01em" }}>
            Antes perdíamos el 40% de los leads por tiempo de respuesta. Con ProSell respondemos en menos de un minuto y cerramos el doble en el mismo tiempo.
          </blockquote>
          <figcaption style={{ display: "inline-flex", alignItems: "center", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "var(--ps-bg-base)", background: "linear-gradient(135deg, #0D1B6E, #1E5FD4)", border: "1px solid rgba(77,184,255,0.25)", flexShrink: 0 }}>MR</div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Martín Rodríguez</div>
              <div style={{ fontSize: 13, color: "var(--ps-text-secondary)" }}>Gerente Comercial · Automotores del Norte</div>
            </div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 100, background: "rgba(77,184,255,0.08)", border: "1px solid rgba(77,184,255,0.22)", fontSize: 11, fontWeight: 700, color: "var(--ps-cyan)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ps-cyan)", boxShadow: "0 0 6px var(--ps-cyan)" }} />
              ProSell
            </span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
