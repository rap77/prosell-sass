import Link from "next/link";
import { PulseDot } from "./landing-shared";

export function LandingFinalCta() {
  return (
    <section className="relative py-[120px] px-8 border-t border-ps-border-subtle overflow-hidden text-center">
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, rgba(6,13,36,0.8), rgba(13,27,110,0.6), rgba(30,95,212,0.4))",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 50%, rgba(77,184,255,0.12), transparent 70%)",
        }}
      />

      <div className="relative z-[1] max-w-[760px] mx-auto">
        <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-ps-cyan mb-6">
          <PulseDot />
          Empezá hoy
        </span>

        <h2 className="text-[52px] font-extrabold leading-[1.08] tracking-[-0.03em] mb-[22px]">
          Tu próximo cierre empieza acá.
        </h2>
        <p className="text-lg leading-relaxed text-ps-text-secondary mb-11">
          Más de 2.400 equipos ya usan ProSell para vender más sin gastar más.
          Empezá gratis, sin tarjeta, en 10 minutos.
        </p>

        <div className="flex gap-3 justify-center flex-wrap mb-7">
          <Link
            href="/auth/register"
            className="ps-btn-primary py-[14px] px-7 text-[15px] gap-2.5"
          >
            Empezar gratis ahora
            <svg
              className="w-4 h-4"
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
            className="ps-btn-ghost py-[14px] px-7 text-[15px] gap-2.5"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M5 5a2 2 0 013.008-1.728l11.997 6.998a2 2 0 01.003 3.458l-12 7A2 2 0 015 19z" />
            </svg>
            Ver demo en vivo
          </Link>
        </div>

        <div className="flex items-center justify-center gap-2 flex-wrap text-[13px] text-ps-tertiary">
          <span>🔒 Sin tarjeta</span>
          <span className="opacity-40">·</span>
          <span>↩️ Cancelá cuando quieras</span>
          <span className="opacity-40">·</span>
          <span>⚡ Setup en 10 min</span>
        </div>
      </div>
    </section>
  );
}
