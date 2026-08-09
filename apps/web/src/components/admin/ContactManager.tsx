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
import { SelectControlled } from "@/components/ui/select-controlled";
import { cn } from "@/lib/utils";
import {
  ContactCategorySchema,
  type OrganizationContact,
} from "@/lib/api/schemas/organizations";

const CATEGORY_OPTIONS = [
  { value: "gerencia", label: "Gerencia" },
  { value: "ventas", label: "Ventas" },
  { value: "servicio_tecnico", label: "Servicio Técnico" },
  { value: "cobranza", label: "Cobranza" },
  { value: "recepcion", label: "Recepción" },
  { value: "custom", label: "Personalizado" },
];

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
    <div className="space-y-3 rounded-lg border border-ps-border-default bg-ps-elevated/40 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="m-0 text-sm font-semibold text-ps-text-primary">
            Personas de contacto
          </h3>
          <p className="m-0 mt-1 text-xs text-ps-text-secondary">
            Definí quién atiende cada canal y ordená la prioridad.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addContact}
          disabled={disabled}
        >
          <Plus className="mr-1 h-4 w-4" />
          Añadir contacto
        </Button>
      </div>

      {contacts.length === 0 ? (
        <p className="rounded-md border border-dashed border-ps-border-default py-5 text-center text-sm text-ps-text-secondary">
          Todavía no hay contactos. Añadí la primera persona responsable.
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
      className={cn(
        "rounded-md border border-ps-border-default bg-ps-elevated",
        isDragging && "opacity-50 shadow-lg",
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 p-3">
        {!disabled && (
          <button
            type="button"
            className="touch-none cursor-grab text-ps-text-secondary hover:text-ps-text-primary"
            aria-label="Arrastrar para reordenar"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}

        <SelectControlled
          value={contact.category}
          onChange={(value) => {
            const parsed = ContactCategorySchema.safeParse(value);
            if (parsed.success) onUpdate({ category: parsed.data });
          }}
          options={CATEGORY_OPTIONS}
          placeholder="Seleccioná una categoría"
          aria-label="Categoría de contacto"
          className="w-40"
          disabled={disabled}
        />

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
          className="text-ps-error hover:text-ps-error"
          aria-label="Eliminar contacto"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="grid gap-3 border-t border-ps-border-default px-3 py-3 sm:grid-cols-3">
          <div className="space-y-1">
            <span className="flex items-center gap-1 text-xs text-ps-text-secondary">
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
            <span className="flex items-center gap-1 text-xs text-ps-text-secondary">
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
            <span className="flex items-center gap-1 text-xs text-ps-text-secondary">
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
