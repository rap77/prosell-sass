"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { extractErrorMessage } from "@/lib/api/extractErrorMessage";

function normalizePairingCode(value: string): string {
  const characters = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  return characters.length > 4
    ? `${characters.slice(0, 4)}-${characters.slice(4)}`
    : characters;
}

type ApprovalResult = { ok: true } | { ok: false; message: string };

// Module-level (not a component/hook) so React Compiler doesn't need to trace
// the try/catch/finally in here — it only analyzes component and hook bodies.
async function submitMigrationApproval(
  pairingCode: string,
): Promise<ApprovalResult> {
  try {
    const response = await fetch(
      "/api/v1/fb-sync/migrations/authorization-requests/approve",
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairing_code: pairingCode }),
      },
    );

    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null);
      throw new Error(
        extractErrorMessage(body, "No se pudo aprobar la migración."),
      );
    }

    return { ok: true };
  } catch (submissionError) {
    return {
      ok: false,
      message:
        submissionError instanceof Error
          ? submissionError.message
          : "No se pudo aprobar la migración.",
    };
  }
}

export default function MigrationApprovalPage() {
  const { isAdmin, isSuperAdmin } = useAuth();
  const router = useRouter();
  const [pairingCode, setPairingCode] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    if (isAdmin && !isSuperAdmin) {
      router.push("/dashboard");
    }
  }, [isAdmin, isSuperAdmin, router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsApproved(false);

    if (!/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(pairingCode)) {
      setError("Ingresá un código válido con el formato ABCD-1234.");
      return;
    }

    setIsPending(true);
    const result = await submitMigrationApproval(pairingCode);
    if (result.ok) {
      setPairingCode("");
      setIsApproved(true);
    } else {
      setError(result.message);
    }
    setIsPending(false);
  }

  if (!isAdmin || !isSuperAdmin) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <Link
        href="/admin/fb-accounts"
        className="inline-flex w-fit items-center text-sm text-ps-text-secondary hover:text-ps-text-primary"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Volver a cuentas de Facebook
      </Link>

      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-ps-info-bg p-2">
            <ShieldCheck className="h-5 w-5 text-ps-cyan" />
          </div>
          <h1 className="text-2xl font-semibold text-ps-text-primary">
            Aprobar migración de Facebook
          </h1>
        </div>
        <p className="mt-3 text-sm text-ps-text-secondary">
          Ingresá el código de emparejamiento provisto por el bot para autorizar
          la migración pendiente.
        </p>
      </div>

      <form
        className="rounded-lg border border-ps-border-subtle bg-ps-surface p-5"
        onSubmit={onSubmit}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="pairing-code">Código de emparejamiento</Label>
          <Input
            id="pairing-code"
            value={pairingCode}
            onChange={(event) =>
              setPairingCode(normalizePairingCode(event.target.value))
            }
            placeholder="ABCD-1234"
            autoComplete="off"
            spellCheck={false}
            maxLength={9}
            aria-describedby={error ? "pairing-code-error" : undefined}
            aria-invalid={Boolean(error)}
            disabled={isPending}
          />
          <p className="text-xs text-ps-text-secondary">
            El código vence automáticamente. No ingreses tokens de migración en
            este formulario.
          </p>
        </div>

        {error && (
          <p
            id="pairing-code-error"
            role="alert"
            className="mt-4 text-sm text-ps-error"
          >
            {error}
          </p>
        )}

        {isApproved && (
          <p
            role="status"
            className="mt-4 flex items-center gap-2 text-sm text-ps-success"
          >
            <CheckCircle2 className="h-4 w-4" />
            La migración fue aprobada.
          </p>
        )}

        <div className="mt-5 flex justify-end">
          <Button
            type="submit"
            disabled={isPending || pairingCode.length !== 9}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Aprobar migración
          </Button>
        </div>
      </form>
    </div>
  );
}
