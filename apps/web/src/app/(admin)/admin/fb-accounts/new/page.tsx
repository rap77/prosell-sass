"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Eye, EyeOff, Plus, X } from "lucide-react";
import { useCreateFBAccount } from "@/lib/api/fb-accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FBGroupCategory } from "@/lib/api/schemas/fb-accounts";

const CATEGORIES: { value: FBGroupCategory; label: string }[] = [
  { value: "vehicles", label: "Vehículos" },
  { value: "general", label: "General" },
  { value: "real_estate", label: "Bienes raíces" },
  { value: "electronics", label: "Electrónicos" },
  { value: "other", label: "Otros" },
];

interface GroupDraft {
  position: number;
  name: string;
  category: FBGroupCategory;
}

export default function NewFBAccountPage() {
  const router = useRouter();
  const createAccount = useCreateFBAccount();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [alias, setAlias] = useState("");
  const [browser, setBrowser] = useState("chrome");
  const [language, setLanguage] = useState("es");
  const [timeToSleep, setTimeToSleep] = useState("0.7");
  const [groups, setGroups] = useState<GroupDraft[]>([]);

  // Validation
  const [touched, setTouched] = useState({ email: false, password: false });
  const emailError = touched.email && !email.includes("@");
  const passwordError = touched.password && password.length < 4;

  function addGroup() {
    const nextPosition = groups.length + 1;
    setGroups([
      ...groups,
      { position: nextPosition, name: "", category: "vehicles" },
    ]);
  }

  function removeGroup(index: number) {
    setGroups(groups.filter((_, i) => i !== index));
  }

  function updateGroup(
    index: number,
    field: keyof GroupDraft,
    value: string | number,
  ) {
    setGroups(
      groups.map((g, i) => (i === index ? { ...g, [field]: value } : g)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true });

    if (!email.includes("@") || password.length < 4) return;

    await createAccount.mutateAsync({
      email,
      password,
      alias: alias || undefined,
      browser,
      language,
      time_to_sleep: parseFloat(timeToSleep),
      groups: groups.map((g) => ({
        position: g.position,
        name: g.name || null,
        category: g.category,
        is_active: true,
      })),
    });

    router.push("/admin/fb-accounts");
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

      <h1 className="text-2xl font-semibold text-ps-text-primary mb-6">
        Nueva cuenta de Facebook
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Credentials */}
        <section className="bg-white border border-ps-border-default rounded-lg p-4 space-y-4">
          <h2 className="font-medium text-ps-text-primary">Credenciales</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ps-text-secondary mb-1">
                Email *
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                placeholder="cuenta@gmail.com"
              />
              {emailError && (
                <span className="text-xs text-red-600">Email inválido</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-ps-text-secondary mb-1">
                Contraseña *
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ps-text-secondary hover:text-ps-text-primary"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passwordError && (
                <span className="text-xs text-red-600">
                  Mínimo 4 caracteres
                </span>
              )}
              <p className="text-xs text-ps-text-secondary mt-1">
                Se guarda encriptada. Nunca se muestra.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ps-text-secondary mb-1">
              Alias (opcional)
            </label>
            <Input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Cuenta Principal, Cuenta Juan, etc."
            />
          </div>
        </section>

        {/* Bot config */}
        <section className="bg-white border border-ps-border-default rounded-lg p-4 space-y-4">
          <h2 className="font-medium text-ps-text-primary">
            Configuración del bot
          </h2>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-ps-text-secondary mb-1">
                Navegador
              </label>
              <select
                value={browser}
                onChange={(e) => setBrowser(e.target.value)}
                className="w-full border border-ps-border-default rounded px-3 py-2 text-sm"
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
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full border border-ps-border-default rounded px-3 py-2 text-sm"
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
                value={timeToSleep}
                onChange={(e) => setTimeToSleep(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Groups */}
        <section className="bg-white border border-ps-border-default rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-ps-text-primary">
              Grupos de Facebook
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addGroup}
            >
              <Plus className="h-4 w-4 mr-1" />
              Agregar grupo
            </Button>
          </div>

          {groups.length === 0 ? (
            <p className="text-sm text-ps-text-secondary">
              Los grupos se pueden agregar después. El bot los detectará
              automáticamente.
            </p>
          ) : (
            <div className="space-y-2">
              {groups.map((group, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                >
                  <span className="text-sm font-medium w-6">
                    #{group.position}
                  </span>
                  <Input
                    placeholder="Nombre del grupo (opcional)"
                    value={group.name}
                    onChange={(e) => updateGroup(index, "name", e.target.value)}
                    className="flex-1"
                  />
                  <select
                    value={group.category}
                    onChange={(e) =>
                      updateGroup(index, "category", e.target.value)
                    }
                    className="border border-ps-border-default rounded px-2 py-1 text-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeGroup(index)}
                    className="text-ps-text-secondary hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link href="/admin/fb-accounts">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={createAccount.isPending}>
            {createAccount.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Crear cuenta
          </Button>
        </div>

        {createAccount.isError && (
          <p className="text-sm text-red-600">{createAccount.error.message}</p>
        )}
      </form>
    </div>
  );
}
