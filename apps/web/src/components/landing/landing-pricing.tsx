import Link from "next/link";
import { PRICING_PLANS } from "./_data";

const CheckIcon = () => (
  <svg
    style={{ width: 11, height: 11 }}
    fill="none"
    stroke="currentColor"
    strokeWidth={2.75}
    viewBox="0 0 24 24"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export function LandingPricing() {
  return (
    <section
      id="precios"
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
            "radial-gradient(50% 35% at 50% 0%, rgba(77,184,255,0.08), transparent 60%), radial-gradient(60% 40% at 50% 100%, rgba(30,95,212,0.10), transparent 60%)",
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
          style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 32px" }}
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
            Precios
          </span>
          <h2
            style={{
              fontSize: 44,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              margin: "0 0 18px",
            }}
          >
            Empezá gratis. Escalá cuando vendás más.
          </h2>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.6,
              color: "var(--ps-text-secondary)",
              maxWidth: 520,
              margin: "0 auto",
            }}
          >
            Sin contratos largos. Sin letra chica. Pagás comisión solo cuando
            cerrás — alineados con tu éxito.
          </p>
        </div>

        {/* Toggle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            flexWrap: "wrap",
            marginBottom: 48,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              padding: 4,
              borderRadius: 100,
              background: "var(--ps-bg-elevated)",
              border: "1px solid var(--ps-border-subtle)",
              gap: 2,
            }}
          >
            {["Mensual", "Por comisión"].map((label, idx) => (
              <span
                key={label}
                style={{
                  padding: "9px 20px",
                  borderRadius: 100,
                  fontSize: 13.5,
                  fontWeight: 600,
                  background: idx === 1 ? "var(--ps-cyan)" : "transparent",
                  color:
                    idx === 1
                      ? "var(--ps-bg-base)"
                      : "var(--ps-text-secondary)",
                  boxShadow:
                    idx === 1 ? "0 0 16px rgba(77,184,255,0.25)" : "none",
                }}
              >
                {label}
              </span>
            ))}
          </div>
          <span
            style={{
              fontSize: 12.5,
              color: "var(--ps-text-secondary)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ color: "var(--ps-warning)" }}>⚡</span>Recomendado —
            pagás cuando vendés
          </span>
        </div>

        {/* Cards */}
        <div
          className="ps-pr-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.06fr 1fr",
            gap: 24,
            alignItems: "start",
            marginBottom: 48,
          }}
        >
          {PRICING_PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`ps-pr-card${plan.featured ? " ps-pr-card-featured" : ""}`}
            >
              {plan.badge && (
                <span
                  style={{
                    position: "absolute",
                    top: -14,
                    left: "50%",
                    transform: "translateX(-50%)",
                    padding: "6px 14px",
                    borderRadius: 100,
                    background: "var(--ps-cyan)",
                    color: "var(--ps-bg-base)",
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    boxShadow: "0 0 18px rgba(77,184,255,0.40)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {plan.badge}
                </span>
              )}
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  margin: "0 0 6px",
                  color: plan.featured
                    ? "var(--ps-cyan)"
                    : "var(--ps-text-primary)",
                }}
              >
                {plan.name}
              </h3>
              <p
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.5,
                  color: "var(--ps-text-secondary)",
                  margin: "0 0 22px",
                  minHeight: 40,
                }}
              >
                {plan.desc}
              </p>
              <div
                style={{
                  fontSize: 40,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  marginBottom: 8,
                }}
              >
                {plan.price}
                {plan.priceUnit && (
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 500,
                      color: "var(--ps-text-secondary)",
                    }}
                  >
                    {" "}
                    {plan.priceUnit}
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: "var(--ps-text-secondary)",
                  marginBottom: 22,
                  lineHeight: 1.45,
                }}
              >
                {plan.note}
              </div>
              <div
                style={{
                  height: 1,
                  background: "rgba(77,184,255,0.08)",
                  margin: "0 0 22px",
                }}
              />
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "0 0 28px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 11,
                  flex: 1,
                }}
              >
                {plan.features.map((f) => (
                  <li
                    key={f}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      fontSize: 13.5,
                      lineHeight: 1.45,
                    }}
                  >
                    <span
                      style={{
                        flexShrink: 0,
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: "rgba(77,184,255,0.12)",
                        color: "var(--ps-cyan)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: 1,
                      }}
                    >
                      <CheckIcon />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/register"
                className={plan.featured ? "ps-btn-primary" : "ps-btn-ghost"}
                style={{
                  justifyContent: "center",
                  padding: "13px 20px",
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Trust row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: 32,
          }}
        >
          {[
            "Sin tarjeta de crédito",
            "Cancelá cuando quieras",
            "Soporte incluido desde el día 1",
            "Datos exportables siempre",
          ].map((t) => (
            <span
              key={t}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 500,
                color: "var(--ps-text-secondary)",
              }}
            >
              <svg
                style={{ width: 14, height: 14, color: "var(--ps-cyan)" }}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
