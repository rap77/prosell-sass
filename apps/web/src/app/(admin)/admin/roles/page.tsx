"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { useRoles } from "@/lib/api/roles";
import { RolesListPanel } from "@/components/admin/roles/RolesListPanel";
import { CreateRoleDialog } from "@/components/admin/roles/CreateRoleDialog";
import { CloneRoleDialog } from "@/components/admin/roles/CloneRoleDialog";
import { RoleDetailPanel } from "@/components/admin/roles/RoleDetailPanel";

/** Admin "Perfiles y Permisos" screen (bloque 3) — list of permission
 * profiles on the left, selected profile's detail on the right. The
 * detail panel grows tabs (Permisos/Alcance/Usuarios asignados) and the
 * create/clone actions in the items that follow this one. */
export default function AdminRolesPage() {
  const isAdmin = useRequireAdmin();
  const { data: roles = [], isLoading, error } = useRoles();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!isAdmin) return null;

  const selected = roles.find((role) => role.id === selectedId) ?? roles[0];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="m-0 text-[22px] font-bold text-ps-text-primary">
            Perfiles y Permisos
          </h1>
          <p className="mt-1 text-sm text-ps-text-secondary">
            Administrá quién puede hacer qué, y sobre qué organizaciones.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CloneRoleDialog roles={roles} onCloned={setSelectedId} />
          <CreateRoleDialog onCreated={setSelectedId} />
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-ps-text-secondary">
          <Loader2 size={16} className="animate-spin" />
          Cargando perfiles…
        </div>
      )}

      {error && (
        <p className="text-ps-error">
          Error al cargar perfiles: {error.message}
        </p>
      )}

      {!isLoading && !error && (
        <div className="flex flex-1 gap-6">
          <RolesListPanel
            roles={roles}
            selectedId={selected?.id ?? null}
            onSelect={setSelectedId}
          />

          <main className="min-w-0 flex-1">
            {selected ? (
              <RoleDetailPanel key={selected.id} role={selected} />
            ) : (
              <p className="text-ps-text-secondary">
                No hay perfiles para mostrar.
              </p>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
