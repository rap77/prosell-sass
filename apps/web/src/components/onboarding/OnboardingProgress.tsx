/**
 * OnboardingProgress — ProSell step indicator bar.
 *
 * Shows current step out of total with a progress bar + step dots.
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function OnboardingProgress({
  currentStep,
  totalSteps,
}: OnboardingProgressProps) {
  const percent = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="flex flex-col gap-2.5">
      {/* Label row */}
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-ps-text-secondary">
          Paso {currentStep} de {totalSteps}
        </span>
        <span className="text-xs font-semibold text-ps-cyan">{percent}%</span>
      </div>

      {/* Progress track */}
      <div className="h-1.5 w-full rounded-full bg-ps-elevated overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${percent}%`,
            background:
              "linear-gradient(90deg, var(--ps-cyan), var(--ps-blue))",
          }}
        />
      </div>

      {/* Step dots */}
      <div className="flex justify-between">
        {Array.from({ length: totalSteps }, (_, i) => {
          const done = i + 1 <= currentStep;
          return (
            <div
              key={i}
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300"
              style={{
                background: done
                  ? "linear-gradient(135deg, var(--ps-cyan), var(--ps-blue))"
                  : "var(--ps-bg-elevated)",
                color: done ? "var(--ps-bg-base)" : "var(--ps-text-tertiary)",
                border: done ? "none" : "1px solid var(--ps-border-default)",
              }}
            >
              {i + 1}
            </div>
          );
        })}
      </div>
    </div>
  );
}
