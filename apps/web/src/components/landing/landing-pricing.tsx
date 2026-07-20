import Link from "next/link";
import {
  CheckItem,
  SectionLabel,
  SectionSubtitle,
  SectionTitle,
  TrustItem,
} from "./landing-shared";
import { PRICING_PLANS } from "./_data";

export function LandingPricing() {
  return (
    <section
      id="precios"
      className="relative py-[100px] px-8 border-t border-ps-border-subtle overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(50% 35% at 50% 0%, rgba(77,184,255,0.08), transparent 60%), radial-gradient(60% 40% at 50% 100%, rgba(30,95,212,0.10), transparent 60%)",
        }}
      />

      <div className="relative z-[1] max-w-[1280px] mx-auto">
        <div className="text-center max-w-[760px] mx-auto mb-8">
          <SectionLabel>Precios</SectionLabel>
          <SectionTitle>Empezá gratis. Escalá cuando vendás más.</SectionTitle>
          <SectionSubtitle className="max-w-[520px]">
            Sin contratos largos. Sin letra chica. Pagás comisión solo cuando
            cerrás — alineados con tu éxito.
          </SectionSubtitle>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-[18px] flex-wrap mb-12">
          <div className="inline-flex p-1 rounded-full bg-ps-elevated border border-ps-border-subtle gap-0.5">
            {["Mensual", "Por comisión"].map((label, idx) => (
              <span
                key={label}
                className={`py-2.5 px-5 rounded-full text-[13.5px] font-semibold ${
                  idx === 1
                    ? "bg-ps-cyan text-ps-base shadow-[0_0_16px_rgba(77,184,255,0.25)]"
                    : "bg-transparent text-muted-foreground"
                }`}
              >
                {label}
              </span>
            ))}
          </div>
          <span className="text-[12.5px] text-muted-foreground inline-flex items-center gap-1.5">
            <span className="text-ps-warning">⚡</span>Recomendado — pagás
            cuando vendés
          </span>
        </div>

        {/* Cards */}
        <div className="ps-pr-grid grid grid-cols-[1fr_1.06fr_1fr] gap-6 items-start mb-12">
          {PRICING_PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`ps-pr-card${plan.featured ? " ps-pr-card-featured" : ""}`}
            >
              {plan.badge && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 py-1.5 px-3.5 rounded-full bg-ps-cyan text-ps-base text-[11px] font-extrabold tracking-[0.14em] uppercase shadow-[0_0_18px_rgba(77,184,255,0.40)] whitespace-nowrap">
                  {plan.badge}
                </span>
              )}
              <h3
                className={`text-lg font-bold tracking-[-0.01em] mb-1.5 ${
                  plan.featured ? "text-ps-cyan" : ""
                }`}
              >
                {plan.name}
              </h3>
              <p className="text-[13.5px] leading-snug text-muted-foreground mb-[22px] min-h-[40px]">
                {plan.desc}
              </p>
              <div className="text-[40px] font-extrabold tracking-[-0.03em] leading-none mb-2">
                {plan.price}
                {plan.priceUnit && (
                  <span className="text-base font-medium text-muted-foreground">
                    {" "}
                    {plan.priceUnit}
                  </span>
                )}
              </div>
              <div className="text-[12.5px] text-muted-foreground mb-[22px] leading-snug">
                {plan.note}
              </div>
              <div className="h-px bg-ps-accent-glow-soft mb-[22px]" />
              <ul className="list-none p-0 mb-7 flex flex-col gap-[11px] flex-1">
                {plan.features.map((f) => (
                  <CheckItem key={f}>{f}</CheckItem>
                ))}
              </ul>
              <Link
                href="/auth/register"
                className={`${plan.featured ? "ps-btn-primary" : "ps-btn-ghost"} justify-center py-[13px] px-5 text-sm text-center`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Trust row */}
        <div className="flex items-center justify-center flex-wrap gap-8">
          {[
            "Sin tarjeta de crédito",
            "Cancelá cuando quieras",
            "Soporte incluido desde el día 1",
            "Datos exportables siempre",
          ].map((t) => (
            <TrustItem key={t}>{t}</TrustItem>
          ))}
        </div>
      </div>
    </section>
  );
}
