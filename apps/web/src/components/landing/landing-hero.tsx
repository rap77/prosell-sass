import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  AvatarStack,
  GlassCard,
  MetricCard,
  PulseDot,
  StarIcon,
} from "./landing-shared";

export function LandingHero() {
  const t = useTranslations("landing.hero");

  return (
    <div className="max-w-[1280px] mx-auto px-8">
      <div className="ps-hero grid grid-cols-[1.05fr_1fr] gap-20 items-center min-h-[calc(100vh-72px)] py-[60px_0_100px]">
        {/* Copy */}
        <div>
          <div className="inline-flex items-center gap-2 py-1.5 pl-3 pr-3.5 bg-ps-badge border border-ps-border-default rounded-full text-[12.5px] font-medium mb-6">
            <PulseDot />
            {t("badge")}
          </div>

          <h1 className="ps-hero-h1 text-[64px] font-extrabold leading-[1.04] tracking-[-0.03em] mb-6">
            {t("titleStart")}{" "}
            <span className="bg-gradient-to-br from-ps-cyan to-ps-blue bg-clip-text text-transparent">
              {t("titleHighlight")}
            </span>
          </h1>

          <p className="text-lg leading-relaxed text-muted-foreground max-w-[520px] mb-9">
            {t("subtitle")}
          </p>

          <div className="ps-cta-row flex gap-3 items-center mb-10">
            <Link
              href="/auth/register"
              className="ps-btn-primary py-[13px] px-6 text-[15px]"
            >
              {t("cta")}
            </Link>
            <Link
              href="/auth/login"
              className="ps-btn-ghost py-[13px] px-6 text-[15px]"
            >
              {t("ctaSecondary")}
            </Link>
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-3.5">
            <AvatarStack
              avatars={[
                {
                  initials: "MR",
                  bg: "linear-gradient(135deg,#4DB8FF,#1E5FD4)",
                },
                {
                  initials: "JC",
                  bg: "linear-gradient(135deg,#22D3A0,#1E5FD4)",
                },
                {
                  initials: "AL",
                  bg: "linear-gradient(135deg,#7DCEFF,#4DB8FF)",
                },
                {
                  initials: "SP",
                  bg: "linear-gradient(135deg,#F5A623,#F04438)",
                },
              ]}
            />
            <div>
              <div className="flex gap-0.5 mb-1">
                {[0, 1, 2, 3, 4].map((s) => (
                  <StarIcon key={s} />
                ))}
              </div>
              <p className="text-[13px] text-muted-foreground m-0">
                <strong className="text-foreground font-semibold">
                  {t("socialProof", { count: "2,400" })}
                </strong>
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className="ps-mockup-col relative flex items-center justify-center min-h-[600px]">
          <div
            aria-hidden="true"
            className="absolute inset-[-20%] blur-[40px] pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(77,184,255,0.18) 0%, rgba(30,95,212,0.12) 30%, transparent 60%)",
            }}
          />

          <GlassCard className="relative w-full max-w-[520px] animate-[ps-float_6s_ease-in-out_infinite]">
            <div className="flex items-center justify-between mb-5">
              <span className="text-[15px] font-semibold">
                {t("mockup.pipeline")}
              </span>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                style={{
                  color: "var(--ps-success)",
                  background: "rgba(34,211,160,0.14)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-ps-success" />
                {t("mockup.live")}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-5">
              {[
                { label: t("mockup.revenue"), value: "$284K", delta: "+12.4%" },
                {
                  label: t("mockup.openDeals"),
                  value: "47",
                  delta: t("mockup.inProgress"),
                },
                { label: t("mockup.winRate"), value: "68%", delta: "+5.2%" },
              ].map((m) => (
                <MetricCard key={m.label} {...m} />
              ))}
            </div>

            <div className="mb-[18px]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-ps-text-secondary tracking-[0.04em]">
                  {t("mockup.closedDeals")}
                </span>
                <span className="text-[10.5px] text-ps-tertiary">S1 — S8</span>
              </div>
              <div className="flex items-end gap-1.5 h-16 px-0.5">
                {[38, 52, 44, 64, 58, 72, 80, 96].map((h, idx) => {
                  const active = idx === 7;
                  return (
                    <div
                      key={idx}
                      className={`flex-1 rounded-t relative ${active ? "shadow-[0_0_18px_rgba(77,184,255,0.45)]" : ""}`}
                      style={{
                        height: `${h}%`,
                        background: active
                          ? "linear-gradient(to top, var(--ps-cyan), var(--ps-cyan-hover))"
                          : "rgba(77,184,255,0.15)",
                      }}
                    >
                      {active && (
                        <div
                          className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-ps-cyan-hover"
                          style={{ boxShadow: "0 0 8px var(--ps-cyan-hover)" }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              className="flex flex-col gap-px rounded-lg overflow-hidden"
              style={{ background: "rgba(77,184,255,0.06)" }}
            >
              {[
                {
                  av: "A",
                  name: "Acme Tech",
                  amount: "$48K",
                  stage: t("mockup.stages.closing"),
                  sc: "var(--ps-success)",
                  sb: "rgba(34,211,160,0.14)",
                  bg: "linear-gradient(135deg,#4DB8FF,#1E5FD4)",
                },
                {
                  av: "N",
                  name: "Northwind Labs",
                  amount: "$32K",
                  stage: t("mockup.stages.demo"),
                  sc: "var(--ps-cyan)",
                  sb: "rgba(77,184,255,0.14)",
                  sbCyan: true,
                  bg: "linear-gradient(135deg,#22D3A0,#1E5FD4)",
                },
                {
                  av: "G",
                  name: "Globex SA",
                  amount: "$76K",
                  stage: t("mockup.stages.proposal"),
                  sc: "var(--ps-warning)",
                  sb: "var(--ps-warning-bg)",
                  bg: "linear-gradient(135deg,#F5A623,#F04438)",
                },
              ].map((d) => (
                <div
                  key={d.name}
                  className="flex items-center gap-3 py-[11px] px-3.5 bg-ps-metric-bg"
                >
                  <div
                    className="w-[30px] h-[30px] rounded-lg shrink-0 flex items-center justify-center text-xs font-bold text-ps-base"
                    style={{ background: d.bg }}
                  >
                    {d.av}
                  </div>
                  <span className="flex-1 text-[13px] font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                    {d.name}
                  </span>
                  <span className="text-[13px] font-bold shrink-0">
                    {d.amount}
                  </span>
                  <span
                    className="text-[10.5px] font-semibold py-0.5 px-2.5 rounded-full shrink-0"
                    style={{ color: d.sc, background: d.sb }}
                  >
                    {d.stage}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Floating badge top */}
          <div
            className="ps-float-badge absolute -top-7 -left-14 inline-flex items-center gap-2 py-2.5 px-3.5 border border-ps-accent-glow-intense rounded-lg backdrop-blur-[20px] text-[12.5px] font-medium whitespace-nowrap z-[2] animate-[ps-float-badge-1_7s_ease-in-out_infinite] text-ps-text-primary"
            style={{
              background: "var(--ps-float-badge-bg)",
              boxShadow: "0 16px 48px rgba(6,13,36,0.55)",
            }}
          >
            <div
              className="w-[26px] h-[26px] rounded-md shrink-0 flex items-center justify-center text-ps-success"
              style={{ background: "rgba(34,211,160,0.15)" }}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </div>
            <div>
              <b className="block font-semibold text-[12.5px]">
                {t("mockup.conversionTitle")}
              </b>
              <span className="text-[10.5px] text-ps-text-secondary">
                {t("mockup.conversionDelta")}
              </span>
            </div>
          </div>

          {/* Floating badge bottom */}
          <div
            className="ps-float-badge absolute -bottom-7 -right-14 inline-flex items-center gap-2 py-2.5 px-3.5 border border-ps-accent-glow-intense rounded-lg backdrop-blur-[20px] text-[12.5px] font-medium whitespace-nowrap z-[2] animate-[ps-float-badge-2_7s_ease-in-out_infinite] text-ps-text-primary"
            style={{
              background: "var(--ps-float-badge-bg)",
              boxShadow: "0 16px 48px rgba(6,13,36,0.55)",
            }}
          >
            <div
              className="w-[26px] h-[26px] rounded-md shrink-0 flex items-center justify-center text-ps-cyan"
              style={{ background: "rgba(77,184,255,0.15)" }}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div>
              <b className="block font-semibold text-[12.5px]">
                {t("mockup.dealClosed")} · $48K
              </b>
              <span className="text-[10.5px] text-ps-text-secondary">
                Acme Tech
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
