/**
 * Landing page — ProSell SaaS.
 *
 * Server Component. Thin orchestrator — each section lives in its own component:
 * src/components/landing/landing-[section].tsx
 *
 * To hide or edit a section, simply comment out or modify the relevant component.
 */

import { LandingStyles } from "@/components/landing/landing-styles";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingProofStrip } from "@/components/landing/landing-proof-strip";
import { LandingProblemSolution } from "@/components/landing/landing-problem-solution";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingMetrics } from "@/components/landing/landing-metrics";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingTestimonials } from "@/components/landing/landing-testimonials";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingFinalCta } from "@/components/landing/landing-final-cta";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function HomePage() {
  return (
    <>
      <LandingStyles />

      <div
        style={{
          minHeight: "100vh",
          background: "var(--ps-bg-base)",
          color: "var(--ps-text-primary)",
          overflowX: "hidden",
        }}
      >
        {/* Fixed background decoration */}
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 0,
            pointerEvents: "none",
            backgroundImage:
              "linear-gradient(var(--ps-landing-grid) 1px, transparent 1px), linear-gradient(90deg, var(--ps-landing-grid) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse 60% 50% at 80% 20%, var(--ps-landing-glow-1), transparent 60%)",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse 50% 40% at 10% 80%, var(--ps-landing-glow-2), transparent 60%)",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <LandingNav />

          <main>
            <LandingHero />
            <LandingProofStrip />
            <LandingProblemSolution />
            <LandingFeatures />
            <LandingMetrics />
            <LandingPricing />
            <LandingHowItWorks />
            <LandingTestimonials />
            <LandingFaq />
            <LandingFinalCta />
          </main>

          <LandingFooter />
        </div>
      </div>
    </>
  );
}
