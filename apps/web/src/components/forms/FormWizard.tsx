"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export interface WizardStep {
  id: string;
  title: string;
  content: ReactNode;
  validate?: () => boolean | Promise<boolean>;
}

// GGA TypeScript const-types
const FORM_WIZARD_VARIANT = {
  MOBILE: "mobile",
  DESKTOP: "desktop",
} as const;

type FormWizardVariant =
  (typeof FORM_WIZARD_VARIANT)[keyof typeof FORM_WIZARD_VARIANT];

export interface FormWizardProps {
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  /**
   * Mobile: sequential steps (1 at a time)
   * Desktop: tabs (all steps visible, click to switch)
   */
  variant?: FormWizardVariant;
}

/**
 * FormWizard — Reusable wizard component for multi-step forms.
 *
 * Features:
 * - Mobile: Sequential navigation (Next/Previous buttons)
 * - Desktop: Tab navigation (click any step)
 * - Step validation before navigation
 * - Progress indicator
 *
 * ponytail: minimal wizard, no animations (add later if needed)
 */
export function FormWizard({
  steps,
  currentStep,
  onStepChange,
  onSubmit,
  isSubmitting = false,
  variant = "mobile",
}: FormWizardProps) {
  const isMobile = variant === "mobile";
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const currentStepData = steps[currentStep];

  const handleNext = async () => {
    // Validate current step before proceeding
    if (currentStepData?.validate) {
      const isValid = await currentStepData.validate();
      if (!isValid) return;
    }

    if (isLastStep) {
      onSubmit();
    } else {
      onStepChange(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      onStepChange(currentStep - 1);
    }
  };

  const handleTabClick = (index: number) => {
    // Desktop: allow jumping to any step (no validation on tab click)
    if (!isMobile) {
      onStepChange(index);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress indicator (mobile) or Tabs (desktop) */}
      {isMobile ? (
        <div className="flex items-center justify-between border-b pb-4">
          <div className="text-sm font-medium">
            Step {currentStep + 1} of {steps.length}
          </div>
          <div className="text-sm text-muted-foreground">
            {currentStepData?.title}
          </div>
        </div>
      ) : (
        <div role="tablist" className="flex border-b">
          {steps.map((step, index) => (
            <button
              key={step.id}
              role="tab"
              aria-selected={index === currentStep}
              onClick={() => handleTabClick(index)}
              className={cn(
                "flex-1 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                index === currentStep
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {step.title}
            </button>
          ))}
        </div>
      )}

      {/* Current step content */}
      <div className="py-4">{currentStepData?.content}</div>

      {/* Navigation buttons */}
      <div className="flex justify-between border-t pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrevious}
          disabled={isFirstStep}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        <Button type="button" onClick={handleNext} disabled={isSubmitting}>
          {isSubmitting ? (
            "Submitting..."
          ) : isLastStep ? (
            "Submit"
          ) : (
            <>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
