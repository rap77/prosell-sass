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
import { orgApi, type Organization } from "@/lib/api/orgApi";
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
  const [org, setOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // Check setup_complete — redirect existing users
  useEffect(() => {
    let cancelled = false;
    async function checkSetup() {
      try {
        const data = await orgApi.getMyOrganization();
        if (cancelled) return;
        if (data.setup_complete) {
          router.replace("/dashboard");
          return;
        }
        setOrg(data);
      } catch {
        // No org or not authenticated — middleware handles redirect
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    }
    void checkSetup();
    return () => {
      cancelled = true;
    };
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
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--ps-bg-base)",
        }}
      >
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <Loader2
          size={24}
          strokeWidth={2}
          style={{
            color: "var(--ps-cyan)",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
    );
  }

  // ── Wizard ───────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--ps-bg-base)",
        padding: 24,
      }}
    >
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <div
        style={{
          width: "100%",
          maxWidth: 480,
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        {/* Brand */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <Image
              src="/logo-mark.png"
              alt="ProSell"
              width={271}
              height={294}
              style={{ height: 28, width: "auto", flexShrink: 0 }}
            />
            <span
              style={{
                fontSize: 17,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "var(--ps-text-primary)",
              }}
            >
              ProSell
            </span>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--ps-text-primary)",
            }}
          >
            Bienvenido a ProSell
          </h1>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 13,
              color: "var(--ps-text-secondary)",
            }}
          >
            Completá estos pasos rápidos para dejar tu cuenta lista.
          </p>
        </div>

        {/* Progress */}
        <OnboardingProgress currentStep={step} totalSteps={TOTAL_STEPS} />

        {/* Step content card */}
        <div
          style={{
            background: "var(--ps-bg-surface)",
            border: "1px solid var(--ps-border-default)",
            borderRadius: 14,
            padding: "28px 28px 24px",
            boxShadow: "0 4px 24px rgba(6,13,36,0.3)",
          }}
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
