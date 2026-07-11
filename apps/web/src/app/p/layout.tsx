/**
 * Public product pages layout.
 * Uses landing components (nav, footer) without auth.
 */

import { LandingStyles } from "@/components/landing/landing-styles";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function PublicProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <LandingStyles />
      <div
        style={{
          minHeight: "100vh",
          background: "var(--ps-bg-base)",
          color: "var(--ps-text-primary)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <LandingNav />
        <main style={{ flex: 1 }}>{children}</main>
        <LandingFooter />
      </div>
    </>
  );
}
