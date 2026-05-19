"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { orgApi, type Organization } from "@/lib/api/orgApi";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { OnboardingStep1, type Step1Data } from "@/components/onboarding/OnboardingStep1";
import { OnboardingStep2, type Step2Data } from "@/components/onboarding/OnboardingStep2";
import { OnboardingStep3 } from "@/components/onboarding/OnboardingStep3";

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [org, setOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // A4.11: check setup_complete — redirect existing users
  useEffect(() => {
    let cancelled = false;
    async function checkSetup() {
      try {
        const data = await orgApi.getMyOrganization("");
        if (cancelled) return;
        if (data.setup_complete) {
          router.replace("/dashboard");
          return;
        }
        setOrg(data);
      } catch {
        // No org or not authenticated — let middleware handle it
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    }
    void checkSetup();
    return () => { cancelled = true; };
  }, [router]);

  async function completeSetup() {
    setIsLoading(true);
    try {
      await orgApi.completeSetup();
      toast.success("¡Configuración completada!", {
        description: "Tu organización está lista para operar.",
      });
      router.push("/dashboard");
    } catch {
      toast.error("No se pudo guardar la configuración", {
        description: "Podés intentarlo de nuevo desde Configuración.",
      });
      router.push("/dashboard");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStep1(data: Step1Data) {
    setIsLoading(true);
    try {
      if (org) {
        await orgApi.update(org.id, {
          name: data.name,
          description: data.description ?? undefined,
          phone: data.phone ?? undefined,
          website: data.website ?? undefined,
        });
      }
    } catch {
      // Non-blocking — continue to next step
    } finally {
      setIsLoading(false);
    }
    setStep(2);
  }

  function handleStep2(_data: Step2Data) {
    // Timezone/currency stored server-side in future; skip for now
    setStep(3);
  }

  if (isFetching) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-lg space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">Bienvenido a ProSell</h1>
          <p className="mt-1 text-muted-foreground">
            Completá estos pasos rápidos para dejar tu cuenta lista
          </p>
        </div>

        {/* Progress */}
        <OnboardingProgress currentStep={step} totalSteps={TOTAL_STEPS} />

        {/* Step content */}
        <div className="rounded-xl border bg-background p-6 shadow-sm">
          {step === 1 && (
            <OnboardingStep1
              defaultValues={{ name: org?.name ?? "" }}
              onNext={handleStep1}
              onSkip={() => setStep(2)}
              isLoading={isLoading}
            />
          )}
          {step === 2 && (
            <OnboardingStep2
              onNext={handleStep2}
              onBack={() => setStep(1)}
              onSkip={() => setStep(3)}
              isLoading={isLoading}
            />
          )}
          {step === 3 && (
            <OnboardingStep3
              onComplete={completeSetup}
              onBack={() => setStep(2)}
              onSkip={completeSetup}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
