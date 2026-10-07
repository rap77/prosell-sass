"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useAssignRoleToUser,
  useLookupUserByEmail,
  useRemoveRoleFromUser,
  useRoleUsers,
} from "@/lib/api/roles";

interface AssignedUsersTabProps {
  roleId: string;
}

/** "Usuarios asignados" tab — lists who currently holds the profile and
 * assigns a new one by exact email. Both backing endpoints
 * (GET /roles/{id}/users and GET /users/by-email) were added for this
 * item: no prior endpoint exposed role→users, and there's still no
 * name/partial-match search for users (deliberately deferred, see the
 * workbook) — the picker only resolves an exact email. */
export function AssignedUsersTab({ roleId }: AssignedUsersTabProps) {
  const { data: users = [], isLoading } = useRoleUsers(roleId);
  const removeRole = useRemoveRoleFromUser();
  const assignRole = useAssignRoleToUser();
  const lookup = useLookupUserByEmail();
  const [email, setEmail] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      lookup.mutate(email.trim());
    }
  };

  const handleAssign = (userId: string) => {
    assignRole.mutate({ roleId, userId });
    setEmail("");
  };

  return (
    <div className="rounded-lg border border-ps-border-subtle">
      <form
        onSubmit={handleSearch}
        className="flex items-center justify-between gap-2 border-b border-ps-border-subtle p-3"
      >
        <Input
          placeholder="Buscar usuario por email..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="max-w-xs"
        />
        <Button type="submit" size="sm" disabled={lookup.isPending}>
          Buscar
        </Button>
      </form>

      {lookup.data !== undefined && (
        <div className="flex items-center justify-between border-b border-ps-border-subtle px-4 py-3">
          {lookup.data === null ? (
            <p className="text-sm text-ps-text-secondary">
              No se encontró ningún usuario con ese email.
            </p>
          ) : (
            <>
              <div>
                <div className="text-sm font-medium text-ps-text-primary">
                  {lookup.data.full_name}
                </div>
                <div className="text-xs text-ps-text-tertiary">
                  {lookup.data.email}
                </div>
              </div>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => handleAssign(lookup.data!.id)}
                disabled={assignRole.isPending}
              >
                <Plus className="h-3.5 w-3.5" />
                Asignar
              </Button>
            </>
          )}
        </div>
      )}

      <div className="divide-y divide-ps-border-subtle">
        {isLoading && (
          <p className="px-4 py-3 text-sm text-ps-text-secondary">
            Cargando usuarios…
          </p>
        )}
        {!isLoading && users.length === 0 && (
          <p className="px-4 py-3 text-sm text-ps-text-secondary">
            Nadie tiene este perfil asignado todavía.
          </p>
        )}
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between px-4 py-3"
          >
            <div>
              <div className="text-sm font-medium text-ps-text-primary">
                {user.full_name}
              </div>
              <div className="text-xs text-ps-text-tertiary">{user.email}</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeRole.mutate({ roleId, userId: user.id })}
              disabled={removeRole.isPending}
            >
              Quitar
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
