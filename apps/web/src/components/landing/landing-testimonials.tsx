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
      <div
        style={{
          color: "var(--ps-warning)",
          fontSize: 13,
          letterSpacing: 1,
          marginBottom: 16,
        }}
      >
        ★★★★★
      </div>
      <p
        style={{
          fontSize: 14.5,
          lineHeight: 1.6,
          color: "var(--ps-text-primary)",
          margin: "0 0 20px",
          flex: 1,
        }}
      >
        {t.quote}
      </p>
      <div
        style={{
          height: 1,
          background: "rgba(77,184,255,0.08)",
          margin: "0 0 20px",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            color: "var(--ps-bg-base)",
            background: t.avBg,
          }}
        >
          {t.av}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.name}</div>
          <div style={{ fontSize: 12, color: "var(--ps-text-secondary)" }}>
            {t.role}
          </div>
        </div>
        <span style={{ fontSize: 12, color: "var(--ps-text-tertiary)" }}>
          {t.niche}
        </span>
      </div>
    </article>
  );
}

export function LandingTestimonials() {
  return (
    <section
      style={{
        position: "relative",
        padding: "100px 32px",
        borderTop: "1px solid var(--ps-border-subtle)",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(50% 35% at 20% 50%, rgba(30,95,212,0.08), transparent 60%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1280,
          margin: "0 auto",
        }}
      >
        <div
          style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 56px" }}
        >
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
            Testimonios
          </span>
          <h2
            style={{
              fontSize: 40,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              margin: 0,
            }}
          >
            Lo que dicen los equipos que ya venden con ProSell
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 20,
            marginBottom: 20,
          }}
        >
          {TESTIMONIALS_3.map((t) => (
            <TestimonialCard key={t.name} t={t} />
          ))}
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
        >
          {TESTIMONIALS_2.map((t) => (
            <TestimonialCard key={t.name} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
