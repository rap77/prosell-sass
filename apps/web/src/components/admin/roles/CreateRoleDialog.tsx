"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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
import { useCreateRole } from "@/lib/api/roles";

interface CreateRoleDialogProps {
  /** Called with the new profile's id once it's created, so the caller
   * can select it right away. */
  onCreated: (roleId: string) => void;
}

/** "Nuevo perfil" — creates a bare custom profile (name/description
 * only). Grants and scope start empty and are configured afterward in
 * the detail panel's Permisos/Alcance tabs, not here. */
export function CreateRoleDialog({ onCreated }: CreateRoleDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const createRole = useCreateRole();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      return;
    }

    try {
      const created = await createRole.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setName("");
      setDescription("");
      setOpen(false);
      onCreated(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el perfil");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo perfil
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo perfil</DialogTitle>
          <DialogDescription>
            Creá un perfil en blanco — los permisos y el alcance se configuran
            después.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-role-name">Nombre</Label>
            <Input
              id="create-role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Supervisor de ventas"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-role-description">Descripción</Label>
            <Textarea
              id="create-role-description"
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
            <Button type="submit" disabled={createRole.isPending}>
              {createRole.isPending ? "Creando..." : "Crear perfil"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
