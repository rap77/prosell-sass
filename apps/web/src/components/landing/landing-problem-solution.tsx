import { SectionLabel } from "./landing-shared";

export function LandingProblemSolution() {
  return (
    <section
      id="soluciones"
      className="relative py-[100px] px-8 border-t border-ps-border-subtle overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 35% at 20% 0%, rgba(240,67,56,0.08), transparent 60%), radial-gradient(ellipse 50% 40% at 85% 100%, rgba(77,184,255,0.10), transparent 60%)",
        }}
      />

      <div className="relative z-[1] max-w-[1280px] mx-auto">
        {/* Part A: Problem */}
        <div className="max-w-[760px] mx-auto text-center">
          <span className="inline-block text-xs font-semibold tracking-[0.18em] uppercase text-destructive mb-[18px]">
            El problema
          </span>
          <h2 className="text-[48px] font-extrabold leading-[1.08] tracking-[-0.025em] mb-[22px]">
            Publicás en mil lados.
            <br />
            <span className="bg-gradient-to-br from-destructive to-ps-warning bg-clip-text text-transparent">
              Cerrás en ninguno.
            </span>
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground max-w-[600px] mx-auto mb-10">
            Vender hoy significa estar en múltiples canales a la vez, responder antes que tu competencia y saber exactamente qué funciona. Sin un sistema que unifique todo eso, el presupuesto se va y los leads no vuelven.
          </p>

          {/* Pain chips */}
          <div className="ps-pain-row flex gap-3.5 justify-center flex-wrap">
            {[
              { num: "43%", lbl: "de leads sin seguimiento" },
              { num: "65–80%", lbl: "usan sistemas desconectados" },
              { num: "+8 hs", lbl: "tiempo promedio de respuesta" },
            ].map((c) => (
              <div
                key={c.num}
                className="flex items-center gap-3 bg-ps-error-bg border border-ps-danger-hover-border rounded-[10px] py-4 px-5"
              >
                <span className="text-2xl font-bold text-destructive tracking-[-0.02em]">{c.num}</span>
                <span className="text-xs text-muted-foreground leading-snug text-left max-w-[140px]">{c.lbl}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center justify-center my-20">
          <div
            className="flex-1 h-px max-w-[220px]"
            style={{
              background:
                "linear-gradient(to right, transparent, rgba(77,184,255,0.2), transparent)",
            }}
          />
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-ps-badge border border-ps-accent-glow-intense text-ps-cyan mx-4">
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
          </div>
          <div
            className="flex-1 h-px max-w-[220px]"
            style={{
              background: "linear-gradient(to right, rgba(77,184,255,0.2), transparent)",
            }}
          />
        </div>

        {/* Part B: Solution */}
        <div className="text-center max-w-[760px] mx-auto mb-14">
          <SectionLabel>La solución</SectionLabel>
          <h2 className="text-[40px] font-bold leading-[1.12] tracking-[-0.022em] mb-[18px]">
            Un sistema. Cualquier nicho.
            <br />
            <span className="bg-gradient-to-br from-ps-cyan to-ps-blue bg-clip-text text-transparent">
              Todo el pipeline.
            </span>
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground max-w-[560px] mx-auto">
            Vehículos, inmuebles, productos — ProSell se adapta a lo que vendés. Vos traés el stock, nosotros ponemos la infraestructura de distribución, inteligencia y cierre.
          </p>
        </div>

        {/* Solution cards */}
        <div className="ps-sol-grid grid grid-cols-3 gap-5">
          {[
            {
              icon: (
                <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              ),
              kicker: "Distribución automática",
              title: "Publicá en todos los canales a la vez",
              desc: "Un producto cargado una vez. Distribuido automáticamente en todos los portales y redes relevantes para tu nicho.",
              badge: "< 2 min · time-to-publish",
            },
            {
              icon: (
                <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              ),
              kicker: "Leads centralizados",
              title: "Todos tus leads, un solo lugar",
              desc: "Sin importar de dónde vienen — inbox unificado, respuesta inmediata, sin leads cayéndose por las grietas.",
              badge: "< 60s · response time",
            },
            {
              icon: (
                <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              ),
              kicker: "Inteligencia de cierre",
              title: "Sabé exactamente qué cierra",
              desc: "Qué canal trae mejores leads, qué precio mueve el stock, qué vendedor necesita soporte. Todo visible, todo accionable.",
              badge: "ROI visible · por canal",
            },
          ].map((c) => (
            <div key={c.title} className="ps-sol-card">
              <div className="w-11 h-11 rounded-xl mb-[22px] bg-ps-badge border border-ps-border-medium flex items-center justify-center text-ps-cyan">
                {c.icon}
              </div>
              <div className="text-[11px] font-semibold tracking-[0.14em] uppercase text-ps-tertiary mb-2.5">
                {c.kicker}
              </div>
              <h3 className="text-[19px] font-bold tracking-[-0.015em] leading-snug mb-3">{c.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground mb-6 flex-1">{c.desc}</p>
              <span className="self-start inline-flex items-center gap-2 py-1.5 px-3 rounded-full border border-ps-border-strong bg-ps-hover-bg-sm text-ps-cyan text-[11.5px] font-semibold">
                <span className="w-[5px] h-[5px] rounded-full bg-ps-cyan" style={{ boxShadow: "0 0 6px var(--ps-cyan)" }} />
                {c.badge}
              </span>
            </div>
          ))}
        </div>

        {/* Niche switcher */}
        <div className="flex items-center justify-center gap-3 flex-wrap mt-12">
          <span className="text-[13px] text-muted-foreground mr-1">Disponible para:</span>
          {[
            { label: "Vehículos", ico: "🚗", active: true },
            { label: "Inmuebles", ico: "🏠", active: false },
            { label: "Productos", ico: "📦", active: false },
          ].map((p) => (
            <span
              key={p.label}
              className={`inline-flex items-center gap-2 py-2.5 px-4 rounded-full text-[13px] font-medium ${
                p.active
                  ? "border border-ps-cyan text-ps-cyan bg-ps-hover-bg-sm"
                  : "border border-ps-accent-glow-medium text-muted-foreground"
              }`}
            >
              <span className="text-sm leading-none">{p.ico}</span>
              {p.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
