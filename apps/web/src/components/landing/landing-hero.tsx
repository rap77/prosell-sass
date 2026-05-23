import Link from "next/link";

export function LandingHero() {
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px" }}>
              <div className="ps-hero" style={{ display: "grid", gridTemplateColumns: "1.05fr 1fr", gap: 80, alignItems: "center", minHeight: "calc(100vh - 72px)", padding: "60px 0 100px" }}>

                {/* Copy */}
                <div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px 6px 12px", background: "var(--ps-badge-bg)", border: "1px solid var(--ps-border-default)", borderRadius: 100, fontSize: 12.5, fontWeight: 500, marginBottom: 24 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--ps-cyan)", display: "inline-block", position: "relative", flexShrink: 0 }}>
                      <span style={{ position: "absolute", inset: -4, borderRadius: "50%", background: "var(--ps-cyan)", opacity: 0.5, animation: "ps-pulse 1.8s cubic-bezier(0.16,1,0.3,1) infinite" }} />
                    </span>
                    Inteligencia comercial en tiempo real
                  </div>

                  <h1 className="ps-hero-h1" style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.04, letterSpacing: "-0.03em", margin: "0 0 24px" }}>
                    Tu equipo de ventas,{" "}
                    <span style={{ background: "linear-gradient(135deg, var(--ps-cyan) 0%, var(--ps-blue) 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>
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
                        <div key={i} style={{ width: 34, height: 34, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 11, color: "var(--ps-bg-base)", border: "2px solid var(--ps-bg-base)", marginLeft: idx === 0 ? 0 : -8, background: bg, flexShrink: 0 }}>{i}</div>
                      ))}
                    </div>
                    <div>
                      <div style={{ display: "flex", gap: 2, marginBottom: 4 }}>
                        {[0,1,2,3,4].map((s) => (
                          <svg key={s} style={{ width: 12, height: 12, color: "var(--ps-warning)" }} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
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

                  <div style={{ position: "relative", width: "100%", maxWidth: 520, background: "rgba(13,27,62,0.75)", border: "1px solid rgba(77,184,255,0.18)", borderRadius: 20, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", boxShadow: "0 32px 80px rgba(6,13,36,0.6), inset 0 1px 0 rgba(255,255,255,0.06)", padding: 22, animation: "ps-float 6s ease-in-out infinite", color: "#F0F4FF" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>Pipeline Q2 2026</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 100, background: "rgba(34,211,160,0.12)", color: "#22D3A0", fontSize: 11, fontWeight: 600 }}>
                        <span style={{ position: "relative", width: 6, height: 6, display: "inline-block" }}>
                          <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#22D3A0" }} />
                          <span style={{ position: "absolute", inset: -2, borderRadius: "50%", background: "#22D3A0", opacity: 0.4, animation: "ps-pulse 1.8s cubic-bezier(0.16,1,0.3,1) infinite" }} />
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
                          <div style={{ fontSize: 10.5, color: "#8A9BBF", marginBottom: 4, letterSpacing: "0.04em" }}>{m.label}</div>
                          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{m.value}</div>
                          <div style={{ fontSize: 10.5, color: "#22D3A0", fontWeight: 600, marginTop: 3 }}>{m.delta}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginBottom: 18 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#8A9BBF", letterSpacing: "0.04em" }}>DEALS CERRADOS / SEMANA</span>
                        <span style={{ fontSize: 10.5, color: "var(--ps-text-disabled)" }}>S1 — S8</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 64, padding: "0 2px" }}>
                        {[38, 52, 44, 64, 58, 72, 80, 96].map((h, idx) => {
                          const active = idx === 7;
                          return (
                            <div key={idx} style={{ flex: 1, borderRadius: "3px 3px 0 0", height: `${h}%`, background: active ? "linear-gradient(to top, var(--ps-cyan), var(--ps-cyan-hover))" : "rgba(77,184,255,0.15)", boxShadow: active ? "0 0 18px rgba(77,184,255,0.45)" : "none", position: "relative" }}>
                              {active && <div style={{ position: "absolute", top: -5, left: "50%", transform: "translateX(-50%)", width: 6, height: 6, borderRadius: "50%", background: "var(--ps-cyan-hover)", boxShadow: "0 0 8px var(--ps-cyan-hover)" }} />}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "rgba(77,184,255,0.06)", borderRadius: 8, overflow: "hidden" }}>
                      {[
                        { av: "A", name: "Acme Tech",       amount: "$48K", stage: "Cierre",    sc: "#22D3A0", sb: "rgba(34,211,160,0.14)", bg: "linear-gradient(135deg,#4DB8FF,#1E5FD4)" },
                        { av: "N", name: "Northwind Labs",  amount: "$32K", stage: "Demo",      sc: "var(--ps-cyan)",    sb: "rgba(77,184,255,0.14)",  bg: "linear-gradient(135deg,#22D3A0,#1E5FD4)" },
                        { av: "G", name: "Globex SA",       amount: "$76K", stage: "Propuesta", sc: "var(--ps-warning)",  sb: "var(--ps-warning-bg)",   bg: "linear-gradient(135deg,#F5A623,#F04438)" },
                      ].map((d) => (
                        <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", background: "rgba(6,13,36,0.5)" }}>
                          <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--ps-bg-base)", background: d.bg }}>{d.av}</div>
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{d.amount}</span>
                          <span style={{ fontSize: 10.5, fontWeight: 600, padding: "3px 9px", borderRadius: 100, color: d.sc, background: d.sb, flexShrink: 0 }}>{d.stage}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Floating badge top */}
                  <div className="ps-float-badge" style={{ position: "absolute", top: -28, left: -56, display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 14px", background: "rgba(13,27,62,0.92)", border: "1px solid rgba(77,184,255,0.25)", borderRadius: 8, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", boxShadow: "0 16px 48px rgba(6,13,36,0.55)", fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap", zIndex: 2, animation: "ps-float-badge-1 7s ease-in-out infinite", color: "#F0F4FF" }}>
                    <div style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(34,211,160,0.15)", color: "#22D3A0" }}>
                      <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
                    </div>
                    <div>
                      <b style={{ display: "block", fontWeight: 600, fontSize: 12.5 }}>Conversión este mes</b>
                      <span style={{ fontSize: 10.5, color: "#8A9BBF" }}>+34% vs anterior</span>
                    </div>
                  </div>

                  {/* Floating badge bottom */}
                  <div className="ps-float-badge" style={{ position: "absolute", bottom: -28, right: -56, display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 14px", background: "rgba(13,27,62,0.92)", border: "1px solid rgba(77,184,255,0.25)", borderRadius: 8, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", boxShadow: "0 16px 48px rgba(6,13,36,0.55)", fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap", zIndex: 2, animation: "ps-float-badge-2 7s ease-in-out infinite", color: "#F0F4FF" }}>
                    <div style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(77,184,255,0.15)", color: "var(--ps-cyan)" }}>
                      <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                    </div>
                    <div>
                      <b style={{ display: "block", fontWeight: 600, fontSize: 12.5 }}>Deal cerrado · $48K</b>
                      <span style={{ fontSize: 10.5, color: "#8A9BBF" }}>Acme Tech</span>
                    </div>
                  </div>
                </div>
              </div>
    </div>
  );
}
