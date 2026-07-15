"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useOrganization, useUpdateOrganization } from "@/lib/api/organizations";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { BrokerManager } from "@/components/admin/BrokerManager";
import { OrganizationFormFields } from "@/components/admin/OrganizationFormFields";
import type { Organization } from "@/lib/api/schemas/organizations";

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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--ps-text-secondary)",
        }}
      >
        <Loader2 size={16} className="animate-spin" />
        Cargando organización…
      </div>
    );
  }

  if (error || !organization) {
    return (
      <p style={{ color: "var(--ps-error)" }}>
        Error al cargar la organización: {error?.message ?? "No encontrada"}
      </p>
    );
  }

  // ponytail: key={organization.id} resets form state when organization changes
  return <EditOrganizationForm key={organization.id} organization={organization} />;
}

function EditOrganizationForm({ organization }: { organization: Organization }) {
  const router = useRouter();
  const updateOrganization = useUpdateOrganization();

  // Form state initialized from organization (no useEffect needed)
  const [name, setName] = useState(organization.name);
  const [code, setCode] = useState(organization.code ?? "");
  const [color, setColor] = useState(organization.color ?? "#4DB8FF");
  const [description, setDescription] = useState(organization.description ?? "");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
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
      router.push(`/admin/organizations/${organization.id}`);
    } catch {
      // Error handled by mutation state
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Back button */}
      <Link
        href={`/admin/organizations/${organization.id}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "var(--ps-text-secondary)",
          textDecoration: "none",
          fontSize: 13,
        }}
      >
        <ArrowLeft size={14} />
        Volver al detalle
      </Link>

      <h1
        style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 700,
          color: "var(--ps-text-primary)",
        }}
      >
        Editar: {organization.name}
      </h1>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxWidth: 600,
        }}
      >
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
        <div
          style={{
            borderTop: "1px solid var(--ps-border-default)",
            paddingTop: 16,
            marginTop: 8,
          }}
        >
          <BrokerManager organizationId={organization.id} />
        </div>

        {/* Error */}
        {updateOrganization.error && (
          <p style={{ color: "var(--ps-error)" }}>
            {updateOrganization.error.message}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button
            type="submit"
            disabled={updateOrganization.isPending || !name.trim()}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 8,
              background: "var(--ps-cyan)",
              border: "none",
              color: "var(--ps-bg-base)",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {updateOrganization.isPending ? "Guardando..." : "Guardar cambios"}
          </button>
          <Link
            href={`/admin/organizations/${organization.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 40,
              padding: "0 20px",
              borderRadius: 8,
              border: "1px solid var(--ps-border-default)",
              background: "var(--ps-bg-elevated)",
              color: "var(--ps-text-primary)",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
