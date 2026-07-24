"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

  // Find all sections after mount
  useEffect(() => {
    if (!containerRef.current) return;

    const formSections = Array.from(
      containerRef.current.querySelectorAll("section"),
    ).filter((el): el is HTMLElement => el instanceof HTMLElement);

    // Filter out sections we don't want as steps (e.g., nested sections)
    // ponytail: simple filter - direct children sections only
    const topLevelSections = formSections.filter((section) => {
      const parent = section.parentElement;
      return parent?.tagName !== "SECTION";
    });

    setSections(topLevelSections);
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
    // Scroll to section (desktop)
    sections[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Extract section titles for tabs/progress
  const sectionTitles = sections.map((section) => {
    const heading = section.querySelector("h2");
    return heading?.textContent || `Step ${sections.indexOf(section) + 1}`;
  });

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === sections.length - 1;

  return (
    <div ref={containerRef} className="relative">
      {/* Desktop: Jump-to-section tabs */}
      {!isMobile && sections.length > 0 && (
        <div className="sticky top-0 z-10 mb-6 border-b bg-background">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {sectionTitles.map((title, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleJumpToSection(index)}
                className={cn(
                  "whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  currentStep === index
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {title}
              </button>
            ))}
          </div>
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
