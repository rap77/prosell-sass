import Link from "next/link";
import { SectionLabel, SectionSubtitle, SectionTitle } from "./landing-shared";

const STEPS = [
  {
    num: "01",
    title: "Cargá tu catálogo",
    desc: "Subí tus productos, vehículos o inmuebles una sola vez. ProSell organiza todo automáticamente según tu nicho.",
    tag: "⏱ 3 minutos",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path d="M11 21.73a2 2 0 002 0l7-4A2 2 0 0021 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73z" />
        <path d="M12 22V12" />
        <polyline points="3.29 7 12 12 20.71 7" />
        <path d="m7.5 4.27 9 5.15" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Activá tus canales",
    desc: "Conectá Facebook, portales y tu web. ProSell publica en todos a la vez con un solo clic.",
    tag: "⏱ 5 minutos",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Respondé y cerrá",
    desc: "Todos tus leads llegan al inbox unificado. Respondés con IA, seguís el pipeline y cerrás más desde el día uno.",
    tag: "⏱ Desde el día 1",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path d="M16 7h6v6" />
        <path d="m22 7-8.5 8.5-5-5L2 17" />
      </svg>
    ),
  },
] as const;

export function LandingHowItWorks() {
  return (
    <section
      id="como-funciona"
      className="relative py-[100px] px-8 border-t border-ps-accent-glow-soft overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(50% 35% at 50% 0%, rgba(77,184,255,0.06), transparent 60%)",
        }}
      />

      <div className="relative z-[1] max-w-[1280px] mx-auto">
        <div className="text-center max-w-[760px] mx-auto mb-16">
          <SectionLabel>Cómo funciona</SectionLabel>
          <SectionTitle>De cero a vendiendo en 10 minutos</SectionTitle>
          <SectionSubtitle className="max-w-[500px]">
            Sin onboarding largo. Sin integración técnica. Tres pasos y tu
            pipeline ya está funcionando.
          </SectionSubtitle>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-14">
          {STEPS.map((step) => (
            <div key={step.num} className="ps-hw-step">
              <span className="absolute top-5 right-6 text-[13px] font-bold tracking-[0.04em] text-ps-cyan-faint">
                {step.num}
              </span>
              <div className="w-[52px] h-[52px] rounded-[14px] bg-ps-badge border border-ps-border-medium flex items-center justify-center text-ps-cyan mb-[22px]">
                {step.icon}
              </div>
              <h3 className="text-[19px] font-bold tracking-[-0.015em] mb-3">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground mb-5">
                {step.desc}
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ps-cyan py-1.5 px-3 rounded-full bg-ps-accent-glow-soft border border-ps-border-medium">
                {step.tag}
              </span>
            </div>
          ))}
        </div>

        <div className="text-center">
          <span className="text-[15px] text-muted-foreground mr-5">
            ¿Listo para probarlo sin riesgos?
          </span>
          <Link
            href="/auth/register"
            className="ps-btn-primary py-[11px] px-[22px] text-sm"
          >
            Empezar gratis →
          </Link>
        </div>
      </div>
    </section>
  );
}
