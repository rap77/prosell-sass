/**
 * Landing page — ProSell SaaS.
 *
 * Server Component — no auth state needed.
 * All colors via var(--ps-*) tokens. CSS keyframes + hover states via embedded <style>.
 *
 * Sections:
 * 1. Nav
 * 2. Hero (two-column: copy + dashboard mockup)
 * 3. Proof strip
 * 4. Problem → Solution (pain stats + solution cards + niche switcher)
 * 5. Features alternating rows (Distribución / Leads / Inteligencia)
 * 6. CTA banner
 * 7. Footer
 */

import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <>
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

        /* Nav */
        .ps-nav-link {
          font-size: 14px; font-weight: 500;
          color: var(--ps-text-secondary); text-decoration: none;
          transition: color 200ms cubic-bezier(0.16,1,0.3,1);
        }
        .ps-nav-link:hover { color: var(--ps-text-primary); }

        /* Buttons */
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
          transition: border-color 200ms cubic-bezier(0.16,1,0.3,1);
        }
        .ps-btn-ghost:hover { border-color: var(--ps-cyan); }

        /* Solution + Feature cards */
        .ps-sol-card {
          background: rgba(13,27,62,0.7);
          border: 1px solid rgba(77,184,255,0.12);
          border-radius: 16px;
          backdrop-filter: blur(20px);
          padding: 28px;
          display: flex; flex-direction: column;
          transition: border-color 220ms cubic-bezier(0.16,1,0.3,1),
                      transform 220ms cubic-bezier(0.16,1,0.3,1);
        }
        .ps-sol-card:hover {
          border-color: rgba(77,184,255,0.3);
          transform: translateY(-4px);
        }

        /* Footer links */
        .ps-footer-link {
          font-size: 12px; color: var(--ps-text-disabled); text-decoration: none;
          transition: color 200ms cubic-bezier(0.16,1,0.3,1);
        }
        .ps-footer-link:hover { color: var(--ps-text-secondary); }

        /* Pricing cards */
        .ps-pr-card {
          position: relative;
          background: rgba(13,27,62,0.7);
          border: 1px solid rgba(77,184,255,0.10);
          border-radius: 18px;
          backdrop-filter: blur(20px);
          padding: 32px 28px;
          display: flex; flex-direction: column;
          transition: border-color 220ms cubic-bezier(0.16,1,0.3,1);
        }
        .ps-pr-card:hover { border-color: rgba(77,184,255,0.25); }
        .ps-pr-card-featured {
          background: rgba(13,27,62,0.95);
          border-color: rgba(77,184,255,0.4) !important;
          box-shadow: 0 0 60px rgba(77,184,255,0.12), inset 0 1px 0 rgba(255,255,255,0.04);
          transform: translateY(-6px);
        }

        /* How it works steps */
        .ps-hw-step {
          position: relative;
          background: rgba(13,27,62,0.5);
          border: 1px solid rgba(77,184,255,0.10);
          border-radius: 16px;
          padding: 44px 28px 32px;
          transition: border-color 220ms cubic-bezier(0.16,1,0.3,1);
        }
        .ps-hw-step:hover { border-color: rgba(77,184,255,0.25); }

        /* Testimonial cards */
        .ps-tm-card {
          background: rgba(13,27,62,0.7);
          border: 1px solid rgba(77,184,255,0.10);
          border-radius: 16px;
          backdrop-filter: blur(20px);
          padding: 28px;
          display: flex; flex-direction: column;
          transition: border-color 220ms cubic-bezier(0.16,1,0.3,1),
                      transform 220ms cubic-bezier(0.16,1,0.3,1);
        }
        .ps-tm-card:hover {
          border-color: rgba(77,184,255,0.25);
          transform: translateY(-3px);
        }

        /* FAQ */
        .ps-faq-item { border-bottom: 1px solid rgba(77,184,255,0.08); }
        .ps-faq-q {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 0; cursor: pointer; list-style: none;
          font-size: 15.5px; font-weight: 600; color: var(--ps-text-primary);
          gap: 16px;
        }
        .ps-faq-q::-webkit-details-marker { display: none; }
        .ps-faq-toggle {
          flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%;
          background: rgba(77,184,255,0.08); border: 1px solid rgba(77,184,255,0.2);
          color: var(--ps-cyan);
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 18px; font-weight: 300; line-height: 1;
          transition: transform 200ms cubic-bezier(0.16,1,0.3,1), background 200ms;
        }
        .ps-faq-item[open] .ps-faq-toggle {
          transform: rotate(45deg);
          background: rgba(77,184,255,0.15);
        }
        .ps-faq-a {
          padding: 0 48px 20px 0;
          font-size: 14.5px; line-height: 1.7;
          color: var(--ps-text-secondary);
        }

        /* Responsive */
        @media (max-width: 1100px) {
          .ps-hero       { grid-template-columns: 1fr !important; gap: 60px !important; }
          .ps-hero-h1    { font-size: 44px !important; }
          .ps-nav-links  { display: none !important; }
          .ps-mockup-col { min-height: 400px !important; }
          .ps-float-badge { display: none !important; }
          .ps-ft-row     { grid-template-columns: 1fr !important; gap: 48px !important; }
          .ps-sol-grid   { grid-template-columns: 1fr !important; }
          .ps-ft-h2      { font-size: 36px !important; }
          .ps-ft-h3      { font-size: 26px !important; }
          .ps-ft-row.reverse .ps-ft-text { order: 1 !important; }
          .ps-ft-row.reverse .ps-ft-mock { order: 2 !important; }
        }
        @media (max-width: 700px) {
          .ps-hero-h1  { font-size: 32px !important; }
          .ps-cta-row  { flex-direction: column !important; align-items: stretch !important; }
          .ps-cta-row a { text-align: center; }
          .ps-pain-row { flex-direction: column !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "var(--ps-bg-base)", color: "var(--ps-text-primary)", overflowX: "hidden" }}>

        {/* Background decoration */}
        <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(77,184,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(77,184,255,0.04) 1px, transparent 1px)", backgroundSize: "56px 56px", maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)", WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)" }} />
        <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", background: "radial-gradient(ellipse 60% 50% at 80% 20%, rgba(30,95,212,0.35), transparent 60%)" }} />
        <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", background: "radial-gradient(ellipse 50% 40% at 10% 80%, rgba(13,27,110,0.4), transparent 60%)" }} />

        <div style={{ position: "relative", zIndex: 1 }}>

          {/* ══════════════ NAV ══════════════ */}
          <header style={{ position: "sticky", top: 0, zIndex: 50, height: 72, display: "flex", alignItems: "center", background: "rgba(6,13,36,0.72)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid rgba(77,184,255,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 40, width: "100%", maxWidth: 1280, margin: "0 auto", padding: "0 32px" }}>
              <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
                <Image src="/logo-mark.png" alt="ProSell" width={271} height={294} style={{ height: 34, width: "auto", flexShrink: 0 }} />
                <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ps-text-primary)" }}>ProSell</span>
              </Link>
              <nav className="ps-nav-links" style={{ display: "flex", gap: 32, flex: 1, justifyContent: "center" }}>
                {["Producto", "Soluciones", "Precios", "Blog"].map((l) => (
                  <a key={l} href="#" className="ps-nav-link">{l}</a>
                ))}
              </nav>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginLeft: "auto" }}>
                <Link href="/auth/login" className="ps-btn-ghost" style={{ padding: "9px 16px", fontSize: 13 }}>Iniciar sesión</Link>
                <Link href="/auth/register" className="ps-btn-primary" style={{ padding: "9px 16px", fontSize: 13 }}>Empezar gratis</Link>
              </div>
            </div>
          </header>

          <main>
            {/* ══════════════ HERO ══════════════ */}
            <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px" }}>
              <div className="ps-hero" style={{ display: "grid", gridTemplateColumns: "1.05fr 1fr", gap: 80, alignItems: "center", minHeight: "calc(100vh - 72px)", padding: "60px 0 100px" }}>

                {/* Copy */}
                <div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px 6px 12px", background: "rgba(77,184,255,0.08)", border: "1px solid rgba(77,184,255,0.18)", borderRadius: 100, fontSize: 12.5, fontWeight: 500, marginBottom: 24 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--ps-cyan)", display: "inline-block", position: "relative", flexShrink: 0 }}>
                      <span style={{ position: "absolute", inset: -4, borderRadius: "50%", background: "var(--ps-cyan)", opacity: 0.5, animation: "ps-pulse 1.8s cubic-bezier(0.16,1,0.3,1) infinite" }} />
                    </span>
                    Inteligencia comercial en tiempo real
                  </div>

                  <h1 className="ps-hero-h1" style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.04, letterSpacing: "-0.03em", margin: "0 0 24px" }}>
                    Tu equipo de ventas,{" "}
                    <span style={{ background: "linear-gradient(135deg, #4DB8FF 0%, #1E5FD4 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>
                      sin fricción.
                    </span>
                  </h1>

                  <p style={{ fontSize: 18, lineHeight: 1.6, color: "var(--ps-text-secondary)", maxWidth: 520, margin: "0 0 36px" }}>
                    ProSell unifica tu pipeline, automatiza la publicación en múltiples canales y te da visibilidad total sobre cada deal. Cerrá más, trabajá menos, escalá sin límites.
                  </p>

                  <div className="ps-cta-row" style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 40 }}>
                    <Link href="/auth/register" className="ps-btn-primary" style={{ padding: "13px 24px", fontSize: 15 }}>Empezar gratis</Link>
                    <Link href="/auth/login" className="ps-btn-ghost" style={{ padding: "13px 24px", fontSize: 15 }}>Ver demo</Link>
                  </div>

                  {/* Social proof */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ display: "flex" }}>
                      {[
                        { i: "MR", bg: "linear-gradient(135deg,#4DB8FF,#1E5FD4)" },
                        { i: "JC", bg: "linear-gradient(135deg,#22D3A0,#1E5FD4)" },
                        { i: "AL", bg: "linear-gradient(135deg,#7DCEFF,#4DB8FF)" },
                        { i: "SP", bg: "linear-gradient(135deg,#F5A623,#F04438)" },
                      ].map(({ i, bg }, idx) => (
                        <div key={i} style={{ width: 34, height: 34, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 11, color: "#060D24", border: "2px solid var(--ps-bg-base)", marginLeft: idx === 0 ? 0 : -8, background: bg, flexShrink: 0 }}>{i}</div>
                      ))}
                    </div>
                    <div>
                      <div style={{ display: "flex", gap: 2, marginBottom: 4 }}>
                        {[0,1,2,3,4].map((s) => (
                          <svg key={s} style={{ width: 12, height: 12, color: "#F5A623" }} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                        ))}
                      </div>
                      <p style={{ fontSize: 13, color: "var(--ps-text-secondary)", margin: 0 }}>
                        <strong style={{ color: "var(--ps-text-primary)", fontWeight: 600 }}>2.400 equipos</strong>{" "}ya cerraron más este mes
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dashboard mockup */}
                <div className="ps-mockup-col" style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 600 }}>
                  <div aria-hidden="true" style={{ position: "absolute", inset: "-20%", background: "radial-gradient(ellipse at center, rgba(77,184,255,0.18) 0%, rgba(30,95,212,0.12) 30%, transparent 60%)", filter: "blur(40px)", pointerEvents: "none" }} />

                  <div style={{ position: "relative", width: "100%", maxWidth: 520, background: "rgba(13,27,62,0.75)", border: "1px solid rgba(77,184,255,0.18)", borderRadius: 20, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", boxShadow: "0 32px 80px rgba(6,13,36,0.6), inset 0 1px 0 rgba(255,255,255,0.06)", padding: 22, animation: "ps-float 6s ease-in-out infinite" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>Pipeline Q2 2026</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 100, background: "rgba(34,211,160,0.12)", color: "var(--ps-success)", fontSize: 11, fontWeight: 600 }}>
                        <span style={{ position: "relative", width: 6, height: 6, display: "inline-block" }}>
                          <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--ps-success)" }} />
                          <span style={{ position: "absolute", inset: -2, borderRadius: "50%", background: "var(--ps-success)", opacity: 0.4, animation: "ps-pulse 1.8s cubic-bezier(0.16,1,0.3,1) infinite" }} />
                        </span>
                        En vivo
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 20 }}>
                      {[
                        { label: "Revenue", value: "$284K", delta: "+12.4%" },
                        { label: "Deals abiertos", value: "47", delta: "en proceso" },
                        { label: "Win rate", value: "68%", delta: "+5.2%" },
                      ].map((m) => (
                        <div key={m.label} style={{ background: "rgba(6,13,36,0.5)", border: "1px solid rgba(77,184,255,0.08)", borderRadius: 8, padding: "12px 14px" }}>
                          <div style={{ fontSize: 10.5, color: "var(--ps-text-secondary)", marginBottom: 4, letterSpacing: "0.04em" }}>{m.label}</div>
                          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{m.value}</div>
                          <div style={{ fontSize: 10.5, color: "var(--ps-success)", fontWeight: 600, marginTop: 3 }}>{m.delta}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginBottom: 18 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ps-text-secondary)", letterSpacing: "0.04em" }}>DEALS CERRADOS / SEMANA</span>
                        <span style={{ fontSize: 10.5, color: "var(--ps-text-disabled)" }}>S1 — S8</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 64, padding: "0 2px" }}>
                        {[38, 52, 44, 64, 58, 72, 80, 96].map((h, idx) => {
                          const active = idx === 7;
                          return (
                            <div key={idx} style={{ flex: 1, borderRadius: "3px 3px 0 0", height: `${h}%`, background: active ? "linear-gradient(to top, #4DB8FF, #7DCEFF)" : "rgba(77,184,255,0.15)", boxShadow: active ? "0 0 18px rgba(77,184,255,0.45)" : "none", position: "relative" }}>
                              {active && <div style={{ position: "absolute", top: -5, left: "50%", transform: "translateX(-50%)", width: 6, height: 6, borderRadius: "50%", background: "#7DCEFF", boxShadow: "0 0 8px #7DCEFF" }} />}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "rgba(77,184,255,0.06)", borderRadius: 8, overflow: "hidden" }}>
                      {[
                        { av: "A", name: "Acme Tech",       amount: "$48K", stage: "Cierre",    sc: "var(--ps-success)", sb: "rgba(34,211,160,0.14)", bg: "linear-gradient(135deg,#4DB8FF,#1E5FD4)" },
                        { av: "N", name: "Northwind Labs",  amount: "$32K", stage: "Demo",      sc: "var(--ps-cyan)",    sb: "rgba(77,184,255,0.14)",  bg: "linear-gradient(135deg,#22D3A0,#1E5FD4)" },
                        { av: "G", name: "Globex SA",       amount: "$76K", stage: "Propuesta", sc: "#F5A623",           sb: "rgba(245,166,35,0.14)",  bg: "linear-gradient(135deg,#F5A623,#F04438)" },
                      ].map((d) => (
                        <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", background: "rgba(6,13,36,0.5)" }}>
                          <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#060D24", background: d.bg }}>{d.av}</div>
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{d.amount}</span>
                          <span style={{ fontSize: 10.5, fontWeight: 600, padding: "3px 9px", borderRadius: 100, color: d.sc, background: d.sb, flexShrink: 0 }}>{d.stage}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Floating badge top */}
                  <div className="ps-float-badge" style={{ position: "absolute", top: -28, left: -56, display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 14px", background: "rgba(13,27,62,0.92)", border: "1px solid rgba(77,184,255,0.25)", borderRadius: 8, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", boxShadow: "0 16px 48px rgba(6,13,36,0.55)", fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap", zIndex: 2, animation: "ps-float-badge-1 7s ease-in-out infinite" }}>
                    <div style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(34,211,160,0.15)", color: "var(--ps-success)" }}>
                      <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
                    </div>
                    <div>
                      <b style={{ display: "block", fontWeight: 600, fontSize: 12.5 }}>Conversión este mes</b>
                      <span style={{ fontSize: 10.5, color: "var(--ps-text-secondary)" }}>+34% vs anterior</span>
                    </div>
                  </div>

                  {/* Floating badge bottom */}
                  <div className="ps-float-badge" style={{ position: "absolute", bottom: -28, right: -56, display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 14px", background: "rgba(13,27,62,0.92)", border: "1px solid rgba(77,184,255,0.25)", borderRadius: 8, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", boxShadow: "0 16px 48px rgba(6,13,36,0.55)", fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap", zIndex: 2, animation: "ps-float-badge-2 7s ease-in-out infinite" }}>
                    <div style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(77,184,255,0.15)", color: "var(--ps-cyan)" }}>
                      <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                    </div>
                    <div>
                      <b style={{ display: "block", fontWeight: 600, fontSize: 12.5 }}>Deal cerrado · $48K</b>
                      <span style={{ fontSize: 10.5, color: "var(--ps-text-secondary)" }}>Acme Tech</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ══════════════ PROOF STRIP ══════════════ */}
            <div style={{ borderTop: "1px solid rgba(77,184,255,0.08)", padding: "36px 32px 60px", display: "flex", flexDirection: "column", gap: 22, alignItems: "center" }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ps-text-disabled)", margin: 0 }}>Confiado por equipos que escalan</p>
              <div style={{ display: "flex", gap: 52, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
                {["MERIDIAN", "STACKFLOW", "NOVA GROUP", "AXION", "VELTRIX"].map((n) => (
                  <span key={n} style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.18em", color: "var(--ps-text-disabled)" }}>{n}</span>
                ))}
              </div>
            </div>

            {/* ══════════════ PROBLEM → SOLUTION ══════════════ */}
            <section style={{ position: "relative", padding: "100px 32px", borderTop: "1px solid rgba(77,184,255,0.08)", overflow: "hidden" }}>
              <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 50% 35% at 20% 0%, rgba(240,67,56,0.08), transparent 60%), radial-gradient(ellipse 50% 40% at 85% 100%, rgba(77,184,255,0.10), transparent 60%)" }} />

              <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto" }}>

                {/* Part A: Problem */}
                <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
                  <span style={{ display: "inline-block", fontSize: 12, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "#F04438", marginBottom: 18 }}>El problema</span>
                  <h2 style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.025em", margin: "0 0 22px" }}>
                    Publicás en mil lados.<br />
                    <span style={{ background: "linear-gradient(135deg, #F04438 0%, #F5A623 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>
                      Cerrás en ninguno.
                    </span>
                  </h2>
                  <p style={{ fontSize: 18, lineHeight: 1.6, color: "var(--ps-text-secondary)", maxWidth: 600, margin: "0 auto 40px" }}>
                    Vender hoy significa estar en múltiples canales a la vez, responder antes que tu competencia y saber exactamente qué funciona. Sin un sistema que unifique todo eso, el presupuesto se va y los leads no vuelven.
                  </p>

                  {/* Pain chips */}
                  <div className="ps-pain-row" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                    {[
                      { num: "43%",    lbl: "de leads sin seguimiento" },
                      { num: "65–80%", lbl: "usan sistemas desconectados" },
                      { num: "+8 hs",  lbl: "tiempo promedio de respuesta" },
                    ].map((c) => (
                      <div key={c.num} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(240,67,56,0.08)", border: "1px solid rgba(240,67,56,0.2)", borderRadius: 10, padding: "16px 20px" }}>
                        <span style={{ fontSize: 24, fontWeight: 700, color: "#F04438", letterSpacing: "-0.02em" }}>{c.num}</span>
                        <span style={{ fontSize: 12, color: "var(--ps-text-secondary)", lineHeight: 1.35, textAlign: "left", maxWidth: 140 }}>{c.lbl}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", margin: "80px 0" }}>
                  <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(77,184,255,0.2), transparent)", maxWidth: 220 }} />
                  <div style={{ width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(77,184,255,0.10)", border: "1px solid rgba(77,184,255,0.25)", color: "var(--ps-cyan)", margin: "0 16px" }}>
                    <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>
                  </div>
                  <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(77,184,255,0.2), transparent)", maxWidth: 220 }} />
                </div>

                {/* Part B: Solution */}
                <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 56px" }}>
                  <span style={{ display: "inline-block", fontSize: 12, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ps-cyan)", marginBottom: 18 }}>La solución</span>
                  <h2 style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.12, letterSpacing: "-0.022em", margin: "0 0 18px" }}>
                    Un sistema. Cualquier nicho.<br />
                    <span style={{ background: "linear-gradient(135deg, #4DB8FF 0%, #1E5FD4 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>
                      Todo el pipeline.
                    </span>
                  </h2>
                  <p style={{ fontSize: 16, lineHeight: 1.6, color: "var(--ps-text-secondary)", maxWidth: 560, margin: "0 auto" }}>
                    Vehículos, inmuebles, productos — ProSell se adapta a lo que vendés. Vos traés el stock, nosotros ponemos la infraestructura de distribución, inteligencia y cierre.
                  </p>
                </div>

                {/* Solution cards (3) */}
                <div className="ps-sol-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
                  {[
                    {
                      icon: <svg style={{ width: 22, height: 22 }} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>,
                      kicker: "Distribución automática",
                      title: "Publicá en todos los canales a la vez",
                      desc: "Un producto cargado una vez. Distribuido automáticamente en todos los portales y redes relevantes para tu nicho.",
                      badge: "< 2 min · time-to-publish",
                    },
                    {
                      icon: <svg style={{ width: 22, height: 22 }} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
                      kicker: "Leads centralizados",
                      title: "Todos tus leads, un solo lugar",
                      desc: "Sin importar de dónde vienen — inbox unificado, respuesta inmediata, sin leads cayéndose por las grietas.",
                      badge: "< 60s · response time",
                    },
                    {
                      icon: <svg style={{ width: 22, height: 22 }} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>,
                      kicker: "Inteligencia de cierre",
                      title: "Sabé exactamente qué cierra",
                      desc: "Qué canal trae mejores leads, qué precio mueve el stock, qué vendedor necesita soporte. Todo visible, todo accionable.",
                      badge: "ROI visible · por canal",
                    },
                  ].map((c) => (
                    <div key={c.title} className="ps-sol-card">
                      <div style={{ width: 44, height: 44, borderRadius: 12, marginBottom: 22, background: "rgba(77,184,255,0.10)", border: "1px solid rgba(77,184,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ps-cyan)" }}>{c.icon}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ps-text-disabled)", marginBottom: 10 }}>{c.kicker}</div>
                      <h3 style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.015em", lineHeight: 1.3, margin: "0 0 12px" }}>{c.title}</h3>
                      <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ps-text-secondary)", margin: "0 0 24px", flex: 1 }}>{c.desc}</p>
                      <span style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 100, border: "1px solid rgba(77,184,255,0.3)", background: "rgba(77,184,255,0.06)", color: "var(--ps-cyan)", fontSize: 11.5, fontWeight: 600 }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--ps-cyan)", boxShadow: "0 0 6px var(--ps-cyan)" }} />
                        {c.badge}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Niche switcher */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap", marginTop: 48 }}>
                  <span style={{ fontSize: 13, color: "var(--ps-text-secondary)", marginRight: 4 }}>Disponible para:</span>
                  {[
                    { label: "Vehículos", ico: "🚗", active: true },
                    { label: "Inmuebles", ico: "🏠", active: false },
                    { label: "Productos", ico: "📦", active: false },
                  ].map((p) => (
                    <span key={p.label} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 100, fontSize: 13, fontWeight: 500, border: p.active ? "1px solid var(--ps-cyan)" : "1px solid rgba(77,184,255,0.12)", color: p.active ? "var(--ps-cyan)" : "var(--ps-text-secondary)", background: p.active ? "rgba(77,184,255,0.06)" : "transparent" }}>
                      <span style={{ fontSize: 14, lineHeight: 1 }}>{p.ico}</span>
                      {p.label}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            {/* ══════════════ FEATURES ALTERNATING ROWS ══════════════ */}
            <section style={{ position: "relative", padding: "120px 32px", borderTop: "1px solid rgba(77,184,255,0.08)", overflow: "hidden" }}>
              <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 40% 30% at 10% 30%, rgba(77,184,255,0.06), transparent 60%), radial-gradient(ellipse 40% 30% at 90% 70%, rgba(30,95,212,0.10), transparent 60%)" }} />

              <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto" }}>
                {/* Head */}
                <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 96px" }}>
                  <span style={{ display: "inline-block", fontSize: 12, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ps-cyan)", marginBottom: 18 }}>Funcionalidades</span>
                  <h2 className="ps-ft-h2" style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.025em", margin: "0 0 18px" }}>Todo lo que necesitás para vender más</h2>
                  <p style={{ fontSize: 17, lineHeight: 1.6, color: "var(--ps-text-secondary)", maxWidth: 600, margin: "0 auto" }}>
                    Sin apps extras. Sin integraciones complicadas. Todo dentro de ProSell desde el día uno.
                  </p>
                </div>

                {/* Row 1: Distribución */}
                <div className="ps-ft-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center", marginBottom: 100 }}>
                  <div className="ps-ft-text" style={{ maxWidth: 520 }}>
                    <span style={{ display: "inline-block", padding: "5px 12px", borderRadius: 100, background: "rgba(77,184,255,0.10)", border: "1px solid rgba(77,184,255,0.25)", color: "var(--ps-cyan)", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 20 }}>Distribución</span>
                    <h3 className="ps-ft-h3" style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.022em", margin: "0 0 18px" }}>Publicá en todos los canales en 2 minutos</h3>
                    <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ps-text-secondary)", margin: "0 0 24px" }}>
                      Cargás el producto una sola vez y ProSell lo distribuye automáticamente a todos los portales y redes activas para tu nicho. Sin copiar, sin pegar, sin errores.
                    </p>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                      {["Facebook Marketplace, AutoTrader, Cars.com y más", "Fotos, precio y descripción sincronizados automáticamente", "Alertas si algún canal falla en la publicación"].map((b) => (
                        <li key={b} style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: 14.5, lineHeight: 1.5 }}>
                          <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", background: "rgba(77,184,255,0.12)", border: "1px solid rgba(77,184,255,0.3)", color: "var(--ps-cyan)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                            <svg style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                          </span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="ps-ft-mock" style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center", minHeight: 380 }}>
                    <div style={{ position: "absolute", inset: "-10%", background: "radial-gradient(ellipse at center, rgba(77,184,255,0.12), transparent 60%)", filter: "blur(40px)", pointerEvents: "none" }} />
                    <div style={{ position: "relative", width: "100%", maxWidth: 480, background: "rgba(13,27,62,0.7)", border: "1px solid rgba(77,184,255,0.12)", borderRadius: 16, backdropFilter: "blur(20px)", boxShadow: "0 0 60px rgba(77,184,255,0.08), 0 16px 48px rgba(6,13,36,0.55)", padding: 22 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>Nueva publicación</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 100, background: "rgba(34,211,160,0.14)", color: "var(--ps-success)", fontSize: 11, fontWeight: 600 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
                          Publicando…
                        </span>
                      </div>
                      {/* Vehicle card */}
                      <div style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(6,13,36,0.5)", border: "1px solid rgba(77,184,255,0.08)", borderRadius: 12, padding: 12, marginBottom: 16 }}>
                        <div style={{ width: 78, height: 60, flexShrink: 0, borderRadius: 8, background: "linear-gradient(135deg, rgba(77,184,255,0.18), rgba(30,95,212,0.25))", border: "1px solid rgba(77,184,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ps-text-disabled)" }}>
                          <svg style={{ width: 22, height: 22 }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><rect x="2" y="9" width="20" height="11" rx="2" /><path d="M5 9V7a2 2 0 012-2h10a2 2 0 012 2v2" /><circle cx="7" cy="20" r="1" /><circle cx="17" cy="20" r="1" /></svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Toyota Corolla 2024</div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ps-cyan)", letterSpacing: "-0.01em" }}>$28.500</div>
                        </div>
                      </div>
                      {/* Channel grid */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
                        {[
                          { swatch: "#1877F2", label: "FB Marketplace", abbr: "f" },
                          { swatch: "#F5A623", label: "AutoTrader",    abbr: "AT" },
                          { swatch: "#F04438", label: "Cars.com",      abbr: "C" },
                          { swatch: "#22D3A0", label: "CarGurus",      abbr: "CG" },
                        ].map((ch) => (
                          <div key={ch.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(77,184,255,0.08)", background: "rgba(6,13,36,0.4)", fontSize: 12, fontWeight: 600 }}>
                            <span style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", background: ch.swatch }}>{ch.abbr}</span>
                            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ch.label}</span>
                            <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--ps-success)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <svg style={{ width: 11, height: 11, color: "#060D24" }} fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                            </span>
                          </div>
                        ))}
                      </div>
                      <div style={{ height: 6, borderRadius: 100, background: "rgba(77,184,255,0.10)", overflow: "hidden", marginBottom: 8 }}>
                        <div style={{ height: "100%", width: "100%", background: "linear-gradient(90deg, var(--ps-cyan), #7DCEFF)", boxShadow: "0 0 12px rgba(77,184,255,0.5)", borderRadius: 100 }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--ps-text-secondary)" }}>
                        <span style={{ color: "var(--ps-success)", fontWeight: 600 }}>4/4 canales publicados</span>
                        <span>00:01:48</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 2: Leads (reversed) */}
                <div className="ps-ft-row reverse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center", marginBottom: 100 }}>
                  <div className="ps-ft-mock" style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center", minHeight: 380 }}>
                    <div style={{ position: "absolute", inset: "-10%", background: "radial-gradient(ellipse at center, rgba(77,184,255,0.12), transparent 60%)", filter: "blur(40px)", pointerEvents: "none" }} />
                    <div style={{ position: "relative", width: "100%", maxWidth: 480, background: "rgba(13,27,62,0.7)", border: "1px solid rgba(77,184,255,0.12)", borderRadius: 16, backdropFilter: "blur(20px)", boxShadow: "0 0 60px rgba(77,184,255,0.08), 0 16px 48px rgba(6,13,36,0.55)", padding: 22 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>Leads · Hoy</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 100, background: "rgba(77,184,255,0.14)", color: "var(--ps-cyan)", fontSize: 11, fontWeight: 600 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
                          12 nuevos
                        </span>
                      </div>
                      {/* Lead rows */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "rgba(77,184,255,0.06)", borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>
                        {[
                          { av: "MR", bg: "linear-gradient(135deg,#4DB8FF,#1E5FD4)", name: "Martín Rivas",  src: "FB",      srcC: "var(--ps-cyan)",    srcBg: "rgba(77,184,255,0.15)",  time: "hace 2 min",  status: "Respondido < 60s", ok: true },
                          { av: "JC", bg: "linear-gradient(135deg,#22D3A0,#1E5FD4)", name: "Julieta Castro", src: "AT",      srcC: "#F5A623",           srcBg: "rgba(245,166,35,0.15)", time: "hace 15 min", status: "Respondido < 60s", ok: true },
                          { av: "SP", bg: "linear-gradient(135deg,#F5A623,#F04438)", name: "Sofía Paz",     src: "Directo", srcC: "var(--ps-success)", srcBg: "rgba(34,211,160,0.15)", time: "hace 1 hora", status: "Pendiente",         ok: false },
                        ].map((l) => (
                          <div key={l.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", background: "rgba(6,13,36,0.5)" }}>
                            <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#060D24", background: l.bg }}>{l.av}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                                {l.name}
                                <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 6px", borderRadius: 4, letterSpacing: "0.04em", color: l.srcC, background: l.srcBg }}>{l.src}</span>
                              </div>
                              <div style={{ fontSize: 11, color: "var(--ps-text-disabled)" }}>{l.time}</div>
                            </div>
                            <span style={{ fontSize: 10.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", color: l.ok ? "var(--ps-success)" : "#F5A623" }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
                              {l.status}
                            </span>
                          </div>
                        ))}
                      </div>
                      {/* AI input */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(6,13,36,0.6)", border: "1px solid rgba(77,184,255,0.2)", borderRadius: 12 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", padding: "2px 6px", borderRadius: 4, background: "rgba(77,184,255,0.15)", color: "var(--ps-cyan)" }}>IA</span>
                        <span style={{ flex: 1, fontSize: 13, color: "var(--ps-text-secondary)" }}>Responder con IA…</span>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--ps-cyan)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg style={{ width: 14, height: 14, color: "#060D24" }} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="ps-ft-text" style={{ maxWidth: 520 }}>
                    <span style={{ display: "inline-block", padding: "5px 12px", borderRadius: 100, background: "rgba(77,184,255,0.10)", border: "1px solid rgba(77,184,255,0.25)", color: "var(--ps-cyan)", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 20 }}>Leads</span>
                    <h3 className="ps-ft-h3" style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.022em", margin: "0 0 18px" }}>Todos tus leads, respondidos antes que tu competencia</h3>
                    <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ps-text-secondary)", margin: "0 0 24px" }}>
                      Sin importar de qué canal venga — Facebook, portal, formulario web — todos llegan al mismo inbox inteligente. Respondés en segundos, no en horas.
                    </p>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                      {["Inbox unificado multi-canal y multi-nicho", "Respuesta asistida por IA con contexto del lead", "Alertas automáticas si un lead lleva más de 60s sin respuesta"].map((b) => (
                        <li key={b} style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: 14.5, lineHeight: 1.5 }}>
                          <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", background: "rgba(77,184,255,0.12)", border: "1px solid rgba(77,184,255,0.3)", color: "var(--ps-cyan)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                            <svg style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                          </span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Row 3: Inteligencia */}
                <div className="ps-ft-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
                  <div className="ps-ft-text" style={{ maxWidth: 520 }}>
                    <span style={{ display: "inline-block", padding: "5px 12px", borderRadius: 100, background: "rgba(77,184,255,0.10)", border: "1px solid rgba(77,184,255,0.25)", color: "var(--ps-cyan)", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 20 }}>Inteligencia</span>
                    <h3 className="ps-ft-h3" style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.022em", margin: "0 0 18px" }}>Sabé exactamente qué canal cierra más</h3>
                    <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ps-text-secondary)", margin: "0 0 24px" }}>
                      ProSell rastrea cada lead desde el origen hasta el cierre. Sabés cuánto gastás por lead, qué canal convierte mejor y qué vendedor necesita soporte — todo en tiempo real.
                    </p>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                      {["Attribution completa por canal y por vendedor", "Pricing dinámico: alertas cuando el stock se mueve lento", "Dashboard de ROI: costo por lead vs revenue cerrado"].map((b) => (
                        <li key={b} style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: 14.5, lineHeight: 1.5 }}>
                          <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", background: "rgba(77,184,255,0.12)", border: "1px solid rgba(77,184,255,0.3)", color: "var(--ps-cyan)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                            <svg style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                          </span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="ps-ft-mock" style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center", minHeight: 380 }}>
                    <div style={{ position: "absolute", inset: "-10%", background: "radial-gradient(ellipse at center, rgba(77,184,255,0.12), transparent 60%)", filter: "blur(40px)", pointerEvents: "none" }} />
                    <div style={{ position: "relative", width: "100%", maxWidth: 480, background: "rgba(13,27,62,0.7)", border: "1px solid rgba(77,184,255,0.12)", borderRadius: 16, backdropFilter: "blur(20px)", boxShadow: "0 0 60px rgba(77,184,255,0.08), 0 16px 48px rgba(6,13,36,0.55)", padding: 22 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>Performance · Q2 2026</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 100, background: "rgba(77,184,255,0.14)", color: "var(--ps-cyan)", fontSize: 11, fontWeight: 600 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
                          En vivo
                        </span>
                      </div>
                      {/* Bar chart */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
                        {[
                          { label: "Facebook",   pct: 68, type: "cyan" },
                          { label: "AutoTrader", pct: 52, type: "blue" },
                          { label: "Cars.com",   pct: 38, type: "muted" },
                        ].map((r) => (
                          <div key={r.label} style={{ display: "grid", gridTemplateColumns: "90px 1fr 50px", gap: 12, alignItems: "center" }}>
                            <span style={{ fontSize: 12.5, fontWeight: 600 }}>{r.label}</span>
                            <div style={{ height: 10, borderRadius: 100, background: "rgba(77,184,255,0.08)", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${r.pct}%`, borderRadius: 100, background: r.type === "cyan" ? "linear-gradient(90deg, var(--ps-cyan), #7DCEFF)" : r.type === "blue" ? "linear-gradient(90deg, var(--ps-blue), var(--ps-cyan))" : "rgba(138,155,191,0.4)", boxShadow: r.type === "cyan" ? "0 0 12px rgba(77,184,255,0.4)" : "none" }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, textAlign: "right" }}>{r.pct}%</span>
                          </div>
                        ))}
                      </div>
                      {/* Metric chips */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                        {[
                          { v: "$148", l: "costo/lead promedio" },
                          { v: "3.2x", l: "ROI por canal" },
                        ].map((m) => (
                          <div key={m.v} style={{ background: "rgba(6,13,36,0.5)", border: "1px solid rgba(77,184,255,0.08)", borderRadius: 10, padding: "10px 12px" }}>
                            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.015em" }}>{m.v}</div>
                            <div style={{ fontSize: 10.5, color: "var(--ps-text-secondary)", marginTop: 2 }}>{m.l}</div>
                          </div>
                        ))}
                      </div>
                      {/* Insight */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: "rgba(77,184,255,0.06)", border: "1px solid rgba(77,184,255,0.3)", borderRadius: 10, fontSize: 12, lineHeight: 1.5 }}>
                        <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: "rgba(77,184,255,0.15)", color: "var(--ps-cyan)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                        </div>
                        <span><strong style={{ color: "var(--ps-cyan)", fontWeight: 700 }}>Insight:</strong> Facebook trae 2x más cierres que AutoTrader este mes.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ══════════════ METRICS ══════════════ */}
            <section style={{ position: "relative", padding: "100px 32px", borderTop: "1px solid rgba(77,184,255,0.08)", overflow: "hidden" }}>
              <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(135deg, #060D24, #0D1B6E, #1E5FD4)", opacity: 0.1 }} />
              <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(50% 40% at 30% 0%, rgba(77,184,255,0.10), transparent 60%), radial-gradient(50% 40% at 70% 100%, rgba(34,211,160,0.06), transparent 60%)" }} />
              <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto" }}>
                <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 64px" }}>
                  <span style={{ display: "inline-block", fontSize: 12, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ps-cyan)", marginBottom: 18 }}>Resultados</span>
                  <h2 style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.025em", margin: "0 0 18px" }}>Los números que importan</h2>
                  <p style={{ fontSize: 17, lineHeight: 1.6, color: "var(--ps-text-secondary)", maxWidth: 520, margin: "0 auto" }}>
                    Equipos que usan ProSell cierran más rápido, pierden menos leads y ven el ROI desde el primer mes.
                  </p>
                </div>
                {/* Stats grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", alignItems: "center", margin: "0 auto 64px" }}>
                  {[
                    { num: "43%",   label: "menos leads perdidos",      sub: "vs. gestión manual",       color: "var(--ps-success)" },
                    { num: "< 60s", label: "tiempo de respuesta",       sub: "garantizado por sistema",  color: "var(--ps-cyan)" },
                    { num: "3.2x",  label: "más deals cerrados",        sub: "por rep / por mes",        color: "var(--ps-cyan)" },
                    { num: "$15K",  label: "ahorrado en marketing",     sub: "por concesionaria / mes",  color: "var(--ps-success)" },
                  ].map((s, idx) => (
                    <div key={s.num} style={{ position: "relative", textAlign: "center", padding: "8px 24px" }}>
                      {idx > 0 && <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 1, height: 60, background: "rgba(77,184,255,0.1)" }} />}
                      <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1, marginBottom: 14, color: s.color }}>{s.num}</div>
                      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, letterSpacing: "-0.005em" }}>{s.label}</div>
                      <div style={{ fontSize: 13, color: "var(--ps-text-secondary)", lineHeight: 1.4 }}>{s.sub}</div>
                    </div>
                  ))}
                </div>
                {/* Quote */}
                <figure style={{ maxWidth: 760, margin: "0 auto", textAlign: "center", padding: "0 24px" }}>
                  <span style={{ display: "block", fontFamily: "Georgia, serif", fontSize: 96, lineHeight: 0.6, color: "var(--ps-cyan)", opacity: 0.85, marginBottom: 8 }}>"</span>
                  <blockquote style={{ fontSize: 20, fontWeight: 500, fontStyle: "italic", lineHeight: 1.55, maxWidth: 640, margin: "0 auto 28px", letterSpacing: "-0.01em" }}>
                    Antes perdíamos el 40% de los leads por tiempo de respuesta. Con ProSell respondemos en menos de un minuto y cerramos el doble en el mismo tiempo.
                  </blockquote>
                  <figcaption style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, #0D1B6E, #1E5FD4)", border: "1px solid rgba(77,184,255,0.25)", flexShrink: 0 }}>MR</div>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>Martín Rodríguez</div>
                      <div style={{ fontSize: 13, color: "var(--ps-text-secondary)" }}>Gerente Comercial · Automotores del Norte</div>
                    </div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 100, background: "rgba(77,184,255,0.08)", border: "1px solid rgba(77,184,255,0.22)", fontSize: 11, fontWeight: 700, color: "var(--ps-cyan)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ps-cyan)", boxShadow: "0 0 6px var(--ps-cyan)" }} />
                      ProSell
                    </span>
                  </figcaption>
                </figure>
              </div>
            </section>

            {/* ══════════════ PRICING ══════════════ */}
            <section style={{ position: "relative", padding: "100px 32px", borderTop: "1px solid rgba(77,184,255,0.08)", overflow: "hidden" }}>
              <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(50% 35% at 50% 0%, rgba(77,184,255,0.08), transparent 60%), radial-gradient(60% 40% at 50% 100%, rgba(30,95,212,0.10), transparent 60%)" }} />
              <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto" }}>
                <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 32px" }}>
                  <span style={{ display: "inline-block", fontSize: 12, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ps-cyan)", marginBottom: 18 }}>Precios</span>
                  <h2 style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.025em", margin: "0 0 18px" }}>Empezá gratis. Escalá cuando vendás más.</h2>
                  <p style={{ fontSize: 17, lineHeight: 1.6, color: "var(--ps-text-secondary)", maxWidth: 520, margin: "0 auto" }}>
                    Sin contratos largos. Sin letra chica. Pagás comisión solo cuando cerrás — alineados con tu éxito.
                  </p>
                </div>

                {/* Toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, flexWrap: "wrap", marginBottom: 48 }}>
                  <div style={{ display: "inline-flex", padding: 4, borderRadius: 100, background: "rgba(6,13,36,0.6)", border: "1px solid rgba(77,184,255,0.08)", gap: 2 }}>
                    {["Mensual", "Por comisión"].map((label, idx) => (
                      <span key={label} style={{ padding: "9px 20px", borderRadius: 100, fontSize: 13.5, fontWeight: 600, background: idx === 1 ? "var(--ps-cyan)" : "transparent", color: idx === 1 ? "var(--ps-bg-base)" : "var(--ps-text-secondary)", boxShadow: idx === 1 ? "0 0 16px rgba(77,184,255,0.25)" : "none" }}>{label}</span>
                    ))}
                  </div>
                  <span style={{ fontSize: 12.5, color: "var(--ps-text-secondary)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "#F5A623" }}>⚡</span>Recomendado — pagás cuando vendés
                  </span>
                </div>

                {/* Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.06fr 1fr", gap: 24, alignItems: "start", marginBottom: 48 }}>
                  {PRICING_PLANS.map((plan) => (
                    <div key={plan.name} className={`ps-pr-card${plan.featured ? " ps-pr-card-featured" : ""}`}>
                      {plan.badge && (
                        <span style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", padding: "6px 14px", borderRadius: 100, background: "var(--ps-cyan)", color: "var(--ps-bg-base)", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", boxShadow: "0 0 18px rgba(77,184,255,0.40)", whiteSpace: "nowrap" }}>{plan.badge}</span>
                      )}
                      <h3 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", margin: "0 0 6px", color: plan.featured ? "var(--ps-cyan)" : "var(--ps-text-primary)" }}>{plan.name}</h3>
                      <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ps-text-secondary)", margin: "0 0 22px", minHeight: 40 }}>{plan.desc}</p>
                      <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 8 }}>
                        {plan.price} <span style={{ fontSize: 16, fontWeight: 500, color: "var(--ps-text-secondary)" }}>{plan.priceUnit}</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: "var(--ps-text-secondary)", marginBottom: 22, lineHeight: 1.45 }}>{plan.note}</div>
                      <div style={{ height: 1, background: "rgba(77,184,255,0.08)", margin: "0 0 22px" }} />
                      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 11, flex: 1 }}>
                        {plan.features.map((f) => (
                          <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13.5, lineHeight: 1.45 }}>
                            <span style={{ flexShrink: 0, width: 18, height: 18, borderRadius: "50%", background: "rgba(77,184,255,0.12)", color: "var(--ps-cyan)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                              <svg style={{ width: 11, height: 11 }} fill="none" stroke="currentColor" strokeWidth={2.75} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                            </span>
                            {f}
                          </li>
                        ))}
                      </ul>
                      <Link href="/auth/register" className={plan.featured ? "ps-btn-primary" : "ps-btn-ghost"} style={{ justifyContent: "center", padding: "13px 20px", fontSize: 14, textAlign: "center" }}>
                        {plan.cta}
                      </Link>
                    </div>
                  ))}
                </div>

                {/* Trust row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 32 }}>
                  {["Sin tarjeta de crédito", "Cancelá cuando quieras", "Soporte incluido desde el día 1", "Datos exportables siempre"].map((t) => (
                    <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: "var(--ps-text-secondary)" }}>
                      <svg style={{ width: 14, height: 14, color: "var(--ps-cyan)" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            {/* ══════════════ HOW IT WORKS ══════════════ */}
            <section style={{ position: "relative", padding: "100px 32px", borderTop: "1px solid rgba(77,184,255,0.08)", overflow: "hidden" }}>
              <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(50% 35% at 50% 0%, rgba(77,184,255,0.06), transparent 60%)" }} />
              <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto" }}>
                <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 64px" }}>
                  <span style={{ display: "inline-block", fontSize: 12, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ps-cyan)", marginBottom: 18 }}>Cómo funciona</span>
                  <h2 style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.025em", margin: "0 0 18px" }}>De cero a vendiendo en 10 minutos</h2>
                  <p style={{ fontSize: 17, lineHeight: 1.6, color: "var(--ps-text-secondary)", maxWidth: 500, margin: "0 auto" }}>
                    Sin onboarding largo. Sin integración técnica. Tres pasos y tu pipeline ya está funcionando.
                  </p>
                </div>

                {/* Steps */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 32, marginBottom: 56 }}>
                  {[
                    { num: "01", title: "Cargá tu catálogo", desc: "Subí tus productos, vehículos o inmuebles una sola vez. ProSell organiza todo automáticamente según tu nicho.", tag: "⏱ 3 minutos",
                      icon: <svg style={{ width: 24, height: 24 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M11 21.73a2 2 0 002 0l7-4A2 2 0 0021 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73z"/><path d="M12 22V12"/><polyline points="3.29 7 12 12 20.71 7"/><path d="m7.5 4.27 9 5.15"/></svg> },
                    { num: "02", title: "Activá tus canales", desc: "Conectá Facebook, portales y tu web. ProSell publica en todos a la vez con un solo clic.", tag: "⏱ 5 minutos",
                      icon: <svg style={{ width: 24, height: 24 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> },
                    { num: "03", title: "Respondé y cerrá", desc: "Todos tus leads llegan al inbox unificado. Respondés con IA, seguís el pipeline y cerrás más desde el día uno.", tag: "⏱ Desde el día 1",
                      icon: <svg style={{ width: 24, height: 24 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/></svg> },
                  ].map((step) => (
                    <div key={step.num} className="ps-hw-step">
                      <span style={{ position: "absolute", top: 20, right: 24, fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", color: "rgba(77,184,255,0.2)", fontVariantNumeric: "tabular-nums" }}>{step.num}</span>
                      <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(77,184,255,0.10)", border: "1px solid rgba(77,184,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ps-cyan)", marginBottom: 22 }}>
                        {step.icon}
                      </div>
                      <h3 style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.015em", margin: "0 0 12px" }}>{step.title}</h3>
                      <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ps-text-secondary)", margin: "0 0 20px" }}>{step.desc}</p>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--ps-cyan)", padding: "5px 12px", borderRadius: 100, background: "rgba(77,184,255,0.08)", border: "1px solid rgba(77,184,255,0.2)" }}>{step.tag}</span>
                    </div>
                  ))}
                </div>

                {/* How it works CTA */}
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontSize: 15, color: "var(--ps-text-secondary)", marginRight: 20 }}>¿Listo para probarlo sin riesgos?</span>
                  <Link href="/auth/register" className="ps-btn-primary" style={{ padding: "11px 22px", fontSize: 14 }}>Empezar gratis →</Link>
                </div>
              </div>
            </section>

            {/* ══════════════ TESTIMONIALS ══════════════ */}
            <section style={{ position: "relative", padding: "100px 32px", borderTop: "1px solid rgba(77,184,255,0.08)", overflow: "hidden" }}>
              <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(50% 35% at 20% 50%, rgba(30,95,212,0.08), transparent 60%)" }} />
              <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto" }}>
                <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 56px" }}>
                  <span style={{ display: "inline-block", fontSize: 12, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ps-cyan)", marginBottom: 18 }}>Testimonios</span>
                  <h2 style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.025em", margin: 0 }}>
                    Lo que dicen los equipos que ya venden con ProSell
                  </h2>
                </div>

                {/* Row of 3 */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, marginBottom: 20 }}>
                  {TESTIMONIALS_3.map((t) => (
                    <article key={t.name} className="ps-tm-card">
                      <div style={{ color: "#F5A623", fontSize: 13, letterSpacing: 1, marginBottom: 16 }}>★★★★★</div>
                      <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--ps-text-primary)", margin: "0 0 20px", flex: 1 }}>{t.quote}</p>
                      <div style={{ height: 1, background: "rgba(77,184,255,0.08)", margin: "0 0 20px" }} />
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", background: t.avBg }}>{t.av}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.name}</div>
                          <div style={{ fontSize: 12, color: "var(--ps-text-secondary)" }}>{t.role}</div>
                        </div>
                        <span style={{ fontSize: 12, color: "var(--ps-text-disabled)" }}>{t.niche}</span>
                      </div>
                    </article>
                  ))}
                </div>

                {/* Row of 2 */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  {TESTIMONIALS_2.map((t) => (
                    <article key={t.name} className="ps-tm-card">
                      <div style={{ color: "#F5A623", fontSize: 13, letterSpacing: 1, marginBottom: 16 }}>★★★★★</div>
                      <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--ps-text-primary)", margin: "0 0 20px", flex: 1 }}>{t.quote}</p>
                      <div style={{ height: 1, background: "rgba(77,184,255,0.08)", margin: "0 0 20px" }} />
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", background: t.avBg }}>{t.av}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.name}</div>
                          <div style={{ fontSize: 12, color: "var(--ps-text-secondary)" }}>{t.role}</div>
                        </div>
                        <span style={{ fontSize: 12, color: "var(--ps-text-disabled)" }}>{t.niche}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            {/* ══════════════ FAQ ══════════════ */}
            <section style={{ padding: "100px 32px", borderTop: "1px solid rgba(77,184,255,0.08)" }}>
              <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 80, alignItems: "start" }}>
                <div>
                  <span style={{ display: "inline-block", fontSize: 12, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ps-cyan)", marginBottom: 18 }}>FAQ</span>
                  <h2 style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.025em", margin: "0 0 18px" }}>Preguntas frecuentes</h2>
                  <p style={{ fontSize: 16, lineHeight: 1.6, color: "var(--ps-text-secondary)", margin: "0 0 32px" }}>
                    Todo lo que necesitás saber antes de empezar.
                  </p>
                  <Link href="/auth/register" className="ps-btn-primary" style={{ padding: "12px 22px", fontSize: 14 }}>Empezar gratis</Link>
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

            {/* ══════════════ FINAL CTA ══════════════ */}
            <section style={{ position: "relative", padding: "120px 32px", borderTop: "1px solid rgba(77,184,255,0.08)", overflow: "hidden", textAlign: "center" }}>
              <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(135deg, rgba(6,13,36,0.8), rgba(13,27,110,0.6), rgba(30,95,212,0.4))" }} />
              <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(60% 50% at 50% 50%, rgba(77,184,255,0.12), transparent 70%)" }} />
              <div style={{ position: "relative", zIndex: 1, maxWidth: 760, margin: "0 auto" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ps-cyan)", marginBottom: 24 }}>
                  <span style={{ position: "relative", width: 8, height: 8, display: "inline-block" }}>
                    <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--ps-cyan)" }} />
                    <span style={{ position: "absolute", inset: -3, borderRadius: "50%", background: "var(--ps-cyan)", opacity: 0.4, animation: "ps-pulse 1.8s cubic-bezier(0.16,1,0.3,1) infinite" }} />
                  </span>
                  Empezá hoy
                </span>
                <h2 style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.03em", margin: "0 0 22px" }}>
                  Tu próximo cierre empieza acá.
                </h2>
                <p style={{ fontSize: 18, lineHeight: 1.6, color: "var(--ps-text-secondary)", margin: "0 0 44px" }}>
                  Más de 2.400 equipos ya usan ProSell para vender más sin gastar más. Empezá gratis, sin tarjeta, en 10 minutos.
                </p>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 28 }}>
                  <Link href="/auth/register" className="ps-btn-primary" style={{ padding: "14px 28px", fontSize: 15, gap: 10 }}>
                    Empezar gratis ahora
                    <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </Link>
                  <Link href="/auth/login" className="ps-btn-ghost" style={{ padding: "14px 28px", fontSize: 15, gap: 10 }}>
                    <svg style={{ width: 14, height: 14 }} fill="currentColor" viewBox="0 0 24 24"><path d="M5 5a2 2 0 013.008-1.728l11.997 6.998a2 2 0 01.003 3.458l-12 7A2 2 0 015 19z"/></svg>
                    Ver demo en vivo
                  </Link>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap", fontSize: 13, color: "var(--ps-text-disabled)" }}>
                  <span>🔒 Sin tarjeta</span>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span>↩️ Cancelá cuando quieras</span>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span>⚡ Setup en 10 min</span>
                </div>
              </div>
            </section>
          </main>

          {/* ══════════════ FOOTER ══════════════ */}
          <footer style={{ borderTop: "1px solid rgba(77,184,255,0.08)", padding: "32px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1280, margin: "0 auto", flexWrap: "wrap", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Image src="/logo-mark.png" alt="ProSell" width={271} height={294} style={{ height: 28, width: "auto", flexShrink: 0 }} />
                <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>ProSell</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--ps-text-disabled)", margin: 0 }}>© {new Date().getFullYear()} ProSell SaaS. Todos los derechos reservados.</p>
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

// ──────────────────────────────── DATA ────────────────────────────────

const PRICING_PLANS = [
  {
    name: "Arranque",
    desc: "Para equipos que están empezando",
    price: "$0",
    priceUnit: "/ mes",
    note: "2% comisión por venta cerrada",
    badge: null,
    featured: false,
    cta: "Empezar gratis",
    features: [
      "Hasta 2 usuarios",
      "1 nicho activo",
      "Publicación en 2 canales",
      "Inbox unificado básico",
      "Dashboard de métricas esencial",
      "Soporte por email",
    ],
  },
  {
    name: "Crecimiento",
    desc: "Para equipos en expansión activa",
    price: "$299",
    priceUnit: "/ mes",
    note: "1.5% comisión por venta cerrada",
    badge: "Más popular",
    featured: true,
    cta: "Empezar ahora",
    features: [
      "Hasta 10 usuarios",
      "3 nichos activos",
      "Publicación en todos los canales",
      "Inbox unificado completo + IA",
      "Analytics avanzados por canal",
      "Soporte prioritario",
      "Integraciones nativas",
    ],
  },
  {
    name: "Enterprise",
    desc: "Para grupos con múltiples sucursales",
    price: "A medida",
    priceUnit: "",
    note: "Comisión negociada según volumen",
    badge: null,
    featured: false,
    cta: "Hablar con ventas",
    features: [
      "Usuarios ilimitados",
      "Nichos ilimitados",
      "API completa",
      "Account manager dedicado",
      "SLA garantizado",
      "Onboarding personalizado",
      "Integraciones enterprise",
    ],
  },
] as const;

const TESTIMONIALS_3 = [
  {
    av: "MR", avBg: "linear-gradient(135deg,#0D1B6E,#1E5FD4)",
    quote: '"En el primer mes recuperamos el 40% de los leads que antes se perdían por falta de seguimiento. El inbox unificado cambió todo para nuestro equipo."',
    name: "Martín Rodríguez", role: "Gerente Comercial · Automotores del Norte", niche: "🚗 Vehículos",
  },
  {
    av: "SG", avBg: "linear-gradient(135deg,#1E5FD4,#4DB8FF)",
    quote: '"Publicamos en 6 portales a la vez sin tocar nada. Antes nos llevaba 2 horas por unidad. Ahora son 2 minutos y sin errores."',
    name: "Sofía García", role: "Directora de Operaciones · Grupo Motores SA", niche: "🚗 Vehículos",
  },
  {
    av: "LT", avBg: "linear-gradient(135deg,#4DB8FF,#0D1B6E)",
    quote: '"El dashboard de analytics nos mostró que Facebook convertía 2x más que AutoTrader. Movimos el presupuesto y el ROI se triplicó en 6 semanas."',
    name: "Lucas Torres", role: "CEO · TurboAutos", niche: "🚗 Vehículos",
  },
] as const;

const TESTIMONIALS_2 = [
  {
    av: "CP", avBg: "linear-gradient(135deg,#22D3A0,#1E5FD4)",
    quote: '"Teníamos 3 personas respondiendo leads manualmente desde 4 plataformas distintas. Con ProSell son 2 personas, respuesta en menos de 60 segundos y el doble de cierres. No entiendo cómo trabajábamos antes."',
    name: "Carolina Pérez", role: "Coordinadora Comercial · AutoSelect", niche: "🚗 Vehículos",
  },
  {
    av: "JM", avBg: "linear-gradient(135deg,#F5A623,#1E5FD4)",
    quote: '"La visibilidad de pipeline que nos da ProSell es incomparable. Antes era todo en Excel y WhatsApp. Hoy sé exactamente dónde está cada deal, cuánto tiempo lleva en cada etapa y qué hacer para cerrarlo."',
    name: "Javier Molina", role: "Director General · Concesionaria Molina e Hijos", niche: "🚗 Vehículos",
  },
] as const;

const FAQ_ITEMS = [
  {
    q: "¿Necesito conocimientos técnicos para usar ProSell?",
    a: "No. ProSell está diseñado para equipos comerciales, no para equipos de IT. El setup tarda menos de 10 minutos y no requiere integraciones ni configuraciones complejas. Si podés usar WhatsApp, podés usar ProSell.",
  },
  {
    q: "¿Funciona solo para vehículos o puedo usarlo para otro tipo de productos?",
    a: "ProSell es una plataforma multinicho. Lanzamos con vehículos porque es donde hay más oportunidad de impacto inmediato, pero el sistema funciona igual para inmuebles, maquinaria, productos de alto valor y más. Podés activar nuevos nichos desde la configuración en minutos.",
  },
  {
    q: "¿Cómo funciona el modelo de comisión?",
    a: "Solo pagás cuando cerrás una venta. En el plan Arranque la comisión es del 2% sobre cada venta cerrada a través de la plataforma. En el plan Crecimiento baja al 1.5%. No hay costos ocultos ni cargos si no vendés.",
  },
  {
    q: "¿Puedo migrar mis leads y datos existentes?",
    a: "Sí. ProSell permite importar tu base de contactos y catálogo de productos en formatos CSV y Excel. Tu equipo puede estar operativo con datos reales desde el primer día, sin empezar de cero.",
  },
  {
    q: "¿Qué canales de publicación están disponibles?",
    a: "En el lanzamiento inicial: Facebook Marketplace, AutoTrader, Cars.com y CarGurus para el nicho de vehículos. Estamos agregando portales locales e internacionales según la región. También podés publicar en tu propio sitio web con nuestro widget embebible.",
  },
  {
    q: "¿Qué pasa si quiero cancelar?",
    a: "Podés cancelar cuando quieras, sin penalidades ni períodos mínimos. Tus datos son tuyos — podés exportarlos en cualquier momento en formato CSV o Excel antes de cerrar tu cuenta.",
  },
] as const;
