"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, List, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactElement } from "react";

// GGA TypeScript const-types
const WIZARD_VARIANT = {
  AUTO: "auto",
  MOBILE: "mobile",
  DESKTOP: "desktop",
} as const;

type WizardVariant = (typeof WIZARD_VARIANT)[keyof typeof WIZARD_VARIANT];

interface WizardContainerProps {
  children: ReactElement;
  /**
   * Auto-detect viewport or force a variant
   * ponytail: simple auto-detect via window.innerWidth
   */
  variant?: WizardVariant;
}

/**
 * WizardContainer — Wraps any form with wizard UX without modifying it.
 *
 * Mobile: Sequential steps (1 section visible at a time)
 * Desktop: Jump-to-section tabs + all sections visible
 *
 * How it works:
 * 1. Finds all <section> elements in children
 * 2. Controls visibility via CSS (display: none)
 * 3. Adds navigation (Next/Previous on mobile, tabs on desktop)
 * 4. Intercepts form submit (only allows on last step)
 *
 * ponytail: Zero changes to wrapped form, pure wrapper pattern
 */
export function WizardContainer({
  children,
  variant = "auto",
}: WizardContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [sections, setSections] = useState<HTMLElement[]>([]);
  // ponytail: state only for auto mode, derive isMobile to avoid setState in effect
  const [isAutoAndMobile, setIsAutoAndMobile] = useState(false);
  // FAB menu state (mobile only)
  const [isNavOpen, setIsNavOpen] = useState(false);

  // Auto mode: listen to viewport resize
  useEffect(() => {
    if (variant !== "auto") return;

    const checkMobile = () => setIsAutoAndMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [variant]);

  // Derive isMobile: auto uses state (updates on resize), mobile/desktop use variant directly
  const isMobile = variant === "auto" ? isAutoAndMobile : variant === "mobile";

  // Find all sections after mount + re-scan when DOM changes
  useEffect(() => {
    if (!containerRef.current) return;

    const scanSections = () => {
      if (!containerRef.current) return;
      const formSections = Array.from(
        containerRef.current.querySelectorAll("section"),
      ).filter((el): el is HTMLElement => el instanceof HTMLElement);

      // Filter out nested sections
      const topLevelSections = formSections.filter((section) => {
        const parent = section.parentElement;
        return parent?.tagName !== "SECTION";
      });

      // The desktop layout reparents the form after the sidebar appears.
      // Keep references current so scrollIntoView targets connected elements.
      setSections((previousSections) => {
        const sectionsAreUnchanged =
          previousSections.length === topLevelSections.length &&
          previousSections.every(
            (section, index) => section === topLevelSections[index],
          );

        return sectionsAreUnchanged ? previousSections : topLevelSections;
      });
    };

    // Initial scan + delayed re-scan for async content
    scanSections();
    const timeout = setTimeout(scanSections, 100);

    // Watch for DOM changes (sections added/removed)
    const observer = new MutationObserver(scanSections);
    observer.observe(containerRef.current, { childList: true, subtree: true });

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, [children]);

  // Control section visibility
  useEffect(() => {
    if (!isMobile || sections.length === 0) {
      // Desktop: show all sections
      sections.forEach((section) => {
        section.style.display = "";
      });
      return;
    }

    // Mobile: show only current step
    sections.forEach((section, index) => {
      section.style.display = index === currentStep ? "" : "none";
    });
  }, [currentStep, sections, isMobile]);

  const handleNext = () => {
    if (currentStep < sections.length - 1) {
      setCurrentStep((prev) => prev + 1);
      // Scroll to top of form
      containerRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      containerRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleJumpToSection = (index: number) => {
    setCurrentStep(index);
    setIsNavOpen(false);
    // Scroll to section
    sections[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Extract section titles for tabs/progress
  // Prefer data-label (clean title) over textContent (may include counters)
  const sectionTitles = sections.map((section, idx) => {
    const heading = section.querySelector("h2");
    return (
      heading?.getAttribute("data-label") ||
      heading?.textContent ||
      `Step ${idx + 1}`
    );
  });

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === sections.length - 1;

  // Desktop: sidebar layout
  if (!isMobile && sections.length > 0) {
    return (
      <div ref={containerRef} className="relative flex gap-6">
        {/* Sidebar navigation */}
        <nav
          aria-label="Secciones"
          className="sticky top-4 z-10 h-fit w-48 shrink-0 rounded-lg border bg-muted/30 p-3"
        >
          <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Secciones
          </div>
          <div className="flex flex-col gap-1">
            {sectionTitles.map((title, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleJumpToSection(index)}
                className={cn(
                  "cursor-pointer rounded px-2 py-1.5 text-left text-sm transition-colors",
                  currentStep === index
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {title}
              </button>
            ))}
          </div>
        </nav>

        {/* Form content */}
        <div className="min-w-0 flex-1">
          {children}
          {/* Lets trailing sections align with the top of the scroll container. */}
          <div aria-hidden="true" className="h-[calc(100vh-8rem)]" />
        </div>
      </div>
    );
  }

  // Mobile layout
  return (
    <div ref={containerRef} className="relative">
      {/* Mobile: FAB navigation */}
      {isMobile && sections.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[9999]">
          {isNavOpen && (
            <div className="mb-2 flex flex-col gap-1 rounded-lg border bg-background p-2 shadow-lg">
              {sectionTitles.map((title, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleJumpToSection(index)}
                  className={cn(
                    "rounded px-3 py-1.5 text-left text-sm transition-colors",
                    currentStep === index
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {title}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsNavOpen((prev) => !prev)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
            aria-label={isNavOpen ? "Cerrar navegación" : "Ir a sección"}
          >
            {isNavOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <List className="h-5 w-5" />
            )}
          </button>
        </div>
      )}

      {/* Mobile: Progress indicator */}
      {isMobile && sections.length > 0 && (
        <div className="mb-4 flex items-center justify-between border-b pb-4">
          <div className="text-sm font-medium">
            Step {currentStep + 1} of {sections.length}
          </div>
          <div className="text-sm text-muted-foreground">
            {sectionTitles[currentStep]}
          </div>
        </div>
      )}

      {/* Original form (unmodified) */}
      {children}

      {/* Mobile: Navigation buttons */}
      {isMobile && sections.length > 0 && (
        <div className="mt-6 flex justify-between border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstStep}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          {!isLastStep && (
            <Button type="button" onClick={handleNext}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
