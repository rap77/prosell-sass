"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Permission } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { useCategories } from "@/lib/api/categories";
import {
  useCreateOrganization,
  useUpdateOrganization,
} from "@/lib/api/organizations";
import {
  OrganizationFormFields,
  isValidPhone,
} from "@/components/admin/OrganizationFormFields";
import type { OrganizationContact } from "@/lib/api/schemas/organizations";

interface BrokerInput {
  name: string;
  email: string;
  phone?: string;
}

const ORGANIZATION_COLORS = [
  "#0D1B6E",
  "#1E5FD4",
  "#7A1E8A",
  "#0F766E",
  "#9A3412",
  "#7F1D1D",
] as const;

function randomOrganizationColor(): string {
  const index = Math.floor(Math.random() * ORGANIZATION_COLORS.length);
  return ORGANIZATION_COLORS[index] ?? ORGANIZATION_COLORS[0];
}

/**
 * Staff form to create a organization org + invite its owner — Subsystem E Task 16.
 *
 * Gates on hasPermission(ORG_ADMIN_VIEW_ALL) directly rather than
 * useRequireAdmin(), which checks role-identity (isAdmin) instead of the
 * permission itself.
 */
export default function AdminNewDealerPage() {
  const router = useRouter();
  const { hasPermission, isLoading: authLoading } = useAuth();
  const canCreate = hasPermission(Permission.ORG_ADMIN_VIEW_ALL);

  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories();

  // ponytail: Only level 0 categories are verticals (top-level industry niches)
  const verticals = categories.filter((c) => c.level === 0);
  const createOrganization = useCreateOrganization();
  const updateOrganization = useUpdateOrganization();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [color, setColor] = useState(randomOrganizationColor);
  const [verticalIds, setVerticalIds] = useState<string[]>([]);
  const [brokers, setBrokers] = useState<BrokerInput[]>([]);
  const [brokerName, setBrokerName] = useState("");
  const [brokerEmail, setBrokerEmail] = useState("");
  const [brokerPhone, setBrokerPhone] = useState("");

  // Optional fields
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [taxId, setTaxId] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [contacts, setContacts] = useState<OrganizationContact[]>([]);

  useEffect(() => {
    if (!authLoading && !canCreate) {
      router.replace("/dashboard");
    }
  }, [authLoading, canCreate, router]);

  // ponytail: redirect handled in handleSubmit after optional update

  if (authLoading || !canCreate) {
    return null;
  }

  const toggleVertical = (id: string) => {
    setVerticalIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  };

  const addBroker = () => {
    const trimmedName = brokerName.trim();
    const trimmedEmail = brokerEmail.trim().toLowerCase();
    const trimmedPhone = brokerPhone.trim();
    if (
      trimmedName &&
      trimmedEmail &&
      !brokers.some((b) => b.email === trimmedEmail)
    ) {
      setBrokers((prev) => [
        ...prev,
        {
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone || undefined,
        },
      ]);
      setBrokerName("");
      setBrokerEmail("");
      setBrokerPhone("");
    }
  };

  const removeBroker = (email: string) => {
    setBrokers((prev) => prev.filter((b) => b.email !== email));
  };

  const hasOptionalFields = () =>
    description ||
    website ||
    streetAddress ||
    city ||
    state ||
    postalCode ||
    country ||
    taxId ||
    instagram ||
    facebook ||
    contacts.length > 0;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const result = await createOrganization.mutateAsync({
        name,
        vertical_ids: verticalIds,
        brokers: brokers.length > 0 ? brokers : undefined,
      });

      // ponytail: always update to set code/color if provided
      if (code || color || hasOptionalFields()) {
        await updateOrganization.mutateAsync({
          organizationId: result.organization_id,
          data: {
            code: code || undefined,
            color: color || undefined,
            description: description || undefined,
            website: website || undefined,
            street_address: streetAddress || undefined,
            city: city || undefined,
            state: state || undefined,
            postal_code: postalCode || undefined,
            country: country || undefined,
            tax_id: taxId || undefined,
            instagram: instagram || undefined,
            facebook: facebook || undefined,
            contacts,
          },
        });
      }

      router.push("/admin/organizations");
    } catch {
      // Error handled by mutation state
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="m-0 text-2xl font-bold text-ps-text-primary">
        Nueva organización
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md">
        {/* Verticals — fundamental info first */}
        <fieldset className="flex flex-col gap-2 border-none p-0">
          <legend className="text-xs mb-1.5">Verticals *</legend>
          {categoriesLoading && <p>Cargando verticals…</p>}
          {!categoriesLoading && verticals.length === 0 && (
            <p className="text-ps-text-secondary">
              No hay verticals activos disponibles. No se puede crear una
              organización hasta que exista al menos uno.
            </p>
          )}
          {verticals.map((vertical) => (
            <label
              key={vertical.id}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded border px-3 py-2",
                verticalIds.includes(vertical.id)
                  ? "border-ps-cyan bg-ps-cyan-10"
                  : "border-ps-border-default bg-ps-elevated",
              )}
            >
              <input
                type="checkbox"
                checked={verticalIds.includes(vertical.id)}
                onChange={() => toggleVertical(vertical.id)}
                aria-label={vertical.name}
              />
              {vertical.name}
            </label>
          ))}
        </fieldset>

        {/* Shared form fields — identity (name/code/color) + optional */}
        <OrganizationFormFields
          name={name}
          code={code}
          color={color}
          onNameChange={setName}
          onCodeChange={setCode}
          onColorChange={setColor}
          description={description}
          website={website}
          streetAddress={streetAddress}
          city={city}
          state={state}
          postalCode={postalCode}
          country={country}
          taxId={taxId}
          instagram={instagram}
          facebook={facebook}
          onDescriptionChange={setDescription}
          onWebsiteChange={setWebsite}
          onStreetAddressChange={setStreetAddress}
          onCityChange={setCity}
          onStateChange={setState}
          onPostalCodeChange={setPostalCode}
          onCountryChange={setCountry}
          onTaxIdChange={setTaxId}
          onInstagramChange={setInstagram}
          onFacebookChange={setFacebook}
          contacts={contacts}
          onContactsChange={setContacts}
        />

        {/* Brokers section */}
        <fieldset className="flex flex-col gap-2 border-none p-0">
          <legend className="text-xs mb-1.5">
            Brokers{" "}
            <span className="text-ps-text-tertiary font-normal">
              (opcional)
            </span>
          </legend>
          <p className="m-0 text-xs text-ps-text-secondary">
            Los brokers son personas que pueden ser propietarias de productos.
          </p>
          {/* ponytail: stack on mobile, horizontal on desktop */}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={brokerName}
              onChange={(e) => setBrokerName(e.target.value)}
              placeholder="Nombre"
              className="flex-1 h-9 px-3 rounded-lg border border-ps-border-default bg-ps-elevated text-ps-text-primary"
            />
            <input
              type="email"
              value={brokerEmail}
              onChange={(e) => setBrokerEmail(e.target.value)}
              placeholder="Email"
              className="flex-1 h-9 px-3 rounded-lg border border-ps-border-default bg-ps-elevated text-ps-text-primary"
            />
          </div>
          {/* ponytail: stack on mobile, horizontal on desktop */}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="tel"
              value={brokerPhone}
              onChange={(e) => setBrokerPhone(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addBroker();
                }
              }}
              placeholder="+54 9 11 1234-5678 (opcional)"
              className={cn(
                "h-9 flex-1 rounded-lg border bg-ps-elevated px-3 text-ps-text-primary",
                !isValidPhone(brokerPhone)
                  ? "border-ps-error"
                  : "border-ps-border-default",
              )}
            />
            <button
              type="button"
              onClick={addBroker}
              disabled={
                !brokerName.trim() ||
                !brokerEmail.trim() ||
                !isValidPhone(brokerPhone)
              }
              className="h-9 px-3 rounded-lg border border-ps-border-default bg-ps-elevated text-ps-text-primary cursor-pointer flex items-center gap-1"
            >
              <Plus size={14} /> Agregar
            </button>
          </div>
          {!isValidPhone(brokerPhone) && brokerPhone.trim() && (
            <p className="m-0 text-xs text-ps-error">
              Formato E.164: +código país + número
            </p>
          )}
          {brokers.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {brokers.map((broker) => (
                <div
                  key={broker.email}
                  className="flex items-center justify-between rounded-lg border border-ps-border-default bg-ps-elevated px-3 py-2 text-xs"
                >
                  <div>
                    <div className="font-semibold">{broker.name}</div>
                    <div className="text-xs text-ps-text-secondary">
                      {broker.email}
                      {broker.phone && ` · ${broker.phone}`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeBroker(broker.email)}
                    className="flex items-center justify-center w-6 h-6 rounded border-none bg-transparent text-ps-text-secondary cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </fieldset>

        {(createOrganization.error || updateOrganization.error) && (
          <p className="text-ps-error">
            {createOrganization.error?.message ||
              updateOrganization.error?.message}
          </p>
        )}

        <button
          type="submit"
          disabled={
            createOrganization.isPending ||
            updateOrganization.isPending ||
            verticalIds.length === 0
          }
          className="h-10 rounded-lg bg-ps-cyan border-none text-ps-bg-base font-bold cursor-pointer"
        >
          {createOrganization.isPending || updateOrganization.isPending
            ? "Creando..."
            : "Crear organización"}
        </button>
      </form>
    </div>
  );
}
