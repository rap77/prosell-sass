"use client";

/**
 * BrokerManager — Manage brokers for an organization.
 *
 * Features:
 * - Create broker with name + email
 * - Edit broker (only if status is 'pending')
 * - Delete broker
 * - Shows verified status badge
 */

import { useState } from "react";
import { Plus, Trash2, Loader2, User, Pencil, Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useDealerBrokers,
  useCreateDealerBroker,
  useUpdateDealerBroker,
  useDeleteDealerBroker,
} from "@/lib/api/dealers";
import type { Broker } from "@/lib/api/schemas/dealers";

interface BrokerManagerProps {
  dealerId: string;
}

export function BrokerManager({ dealerId }: BrokerManagerProps) {
  const { data: brokers = [], isLoading } = useDealerBrokers(dealerId);
  const createBroker = useCreateDealerBroker();
  const updateBroker = useUpdateDealerBroker();
  const deleteBroker = useDeleteDealerBroker();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const handleCreate = async () => {
    if (!newName.trim() || !newEmail.trim()) return;
    try {
      await createBroker.mutateAsync({
        dealerId,
        name: newName.trim(),
        email: newEmail.trim(),
      });
      setNewName("");
      setNewEmail("");
      setShowAddForm(false);
    } catch {
      // Error handled by mutation
    }
  };

  const startEdit = (broker: Broker) => {
    if (broker.status === "verified") return;
    setEditingId(broker.id);
    setEditName(broker.name);
    setEditEmail(broker.email);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditEmail("");
  };

  const handleUpdate = async () => {
    if (!editingId || !editName.trim() || !editEmail.trim()) return;
    try {
      await updateBroker.mutateAsync({
        dealerId,
        brokerId: editingId,
        name: editName.trim(),
        email: editEmail.trim(),
      });
      cancelEdit();
    } catch {
      // Error handled by mutation
    }
  };

  const handleDelete = async (brokerId: string) => {
    await deleteBroker.mutateAsync({ dealerId, brokerId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Cargando brokers...</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-4 text-sm font-semibold">Brokers</h3>

      {brokers.length === 0 ? (
        <p className="mb-4 text-sm text-muted-foreground">
          Sin brokers. La organización es propietaria directa de sus productos.
        </p>
      ) : (
        <div className="mb-4 space-y-2">
          {brokers.map((broker) => (
            <div
              key={broker.id}
              className="flex items-center justify-between rounded-md bg-muted/50 p-2"
            >
              {editingId === broker.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Nombre"
                    className="h-8 flex-1"
                  />
                  <Input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Email"
                    className="h-8 flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleUpdate}
                    disabled={updateBroker.isPending}
                    className="h-8 w-8 text-green-600"
                  >
                    {updateBroker.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={cancelEdit}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {broker.name}
                        </span>
                        {broker.status === "verified" && (
                          <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                            Verificado
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {broker.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {broker.status === "pending" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(broker)}
                        className="h-8 w-8"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(broker.id)}
                      disabled={deleteBroker.isPending}
                      className="h-8 w-8 text-destructive"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddForm ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Nombre del broker"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="flex-1"
            />
            <Input
              type="email"
              placeholder="Email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="flex-1"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleCreate}
              disabled={
                !newName.trim() || !newEmail.trim() || createBroker.isPending
              }
            >
              {createBroker.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Agregar"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddForm(false);
                setNewName("");
                setNewEmail("");
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="mr-1 h-4 w-4" />
          Agregar broker
        </Button>
      )}
    </div>
  );
}
