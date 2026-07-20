// ponytail: landing features with Tailwind utilities
import { BulletItem, FeatureBadge, MockCardWrapper, StatusDot } from "./landing-shared";

const BAR_STYLES: Record<string, { background: string; boxShadow: string }> = {
  cyan: {
    background: "linear-gradient(90deg, var(--ps-cyan), var(--ps-cyan-hover))",
    boxShadow: "0 0 12px rgba(77,184,255,0.4)",
  },
  blue: {
    background: "linear-gradient(90deg, var(--ps-blue), var(--ps-cyan))",
    boxShadow: "none",
  },
  muted: {
    background: "rgba(138,155,191,0.4)",
    boxShadow: "none",
  },
};

export function LandingFeatures() {
  return (
    <section
      id="producto"
      className="relative py-[120px] px-8 border-t border-ps-border-subtle overflow-hidden"
    >
      {/* Background gradient */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 40% 30% at 10% 30%, rgba(77,184,255,0.06), transparent 60%), radial-gradient(ellipse 40% 30% at 90% 70%, rgba(30,95,212,0.10), transparent 60%)",
        }}
      />

      <div className="relative z-[1] max-w-[1280px] mx-auto">
        {/* Head */}
        <div className="text-center max-w-[760px] mx-auto mb-24">
          <span className="inline-block text-xs font-semibold tracking-[0.18em] uppercase text-ps-cyan mb-[18px]">
            Funcionalidades
          </span>
          <h2 className="ps-ft-h2 text-[44px] font-extrabold leading-[1.1] tracking-[-0.025em] mb-[18px]">
            Todo lo que necesitás para vender más
          </h2>
          <p className="text-[17px] leading-relaxed text-muted-foreground max-w-[600px] mx-auto">
            Sin apps extras. Sin integraciones complicadas. Todo dentro de ProSell desde el día uno.
          </p>
        </div>

        {/* Row 1: Distribución */}
        <div className="ps-ft-row grid grid-cols-2 gap-20 items-center mb-[100px]">
          <div className="ps-ft-text max-w-[520px]">
            <FeatureBadge>Distribución</FeatureBadge>
            <h3 className="ps-ft-h3 text-[32px] font-bold leading-[1.2] tracking-[-0.022em] mb-[18px]">
              Publicá en todos los canales en 2 minutos
            </h3>
            <p className="text-base leading-relaxed text-muted-foreground mb-6">
              Cargás el producto una sola vez y ProSell lo distribuye automáticamente a todos los portales y redes activas para tu nicho. Sin copiar, sin pegar, sin errores.
            </p>
            <ul className="list-none p-0 m-0 flex flex-col gap-3">
              <BulletItem>Facebook Marketplace, AutoTrader, Cars.com y más</BulletItem>
              <BulletItem>Fotos, precio y descripción sincronizados automáticamente</BulletItem>
              <BulletItem>Alertas si algún canal falla en la publicación</BulletItem>
            </ul>
          </div>
          <MockCardWrapper>
            <div className="flex items-center justify-between mb-[18px]">
              <span className="text-sm font-semibold">Nueva publicación</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-ps-success-bg text-ps-success text-[11px] font-semibold">
                <StatusDot />
                Publicando…
              </span>
            </div>
            {/* Vehicle card */}
            <div className="flex items-center gap-3.5 bg-ps-metric-bg border border-ps-accent-glow-soft rounded-xl p-3 mb-4">
              <div
                className="w-[78px] h-[60px] shrink-0 rounded-lg border border-ps-accent-glow-soft flex items-center justify-center text-ps-tertiary"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(77,184,255,0.18), rgba(30,95,212,0.25))",
                }}
              >
                <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <rect x="2" y="9" width="20" height="11" rx="2" />
                  <path d="M5 9V7a2 2 0 012-2h10a2 2 0 012 2v2" />
                  <circle cx="7" cy="20" r="1" />
                  <circle cx="17" cy="20" r="1" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold mb-1">Toyota Corolla 2024</div>
                <div className="text-[15px] font-bold text-ps-cyan tracking-[-0.01em]">$28.500</div>
              </div>
            </div>
            {/* Channel grid */}
            <div className="grid grid-cols-2 gap-2 mb-[18px]">
              {[
                { swatch: "#1877F2", label: "FB Marketplace", abbr: "f" },
                { swatch: "#F5A623", label: "AutoTrader", abbr: "AT" },
                { swatch: "#F04438", label: "Cars.com", abbr: "C" },
                { swatch: "#22D3A0", label: "CarGurus", abbr: "CG" },
              ].map((ch) => (
                <div
                  key={ch.label}
                  className="flex items-center gap-2.5 py-[9px] px-3 rounded-[10px] border border-ps-accent-glow-soft bg-ps-metric-bg text-xs font-semibold"
                >
                  <span
                    className="w-[22px] h-[22px] rounded-md shrink-0 flex items-center justify-center text-[10px] font-bold text-ps-base"
                    style={{ background: ch.swatch }}
                  >
                    {ch.abbr}
                  </span>
                  <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{ch.label}</span>
                  <span className="w-[18px] h-[18px] rounded-full bg-ps-success flex items-center justify-center shrink-0">
                    <svg className="w-[11px] h-[11px] text-ps-base" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                </div>
              ))}
            </div>
            {/* Progress bar */}
            <div className="h-1.5 rounded-full bg-ps-border-subtle overflow-hidden mb-2">
              <div className="h-full w-full bg-gradient-to-r from-ps-cyan to-ps-cyan-hover shadow-[0_0_12px_rgba(77,184,255,0.5)] rounded-full" />
            </div>
            <div className="flex justify-between text-[11.5px] text-ps-text-secondary">
              <span className="text-ps-success font-semibold">4/4 canales publicados</span>
              <span>00:01:48</span>
            </div>
          </MockCardWrapper>
        </div>

        {/* Row 2: Leads (reversed) */}
        <div className="ps-ft-row reverse grid grid-cols-2 gap-20 items-center mb-[100px]">
          <MockCardWrapper>
            <div className="flex items-center justify-between mb-[18px]">
              <span className="text-sm font-semibold">Leads · Hoy</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-ps-badge text-ps-cyan text-[11px] font-semibold">
                <StatusDot />
                12 nuevos
              </span>
            </div>
            {/* Lead rows */}
            <div
              className="flex flex-col gap-px rounded-xl overflow-hidden mb-3.5"
              style={{ background: "rgba(77,184,255,0.06)" }}
            >
              {[
                { av: "MR", bg: "linear-gradient(135deg,#4DB8FF,#1E5FD4)", name: "Martín Rivas", src: "FB", srcC: "var(--ps-cyan)", srcBg: "rgba(77,184,255,0.15)", time: "hace 2 min", status: "Respondido < 60s", ok: true },
                { av: "JC", bg: "linear-gradient(135deg,#22D3A0,#1E5FD4)", name: "Julieta Castro", src: "AT", srcC: "#F5A623", srcBg: "rgba(245,166,35,0.15)", time: "hace 15 min", status: "Respondido < 60s", ok: true },
                { av: "SP", bg: "linear-gradient(135deg,#F5A623,#F04438)", name: "Sofía Paz", src: "Directo", srcC: "#22D3A0", srcBg: "rgba(34,211,160,0.15)", time: "hace 1 hora", status: "Pendiente", ok: false },
              ].map((l) => (
                <div key={l.name} className="flex items-center gap-3 py-[11px] px-3 bg-ps-metric-bg">
                  <div
                    className="w-[34px] h-[34px] rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-ps-base"
                    style={{ background: l.bg }}
                  >
                    {l.av}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold flex items-center gap-2 mb-0.5">
                      {l.name}
                      <span
                        className="text-[9.5px] font-bold py-0.5 px-1.5 rounded tracking-[0.04em]"
                        style={{ color: l.srcC, background: l.srcBg }}
                      >
                        {l.src}
                      </span>
                    </div>
                    <div className="text-[11px] text-ps-tertiary">{l.time}</div>
                  </div>
                  <span
                    className="text-[10.5px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
                    style={{ color: l.ok ? "var(--ps-success)" : "var(--ps-warning)" }}
                  >
                    <StatusDot />
                    {l.status}
                  </span>
                </div>
              ))}
            </div>
            {/* AI input */}
            <div className="flex items-center gap-2.5 py-2.5 px-3 bg-ps-field-tag-bg border border-ps-border-medium rounded-xl">
              <span className="text-[10px] font-bold tracking-[0.08em] py-0.5 px-1.5 rounded bg-ps-info-bg text-ps-cyan">
                IA
              </span>
              <span className="flex-1 text-[13px] text-ps-text-secondary">Responder con IA…</span>
              <div className="w-[30px] h-[30px] rounded-lg bg-ps-cyan flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-ps-base" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </div>
            </div>
          </MockCardWrapper>
          <div className="ps-ft-text max-w-[520px]">
            <FeatureBadge>Leads</FeatureBadge>
            <h3 className="ps-ft-h3 text-[32px] font-bold leading-[1.2] tracking-[-0.022em] mb-[18px]">
              Todos tus leads, respondidos antes que tu competencia
            </h3>
            <p className="text-base leading-relaxed text-muted-foreground mb-6">
              Sin importar de qué canal venga — Facebook, portal, formulario web — todos llegan al mismo inbox inteligente. Respondés en segundos, no en horas.
            </p>
            <ul className="list-none p-0 m-0 flex flex-col gap-3">
              <BulletItem>Inbox unificado multi-canal y multi-nicho</BulletItem>
              <BulletItem>Respuesta asistida por IA con contexto del lead</BulletItem>
              <BulletItem>Alertas automáticas si un lead lleva más de 60s sin respuesta</BulletItem>
            </ul>
          </div>
        </div>

        {/* Row 3: Inteligencia */}
        <div className="ps-ft-row grid grid-cols-2 gap-20 items-center">
          <div className="ps-ft-text max-w-[520px]">
            <FeatureBadge>Inteligencia</FeatureBadge>
            <h3 className="ps-ft-h3 text-[32px] font-bold leading-[1.2] tracking-[-0.022em] mb-[18px]">
              Sabé exactamente qué canal cierra más
            </h3>
            <p className="text-base leading-relaxed text-muted-foreground mb-6">
              ProSell rastrea cada lead desde el origen hasta el cierre. Sabés cuánto gastás por lead, qué canal convierte mejor y qué vendedor necesita soporte — todo en tiempo real.
            </p>
            <ul className="list-none p-0 m-0 flex flex-col gap-3">
              <BulletItem>Attribution completa por canal y por vendedor</BulletItem>
              <BulletItem>Pricing dinámico: alertas cuando el stock se mueve lento</BulletItem>
              <BulletItem>Dashboard de ROI: costo por lead vs revenue cerrado</BulletItem>
            </ul>
          </div>
          <MockCardWrapper>
            <div className="flex items-center justify-between mb-[18px]">
              <span className="text-sm font-semibold">Performance · Q2 2026</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-ps-badge text-ps-cyan text-[11px] font-semibold">
                <StatusDot />
                En vivo
              </span>
            </div>
            {/* Bar chart */}
            <div className="flex flex-col gap-3 mb-[18px]">
              {[
                { label: "Facebook", pct: 68, type: "cyan" },
                { label: "AutoTrader", pct: 52, type: "blue" },
                { label: "Cars.com", pct: 38, type: "muted" },
              ].map((r) => (
                <div key={r.label} className="grid grid-cols-[90px_1fr_50px] gap-3 items-center">
                  <span className="text-[12.5px] font-semibold">{r.label}</span>
                  <div className="h-2.5 rounded-full bg-ps-accent-glow-soft overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${r.pct}%`, ...BAR_STYLES[r.type] }}
                    />
                  </div>
                  <span className="text-xs font-bold text-right">{r.pct}%</span>
                </div>
              ))}
            </div>
            {/* Metric chips */}
            <div className="grid grid-cols-2 gap-2 mb-3.5">
              {[
                { v: "$148", l: "costo/lead promedio" },
                { v: "3.2x", l: "ROI por canal" },
              ].map((m) => (
                <div key={m.v} className="bg-ps-metric-bg border border-ps-accent-glow-soft rounded-[10px] py-2.5 px-3">
                  <div className="text-base font-bold tracking-[-0.015em]">{m.v}</div>
                  <div className="text-[10.5px] text-ps-text-secondary mt-0.5">{m.l}</div>
                </div>
              ))}
            </div>
            {/* Insight */}
            <div className="flex items-start gap-2.5 py-2.5 px-3 bg-ps-hover-bg-sm border border-ps-border-strong rounded-[10px] text-xs leading-relaxed">
              <div className="w-[22px] h-[22px] rounded-md shrink-0 bg-ps-badge text-ps-cyan flex items-center justify-center">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <span>
                <strong className="text-ps-cyan font-bold">Insight:</strong> Facebook trae 2x más cierres que AutoTrader este mes.
              </span>
            </div>
          </MockCardWrapper>
        </div>
      </div>
    </section>
  );
}
