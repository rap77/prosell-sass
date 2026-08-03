"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Eye, EyeOff, Plus, X, Save } from "lucide-react";
import {
  useFBAccount,
  useUpdateFBAccount,
  useChangeFBAccountPassword,
  useAddFBGroup,
  useUpdateFBGroup,
} from "@/lib/api/fb-accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FBGroupCategory, FBGroup } from "@/lib/api/schemas/fb-accounts";
import { toast } from "sonner";

const CATEGORIES: { value: FBGroupCategory; label: string }[] = [
  { value: "vehicles", label: "Vehículos" },
  { value: "general", label: "General" },
  { value: "real_estate", label: "Bienes raíces" },
  { value: "electronics", label: "Electrónicos" },
  { value: "other", label: "Otros" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Activa" },
  { value: "disabled", label: "Deshabilitada" },
];

function showMutationError(error: unknown, fallback: string): void {
  const message = error instanceof Error ? error.message : fallback;

  if (message.includes("Not authenticated")) {
    toast.error("Tu sesión expiró", {
      description: "Iniciá sesión nuevamente para guardar cambios.",
    });
    return;
  }

  toast.error(fallback, { description: message });
}

export default function EditFBAccountPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params.id as string;

  const { data: account, isLoading, error } = useFBAccount(accountId);
  const updateAccount = useUpdateFBAccount();
  const changePassword = useChangeFBAccountPassword();
  const addGroup = useAddFBGroup();
  const updateGroup = useUpdateFBGroup();

  // Form state - initialized from account data
  const [alias, setAlias] = useState<string | null>(null);
  const [browser, setBrowser] = useState<string | null>(null);
  const [language, setLanguage] = useState<string | null>(null);
  const [timeToSleep, setTimeToSleep] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // New group
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCategory, setNewGroupCategory] =
    useState<FBGroupCategory>("vehicles");

  // Derive values: use local state if set, otherwise account data
  const currentAlias = alias ?? account?.alias ?? "";
  const currentBrowser = browser ?? account?.browser ?? "chrome";
  const currentLanguage = language ?? account?.language ?? "es";
  const currentTimeToSleep =
    timeToSleep ?? String(account?.time_to_sleep ?? "0.7");
  const currentStatus = status ?? account?.status ?? "active";

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-ps-cyan" />
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="p-6 text-ps-error">
        Error: {error?.message ?? "Cuenta no encontrada"}
      </div>
    );
  }

  async function handleSave() {
    try {
      await updateAccount.mutateAsync({
        accountId,
        data: {
          alias: currentAlias || undefined,
          browser: currentBrowser,
          language: currentLanguage,
          time_to_sleep: parseFloat(currentTimeToSleep),
          status: currentStatus,
        },
      });
      router.push("/admin/fb-accounts");
    } catch (error) {
      showMutationError(error, "No se pudo guardar la cuenta");
    }
  }

  async function handleChangePassword() {
    if (newPassword.length < 4) return;
    try {
      await changePassword.mutateAsync({ accountId, newPassword });
      setShowPasswordForm(false);
      setNewPassword("");
    } catch (error) {
      showMutationError(error, "No se pudo cambiar la contraseña");
    }
  }

  async function handleAddGroup() {
    const nextPosition = (account?.groups?.length ?? 0) + 1;
    try {
      await addGroup.mutateAsync({
        accountId,
        group: {
          position: nextPosition,
          name: newGroupName || null,
          category: newGroupCategory,
          is_active: true,
        },
      });
      setShowNewGroup(false);
      setNewGroupName("");
    } catch (error) {
      showMutationError(error, "No se pudo agregar el grupo");
    }
  }

  async function handleToggleGroup(group: FBGroup) {
    try {
      await updateGroup.mutateAsync({
        accountId,
        groupId: group.id,
        group: {
          position: group.position,
          name: group.name,
          category: group.category,
          is_active: !group.is_active,
        },
      });
    } catch (error) {
      showMutationError(error, "No se pudo actualizar el grupo");
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <Link
          href="/admin/fb-accounts"
          className="inline-flex items-center text-sm text-ps-text-secondary hover:text-ps-text-primary"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver a cuentas
        </Link>
      </div>

      <h1 className="text-2xl font-semibold text-ps-text-primary mb-2">
        {account.email}
      </h1>
      <p className="text-sm text-ps-text-secondary mb-6">
        Creada: {new Date(account.created_at).toLocaleDateString()} ·{" "}
        {account.total_publications} publicaciones
      </p>

      <div className="space-y-6">
        {/* Basic info */}
        <section className="space-y-4 rounded-lg border border-ps-border-default bg-ps-surface p-4">
          <h2 className="font-medium text-ps-text-primary">
            Información básica
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ps-text-secondary mb-1">
                Email
              </label>
              <Input
                value={account.email}
                disabled
                className="bg-ps-elevated text-ps-text-secondary"
              />
              <p className="text-xs text-ps-text-secondary mt-1">
                El email no se puede cambiar
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-ps-text-secondary mb-1">
                Alias
              </label>
              <Input
                value={currentAlias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="Cuenta Principal, etc."
                className="bg-ps-input-bg text-ps-text-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ps-text-secondary mb-1">
                Estado
              </label>
              <select
                value={currentStatus}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded border border-ps-border-default bg-ps-input-bg px-3 py-2 text-sm text-ps-text-primary"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-ps-text-secondary mb-1">
              Contraseña
            </label>
            {!showPasswordForm ? (
              <div className="flex items-center gap-2">
                <Input
                  value="••••••••••••"
                  disabled
                  className="flex-1 bg-ps-elevated text-ps-text-secondary"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPasswordForm(true)}
                >
                  Cambiar
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nueva contraseña"
                    className="bg-ps-input-bg text-ps-text-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-ps-text-secondary"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <Button
                  size="sm"
                  onClick={handleChangePassword}
                  disabled={changePassword.isPending || newPassword.length < 4}
                >
                  {changePassword.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Guardar"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setNewPassword("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Bot config */}
        <section className="space-y-4 rounded-lg border border-ps-border-default bg-ps-surface p-4">
          <h2 className="font-medium text-ps-text-primary">
            Configuración del bot
          </h2>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-ps-text-secondary mb-1">
                Navegador
              </label>
              <select
                value={currentBrowser}
                onChange={(e) => setBrowser(e.target.value)}
                className="w-full rounded border border-ps-border-default bg-ps-input-bg px-3 py-2 text-sm text-ps-text-primary"
              >
                <option value="chrome">Chrome</option>
                <option value="firefox">Firefox</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-ps-text-secondary mb-1">
                Idioma
              </label>
              <select
                value={currentLanguage}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded border border-ps-border-default bg-ps-input-bg px-3 py-2 text-sm text-ps-text-primary"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-ps-text-secondary mb-1">
                Delay (seg)
              </label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                max="5"
                value={currentTimeToSleep}
                onChange={(e) => setTimeToSleep(e.target.value)}
                className="bg-ps-input-bg text-ps-text-primary"
              />
            </div>
          </div>
        </section>

        {/* Groups */}
        <section className="space-y-4 rounded-lg border border-ps-border-default bg-ps-surface p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-ps-text-primary">
              Grupos de Facebook ({account.groups?.length ?? 0})
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNewGroup(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Agregar
            </Button>
          </div>

          {showNewGroup && (
            <div className="flex items-center gap-2 rounded border border-ps-border-medium bg-ps-info-bg p-2">
              <Input
                placeholder="Nombre del grupo"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="flex-1 bg-ps-input-bg text-ps-text-primary"
              />
              <select
                value={newGroupCategory}
                onChange={(e) =>
                  setNewGroupCategory(e.target.value as FBGroupCategory)
                }
                className="rounded border border-ps-border-default bg-ps-input-bg px-2 py-1 text-sm text-ps-text-primary"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                onClick={handleAddGroup}
                disabled={addGroup.isPending}
              >
                {addGroup.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Agregar"
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewGroup(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {!account.groups?.length ? (
            <p className="text-sm text-ps-text-secondary">
              No hay grupos configurados. El bot los detectará automáticamente
              al publicar.
            </p>
          ) : (
            <div className="divide-y divide-ps-border-default">
              {account.groups.map((group) => {
                const cat = CATEGORIES.find((c) => c.value === group.category);
                return (
                  <div
                    key={group.id}
                    className={`flex items-center justify-between py-2 ${
                      !group.is_active ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-ps-text-secondary w-6">
                        #{group.position}
                      </span>
                      <div>
                        <div className="text-sm text-ps-text-primary">
                          {group.name || "(Sin nombre)"}
                        </div>
                        <div className="text-xs text-ps-text-secondary">
                          {cat?.label ?? group.category} · {group.total_posts}{" "}
                          posts
                          {group.fb_group_id && ` · ID: ${group.fb_group_id}`}
                        </div>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-xs text-ps-text-secondary">
                        {group.is_active ? "Activo" : "Inactivo"}
                      </span>
                      <input
                        type="checkbox"
                        checked={group.is_active}
                        onChange={() => handleToggleGroup(group)}
                        className="h-4 w-4 accent-ps-cyan"
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs text-ps-text-secondary">
            Los nombres e IDs se actualizan automáticamente cuando el bot
            publica.
          </p>
        </section>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link href="/admin/fb-accounts">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={updateAccount.isPending}>
            {updateAccount.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar cambios
          </Button>
        </div>

        {updateAccount.isError && (
          <p className="text-sm text-ps-error">{updateAccount.error.message}</p>
        )}
      </div>
    </div>
  );
}
