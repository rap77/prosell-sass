"use client";

/**
 * OnboardingPage — ProSell 3-step setup wizard.
 *
 * Flow:
 *   1. Check org setup_complete — redirect to /dashboard if already done
 *   2. Step 1: Organization basics (name, description, phone, website)
 *   3. Step 2: Timezone & currency preferences
 *   4. Step 3: Invite team member (optional)
 *   5. completeSetup() → POST → redirect to /dashboard
 *
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { orgApi, useMyOrganization } from "@/lib/api/orgApi";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import {
  OnboardingStep1,
  type Step1Data,
} from "@/components/onboarding/OnboardingStep1";
import {
  OnboardingStep2,
  type Step2Data,
} from "@/components/onboarding/OnboardingStep2";
import { OnboardingStep3 } from "@/components/onboarding/OnboardingStep3";

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { data: org, isLoading: isFetching } = useMyOrganization();

  // Redirect existing users whose setup is already complete. This reacts to
  // already-fetched query data — it is not the data-fetching effect itself.
  useEffect(() => {
    if (org?.setup_complete) {
      router.replace("/dashboard");
    }
  }, [org, router]);

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
      // Don't navigate on failure — let the user retry
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
      // Non-blocking — continue to next step regardless
    } finally {
      setIsLoading(false);
    }
    setStep(2);
  }

  function handleStep2(_data: Step2Data) {
    // Timezone/currency stored server-side in future — skip for now
    setStep(3);
  }

  // ── Fetching ─────────────────────────────────────────────────────────────────
  if (isFetching) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ps-bg-base">
        <Loader2
          size={24}
          strokeWidth={2}
          className="text-ps-cyan animate-spin [animation-duration:0.8s]"
        />
      </div>
    );
  }

  // ── Wizard ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ps-bg-base p-6">
      <div className="flex w-full max-w-[480px] flex-col gap-7">
        {/* Brand */}
        <div className="text-center">
          <div className="mb-3 inline-flex items-center gap-2.5">
            <Image
              src="/logo-mark.png"
              alt="ProSell"
              width={271}
              height={294}
              className="h-7 w-auto shrink-0"
            />
            <span className="text-[17px] font-bold tracking-[-0.02em] text-ps-text-primary">
              ProSell
            </span>
          </div>
          <h1 className="m-0 text-2xl font-bold tracking-[-0.02em] text-ps-text-primary">
            Bienvenido a ProSell
          </h1>
          <p className="mt-1.5 text-[13px] text-ps-text-secondary">
            Completá estos pasos rápidos para dejar tu cuenta lista.
          </p>
        </div>

        {/* Progress */}
        <OnboardingProgress currentStep={step} totalSteps={TOTAL_STEPS} />

        {/* Step content card */}
        <div
          className="rounded-[14px] border border-ps-border-default bg-ps-bg-surface px-7 pt-7 pb-6"
          style={{ boxShadow: "0 4px 24px rgba(6,13,36,0.3)" }}
        >
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
