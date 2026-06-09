import Link from "next/link";
import { FAQ_ITEMS } from "./_data";

export function LandingFaq() {
  return (
    <section
      style={{
        padding: "100px 32px",
        borderTop: "1px solid rgba(77,184,255,0.08)",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr 1.6fr",
          gap: 80,
          alignItems: "start",
        }}
      >
        <div>
          <span
            style={{
              display: "inline-block",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ps-cyan)",
              marginBottom: 18,
            }}
          >
            FAQ
          </span>
          <h2
            style={{
              fontSize: 40,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              margin: "0 0 18px",
            }}
          >
            Preguntas frecuentes
          </h2>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.6,
              color: "var(--ps-text-secondary)",
              margin: "0 0 32px",
            }}
          >
            Todo lo que necesitás saber antes de empezar.
          </p>
          <Link
            href="/auth/register"
            className="ps-btn-primary"
            style={{ padding: "12px 22px", fontSize: 14 }}
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
