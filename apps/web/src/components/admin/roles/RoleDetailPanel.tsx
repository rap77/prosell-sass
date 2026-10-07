"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUpdateRole } from "@/lib/api/roles";
import type { Role, RoleGrant, RoleScope } from "@/lib/api/schemas/roles";
import { GrantsMatrixTab } from "./GrantsMatrixTab";
import { ScopeEditorTab } from "./ScopeEditorTab";
import { AssignedUsersTab } from "./AssignedUsersTab";

interface RoleDetailPanelProps {
  role: Role;
}

function grantKey(g: RoleGrant) {
  return `${g.zone}:${g.action}`;
}

function grantsEqual(a: RoleGrant[], b: RoleGrant[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = a.map(grantKey).sort();
  const sortedB = b.map(grantKey).sort();
  return sortedA.every((key, i) => key === sortedB[i]);
}

function scopeEqual(a: RoleScope, b: RoleScope): boolean {
  if (a.scope_type !== b.scope_type) return false;
  const sortedA = [...a.organization_ids].sort();
  const sortedB = [...b.organization_ids].sort();
  return (
    sortedA.length === sortedB.length &&
    sortedA.every((id, i) => id === sortedB[i])
  );
}

/** Detail panel for the selected permission profile (bloque 3). Holds
 * LOCAL edits to grants/scope across the Permisos/Alcance tabs and
 * commits them together via one PATCH (UpdateRoleUseCase is a full
 * replace, same shape the mockup's single "Guardar cambios" implies) —
 * name/description pass through unchanged, this screen doesn't rename
 * profiles. The parent must remount this component (`key={role.id}`)
 * when the selection changes, so switching profiles never needs an
 * effect to reset local edits. */
export function RoleDetailPanel({ role }: RoleDetailPanelProps) {
  const [grants, setGrants] = useState<RoleGrant[]>(role.grants);
  const [scope, setScope] = useState<RoleScope>(role.scope);
  const updateRole = useUpdateRole();

  const dirty =
    !grantsEqual(grants, role.grants) || !scopeEqual(scope, role.scope);

  const handleSave = () => {
    updateRole.mutate({
      roleId: role.id,
      data: {
        name: role.name,
        description: role.description,
        grants,
        scope,
      },
    });
  };

  const handleCancel = () => {
    setGrants(role.grants);
    setScope(role.scope);
  };

  return (
    <div className="rounded-lg border border-ps-border-subtle bg-ps-bg-surface p-6">
      <h2 className="text-lg font-semibold text-ps-text-primary">
        {role.name}
      </h2>
      {role.description && (
        <p className="text-sm text-ps-text-secondary">{role.description}</p>
      )}

      <Separator className="my-4" />

      <Tabs defaultValue="permisos">
        <TabsList>
          <TabsTrigger value="permisos">Permisos</TabsTrigger>
          <TabsTrigger value="alcance">Alcance</TabsTrigger>
          <TabsTrigger value="usuarios">Usuarios asignados</TabsTrigger>
        </TabsList>

        <TabsContent value="permisos" className="mt-4">
          <GrantsMatrixTab grants={grants} onChange={setGrants} />
        </TabsContent>

        <TabsContent value="alcance" className="mt-4">
          <ScopeEditorTab scope={scope} onChange={setScope} />
        </TabsContent>

        <TabsContent value="usuarios" className="mt-4">
          <AssignedUsersTab roleId={role.id} />
        </TabsContent>
      </Tabs>

      <Separator className="my-5" />

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={!dirty}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={!dirty || updateRole.isPending}
        >
          {updateRole.isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </div>
  );
}
