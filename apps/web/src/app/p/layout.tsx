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
        className="flex min-h-screen flex-col"
        style={{
          background: "var(--ps-bg-base)",
          color: "var(--ps-text-primary)",
        }}
      >
        <LandingNav />
        <main className="flex-1">{children}</main>
        <LandingFooter />
      </div>
    </>
  );
}
