"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OnboardingStep3Props {
  onComplete: () => void;
  onBack: () => void;
  onSkip: () => void;
  isLoading?: boolean;
}

export function OnboardingStep3({ onComplete, onBack, onSkip, isLoading }: OnboardingStep3Props) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function handleInvite() {
    if (!email.trim() || !EMAIL_RE.test(email)) {
      onComplete();
      return;
    }
    try {
      await fetch("/api/v1/teams/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      // Non-blocking — proceed regardless
    }
    onComplete();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Invitá a tu equipo</h2>
          <p className="text-sm text-muted-foreground">
            Opcional — podés invitar a tu primer vendedor ahora o hacerlo después desde Configuración
          </p>
        </div>
      </div>

      {sent ? (
        <p className="text-sm text-emerald-600">¡Invitación enviada! Continuando...</p>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email del integrante</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="vendedor@tuempresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            También podés invitar a más personas desde{" "}
            <strong>Configuración → Equipo</strong> en cualquier momento.
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onBack} disabled={isLoading}>
            Atrás
          </Button>
          <Button type="button" variant="ghost" onClick={onSkip} disabled={isLoading}>
            Saltar
          </Button>
        </div>
        <Button onClick={handleInvite} disabled={isLoading}>
          {isLoading ? "Finalizando..." : "Finalizar"}
        </Button>
      </div>
    </div>
  );
}
