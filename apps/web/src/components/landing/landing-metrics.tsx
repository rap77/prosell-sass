import { SectionLabel, SectionSubtitle, SectionTitle } from "./landing-shared";

const STATS = [
  {
    num: "43%",
    label: "menos leads perdidos",
    sub: "vs. gestión manual",
    color: "text-ps-success",
  },
  {
    num: "< 60s",
    label: "tiempo de respuesta",
    sub: "garantizado por sistema",
    color: "text-ps-cyan",
  },
  {
    num: "3.2x",
    label: "más deals cerrados",
    sub: "por rep / por mes",
    color: "text-ps-cyan",
  },
  {
    num: "$15K",
    label: "ahorrado en marketing",
    sub: "por concesionaria / mes",
    color: "text-ps-success",
  },
] as const;

export function LandingMetrics() {
  return (
    <section className="relative py-[100px] px-8 border-t border-ps-border-subtle overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          background: "linear-gradient(135deg, #060D24, #0D1B6E, #1E5FD4)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(50% 40% at 30% 0%, rgba(77,184,255,0.10), transparent 60%), radial-gradient(50% 40% at 70% 100%, rgba(34,211,160,0.06), transparent 60%)",
        }}
      />

      <div className="relative z-[1] max-w-[1280px] mx-auto">
        <div className="text-center max-w-[760px] mx-auto mb-16">
          <SectionLabel>Resultados</SectionLabel>
          <SectionTitle>Los números que importan</SectionTitle>
          <SectionSubtitle className="max-w-[520px]">
            Equipos que usan ProSell cierran más rápido, pierden menos leads y
            ven el ROI desde el primer mes.
          </SectionSubtitle>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-6 lg:gap-0 items-center mx-auto mb-16">
          {STATS.map((s, idx) => (
            <div key={s.num} className="relative text-center py-6 sm:py-4 px-6">
              {idx > 0 && (
                <div className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 w-px h-[60px] bg-ps-accent-glow-soft" />
              )}
              <div
                className={`text-[56px] font-extrabold tracking-[-0.035em] leading-none mb-3.5 ${s.color}`}
              >
                {s.num}
              </div>
              <div className="text-base font-semibold mb-1 tracking-[-0.005em]">
                {s.label}
              </div>
              <div className="text-[13px] text-muted-foreground leading-snug">
                {s.sub}
              </div>
            </div>
          ))}
        </div>

        <figure className="max-w-[760px] mx-auto text-center px-6">
          <span className="block font-serif text-[96px] leading-[0.6] text-ps-cyan opacity-85 mb-2">
            &quot;
          </span>
          <blockquote className="text-xl font-medium italic leading-relaxed max-w-[640px] mx-auto mb-7 tracking-[-0.01em]">
            Antes perdíamos el 40% de los leads por tiempo de respuesta. Con
            ProSell respondemos en menos de un minuto y cerramos el doble en el
            mismo tiempo.
          </blockquote>
          <figcaption className="inline-flex items-center gap-3.5 flex-wrap justify-center">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-ps-base border border-ps-border-medium shrink-0"
              style={{
                background: "linear-gradient(135deg, #0D1B6E, #1E5FD4)",
              }}
            >
              MR
            </div>
            <div className="text-left">
              <div className="text-[15px] font-semibold">Martín Rodríguez</div>
              <div className="text-[13px] text-muted-foreground">
                Gerente Comercial · Automotores del Norte
              </div>
            </div>
            <span
              className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-[11px] font-bold text-ps-cyan tracking-[0.04em] uppercase"
              style={{
                background: "rgba(77,184,255,0.08)",
                borderColor: "rgba(77,184,255,0.22)",
                borderStyle: "solid",
                borderWidth: "1px",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-ps-cyan"
                style={{ boxShadow: "0 0 6px var(--ps-cyan)" }}
              />
              ProSell
            </span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
