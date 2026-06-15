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
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Label row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--ps-text-secondary)",
          }}
        >
          Paso {currentStep} de {totalSteps}
        </span>
        <span
          style={{ fontSize: 12, fontWeight: 600, color: "var(--ps-cyan)" }}
        >
          {percent}%
        </span>
      </div>

      {/* Progress track */}
      <div
        style={{
          height: 6,
          width: "100%",
          borderRadius: 99,
          background: "var(--ps-bg-elevated)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${percent}%`,
            borderRadius: 99,
            background:
              "linear-gradient(90deg, var(--ps-cyan), var(--ps-blue))",
            transition: "width 300ms ease",
          }}
        />
      </div>

      {/* Step dots */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {Array.from({ length: totalSteps }, (_, i) => {
          const done = i + 1 <= currentStep;
          return (
            <div
              key={i}
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                background: done
                  ? "linear-gradient(135deg, var(--ps-cyan), var(--ps-blue))"
                  : "var(--ps-bg-elevated)",
                color: done ? "var(--ps-bg-base)" : "var(--ps-text-tertiary)",
                border: done ? "none" : "1px solid var(--ps-border-default)",
                transition: "background 300ms, color 300ms",
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
