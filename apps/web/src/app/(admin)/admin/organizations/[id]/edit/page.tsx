"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  useOrganization,
  useOrganizationVerticals,
  useUpdateOrganization,
  useUpdateOrganizationVerticals,
} from "@/lib/api/organizations";
import { useCategories } from "@/lib/api/categories";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { logger } from "@/lib/logger";
import { BrokerManager } from "@/components/admin/BrokerManager";
import {
  OrganizationFormFields,
  isValidPhone,
} from "@/components/admin/OrganizationFormFields";
import type {
  Organization,
  OrganizationVerticalsResponse,
} from "@/lib/api/schemas/organizations";

const EMPTY_VERTICALS_DATA: OrganizationVerticalsResponse = {
  organization_id: "",
  vertical_ids: [],
  product_counts: [],
};

/**
 * Edit organization page — uses shared OrganizationFormFields component
 * (which includes identity + optional fields).
 * ponytail: Form extracted to avoid setState-in-useEffect (React Compiler)
 */
export default function AdminEditOrganizationPage() {
  const { id } = useParams<{ id: string }>();
  const isAdmin = useRequireAdmin();
  const { organization, isLoading, error } = useOrganization(id);

  if (!isAdmin) return null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-text-secondary">
        <Loader2 size={16} className="animate-spin" />
        Cargando organización…
      </div>
    );
  }

  if (error || !organization) {
    return (
      <p className="text-error">
        Error al cargar la organización: {error?.message ?? "No encontrada"}
      </p>
    );
  }

  // ponytail: key={organization.id} resets form state when organization changes
  return (
    <EditOrganizationForm key={organization.id} organization={organization} />
  );
}

function EditOrganizationForm({
  organization,
}: {
  organization: Organization;
}) {
  const router = useRouter();
  const updateOrganization = useUpdateOrganization();
  const updateVerticals = useUpdateOrganizationVerticals();
  const {
    data: verticalsData = EMPTY_VERTICALS_DATA,
    isLoading: verticalsLoading,
  } = useOrganizationVerticals(organization.id);
  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories();
  const verticals = categories.filter((c) => c.level === 0);

  // ponytail: map vertical_id -> product_count for quick lookup
  const productCountMap = new Map(
    verticalsData.product_counts.map((pc) => [
      pc.vertical_id,
      pc.product_count,
    ]),
  );

  const [verticalIdsOverride, setVerticalIdsOverride] = useState<
    string[] | null
  >(null);
  const verticalIds = verticalIdsOverride ?? verticalsData.vertical_ids;

  const toggleVertical = (id: string) => {
    // Cannot uncheck if vertical has products
    const hasProducts = (productCountMap.get(id) ?? 0) > 0;
    if (hasProducts && verticalIds.includes(id)) return;

    setVerticalIdsOverride((override) => {
      const current = override ?? verticalsData.vertical_ids;
      return current.includes(id)
        ? current.filter((verticalId) => verticalId !== id)
        : [...current, id];
    });
  };

  // Form state initialized from organization (no useEffect needed)
  const [name, setName] = useState(organization.name);
  const [code, setCode] = useState(organization.code ?? "");
  const [color, setColor] = useState(organization.color ?? "#4DB8FF");
  const [description, setDescription] = useState(
    organization.description ?? "",
  );
  const [website, setWebsite] = useState(organization.website ?? "");
  const [phone, setPhone] = useState(organization.phone ?? "");
  const [email, setEmail] = useState(organization.email ?? "");
  const [whatsapp, setWhatsapp] = useState(organization.whatsapp ?? "");
  const [streetAddress, setStreetAddress] = useState(
    organization.street_address ?? "",
  );
  const [city, setCity] = useState(organization.city ?? "");
  const [state, setState] = useState(organization.state ?? "");
  const [postalCode, setPostalCode] = useState(organization.postal_code ?? "");
  const [country, setCountry] = useState(organization.country ?? "");
  const [taxId, setTaxId] = useState(organization.tax_id ?? "");
  const [instagram, setInstagram] = useState(organization.instagram ?? "");
  const [facebook, setFacebook] = useState(organization.facebook ?? "");

  // A null override means the user has not touched vertical assignments.
  const verticalsChanged =
    verticalIdsOverride !== null &&
    (verticalIds.length !== verticalsData.vertical_ids.length ||
      verticalIds.some((id) => !verticalsData.vertical_ids.includes(id)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Update org details
      await updateOrganization.mutateAsync({
        organizationId: organization.id,
        data: {
          name,
          code: code || undefined,
          color: color || undefined,
          description: description || undefined,
          website: website || undefined,
          phone: phone || undefined,
          email: email || undefined,
          whatsapp: whatsapp || undefined,
          street_address: streetAddress || undefined,
          city: city || undefined,
          state: state || undefined,
          postal_code: postalCode || undefined,
          country: country || undefined,
          tax_id: taxId || undefined,
          instagram: instagram || undefined,
          facebook: facebook || undefined,
        },
      });

      // Update verticals if changed
      if (verticalsChanged) {
        await updateVerticals.mutateAsync({
          organizationId: organization.id,
          verticalIds,
        });
      }

      router.push(`/admin/organizations/${organization.id}`);
    } catch (error) {
      logger.error("Failed to update organization", error);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Back button */}
      <Link
        href={`/admin/organizations/${organization.id}`}
        className="inline-flex items-center gap-1.5 text-text-secondary no-underline text-xs"
      >
        <ArrowLeft size={14} />
        Volver al detalle
      </Link>

      <h1 className="m-0 text-2xl font-bold text-text-primary">
        Editar: {organization.name}
      </h1>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 max-w-[600px]"
      >
        {/* Verticals — fundamental info first */}
        <fieldset className="flex flex-col gap-2 border-none p-0">
          <legend className="text-sm mb-1.5">Verticals</legend>
          {(verticalsLoading || categoriesLoading) && (
            <p className="text-text-secondary">
              Cargando verticals…
            </p>
          )}
          {!verticalsLoading &&
            !categoriesLoading &&
            verticals.length === 0 && (
              <p className="text-text-secondary">
                No hay verticals disponibles.
              </p>
            )}
          {!verticalsLoading &&
            !categoriesLoading &&
            verticals.map((vertical) => {
              const productCount = productCountMap.get(vertical.id) ?? 0;
              const isSelected = verticalIds.includes(vertical.id);
              // ponytail: cannot uncheck if has products
              const isLocked = isSelected && productCount > 0;

              return (
                <label
                  key={vertical.id}
                  className="flex items-center gap-2 p-2.5 rounded"
                  style={{
                    background: isSelected
                      ? "var(--ps-cyan-10)"
                      : "var(--ps-bg-elevated)",
                    border: isSelected
                      ? "1px solid var(--ps-cyan)"
                      : "1px solid var(--ps-border-default)",
                    cursor: isLocked ? "not-allowed" : "pointer",
                    opacity: isLocked ? 0.7 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleVertical(vertical.id)}
                    disabled={isLocked}
                    aria-label={vertical.name}
                  />
                  <span>{vertical.name}</span>
                  {productCount > 0 && (
                    <span className="text-xs text-text-tertiary ml-auto">
                      ({productCount} producto{productCount !== 1 ? "s" : ""})
                    </span>
                  )}
                </label>
              );
            })}
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
          phone={phone}
          email={email}
          whatsapp={whatsapp}
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
          onPhoneChange={setPhone}
          onEmailChange={setEmail}
          onWhatsappChange={setWhatsapp}
          onStreetAddressChange={setStreetAddress}
          onCityChange={setCity}
          onStateChange={setState}
          onPostalCodeChange={setPostalCode}
          onCountryChange={setCountry}
          onTaxIdChange={setTaxId}
          onInstagramChange={setInstagram}
          onFacebookChange={setFacebook}
          defaultExpanded
        />

        {/* Brokers section */}
        <div className="border-t border-border-default pt-4 mt-2">
          <BrokerManager organizationId={organization.id} />
        </div>

        {/* Error */}
        {(updateOrganization.error || updateVerticals.error) && (
          <p className="text-error">
            {updateOrganization.error?.message ||
              updateVerticals.error?.message}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-2">
          <button
            type="submit"
            disabled={
              updateOrganization.isPending ||
              updateVerticals.isPending ||
              !name.trim() ||
              !isValidPhone(phone) ||
              !isValidPhone(whatsapp)
            }
            className="flex-1 h-10 rounded-lg bg-cyan border-none text-bg-base font-bold cursor-pointer"
          >
            {updateOrganization.isPending || updateVerticals.isPending
              ? "Guardando..."
              : "Guardar cambios"}
          </button>
          <Link
            href={`/admin/organizations/${organization.id}`}
            className="flex items-center justify-center h-10 px-5 rounded-lg border border-border-default bg-bg-elevated text-text-primary no-underline font-semibold"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
