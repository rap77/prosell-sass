"use client";

/**
 * ContactManager — multi-contact editor with drag-and-drop.
 *
 * Each contact has a category (predefined or custom), and optional phone/email/whatsapp.
 * Drag handle reorders, inline edit/delete.
 */

import { useState, useId } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  Trash2,
  Phone,
  Mail,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ContactCategorySchema,
  type OrganizationContact,
  type ContactCategory,
} from "@/lib/api/schemas/organizations";

const CATEGORY_LABELS: Record<ContactCategory, string> = {
  gerencia: "Gerencia",
  ventas: "Ventas",
  servicio_tecnico: "Servicio Técnico",
  cobranza: "Cobranza",
  recepcion: "Recepción",
  custom: "Personalizado",
};

interface ContactManagerProps {
  contacts: OrganizationContact[];
  onChange: (contacts: OrganizationContact[]) => void;
  disabled?: boolean;
}

export function ContactManager({
  contacts,
  onChange,
  disabled,
}: ContactManagerProps) {
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = contacts.findIndex((c) => c.id === active.id);
      const newIndex = contacts.findIndex((c) => c.id === over.id);
      const reordered = arrayMove(contacts, oldIndex, newIndex).map((c, i) => ({
        ...c,
        order: i,
      }));
      onChange(reordered);
    }
  };

  const addContact = () => {
    const newContact: OrganizationContact = {
      id: crypto.randomUUID(),
      category: "ventas",
      custom_label: null,
      phone: null,
      email: null,
      whatsapp: null,
      order: contacts.length,
    };
    onChange([...contacts, newContact]);
  };

  const updateContact = (id: string, updates: Partial<OrganizationContact>) => {
    onChange(contacts.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const removeContact = (id: string) => {
    onChange(
      contacts.filter((c) => c.id !== id).map((c, i) => ({ ...c, order: i })),
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Contactos</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addContact}
          disabled={disabled}
        >
          <Plus className="mr-1 h-4 w-4" />
          Agregar
        </Button>
      </div>

      {contacts.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-md">
          No hay contactos. Agregá uno para empezar.
        </p>
      ) : (
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={contacts.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {contacts.map((contact) => (
                <ContactRow
                  key={contact.id}
                  contact={contact}
                  onUpdate={(updates) => updateContact(contact.id, updates)}
                  onRemove={() => removeContact(contact.id)}
                  disabled={disabled}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

interface ContactRowProps {
  contact: OrganizationContact;
  onUpdate: (updates: Partial<OrganizationContact>) => void;
  onRemove: () => void;
  disabled?: boolean;
}

function ContactRow({
  contact,
  onUpdate,
  onRemove,
  disabled,
}: ContactRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: contact.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 200ms ease",
  };

  const showCustomLabel = contact.category === "custom";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-md bg-background ${isDragging ? "opacity-50 shadow-lg" : ""}`}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 p-3">
        {!disabled && (
          <button
            type="button"
            className="cursor-grab text-muted-foreground hover:text-foreground touch-none"
            aria-label="Arrastrar para reordenar"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}

        <Select
          value={contact.category}
          onValueChange={(v) => {
            const parsed = ContactCategorySchema.safeParse(v);
            if (parsed.success) onUpdate({ category: parsed.data });
          }}
          disabled={disabled}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showCustomLabel && (
          <Input
            placeholder="Nombre personalizado"
            value={contact.custom_label ?? ""}
            onChange={(e) => onUpdate({ custom_label: e.target.value || null })}
            className="w-40"
            disabled={disabled}
          />
        )}

        <div className="flex-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs"
        >
          {isExpanded ? "Ocultar" : "Detalles"}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={disabled}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t px-3 py-3 grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3" /> Teléfono
            </span>
            <Input
              type="tel"
              aria-label="Teléfono"
              placeholder="+54 9 11 5555-1234"
              value={contact.phone ?? ""}
              onChange={(e) => onUpdate({ phone: e.target.value || null })}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" /> Email
            </span>
            <Input
              type="email"
              aria-label="Email"
              placeholder="contacto@empresa.com"
              value={contact.email ?? ""}
              onChange={(e) => onUpdate({ email: e.target.value || null })}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MessageCircle className="h-3 w-3" /> WhatsApp
            </span>
            <Input
              type="tel"
              aria-label="WhatsApp"
              placeholder="+54 9 11 5555-1234"
              value={contact.whatsapp ?? ""}
              onChange={(e) => onUpdate({ whatsapp: e.target.value || null })}
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </div>
  );
}
