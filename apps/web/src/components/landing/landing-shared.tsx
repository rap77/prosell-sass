// ponytail: shared landing components extracted when second consumer appeared
// these are used across 10+ landing files

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// --- Icons ---

export const CheckIcon = ({ size = 12 }: { size?: number }) => (
  <svg
    style={{ width: size, height: size }}
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    viewBox="0 0 24 24"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const StarIcon = () => (
  <svg className="w-3 h-3 text-ps-warning" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

// --- Status dots ---

export const StatusDot = ({ color = "currentColor" }: { color?: string }) => (
  <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
);

export const PulseDot = ({ color = "var(--ps-cyan)" }: { color?: string }) => (
  <span className="relative w-2 h-2 inline-block shrink-0">
    <span className="absolute inset-0 rounded-full" style={{ background: color }} />
    <span
      className="absolute -inset-1 rounded-full opacity-50 animate-[ps-pulse_1.8s_cubic-bezier(0.16,1,0.3,1)_infinite]"
      style={{ background: color }}
    />
  </span>
);

// --- Text elements ---

export const SectionLabel = ({ children }: { children: ReactNode }) => (
  <span className="inline-block text-xs font-semibold tracking-[0.18em] uppercase text-ps-cyan mb-[18px]">
    {children}
  </span>
);

export const SectionTitle = ({ children }: { children: ReactNode }) => (
  <h2 className="text-[44px] font-extrabold leading-[1.1] tracking-[-0.025em] mb-[18px]">
    {children}
  </h2>
);

export const SectionSubtitle = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p className={cn("text-[17px] leading-relaxed text-muted-foreground max-w-[600px] mx-auto", className)}>
    {children}
  </p>
);

// --- Badges ---

export const FeatureBadge = ({ children }: { children: ReactNode }) => (
  <span className="inline-block px-3 py-1 rounded-full bg-ps-badge border border-ps-border-medium text-ps-cyan text-[11px] font-bold tracking-[0.14em] uppercase mb-5">
    {children}
  </span>
);

export const LiveBadge = ({ children, color = "#4DB8FF", bg = "rgba(77,184,255,0.14)" }: { children: ReactNode; color?: string; bg?: string }) => (
  <span
    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
    style={{ color, background: bg }}
  >
    <StatusDot />
    {children}
  </span>
);

// --- List items ---

export const BulletItem = ({ children }: { children: ReactNode }) => (
  <li className="flex items-start gap-3 text-sm leading-relaxed">
    <span className="shrink-0 w-[22px] h-[22px] rounded-full bg-ps-badge border border-ps-border-medium text-ps-cyan inline-flex items-center justify-center mt-0.5">
      <CheckIcon size={12} />
    </span>
    {children}
  </li>
);

export const CheckItem = ({ children }: { children: ReactNode }) => (
  <li className="flex items-start gap-2.5 text-[13.5px] leading-snug">
    <span className="shrink-0 w-[18px] h-[18px] rounded-full bg-ps-info-bg text-ps-cyan inline-flex items-center justify-center mt-0.5">
      <CheckIcon size={11} />
    </span>
    {children}
  </li>
);

export const TrustItem = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
    <svg className="w-3.5 h-3.5 text-ps-cyan" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12" />
    </svg>
    {children}
  </span>
);

// --- Cards ---

export const MockCardWrapper = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("ps-ft-mock relative flex justify-center items-center min-h-[380px]", className)}>
    <div
      aria-hidden="true"
      className="absolute inset-[-10%] blur-[40px] pointer-events-none"
      style={{
        background:
          "radial-gradient(ellipse at center, rgba(77,184,255,0.12), transparent 60%)",
      }}
    />
    <div
      className="relative w-full max-w-[480px] bg-ps-glass-bg border border-ps-accent-glow-medium rounded-2xl backdrop-blur-[20px] p-[22px] text-ps-text-primary"
      style={{
        boxShadow:
          "0 0 60px rgba(77,184,255,0.08), 0 16px 48px rgba(6,13,36,0.55)",
      }}
    >
      {children}
    </div>
  </div>
);

export const GlassCard = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div
    className={cn(
      "bg-ps-glass-bg-strong border border-ps-accent-glow rounded-[20px] backdrop-blur-[24px] p-[22px] text-ps-text-primary",
      className,
    )}
    style={{
      boxShadow:
        "0 32px 80px rgba(6,13,36,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
    }}
  >
    {children}
  </div>
);

export const MetricCard = ({ label, value, delta }: { label: string; value: string; delta?: string }) => (
  <div className="bg-ps-metric-bg border border-ps-accent-glow-soft rounded-lg py-3 px-3.5">
    <div className="text-[10.5px] text-ps-text-secondary mb-1 tracking-[0.04em]">{label}</div>
    <div className="text-xl font-bold tracking-[-0.02em] leading-none">{value}</div>
    {delta && <div className="text-[10.5px] text-ps-success font-semibold mt-0.5">{delta}</div>}
  </div>
);

// --- Avatars ---

interface Avatar {
  initials: string;
  bg: string;
}

interface AvatarStackProps {
  avatars: Avatar[];
}

export const AvatarStack = ({ avatars }: AvatarStackProps) => (
  <div className="flex">
    {avatars.map(({ initials, bg }, idx) => (
      <div
        key={initials}
        className="w-[34px] h-[34px] rounded-full inline-flex items-center justify-center font-semibold text-[11px] text-ps-base border-2 border-ps-base shrink-0"
        style={{ background: bg, marginLeft: idx === 0 ? 0 : -8 }}
      >
        {initials}
      </div>
    ))}
  </div>
);

// --- Background decorations ---

const SECTION_GRADIENT_VARIANTS = {
  default:
    "radial-gradient(ellipse 40% 30% at 10% 30%, rgba(77,184,255,0.06), transparent 60%), radial-gradient(ellipse 40% 30% at 90% 70%, rgba(30,95,212,0.10), transparent 60%)",
  "top-bottom":
    "radial-gradient(50% 35% at 50% 0%, rgba(77,184,255,0.08), transparent 60%), radial-gradient(60% 40% at 50% 100%, rgba(30,95,212,0.10), transparent 60%)",
  center:
    "radial-gradient(ellipse at center, rgba(77,184,255,0.18) 0%, rgba(30,95,212,0.12) 30%, transparent 60%)",
} as const;

type SectionGradientVariant = keyof typeof SECTION_GRADIENT_VARIANTS;

interface SectionGradientBgProps {
  variant?: SectionGradientVariant;
}

export const SectionGradientBg = ({ variant = "default" }: SectionGradientBgProps) => (
  <div
    aria-hidden="true"
    className="absolute inset-0 pointer-events-none"
    style={{ background: SECTION_GRADIENT_VARIANTS[variant] }}
  />
);
