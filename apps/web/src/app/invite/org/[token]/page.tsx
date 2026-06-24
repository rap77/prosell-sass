"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { z } from "zod";
import { CheckCircle2, XCircle } from "lucide-react";
import { passwordFieldSchema } from "@/lib/schemas/password";
import { extractErrorMessage } from "@/lib/api/extractErrorMessage";

type PageState = "form" | "loading" | "success" | "expired" | "error";

const schema = z.object({
  firstName: z.string().min(1, "El nombre es obligatorio"),
  lastName: z.string().min(1, "El apellido es obligatorio"),
  password: passwordFieldSchema,
});

export default function AcceptOrgInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const rawToken = params?.token;
  const token = typeof rawToken === "string" ? rawToken : null;

  const [state, setState] = useState<PageState>("form");
  const [message, setMessage] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  if (token === null) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--ps-bg-base)",
          padding: "32px 24px",
        }}
      >
        <div
          style={{
            background: "var(--ps-bg-surface)",
            border: "1px solid var(--ps-border-default)",
            borderRadius: 14,
            padding: "28px 28px 32px",
            maxWidth: 400,
            width: "100%",
            textAlign: "center",
          }}
        >
          <XCircle size={48} style={{ color: "var(--ps-error)" }} />
          <h1
            style={{
              margin: "16px 0 8px",
              fontSize: 20,
              fontWeight: 700,
              color: "var(--ps-text-primary)",
            }}
          >
            Enlace inválido
          </h1>
          <p style={{ margin: 0, color: "var(--ps-text-secondary)" }}>
            El enlace de invitación no es válido. Pedile al staff que te envíe
            uno nuevo.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ firstName, lastName, password });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }
    setFieldError(null);
    setState("loading");

    try {
      const res = await fetch("/api/v1/auth/accept-org-invitation", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          first_name: firstName,
          last_name: lastName,
        }),
      });

      if (!res.ok) {
        const body: unknown = await res.json().catch(() => null);
        const errorMessage = extractErrorMessage(
          body,
          "No se pudo aceptar la invitación",
        );
        if (errorMessage.toLowerCase().includes("expired")) {
          setState("expired");
          setMessage(
            "Esta invitación venció. Pedile al staff que te envíe una nueva.",
          );
        } else {
          setState("error");
          setMessage(errorMessage);
        }
        return;
      }

      setState("success");
      setMessage(
        "¡Bienvenido a ProSell! Tu cuenta y tu concesionario ya están activos.",
      );
      setTimeout(() => router.push("/dashboard?welcome=org"), 2000);
    } catch {
      setState("error");
      setMessage("Ocurrió un error inesperado. Intentá de nuevo.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--ps-bg-base)",
        padding: "32px 24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div
          style={{
            background: "var(--ps-bg-surface)",
            border: "1px solid var(--ps-border-default)",
            borderRadius: 14,
            padding: "28px 28px 32px",
          }}
        >
          <h1
            style={{
              margin: "0 0 16px",
              fontSize: 20,
              fontWeight: 700,
              color: "var(--ps-text-primary)",
            }}
          >
            Invitación de concesionario
          </h1>

          {state === "success" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              <CheckCircle2 size={48} style={{ color: "var(--ps-success)" }} />
              <p
                style={{
                  textAlign: "center",
                  color: "var(--ps-text-secondary)",
                }}
              >
                {message}
              </p>
            </div>
          )}

          {state === "expired" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              <XCircle size={48} style={{ color: "var(--ps-error)" }} />
              <p
                style={{
                  textAlign: "center",
                  color: "var(--ps-text-secondary)",
                }}
              >
                {message}
              </p>
            </div>
          )}

          {(state === "form" || state === "loading" || state === "error") && (
            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <label
                style={{ display: "flex", flexDirection: "column", gap: 6 }}
              >
                Nombre
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  style={{
                    height: 38,
                    padding: "0 12px",
                    borderRadius: 8,
                    border: "1px solid var(--ps-border-default)",
                  }}
                />
              </label>
              <label
                style={{ display: "flex", flexDirection: "column", gap: 6 }}
              >
                Apellido
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  style={{
                    height: 38,
                    padding: "0 12px",
                    borderRadius: 8,
                    border: "1px solid var(--ps-border-default)",
                  }}
                />
              </label>
              <label
                style={{ display: "flex", flexDirection: "column", gap: 6 }}
              >
                Contraseña
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    height: 38,
                    padding: "0 12px",
                    borderRadius: 8,
                    border: "1px solid var(--ps-border-default)",
                  }}
                />
              </label>
              {fieldError && (
                <p
                  style={{ margin: 0, fontSize: 13, color: "var(--ps-error)" }}
                  role="alert"
                >
                  {fieldError}
                </p>
              )}
              {state === "error" && !fieldError && (
                <p
                  style={{ margin: 0, fontSize: 13, color: "var(--ps-error)" }}
                  role="alert"
                >
                  {message}
                </p>
              )}
              <button
                type="submit"
                disabled={state === "loading"}
                style={{
                  height: 40,
                  borderRadius: 8,
                  background: "var(--ps-cyan)",
                  border: "none",
                  color: "var(--ps-bg-base)",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Aceptar invitación
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
