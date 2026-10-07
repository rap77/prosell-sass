"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCloneRole } from "@/lib/api/roles";
import type { Role } from "@/lib/api/schemas/roles";

interface CloneRoleDialogProps {
  roles: Role[];
  /** Called with the new profile's id once it's created, so the caller
   * can select it right away. */
  onCloned: (roleId: string) => void;
}

/** "Clonar plantilla" — picks a source profile (template or custom) and
 * copies its grants/scope under a new name/description. The source's
 * grants/scope are never shown or edited here; CloneRoleUseCase on the
 * backend copies them verbatim (subject to the actor's own anti-escalation
 * limits). */
export function CloneRoleDialog({ roles, onCloned }: CloneRoleDialogProps) {
  const [open, setOpen] = useState(false);
  const [sourceRoleId, setSourceRoleId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const cloneRole = useCloneRole();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!sourceRoleId || !name.trim()) {
      return;
    }

    try {
      const created = await cloneRole.mutateAsync({
        sourceRoleId,
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setSourceRoleId("");
      setName("");
      setDescription("");
      setOpen(false);
      onCloned(created.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al clonar el perfil",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Copy className="h-4 w-4" />
          Clonar plantilla
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clonar plantilla</DialogTitle>
          <DialogDescription>
            Copia los permisos y el alcance de un perfil existente en uno nuevo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clone-role-source">Plantilla de origen</Label>
            <select
              id="clone-role-source"
              value={sourceRoleId}
              onChange={(e) => setSourceRoleId(e.target.value)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">Seleccionar perfil...</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clone-role-name">Nombre</Label>
            <Input
              id="clone-role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Manager Global"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clone-role-description">Descripción</Label>
            <Textarea
              id="clone-role-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opcional"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={cloneRole.isPending}>
              {cloneRole.isPending ? "Clonando..." : "Clonar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
