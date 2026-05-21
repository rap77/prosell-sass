/**
 * Landing page — ProSell SaaS.
 *
 * Server Component — no auth state needed.
 * All colors via var(--ps-*) tokens. CSS keyframes via embedded <style>.
 */

import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <>
      {/* Keyframes + interactive states that can't be expressed via inline styles */}
      <style>{`
        @keyframes ps-float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-10px); }
        }
        @keyframes ps-float-badge-1 {
          0%, 100% { transform: translateY(0) translateX(0); }
          50%       { transform: translateY(-12px) translateX(-4px); }
        }
        @keyframes ps-float-badge-2 {
          0%, 100% { transform: translateY(0) translateX(0); }
          50%       { transform: translateY(-14px) translateX(6px); }
        }
        @keyframes ps-pulse {
          0%   { transform: scale(0.6); opacity: 0.6; }
          100% { transform: scale(2.2); opacity: 0; }
        }

        .ps-nav-link {
          font-size: 14px; font-weight: 500;
          color: var(--ps-text-secondary); text-decoration: none;
          transition: color 200ms cubic-bezier(0.16,1,0.3,1);
        }
        .ps-nav-link:hover { color: var(--ps-text-primary); }

        .ps-btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 11px 22px; border-radius: 8px;
          font-size: 14px; font-weight: 600; line-height: 1;
          text-decoration: none; border: none; cursor: pointer;
          background: var(--ps-cyan); color: var(--ps-bg-base);
          transition: background 220ms cubic-bezier(0.16,1,0.3,1),
                      transform 220ms cubic-bezier(0.16,1,0.3,1),
                      box-shadow 220ms cubic-bezier(0.16,1,0.3,1);
        }
        .ps-btn-primary:hover {
          background: #7DCEFF;
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(77,184,255,0.35);
        }
        .ps-btn-ghost {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 11px 22px; border-radius: 8px;
          font-size: 14px; font-weight: 600; line-height: 1;
          text-decoration: none; cursor: pointer;
          background: transparent; color: var(--ps-text-primary);
          border: 1px solid rgba(77,184,255,0.2);
          transition: border-color 200ms cubic-bezier(0.16,1,0.3,1),
                      color 200ms cubic-bezier(0.16,1,0.3,1);
        }
        .ps-btn-ghost:hover { border-color: var(--ps-cyan); }

        .ps-feat-card {
          background: rgba(13,27,62,0.7);
          border: 1px solid rgba(77,184,255,0.12);
          border-radius: 16px;
          backdrop-filter: blur(20px);
          padding: 28px;
          display: flex; flex-direction: column;
          transition: border-color 220ms cubic-bezier(0.16,1,0.3,1),
                      transform 220ms cubic-bezier(0.16,1,0.3,1);
        }
        .ps-feat-card:hover {
          border-color: rgba(77,184,255,0.3);
          transform: translateY(-4px);
        }

        .ps-footer-link {
          font-size: 12px; color: var(--ps-text-disabled); text-decoration: none;
          transition: color 200ms cubic-bezier(0.16,1,0.3,1);
        }
        .ps-footer-link:hover { color: var(--ps-text-secondary); }

        @media (max-width: 1100px) {
          .ps-hero        { grid-template-columns: 1fr !important; gap: 60px !important; }
          .ps-hero-h1     { font-size: 44px !important; }
          .ps-nav-links   { display: none !important; }
          .ps-mockup-col  { min-height: 400px !important; }
          .ps-feat-grid   { grid-template-columns: 1fr 1fr !important; }
          .ps-float-badge { display: none !important; }
        }
        @media (max-width: 700px) {
          .ps-hero-h1     { font-size: 32px !important; }
          .ps-cta-row     { flex-direction: column !important; align-items: stretch !important; }
          .ps-cta-row a   { text-align: center; }
          .ps-feat-grid   { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "var(--ps-bg-base)",
        color: "var(--ps-text-primary)",
        overflowX: "hidden",
      }}>

        {/* ── BACKGROUND DECORATION ── */}
        <div aria-hidden="true" style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          backgroundImage: [
            "linear-gradient(rgba(77,184,255,0.04) 1px, transparent 1px)",
            "linear-gradient(90deg, rgba(77,184,255,0.04) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        }} />
        <div aria-hidden="true" style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 60% 50% at 80% 20%, rgba(30,95,212,0.35), transparent 60%)",
        }} />
        <div aria-hidden="true" style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 50% 40% at 10% 80%, rgba(13,27,110,0.4), transparent 60%)",
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>

          {/* ──────────────────────── NAV ──────────────────────── */}
          <header style={{
            position: "sticky", top: 0, zIndex: 50,
            height: 72,
            display: "flex", alignItems: "center",
            background: "rgba(6,13,36,0.72)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(77,184,255,0.08)",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 40,
              width: "100%", maxWidth: 1280,
              margin: "0 auto", padding: "0 32px",
            }}>
              {/* Logo */}
              <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
                <Image src="/logo-mark.png" alt="ProSell" width={271} height={294} style={{ height: 34, width: "auto", flexShrink: 0 }} />
                <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ps-text-primary)" }}>
                  ProSell
                </span>
              </Link>

              {/* Nav links */}
              <nav className="ps-nav-links" style={{ display: "flex", gap: 32, flex: 1, justifyContent: "center" }}>
                {["Funciones", "Precios", "Integraciones", "Recursos"].map((label) => (
                  <a key={label} href="#funciones" className="ps-nav-link">{label}</a>
                ))}
              </nav>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginLeft: "auto" }}>
                <Link href="/auth/login" className="ps-nav-link" style={{ padding: "0 4px" }}>
                  Iniciar sesión
                </Link>
                <Link href="/auth/register" className="ps-btn-primary" style={{ padding: "9px 16px", fontSize: 13 }}>
                  Comenzar gratis
                </Link>
              </div>
            </div>
          </header>

          {/* ──────────────────────── HERO ──────────────────────── */}
          <main>
            <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px" }}>
              <div
                className="ps-hero"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.05fr 1fr",
                  gap: 80,
                  alignItems: "center",
                  minHeight: "calc(100vh - 72px)",
                  padding: "60px 0 100px",
                }}
              >
                {/* ── LEFT: copy ── */}
                <div>
                  {/* Pill badge */}
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "6px 14px 6px 12px",
                    background: "rgba(77,184,255,0.08)",
                    border: "1px solid rgba(77,184,255,0.18)",
                    borderRadius: 100,
                    fontSize: 12.5, fontWeight: 500,
                    color: "var(--ps-text-primary)",
                    marginBottom: 24,
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: "var(--ps-cyan)",
                      display: "inline-block", position: "relative", flexShrink: 0,
                    }}>
                      <span style={{
                        position: "absolute", inset: -4, borderRadius: "50%",
                        background: "var(--ps-cyan)", opacity: 0.5,
                        animation: "ps-pulse 1.8s cubic-bezier(0.16,1,0.3,1) infinite",
                      }} />
                    </span>
                    Plataforma de ventas para concesionarias
                  </div>

                  {/* H1 */}
                  <h1
                    className="ps-hero-h1"
                    style={{
                      fontSize: 64, fontWeight: 800, lineHeight: 1.04,
                      letterSpacing: "-0.03em",
                      margin: "0 0 24px",
                      color: "var(--ps-text-primary)",
                    }}
                  >
                    Vendé más vehículos.{" "}
                    <span style={{
                      background: "linear-gradient(135deg, #4DB8FF 0%, #1E5FD4 100%)",
                      WebkitBackgroundClip: "text", backgroundClip: "text",
                      WebkitTextFillColor: "transparent", color: "transparent",
                    }}>
                      Con inteligencia de mercado.
                    </span>
                  </h1>

                  {/* Subtitle */}
                  <p style={{
                    fontSize: 18, lineHeight: 1.6,
                    color: "var(--ps-text-secondary)",
                    maxWidth: 520, margin: "0 0 36px",
                  }}>
                    ProSell centraliza tu inventario, automatiza la publicación en Facebook Marketplace,
                    captura leads y te da visibilidad real sobre tu pipeline — todo desde una sola plataforma.
                  </p>

                  {/* CTAs */}
                  <div className="ps-cta-row" style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 40 }}>
                    <Link href="/auth/register" className="ps-btn-primary" style={{ padding: "13px 24px", fontSize: 15 }}>
                      Comenzar gratis
                    </Link>
                    <Link href="/auth/login" className="ps-btn-ghost" style={{ padding: "13px 24px", fontSize: 15 }}>
                      Ver demo
                    </Link>
                  </div>

                  {/* Social proof */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ display: "flex" }}>
                      {[
                        { i: "MR", bg: "linear-gradient(135deg,#4DB8FF,#1E5FD4)" },
                        { i: "LC", bg: "linear-gradient(135deg,#22D3A0,#0D9B74)" },
                        { i: "SA", bg: "linear-gradient(135deg,#F5A623,#E88C00)" },
                        { i: "PG", bg: "linear-gradient(135deg,#4DB8FF,#7DCEFF)" },
                        { i: "AR", bg: "linear-gradient(135deg,#1E5FD4,#4DB8FF)" },
                      ].map(({ i, bg }, idx) => (
                        <div key={i} style={{
                          width: 34, height: 34, borderRadius: "50%",
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          fontWeight: 600, fontSize: 11, color: "#060D24",
                          border: "2px solid var(--ps-bg-base)",
                          marginLeft: idx === 0 ? 0 : -8,
                          background: bg,
                          flexShrink: 0,
                        }}>{i}</div>
                      ))}
                    </div>
                    <div>
                      <div style={{ display: "flex", gap: 2, marginBottom: 4 }}>
                        {[0, 1, 2, 3, 4].map((s) => (
                          <svg key={s} style={{ width: 12, height: 12, color: "#F5A623" }} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        ))}
                      </div>
                      <p style={{ fontSize: 13, color: "var(--ps-text-secondary)", margin: 0 }}>
                        <strong style={{ color: "var(--ps-text-primary)", fontWeight: 600 }}>+120 concesionarias</strong>
                        {" "}ya gestionan su pipeline con ProSell
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── RIGHT: dashboard mockup ── */}
                <div className="ps-mockup-col" style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 600 }}>
                  {/* Glow */}
                  <div aria-hidden="true" style={{
                    position: "absolute", inset: "-20%",
                    background: "radial-gradient(ellipse at center, rgba(77,184,255,0.18) 0%, rgba(30,95,212,0.12) 30%, transparent 60%)",
                    filter: "blur(40px)",
                    pointerEvents: "none",
                  }} />

                  {/* Main dashboard card */}
                  <div style={{
                    position: "relative",
                    width: "100%", maxWidth: 520,
                    background: "rgba(13,27,62,0.75)",
                    border: "1px solid rgba(77,184,255,0.18)",
                    borderRadius: 20,
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                    boxShadow: "0 32px 80px rgba(6,13,36,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
                    padding: 22,
                    animation: "ps-float 6s ease-in-out infinite",
                  }}>
                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>Pipeline activo</span>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "3px 10px", borderRadius: 100,
                        background: "rgba(34,211,160,0.12)", color: "var(--ps-success)",
                        fontSize: 11, fontWeight: 600,
                      }}>
                        <span style={{ position: "relative", width: 6, height: 6, display: "inline-block" }}>
                          <span style={{
                            position: "absolute", inset: 0, borderRadius: "50%",
                            background: "var(--ps-success)",
                          }} />
                          <span style={{
                            position: "absolute", inset: -2, borderRadius: "50%",
                            background: "var(--ps-success)", opacity: 0.4,
                            animation: "ps-pulse 1.8s cubic-bezier(0.16,1,0.3,1) infinite",
                          }} />
                        </span>
                        En vivo
                      </span>
                    </div>

                    {/* Metrics */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 20 }}>
                      {[
                        { label: "Stock activo", value: "48", delta: "+6 este mes" },
                        { label: "Leads activos", value: "127", delta: "+18 esta semana" },
                        { label: "Tasa de cierre", value: "64%", delta: "+5% vs mes ant." },
                      ].map((m) => (
                        <div key={m.label} style={{
                          background: "rgba(6,13,36,0.5)",
                          border: "1px solid rgba(77,184,255,0.08)",
                          borderRadius: 8, padding: "12px 14px",
                        }}>
                          <div style={{ fontSize: 10.5, color: "var(--ps-text-secondary)", marginBottom: 4, letterSpacing: "0.04em" }}>{m.label}</div>
                          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{m.value}</div>
                          <div style={{ fontSize: 10.5, color: "var(--ps-success)", fontWeight: 600, marginTop: 3 }}>{m.delta}</div>
                        </div>
                      ))}
                    </div>

                    {/* Bar chart */}
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ps-text-secondary)", letterSpacing: "0.04em" }}>LEADS / SEMANA</span>
                        <span style={{ fontSize: 10.5, color: "var(--ps-text-disabled)" }}>últimas 8 semanas</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 64, padding: "0 2px" }}>
                        {[35, 52, 41, 68, 73, 59, 81, 94].map((h, idx) => {
                          const isActive = idx === 7;
                          return (
                            <div key={idx} style={{
                              flex: 1, borderRadius: "3px 3px 0 0",
                              height: `${h}%`,
                              background: isActive
                                ? "linear-gradient(to top, #4DB8FF, #7DCEFF)"
                                : "rgba(77,184,255,0.15)",
                              boxShadow: isActive ? "0 0 18px rgba(77,184,255,0.45)" : "none",
                              position: "relative",
                            }}>
                              {isActive && (
                                <div style={{
                                  position: "absolute", top: -5, left: "50%", transform: "translateX(-50%)",
                                  width: 6, height: 6, borderRadius: "50%",
                                  background: "#7DCEFF", boxShadow: "0 0 8px #7DCEFF",
                                }} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Deal list */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "rgba(77,184,255,0.06)", borderRadius: 8, overflow: "hidden" }}>
                      {[
                        { av: "MR", name: "Toyota Corolla 2023", amount: "$28.500", stage: "Negociación", stageColor: "#F5A623", stageBg: "rgba(245,166,35,0.14)", avBg: "linear-gradient(135deg,#4DB8FF,#1E5FD4)" },
                        { av: "LC", name: "Ford Ranger 2022",    amount: "$34.200", stage: "Demo",        stageColor: "var(--ps-cyan)",    stageBg: "rgba(77,184,255,0.14)",  avBg: "linear-gradient(135deg,#22D3A0,#0D9B74)" },
                        { av: "SA", name: "VW Tiguan 2024",      amount: "$52.000", stage: "Cierre",      stageColor: "var(--ps-success)", stageBg: "rgba(34,211,160,0.14)", avBg: "linear-gradient(135deg,#F5A623,#E88C00)" },
                      ].map((deal) => (
                        <div key={deal.name} style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "11px 14px", background: "rgba(6,13,36,0.5)",
                        }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 700, color: "#060D24",
                            background: deal.avBg,
                          }}>{deal.av}</div>
                          <span style={{
                            flex: 1, fontSize: 13, fontWeight: 500,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>{deal.name}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{deal.amount}</span>
                          <span style={{
                            fontSize: 10.5, fontWeight: 600, padding: "3px 9px", borderRadius: 100,
                            color: deal.stageColor, background: deal.stageBg,
                            letterSpacing: "0.02em", flexShrink: 0,
                          }}>{deal.stage}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Floating badge — top left */}
                  <div className="ps-float-badge" style={{
                    position: "absolute", top: -28, left: -56,
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "9px 14px",
                    background: "rgba(13,27,62,0.92)",
                    border: "1px solid rgba(77,184,255,0.25)",
                    borderRadius: 8,
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    boxShadow: "0 16px 48px rgba(6,13,36,0.55)",
                    fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap", zIndex: 2,
                    animation: "ps-float-badge-1 7s ease-in-out infinite",
                  }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(34,211,160,0.15)", color: "var(--ps-success)",
                    }}>
                      <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div>
                      <b style={{ display: "block", fontWeight: 600, fontSize: 12.5 }}>+1 lead nuevo</b>
                      <span style={{ fontSize: 10.5, color: "var(--ps-text-secondary)" }}>Facebook Marketplace · hace 2 min</span>
                    </div>
                  </div>

                  {/* Floating badge — bottom right */}
                  <div className="ps-float-badge" style={{
                    position: "absolute", bottom: -28, right: -56,
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "9px 14px",
                    background: "rgba(13,27,62,0.92)",
                    border: "1px solid rgba(77,184,255,0.25)",
                    borderRadius: 8,
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    boxShadow: "0 16px 48px rgba(6,13,36,0.55)",
                    fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap", zIndex: 2,
                    animation: "ps-float-badge-2 7s ease-in-out infinite",
                  }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(77,184,255,0.15)", color: "var(--ps-cyan)",
                    }}>
                      <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </div>
                    <div>
                      <b style={{ display: "block", fontWeight: 600, fontSize: 12.5 }}>Publicado en Marketplace</b>
                      <span style={{ fontSize: 10.5, color: "var(--ps-text-secondary)" }}>VW Tiguan 2024 · hace 5 min</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ──────────── SOCIAL PROOF STRIP ──────────── */}
            <div style={{
              borderTop: "1px solid rgba(77,184,255,0.08)",
              padding: "36px 32px 60px",
              display: "flex", flexDirection: "column", gap: 22, alignItems: "center",
            }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ps-text-disabled)", margin: 0 }}>
                De confianza para concesionarias líderes
              </p>
              <div style={{ display: "flex", gap: 52, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
                {["AutoNorte", "CarMax AR", "Motorel", "ConcesAR", "AutoGrupo", "VehiMax"].map((name) => (
                  <span key={name} style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.16em", color: "var(--ps-text-disabled)" }}>
                    {name}
                  </span>
                ))}
              </div>
            </div>

            {/* ──────────── FEATURES GRID ──────────── */}
            <section id="funciones" style={{
              position: "relative",
              padding: "100px 32px",
              borderTop: "1px solid rgba(77,184,255,0.08)",
              overflow: "hidden",
            }}>
              <div aria-hidden="true" style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: [
                  "radial-gradient(ellipse 50% 35% at 20% 0%, rgba(240,67,56,0.06), transparent 60%)",
                  "radial-gradient(ellipse 50% 40% at 85% 100%, rgba(77,184,255,0.08), transparent 60%)",
                ].join(", "),
              }} />

              <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto" }}>
                {/* Section head */}
                <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 64px" }}>
                  <span style={{
                    display: "inline-block",
                    fontSize: 12, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase",
                    color: "var(--ps-cyan)", marginBottom: 18,
                  }}>
                    INTELIGENCIA COMERCIAL
                  </span>
                  <h2 style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.025em", margin: "0 0 18px" }}>
                    Todo lo que necesita{" "}
                    <span style={{
                      background: "linear-gradient(135deg,#4DB8FF 0%,#1E5FD4 100%)",
                      WebkitBackgroundClip: "text", backgroundClip: "text",
                      WebkitTextFillColor: "transparent", color: "transparent",
                    }}>
                      tu equipo de ventas
                    </span>
                  </h2>
                  <p style={{ fontSize: 17, lineHeight: 1.6, color: "var(--ps-text-secondary)", maxWidth: 560, margin: "0 auto" }}>
                    Desde el primer contacto hasta la firma. ProSell conecta cada punto del proceso comercial.
                  </p>
                </div>

                {/* Cards */}
                <div className="ps-feat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
                  {FEATURES.map((feat) => (
                    <div key={feat.title} className="ps-feat-card">
                      <div style={{
                        width: 44, height: 44, borderRadius: 12, marginBottom: 22,
                        background: "rgba(77,184,255,0.10)",
                        border: "1px solid rgba(77,184,255,0.2)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "var(--ps-cyan)",
                      }}>
                        {feat.icon}
                      </div>
                      <div style={{
                        fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase",
                        color: "var(--ps-text-disabled)", marginBottom: 10,
                      }}>
                        {feat.kicker}
                      </div>
                      <h3 style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.015em", lineHeight: 1.3, margin: "0 0 12px" }}>
                        {feat.title}
                      </h3>
                      <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ps-text-secondary)", margin: "0 0 24px", flex: 1 }}>
                        {feat.desc}
                      </p>
                      <span style={{
                        alignSelf: "flex-start",
                        display: "inline-flex", alignItems: "center", gap: 8,
                        padding: "6px 12px", borderRadius: 100,
                        border: "1px solid rgba(77,184,255,0.3)",
                        background: "rgba(77,184,255,0.06)",
                        color: "var(--ps-cyan)",
                        fontSize: 11.5, fontWeight: 600,
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--ps-cyan)", boxShadow: "0 0 6px var(--ps-cyan)" }} />
                        {feat.badge}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ──────────── CTA BANNER ──────────── */}
            <section style={{
              padding: "100px 32px",
              borderTop: "1px solid rgba(77,184,255,0.08)",
              textAlign: "center",
            }}>
              <div style={{ maxWidth: 720, margin: "0 auto" }}>
                <span style={{
                  display: "inline-block",
                  fontSize: 12, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase",
                  color: "var(--ps-cyan)", marginBottom: 18,
                }}>
                  EMPEZÁ HOY
                </span>
                <h2 style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.025em", margin: "0 0 20px" }}>
                  Tu concesionaria necesita un sistema que trabaje tan duro como vos.
                </h2>
                <p style={{ fontSize: 18, lineHeight: 1.6, color: "var(--ps-text-secondary)", margin: "0 0 40px" }}>
                  Comenzá gratis. Sin tarjeta de crédito. Onboarding en menos de 10 minutos.
                </p>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                  <Link href="/auth/register" className="ps-btn-primary" style={{ padding: "14px 28px", fontSize: 15 }}>
                    Crear cuenta gratis
                  </Link>
                  <Link href="/auth/login" className="ps-btn-ghost" style={{ padding: "14px 28px", fontSize: 15 }}>
                    Iniciar sesión
                  </Link>
                </div>
              </div>
            </section>
          </main>

          {/* ──────────────────────── FOOTER ──────────────────────── */}
          <footer style={{
            borderTop: "1px solid rgba(77,184,255,0.08)",
            padding: "32px",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              maxWidth: 1280, margin: "0 auto",
              flexWrap: "wrap", gap: 16,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Image src="/logo-mark.png" alt="ProSell" width={28} height={28} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>ProSell</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--ps-text-disabled)", margin: 0 }}>
                © {new Date().getFullYear()} ProSell SaaS. Todos los derechos reservados.
              </p>
              <div style={{ display: "flex", gap: 24 }}>
                <Link href="/privacy" className="ps-footer-link">Privacidad</Link>
                <Link href="/terms" className="ps-footer-link">Términos</Link>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}

// ──────────── DATA ────────────

const FEATURES = [
  {
    kicker: "Inventario",
    title: "Stock en tiempo real",
    desc: "Cargá tu inventario una sola vez. ProSell sincroniza el estado de cada vehículo automáticamente — disponible, reservado, vendido.",
    badge: "Actualización instantánea",
    icon: (
      <svg style={{ width: 22, height: 22 }} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
  {
    kicker: "Publicación",
    title: "Facebook Marketplace automático",
    desc: "Publicá cualquier vehículo en Facebook Marketplace con un click. Imágenes, precio y descripción optimizados para conversión.",
    badge: "Multi-cuenta",
    icon: (
      <svg style={{ width: 22, height: 22 }} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    kicker: "Leads",
    title: "Captura y gestión de leads",
    desc: "Todos los leads en un solo lugar. Asignación automática, historial completo y deduplicación inteligente para evitar contactos repetidos.",
    badge: "Dedup automático",
    icon: (
      <svg style={{ width: 22, height: 22 }} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    kicker: "Pipeline",
    title: "Kanban de ventas",
    desc: "Mové oportunidades por las etapas del proceso con drag & drop. Visibilidad completa del pipeline para todo el equipo.",
    badge: "Drag & drop",
    icon: (
      <svg style={{ width: 22, height: 22 }} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <rect x="3" y="3" width="4" height="18" rx="1" /><rect x="10" y="3" width="4" height="14" rx="1" /><rect x="17" y="3" width="4" height="10" rx="1" />
      </svg>
    ),
  },
  {
    kicker: "Citas",
    title: "Agenda integrada",
    desc: "Los clientes reservan horarios online. El vendedor recibe la notificación y confirma en segundos. Sin llamadas innecesarias.",
    badge: "Self-service",
    icon: (
      <svg style={{ width: 22, height: 22 }} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    kicker: "Analytics",
    title: "Inteligencia de mercado",
    desc: "Dashboards con métricas de stock, conversión por fuente, tiempo en etapa y proyección de cierre. Decisiones basadas en datos reales.",
    badge: "Real-time",
    icon: (
      <svg style={{ width: 22, height: 22 }} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
] as const;
