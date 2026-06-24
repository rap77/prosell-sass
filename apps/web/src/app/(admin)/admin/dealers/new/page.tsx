"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Permission } from "@/lib/auth/permissions";
import { useCategories } from "@/lib/api/categories";
import { useCreateDealer } from "@/lib/api/dealers";

/**
 * Staff form to create a dealer org + invite its owner — Subsystem E Task 16.
 *
 * Gates on hasPermission(DEALER_ADMIN_VIEW_ALL) directly rather than
 * useRequireAdmin(), which checks role-identity (isAdmin) instead of the
 * permission itself.
 */
export default function AdminNewDealerPage() {
  const router = useRouter();
  const { hasPermission, isLoading: authLoading } = useAuth();
  const canCreate = hasPermission(Permission.DEALER_ADMIN_VIEW_ALL);

  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories();
  const createDealer = useCreateDealer();

  const [name, setName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [verticalIds, setVerticalIds] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !canCreate) {
      router.replace("/dashboard");
    }
  }, [authLoading, canCreate, router]);

  useEffect(() => {
    if (createDealer.isSuccess) {
      router.push("/admin/dealers");
    }
  }, [createDealer.isSuccess, router]);

  if (authLoading || !canCreate) {
    return null;
  }

  const toggleVertical = (id: string) => {
    setVerticalIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createDealer.mutate({
      name,
      vertical_ids: verticalIds,
      owner_email: ownerEmail,
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h1
        style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 700,
          color: "var(--ps-text-primary)",
        }}
      >
        Nuevo concesionario
      </h1>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxWidth: 480,
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          Nombre
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{
              height: 38,
              padding: "0 12px",
              borderRadius: 8,
              border: "1px solid var(--ps-border-default)",
            }}
          />
        </label>

        <fieldset
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            border: "none",
            padding: 0,
          }}
        >
          <legend style={{ fontSize: 13.5, marginBottom: 6 }}>
            Verticals
          </legend>
          {categoriesLoading && <p>Cargando verticals…</p>}
          {!categoriesLoading && categories.length === 0 && (
            <p style={{ color: "var(--ps-text-secondary)" }}>
              No hay verticals activos disponibles. No se puede crear un
              concesionario hasta que exista al menos uno.
            </p>
          )}
          {categories.map((category) => (
            <label
              key={category.id}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <input
                type="checkbox"
                checked={verticalIds.includes(category.id)}
                onChange={() => toggleVertical(category.id)}
                aria-label={category.name}
              />
              {category.name}
            </label>
          ))}
        </fieldset>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          Email del owner
          <input
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            required
            style={{
              height: 38,
              padding: "0 12px",
              borderRadius: 8,
              border: "1px solid var(--ps-border-default)",
            }}
          />
        </label>

        {createDealer.error && (
          <p style={{ color: "var(--ps-error)" }}>
            {createDealer.error.message}
          </p>
        )}

        <button
          type="submit"
          disabled={createDealer.isPending || verticalIds.length === 0}
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
          Crear concesionario
        </button>
      </form>
    </div>
  );
}
