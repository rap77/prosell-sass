"use client";

/**
 * ContactManager — multi-contact editor with broker-style cards.
 *
 * Each contact has an optional name (displayed prominently on the card),
 * a category (predefined or custom), and optional phone/email/whatsapp.
 *
 * UX flow:
 *   1. Inline form at the top — fill in name + category + optional contact
 *      channels, then click "Agregar" to add a card.
 *   2. Cards below the form show all details visible by default.
 *   3. Each card has a ✏️ Edit button (transforms it into an inline editable
 *      form) and a 🗑 Delete button.
 *   4. Drag handle reorders cards (persisted via the `order` field).
 *
 * The `name` field is required by the UI to add a new contact (mirrors
 * the broker pattern) but is optional in the schema for backwards
 * compatibility with existing data that may not have it.
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
  Pencil,
  Check,
  X,
  Phone,
  Mail,
  MessageCircle,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectControlled } from "@/components/ui/select-controlled";
import { cn } from "@/lib/utils";
import {
  ContactCategorySchema,
  type OrganizationContact,
} from "@/lib/api/schemas/organizations";
import { isValidPhone } from "./OrganizationFormFields";

const CATEGORY_OPTIONS = [
  { value: "gerencia", label: "Gerencia" },
  { value: "ventas", label: "Ventas" },
  { value: "servicio_tecnico", label: "Servicio Técnico" },
  { value: "cobranza", label: "Cobranza" },
  { value: "recepcion", label: "Recepción" },
  { value: "custom", label: "Personalizado" },
];

type ContactCategory = OrganizationContact["category"];

const EMPTY_FORM: {
  name: string;
  category: ContactCategory;
  custom_label: string;
  phone: string;
  email: string;
  whatsapp: string;
} = {
  name: "",
  category: "ventas",
  custom_label: "",
  phone: "",
  email: "",
  whatsapp: "",
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

  const addContact = (form: typeof EMPTY_FORM) => {
    const newContact: OrganizationContact = {
      id: crypto.randomUUID(),
      name: form.name.trim() || null,
      category: form.category,
      custom_label:
        form.category === "custom" ? form.custom_label.trim() || null : null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
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
    <div className="space-y-4 rounded-lg border border-ps-border-default bg-ps-elevated/40 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="m-0 text-sm font-semibold text-ps-text-primary">
            Personas de contacto
          </h3>
          <p className="m-0 mt-1 text-xs text-ps-text-secondary">
            Definí quién atiende cada canal y ordená la prioridad.
          </p>
        </div>
      </div>

      {/* Inline form for adding a new contact */}
      <NewContactForm onAdd={addContact} disabled={disabled} />

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
                <ContactCard
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

interface NewContactFormProps {
  onAdd: (form: typeof EMPTY_FORM) => void;
  disabled?: boolean;
}

function NewContactForm({ onAdd, disabled }: NewContactFormProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const showCustomLabel = form.category === "custom";
  const phoneValid = isValidPhone(form.phone) && isValidPhone(form.whatsapp);
  const canAdd = form.name.trim().length > 0 && phoneValid;

  const update = <K extends keyof typeof EMPTY_FORM>(
    key: K,
    value: (typeof EMPTY_FORM)[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleAdd = () => {
    if (!canAdd) return;
    onAdd(form);
    setForm(EMPTY_FORM);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canAdd) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <fieldset
      className="space-y-3 rounded-md border border-dashed border-ps-border-default bg-ps-bg-base p-3"
      onKeyDown={handleKeyDown}
    >
      <legend className="px-1 text-xs font-semibold text-ps-text-secondary">
        Nuevo contacto
      </legend>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-ps-text-secondary">
          Nombre *
          <Input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Juan Pérez"
            disabled={disabled}
            aria-label="Nombre"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-ps-text-secondary">
          Categoría *
          <SelectControlled
            value={form.category}
            onChange={(value) => {
              const parsed = ContactCategorySchema.safeParse(value);
              if (parsed.success) update("category", parsed.data);
            }}
            options={CATEGORY_OPTIONS}
            placeholder="Seleccioná una categoría"
            aria-label="Categoría de contacto"
            disabled={disabled}
            className="w-full"
          />
        </label>
      </div>

      {showCustomLabel && (
        <label className="flex flex-col gap-1 text-xs text-ps-text-secondary">
          Etiqueta personalizada
          <Input
            value={form.custom_label}
            onChange={(e) => update("custom_label", e.target.value)}
            placeholder="Ej: Financiamiento"
            disabled={disabled}
            aria-label="Etiqueta personalizada"
          />
        </label>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-ps-text-secondary">
          <span className="flex items-center gap-1">
            <Mail className="h-3 w-3" /> Email
          </span>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="contacto@empresa.com"
            disabled={disabled}
            aria-label="Email"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-ps-text-secondary">
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" /> Teléfono
          </span>
          <Input
            type="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="+54 9 11 5555-1234"
            disabled={disabled}
            aria-label="Teléfono"
            className={cn(
              form.phone && !isValidPhone(form.phone) && "border-ps-error",
            )}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-ps-text-secondary">
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" /> WhatsApp
          </span>
          <Input
            type="tel"
            value={form.whatsapp}
            onChange={(e) => update("whatsapp", e.target.value)}
            placeholder="+54 9 11 5555-1234"
            disabled={disabled}
            aria-label="WhatsApp"
            className={cn(
              form.whatsapp &&
                !isValidPhone(form.whatsapp) &&
                "border-ps-error",
            )}
          />
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          disabled={disabled || !canAdd}
          className="bg-ps-cyan text-ps-bg-base hover:bg-ps-cyan-hover"
        >
          <Plus className="mr-1 h-4 w-4" />
          Agregar
        </Button>
      </div>
    </fieldset>
  );
}

interface ContactCardProps {
  contact: OrganizationContact;
  onUpdate: (updates: Partial<OrganizationContact>) => void;
  onRemove: () => void;
  disabled?: boolean;
}

function ContactCard({
  contact,
  onUpdate,
  onRemove,
  disabled,
}: ContactCardProps) {
  const [isEditing, setIsEditing] = useState(false);
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

  const displayName = contact.name ?? "(sin nombre)";
  const displayCategory =
    contact.category === "custom" && contact.custom_label
      ? contact.custom_label
      : (CATEGORY_OPTIONS.find((c) => c.value === contact.category)?.label ??
        contact.category);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-md border border-ps-border-default bg-ps-elevated",
        isDragging && "opacity-50 shadow-lg",
      )}
    >
      {isEditing ? (
        <ContactEditForm
          contact={contact}
          onSave={(updates) => {
            onUpdate(updates);
            setIsEditing(false);
          }}
          onCancel={() => setIsEditing(false)}
          disabled={disabled}
        />
      ) : (
        <div className="flex items-start gap-3 p-3">
          {!disabled && (
            <button
              type="button"
              className="touch-none cursor-grab pt-0.5 text-ps-text-secondary hover:text-ps-text-primary"
              aria-label="Arrastrar para reordenar"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}

          <User className="mt-0.5 h-4 w-4 flex-shrink-0 text-ps-text-secondary" />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ps-text-primary">
                {displayName}
              </span>
              <span className="rounded bg-ps-elevated px-1.5 py-0.5 text-[10px] font-medium text-ps-text-secondary">
                {displayCategory}
              </span>
            </div>

            {(contact.email || contact.phone || contact.whatsapp) && (
              <div className="mt-1.5 space-y-0.5 text-xs text-ps-text-secondary">
                {contact.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3 w-3" />
                    <span>{contact.email}</span>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3" />
                    <span>{contact.phone}</span>
                  </div>
                )}
                {contact.whatsapp && (
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="h-3 w-3" />
                    <span>{contact.whatsapp}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsEditing(true)}
              disabled={disabled}
              className="h-8 w-8 text-ps-text-secondary hover:bg-ps-elevated"
              aria-label="Editar contacto"
              title="Editar"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onRemove}
              disabled={disabled}
              className="h-8 w-8 text-ps-error hover:text-ps-error"
              aria-label="Eliminar contacto"
              title="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ContactEditFormProps {
  contact: OrganizationContact;
  onSave: (updates: Partial<OrganizationContact>) => void;
  onCancel: () => void;
  disabled?: boolean;
}

function ContactEditForm({
  contact,
  onSave,
  onCancel,
  disabled,
}: ContactEditFormProps) {
  const [name, setName] = useState(contact.name ?? "");
  const [category, setCategory] = useState(contact.category);
  const [customLabel, setCustomLabel] = useState(contact.custom_label ?? "");
  const [email, setEmail] = useState(contact.email ?? "");
  const [phone, setPhone] = useState(contact.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(contact.whatsapp ?? "");

  const showCustomLabel = category === "custom";
  const phoneValid = isValidPhone(phone) && isValidPhone(whatsapp);
  const canSave = name.trim().length > 0 && phoneValid;

  return (
    <div className="space-y-2 p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-ps-text-secondary">
          Nombre *
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Juan Pérez"
            disabled={disabled}
            aria-label="Nombre"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ps-text-secondary">
          Categoría *
          <SelectControlled
            value={category}
            onChange={(value) => {
              const parsed = ContactCategorySchema.safeParse(value);
              if (parsed.success) setCategory(parsed.data);
            }}
            options={CATEGORY_OPTIONS}
            placeholder="Seleccioná una categoría"
            aria-label="Categoría de contacto"
            disabled={disabled}
            className="w-full"
          />
        </label>
      </div>

      {showCustomLabel && (
        <label className="flex flex-col gap-1 text-xs text-ps-text-secondary">
          Etiqueta personalizada
          <Input
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="Ej: Financiamiento"
            disabled={disabled}
            aria-label="Etiqueta personalizada"
          />
        </label>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-ps-text-secondary">
          <span className="flex items-center gap-1">
            <Mail className="h-3 w-3" /> Email
          </span>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contacto@empresa.com"
            disabled={disabled}
            aria-label="Email"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ps-text-secondary">
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" /> Teléfono
          </span>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+54 9 11 5555-1234"
            disabled={disabled}
            aria-label="Teléfono"
            className={cn(phone && !isValidPhone(phone) && "border-ps-error")}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ps-text-secondary">
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" /> WhatsApp
          </span>
          <Input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="+54 9 11 5555-1234"
            disabled={disabled}
            aria-label="WhatsApp"
            className={cn(
              whatsapp && !isValidPhone(whatsapp) && "border-ps-error",
            )}
          />
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={disabled}
          className="text-ps-text-secondary"
        >
          <X className="mr-1 h-4 w-4" />
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            if (!canSave) return;
            onSave({
              name: name.trim() || null,
              category,
              custom_label: showCustomLabel ? customLabel.trim() || null : null,
              email: email.trim() || null,
              phone: phone.trim() || null,
              whatsapp: whatsapp.trim() || null,
            });
          }}
          disabled={disabled || !canSave}
          className="bg-ps-success text-ps-base hover:bg-ps-success-bg"
        >
          <Check className="mr-1 h-4 w-4" />
          Guardar
        </Button>
      </div>
    </div>
  );
}
