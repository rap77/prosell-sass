import Link from "next/link";

export function LandingProblemSolution() {
  return (
    <section
      id="soluciones"
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
            "radial-gradient(ellipse 50% 35% at 20% 0%, rgba(240,67,56,0.08), transparent 60%), radial-gradient(ellipse 50% 40% at 85% 100%, rgba(77,184,255,0.10), transparent 60%)",
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
        {/* Part A: Problem */}
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
          <span
            style={{
              display: "inline-block",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ps-error)",
              marginBottom: 18,
            }}
          >
            El problema
          </span>
          <h2
            style={{
              fontSize: 48,
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: "-0.025em",
              margin: "0 0 22px",
            }}
          >
            Publicás en mil lados.
            <br />
            <span
              style={{
                background:
                  "linear-gradient(135deg, var(--ps-error) 0%, var(--ps-warning) 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                color: "transparent",
              }}
            >
              Cerrás en ninguno.
            </span>
          </h2>
          <p
            style={{
              fontSize: 18,
              lineHeight: 1.6,
              color: "var(--ps-text-secondary)",
              maxWidth: 600,
              margin: "0 auto 40px",
            }}
          >
            Vender hoy significa estar en múltiples canales a la vez, responder
            antes que tu competencia y saber exactamente qué funciona. Sin un
            sistema que unifique todo eso, el presupuesto se va y los leads no
            vuelven.
          </p>

          {/* Pain chips */}
          <div
            className="ps-pain-row"
            style={{
              display: "flex",
              gap: 14,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {[
              { num: "43%", lbl: "de leads sin seguimiento" },
              { num: "65–80%", lbl: "usan sistemas desconectados" },
              { num: "+8 hs", lbl: "tiempo promedio de respuesta" },
            ].map((c) => (
              <div
                key={c.num}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "var(--ps-error-bg)",
                  border: "1px solid var(--ps-danger-hover-border)",
                  borderRadius: 10,
                  padding: "16px 20px",
                }}
              >
                <span
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: "var(--ps-error)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {c.num}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--ps-text-secondary)",
                    lineHeight: 1.35,
                    textAlign: "left",
                    maxWidth: 140,
                  }}
                >
                  {c.lbl}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "80px 0",
          }}
        >
          <div
            style={{
              flex: 1,
              height: 1,
              background:
                "linear-gradient(90deg, transparent, rgba(77,184,255,0.2), transparent)",
              maxWidth: 220,
            }}
          />
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(77,184,255,0.10)",
              border: "1px solid rgba(77,184,255,0.25)",
              color: "var(--ps-cyan)",
              margin: "0 16px",
            }}
          >
            <svg
              style={{ width: 18, height: 18 }}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
          </div>
          <div
            style={{
              flex: 1,
              height: 1,
              background:
                "linear-gradient(90deg, rgba(77,184,255,0.2), transparent)",
              maxWidth: 220,
            }}
          />
        </div>

        {/* Part B: Solution */}
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
            La solución
          </span>
          <h2
            style={{
              fontSize: 40,
              fontWeight: 700,
              lineHeight: 1.12,
              letterSpacing: "-0.022em",
              margin: "0 0 18px",
            }}
          >
            Un sistema. Cualquier nicho.
            <br />
            <span
              style={{
                background:
                  "linear-gradient(135deg, var(--ps-cyan) 0%, var(--ps-blue) 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                color: "transparent",
              }}
            >
              Todo el pipeline.
            </span>
          </h2>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.6,
              color: "var(--ps-text-secondary)",
              maxWidth: 560,
              margin: "0 auto",
            }}
          >
            Vehículos, inmuebles, productos — ProSell se adapta a lo que vendés.
            Vos traés el stock, nosotros ponemos la infraestructura de
            distribución, inteligencia y cierre.
          </p>
        </div>

        {/* Solution cards (3) */}
        <div
          className="ps-sol-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 20,
          }}
        >
          {[
            {
              icon: (
                <svg
                  style={{ width: 22, height: 22 }}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  viewBox="0 0 24 24"
                >
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
                <svg
                  style={{ width: 22, height: 22 }}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  viewBox="0 0 24 24"
                >
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
                <svg
                  style={{ width: 22, height: 22 }}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  viewBox="0 0 24 24"
                >
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
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  marginBottom: 22,
                  background: "var(--ps-badge-bg)",
                  border: "1px solid var(--ps-border-medium)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--ps-cyan)",
                }}
              >
                {c.icon}
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--ps-text-tertiary)",
                  marginBottom: 10,
                }}
              >
                {c.kicker}
              </div>
              <h3
                style={{
                  fontSize: 19,
                  fontWeight: 700,
                  letterSpacing: "-0.015em",
                  lineHeight: 1.3,
                  margin: "0 0 12px",
                }}
              >
                {c.title}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "var(--ps-text-secondary)",
                  margin: "0 0 24px",
                  flex: 1,
                }}
              >
                {c.desc}
              </p>
              <span
                style={{
                  alignSelf: "flex-start",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 12px",
                  borderRadius: 100,
                  border: "1px solid rgba(77,184,255,0.3)",
                  background: "rgba(77,184,255,0.06)",
                  color: "var(--ps-cyan)",
                  fontSize: 11.5,
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "var(--ps-cyan)",
                    boxShadow: "0 0 6px var(--ps-cyan)",
                  }}
                />
                {c.badge}
              </span>
            </div>
          ))}
        </div>

        {/* Niche switcher */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 48,
          }}
        >
          <span
            style={{
              fontSize: 13,
              color: "var(--ps-text-secondary)",
              marginRight: 4,
            }}
          >
            Disponible para:
          </span>
          {[
            { label: "Vehículos", ico: "🚗", active: true },
            { label: "Inmuebles", ico: "🏠", active: false },
            { label: "Productos", ico: "📦", active: false },
          ].map((p) => (
            <span
              key={p.label}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 16px",
                borderRadius: 100,
                fontSize: 13,
                fontWeight: 500,
                border: p.active
                  ? "1px solid var(--ps-cyan)"
                  : "1px solid rgba(77,184,255,0.12)",
                color: p.active ? "var(--ps-cyan)" : "var(--ps-text-secondary)",
                background: p.active ? "rgba(77,184,255,0.06)" : "transparent",
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>{p.ico}</span>
              {p.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
