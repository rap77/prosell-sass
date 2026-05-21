import Link from "next/link";

const STEPS = [
  {
    num: "01",
    title: "Cargá tu catálogo",
    desc: "Subí tus productos, vehículos o inmuebles una sola vez. ProSell organiza todo automáticamente según tu nicho.",
    tag: "⏱ 3 minutos",
    icon: (
      <svg style={{ width: 24, height: 24 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M11 21.73a2 2 0 002 0l7-4A2 2 0 0021 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73z" />
        <path d="M12 22V12" /><polyline points="3.29 7 12 12 20.71 7" /><path d="m7.5 4.27 9 5.15" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Activá tus canales",
    desc: "Conectá Facebook, portales y tu web. ProSell publica en todos a la vez con un solo clic.",
    tag: "⏱ 5 minutos",
    icon: (
      <svg style={{ width: 24, height: 24 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Respondé y cerrá",
    desc: "Todos tus leads llegan al inbox unificado. Respondés con IA, seguís el pipeline y cerrás más desde el día uno.",
    tag: "⏱ Desde el día 1",
    icon: (
      <svg style={{ width: 24, height: 24 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M16 7h6v6" /><path d="m22 7-8.5 8.5-5-5L2 17" />
      </svg>
    ),
  },
] as const;

export function LandingHowItWorks() {
  return (
    <section style={{ position: "relative", padding: "100px 32px", borderTop: "1px solid rgba(77,184,255,0.08)", overflow: "hidden" }}>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(50% 35% at 50% 0%, rgba(77,184,255,0.06), transparent 60%)" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 64px" }}>
          <span style={{ display: "inline-block", fontSize: 12, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ps-cyan)", marginBottom: 18 }}>Cómo funciona</span>
          <h2 style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.025em", margin: "0 0 18px" }}>De cero a vendiendo en 10 minutos</h2>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: "var(--ps-text-secondary)", maxWidth: 500, margin: "0 auto" }}>
            Sin onboarding largo. Sin integración técnica. Tres pasos y tu pipeline ya está funcionando.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 32, marginBottom: 56 }}>
          {STEPS.map((step) => (
            <div key={step.num} className="ps-hw-step">
              <span style={{ position: "absolute", top: 20, right: 24, fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", color: "rgba(77,184,255,0.2)" }}>{step.num}</span>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(77,184,255,0.10)", border: "1px solid rgba(77,184,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ps-cyan)", marginBottom: 22 }}>
                {step.icon}
              </div>
              <h3 style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.015em", margin: "0 0 12px" }}>{step.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ps-text-secondary)", margin: "0 0 20px" }}>{step.desc}</p>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--ps-cyan)", padding: "5px 12px", borderRadius: 100, background: "rgba(77,184,255,0.08)", border: "1px solid rgba(77,184,255,0.2)" }}>
                {step.tag}
              </span>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center" }}>
          <span style={{ fontSize: 15, color: "var(--ps-text-secondary)", marginRight: 20 }}>¿Listo para probarlo sin riesgos?</span>
          <Link href="/auth/register" className="ps-btn-primary" style={{ padding: "11px 22px", fontSize: 14 }}>Empezar gratis →</Link>
        </div>
      </div>
    </section>
  );
}
