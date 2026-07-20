import Link from "next/link";
import { FAQ_ITEMS } from "./_data";

export function LandingFaq() {
  return (
    <section className="py-[100px] px-8 border-t border-ps-border-subtle">
      <div className="max-w-[1280px] mx-auto grid grid-cols-[1fr_1.6fr] gap-20 items-start">
        <div>
          <span className="inline-block text-xs font-semibold tracking-[0.18em] uppercase text-ps-cyan mb-[18px]">
            FAQ
          </span>
          <h2 className="text-[40px] font-extrabold leading-[1.1] tracking-[-0.025em] mb-[18px]">
            Preguntas frecuentes
          </h2>
          <p className="text-base leading-relaxed text-ps-text-secondary mb-8">
            Todo lo que necesitás saber antes de empezar.
          </p>
          <Link
            href="/auth/register"
            className="ps-btn-primary py-3 px-[22px] text-sm"
          >
            Empezar gratis
          </Link>
        </div>

        <div>
          {FAQ_ITEMS.map((item, idx) => (
            <details key={item.q} className="ps-faq-item" open={idx === 0}>
              <summary className="ps-faq-q">
                <span>{item.q}</span>
                <span className="ps-faq-toggle">+</span>
              </summary>
              <p className="ps-faq-a">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
