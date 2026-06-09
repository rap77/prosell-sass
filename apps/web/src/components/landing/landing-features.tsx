export function LandingFeatures() {
  return (
    <section
      id="producto"
      style={{
        position: "relative",
        padding: "120px 32px",
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
            "radial-gradient(ellipse 40% 30% at 10% 30%, rgba(77,184,255,0.06), transparent 60%), radial-gradient(ellipse 40% 30% at 90% 70%, rgba(30,95,212,0.10), transparent 60%)",
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
        {/* Head */}
        <div
          style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 96px" }}
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
            Funcionalidades
          </span>
          <h2
            className="ps-ft-h2"
            style={{
              fontSize: 44,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              margin: "0 0 18px",
            }}
          >
            Todo lo que necesitás para vender más
          </h2>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.6,
              color: "var(--ps-text-secondary)",
              maxWidth: 600,
              margin: "0 auto",
            }}
          >
            Sin apps extras. Sin integraciones complicadas. Todo dentro de
            ProSell desde el día uno.
          </p>
        </div>

        {/* Row 1: Distribución */}
        <div
          className="ps-ft-row"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 80,
            alignItems: "center",
            marginBottom: 100,
          }}
        >
          <div className="ps-ft-text" style={{ maxWidth: 520 }}>
            <span
              style={{
                display: "inline-block",
                padding: "5px 12px",
                borderRadius: 100,
                background: "var(--ps-badge-bg)",
                border: "1px solid var(--ps-border-medium)",
                color: "var(--ps-cyan)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                marginBottom: 20,
              }}
            >
              Distribución
            </span>
            <h3
              className="ps-ft-h3"
              style={{
                fontSize: 32,
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: "-0.022em",
                margin: "0 0 18px",
              }}
            >
              Publicá en todos los canales en 2 minutos
            </h3>
            <p
              style={{
                fontSize: 16,
                lineHeight: 1.7,
                color: "var(--ps-text-secondary)",
                margin: "0 0 24px",
              }}
            >
              Cargás el producto una sola vez y ProSell lo distribuye
              automáticamente a todos los portales y redes activas para tu
              nicho. Sin copiar, sin pegar, sin errores.
            </p>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {[
                "Facebook Marketplace, AutoTrader, Cars.com y más",
                "Fotos, precio y descripción sincronizados automáticamente",
                "Alertas si algún canal falla en la publicación",
              ].map((b) => (
                <li
                  key={b}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    fontSize: 14.5,
                    lineHeight: 1.5,
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "var(--ps-badge-bg)",
                      border: "1px solid var(--ps-border-medium)",
                      color: "var(--ps-cyan)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 1,
                    }}
                  >
                    <svg
                      style={{ width: 12, height: 12 }}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      viewBox="0 0 24 24"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div
            className="ps-ft-mock"
            style={{
              position: "relative",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 380,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "-10%",
                background:
                  "radial-gradient(ellipse at center, rgba(77,184,255,0.12), transparent 60%)",
                filter: "blur(40px)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: 480,
                background: "rgba(13,27,62,0.7)",
                border: "1px solid rgba(77,184,255,0.12)",
                borderRadius: 16,
                backdropFilter: "blur(20px)",
                boxShadow:
                  "0 0 60px rgba(77,184,255,0.08), 0 16px 48px rgba(6,13,36,0.55)",
                padding: 22,
                color: "#F0F4FF",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 18,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  Nueva publicación
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "3px 10px",
                    borderRadius: 100,
                    background: "rgba(34,211,160,0.14)",
                    color: "#22D3A0",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "currentColor",
                    }}
                  />
                  Publicando…
                </span>
              </div>
              {/* Vehicle card */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  background: "rgba(6,13,36,0.5)",
                  border: "1px solid rgba(77,184,255,0.08)",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 78,
                    height: 60,
                    flexShrink: 0,
                    borderRadius: 8,
                    background:
                      "linear-gradient(135deg, rgba(77,184,255,0.18), rgba(30,95,212,0.25))",
                    border: "1px solid rgba(77,184,255,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--ps-text-disabled)",
                  }}
                >
                  <svg
                    style={{ width: 22, height: 22 }}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                  >
                    <rect x="2" y="9" width="20" height="11" rx="2" />
                    <path d="M5 9V7a2 2 0 012-2h10a2 2 0 012 2v2" />
                    <circle cx="7" cy="20" r="1" />
                    <circle cx="17" cy="20" r="1" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}
                  >
                    Toyota Corolla 2024
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "#4DB8FF",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    $28.500
                  </div>
                </div>
              </div>
              {/* Channel grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginBottom: 18,
                }}
              >
                {[
                  { swatch: "#1877F2", label: "FB Marketplace", abbr: "f" },
                  { swatch: "#F5A623", label: "AutoTrader", abbr: "AT" },
                  { swatch: "#F04438", label: "Cars.com", abbr: "C" },
                  { swatch: "#22D3A0", label: "CarGurus", abbr: "CG" },
                ].map((ch) => (
                  <div
                    key={ch.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 12px",
                      borderRadius: 10,
                      border: "1px solid rgba(77,184,255,0.08)",
                      background: "rgba(6,13,36,0.4)",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--ps-bg-base)",
                        background: ch.swatch,
                      }}
                    >
                      {ch.abbr}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {ch.label}
                    </span>
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: "#22D3A0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <svg
                        style={{
                          width: 11,
                          height: 11,
                          color: "var(--ps-bg-base)",
                        }}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                        viewBox="0 0 24 24"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  </div>
                ))}
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 100,
                  background: "rgba(77,184,255,0.10)",
                  overflow: "hidden",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: "100%",
                    background:
                      "linear-gradient(90deg, var(--ps-cyan), #7DCEFF)",
                    boxShadow: "0 0 12px rgba(77,184,255,0.5)",
                    borderRadius: 100,
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11.5,
                  color: "#8A9BBF",
                }}
              >
                <span style={{ color: "#22D3A0", fontWeight: 600 }}>
                  4/4 canales publicados
                </span>
                <span>00:01:48</span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Leads (reversed) */}
        <div
          className="ps-ft-row reverse"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 80,
            alignItems: "center",
            marginBottom: 100,
          }}
        >
          <div
            className="ps-ft-mock"
            style={{
              position: "relative",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 380,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "-10%",
                background:
                  "radial-gradient(ellipse at center, rgba(77,184,255,0.12), transparent 60%)",
                filter: "blur(40px)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: 480,
                background: "rgba(13,27,62,0.7)",
                border: "1px solid rgba(77,184,255,0.12)",
                borderRadius: 16,
                backdropFilter: "blur(20px)",
                boxShadow:
                  "0 0 60px rgba(77,184,255,0.08), 0 16px 48px rgba(6,13,36,0.55)",
                padding: 22,
                color: "#F0F4FF",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 18,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  Leads · Hoy
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "3px 10px",
                    borderRadius: 100,
                    background: "rgba(77,184,255,0.14)",
                    color: "#4DB8FF",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "currentColor",
                    }}
                  />
                  12 nuevos
                </span>
              </div>
              {/* Lead rows */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  background: "rgba(77,184,255,0.06)",
                  borderRadius: 12,
                  overflow: "hidden",
                  marginBottom: 14,
                }}
              >
                {[
                  {
                    av: "MR",
                    bg: "linear-gradient(135deg,#4DB8FF,#1E5FD4)",
                    name: "Martín Rivas",
                    src: "FB",
                    srcC: "var(--ps-cyan)",
                    srcBg: "rgba(77,184,255,0.15)",
                    time: "hace 2 min",
                    status: "Respondido < 60s",
                    ok: true,
                  },
                  {
                    av: "JC",
                    bg: "linear-gradient(135deg,#22D3A0,#1E5FD4)",
                    name: "Julieta Castro",
                    src: "AT",
                    srcC: "#F5A623",
                    srcBg: "rgba(245,166,35,0.15)",
                    time: "hace 15 min",
                    status: "Respondido < 60s",
                    ok: true,
                  },
                  {
                    av: "SP",
                    bg: "linear-gradient(135deg,#F5A623,#F04438)",
                    name: "Sofía Paz",
                    src: "Directo",
                    srcC: "#22D3A0",
                    srcBg: "rgba(34,211,160,0.15)",
                    time: "hace 1 hora",
                    status: "Pendiente",
                    ok: false,
                  },
                ].map((l) => (
                  <div
                    key={l.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "11px 12px",
                      background: "rgba(6,13,36,0.5)",
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--ps-bg-base)",
                        background: l.bg,
                      }}
                    >
                      {l.av}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 3,
                        }}
                      >
                        {l.name}
                        <span
                          style={{
                            fontSize: 9.5,
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            letterSpacing: "0.04em",
                            color: l.srcC,
                            background: l.srcBg,
                          }}
                        >
                          {l.src}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--ps-text-disabled)",
                        }}
                      >
                        {l.time}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        whiteSpace: "nowrap",
                        color: l.ok ? "#22D3A0" : "#F5A623",
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "currentColor",
                        }}
                      />
                      {l.status}
                    </span>
                  </div>
                ))}
              </div>
              {/* AI input */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  background: "rgba(6,13,36,0.6)",
                  border: "1px solid rgba(77,184,255,0.2)",
                  borderRadius: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: "rgba(77,184,255,0.15)",
                    color: "#4DB8FF",
                  }}
                >
                  IA
                </span>
                <span style={{ flex: 1, fontSize: 13, color: "#8A9BBF" }}>
                  Responder con IA…
                </span>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: "var(--ps-cyan)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg
                    style={{
                      width: 14,
                      height: 14,
                      color: "var(--ps-bg-base)",
                    }}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          <div className="ps-ft-text" style={{ maxWidth: 520 }}>
            <span
              style={{
                display: "inline-block",
                padding: "5px 12px",
                borderRadius: 100,
                background: "var(--ps-badge-bg)",
                border: "1px solid var(--ps-border-medium)",
                color: "var(--ps-cyan)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                marginBottom: 20,
              }}
            >
              Leads
            </span>
            <h3
              className="ps-ft-h3"
              style={{
                fontSize: 32,
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: "-0.022em",
                margin: "0 0 18px",
              }}
            >
              Todos tus leads, respondidos antes que tu competencia
            </h3>
            <p
              style={{
                fontSize: 16,
                lineHeight: 1.7,
                color: "var(--ps-text-secondary)",
                margin: "0 0 24px",
              }}
            >
              Sin importar de qué canal venga — Facebook, portal, formulario web
              — todos llegan al mismo inbox inteligente. Respondés en segundos,
              no en horas.
            </p>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {[
                "Inbox unificado multi-canal y multi-nicho",
                "Respuesta asistida por IA con contexto del lead",
                "Alertas automáticas si un lead lleva más de 60s sin respuesta",
              ].map((b) => (
                <li
                  key={b}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    fontSize: 14.5,
                    lineHeight: 1.5,
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "var(--ps-badge-bg)",
                      border: "1px solid var(--ps-border-medium)",
                      color: "var(--ps-cyan)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 1,
                    }}
                  >
                    <svg
                      style={{ width: 12, height: 12 }}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      viewBox="0 0 24 24"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Row 3: Inteligencia */}
        <div
          className="ps-ft-row"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 80,
            alignItems: "center",
          }}
        >
          <div className="ps-ft-text" style={{ maxWidth: 520 }}>
            <span
              style={{
                display: "inline-block",
                padding: "5px 12px",
                borderRadius: 100,
                background: "var(--ps-badge-bg)",
                border: "1px solid var(--ps-border-medium)",
                color: "var(--ps-cyan)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                marginBottom: 20,
              }}
            >
              Inteligencia
            </span>
            <h3
              className="ps-ft-h3"
              style={{
                fontSize: 32,
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: "-0.022em",
                margin: "0 0 18px",
              }}
            >
              Sabé exactamente qué canal cierra más
            </h3>
            <p
              style={{
                fontSize: 16,
                lineHeight: 1.7,
                color: "var(--ps-text-secondary)",
                margin: "0 0 24px",
              }}
            >
              ProSell rastrea cada lead desde el origen hasta el cierre. Sabés
              cuánto gastás por lead, qué canal convierte mejor y qué vendedor
              necesita soporte — todo en tiempo real.
            </p>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {[
                "Attribution completa por canal y por vendedor",
                "Pricing dinámico: alertas cuando el stock se mueve lento",
                "Dashboard de ROI: costo por lead vs revenue cerrado",
              ].map((b) => (
                <li
                  key={b}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    fontSize: 14.5,
                    lineHeight: 1.5,
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "var(--ps-badge-bg)",
                      border: "1px solid var(--ps-border-medium)",
                      color: "var(--ps-cyan)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 1,
                    }}
                  >
                    <svg
                      style={{ width: 12, height: 12 }}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      viewBox="0 0 24 24"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div
            className="ps-ft-mock"
            style={{
              position: "relative",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 380,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "-10%",
                background:
                  "radial-gradient(ellipse at center, rgba(77,184,255,0.12), transparent 60%)",
                filter: "blur(40px)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: 480,
                background: "rgba(13,27,62,0.7)",
                border: "1px solid rgba(77,184,255,0.12)",
                borderRadius: 16,
                backdropFilter: "blur(20px)",
                boxShadow:
                  "0 0 60px rgba(77,184,255,0.08), 0 16px 48px rgba(6,13,36,0.55)",
                padding: 22,
                color: "#F0F4FF",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 18,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  Performance · Q2 2026
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "3px 10px",
                    borderRadius: 100,
                    background: "rgba(77,184,255,0.14)",
                    color: "#4DB8FF",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "currentColor",
                    }}
                  />
                  En vivo
                </span>
              </div>
              {/* Bar chart */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  marginBottom: 18,
                }}
              >
                {[
                  { label: "Facebook", pct: 68, type: "cyan" },
                  { label: "AutoTrader", pct: 52, type: "blue" },
                  { label: "Cars.com", pct: 38, type: "muted" },
                ].map((r) => (
                  <div
                    key={r.label}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "90px 1fr 50px",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>
                      {r.label}
                    </span>
                    <div
                      style={{
                        height: 10,
                        borderRadius: 100,
                        background: "rgba(77,184,255,0.08)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${r.pct}%`,
                          borderRadius: 100,
                          background:
                            r.type === "cyan"
                              ? "linear-gradient(90deg, var(--ps-cyan), #7DCEFF)"
                              : r.type === "blue"
                                ? "linear-gradient(90deg, var(--ps-blue), var(--ps-cyan))"
                                : "rgba(138,155,191,0.4)",
                          boxShadow:
                            r.type === "cyan"
                              ? "0 0 12px rgba(77,184,255,0.4)"
                              : "none",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        textAlign: "right",
                      }}
                    >
                      {r.pct}%
                    </span>
                  </div>
                ))}
              </div>
              {/* Metric chips */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                {[
                  { v: "$148", l: "costo/lead promedio" },
                  { v: "3.2x", l: "ROI por canal" },
                ].map((m) => (
                  <div
                    key={m.v}
                    style={{
                      background: "rgba(6,13,36,0.5)",
                      border: "1px solid rgba(77,184,255,0.08)",
                      borderRadius: 10,
                      padding: "10px 12px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        letterSpacing: "-0.015em",
                      }}
                    >
                      {m.v}
                    </div>
                    <div
                      style={{ fontSize: 10.5, color: "#8A9BBF", marginTop: 2 }}
                    >
                      {m.l}
                    </div>
                  </div>
                ))}
              </div>
              {/* Insight */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 12px",
                  background: "rgba(77,184,255,0.06)",
                  border: "1px solid rgba(77,184,255,0.3)",
                  borderRadius: 10,
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    flexShrink: 0,
                    background: "rgba(77,184,255,0.15)",
                    color: "#4DB8FF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    style={{ width: 12, height: 12 }}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <span>
                  <strong style={{ color: "#4DB8FF", fontWeight: 700 }}>
                    Insight:
                  </strong>{" "}
                  Facebook trae 2x más cierres que AutoTrader este mes.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
