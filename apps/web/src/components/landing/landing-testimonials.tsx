import { TESTIMONIALS_2, TESTIMONIALS_3 } from "./_data";

type Testimonial = {
  av: string;
  avBg: string;
  quote: string;
  name: string;
  role: string;
  niche: string;
};

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <article className="ps-tm-card">
      <div className="text-ps-warning text-[13px] tracking-[1px] mb-4">
        ★★★★★
      </div>
      <p className="text-[14.5px] leading-[1.6] text-ps-text-primary mb-5 flex-1">
        {t.quote}
      </p>
      <div className="h-px bg-ps-border-subtle mb-5" />
      <div className="flex items-center gap-3">
        <div
          className="w-[38px] h-[38px] rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-ps-base"
          style={{ background: t.avBg }}
        >
          {t.av}
        </div>
        <div className="flex-1">
          <div className="text-[13.5px] font-semibold">{t.name}</div>
          <div className="text-xs text-ps-text-secondary">{t.role}</div>
        </div>
        <span className="text-xs text-ps-tertiary">{t.niche}</span>
      </div>
    </article>
  );
}

export function LandingTestimonials() {
  return (
    <section className="relative py-[100px] px-8 border-t border-ps-border-subtle overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(50% 35% at 20% 50%, rgba(30,95,212,0.08), transparent 60%)",
        }}
      />

      <div className="relative z-[1] max-w-[1280px] mx-auto">
        <div className="text-center max-w-[760px] mx-auto mb-14">
          <span className="inline-block text-xs font-semibold tracking-[0.18em] uppercase text-ps-cyan mb-[18px]">
            Testimonios
          </span>
          <h2 className="text-[40px] font-extrabold leading-[1.1] tracking-[-0.025em] m-0">
            Lo que dicen los equipos que ya venden con ProSell
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-5 mb-5">
          {TESTIMONIALS_3.map((t) => (
            <TestimonialCard key={t.name} t={t} />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-5">
          {TESTIMONIALS_2.map((t) => (
            <TestimonialCard key={t.name} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
