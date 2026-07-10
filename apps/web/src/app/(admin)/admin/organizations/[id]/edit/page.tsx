"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useDealer, useUpdateDealer } from "@/lib/api/dealers";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { BrokerManager } from "@/components/admin/BrokerManager";
import { OrganizationFormFields } from "@/components/admin/OrganizationFormFields";
import type { Dealer } from "@/lib/api/schemas/dealers";

/**
 * Edit organization page — uses shared OrganizationFormFields component.
 * ponytail: Form extracted to avoid setState-in-useEffect (React Compiler)
 */
export default function AdminEditOrganizationPage() {
  const { id } = useParams<{ id: string }>();
  const isAdmin = useRequireAdmin();
  const { dealer, isLoading, error } = useDealer(id);

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

  if (error || !dealer) {
    return (
      <p style={{ color: "var(--ps-error)" }}>
        Error al cargar la organización: {error?.message ?? "No encontrada"}
      </p>
    );
  }

  // ponytail: key={dealer.id} resets form state when dealer changes
  return <EditOrganizationForm key={dealer.id} dealer={dealer} />;
}

function EditOrganizationForm({ dealer }: { dealer: Dealer }) {
  const router = useRouter();
  const updateDealer = useUpdateDealer();

  // Form state initialized from dealer (no useEffect needed)
  const [name, setName] = useState(dealer.name);
  const [description, setDescription] = useState(dealer.description ?? "");
  const [website, setWebsite] = useState(dealer.website ?? "");
  const [phone, setPhone] = useState(dealer.phone ?? "");
  const [email, setEmail] = useState(dealer.email ?? "");
  const [whatsapp, setWhatsapp] = useState(dealer.whatsapp ?? "");
  const [streetAddress, setStreetAddress] = useState(
    dealer.street_address ?? "",
  );
  const [city, setCity] = useState(dealer.city ?? "");
  const [state, setState] = useState(dealer.state ?? "");
  const [postalCode, setPostalCode] = useState(dealer.postal_code ?? "");
  const [country, setCountry] = useState(dealer.country ?? "");
  const [taxId, setTaxId] = useState(dealer.tax_id ?? "");
  const [instagram, setInstagram] = useState(dealer.instagram ?? "");
  const [facebook, setFacebook] = useState(dealer.facebook ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateDealer.mutateAsync({
        dealerId: dealer.id,
        data: {
          name,
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
      router.push(`/admin/organizations/${dealer.id}`);
    } catch {
      // Error handled by mutation state
    }
  };

  const inputStyle = {
    height: 38,
    padding: "0 12px",
    borderRadius: 8,
    border: "1px solid var(--ps-border-default)",
    background: "var(--ps-bg-elevated)",
    color: "var(--ps-text-primary)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Back button */}
      <Link
        href={`/admin/organizations/${dealer.id}`}
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
        Editar: {dealer.name}
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
        {/* Name - always visible */}
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          Nombre *
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={inputStyle}
          />
        </label>

        {/* Shared form fields - same component as create page */}
        <OrganizationFormFields
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
          <BrokerManager dealerId={dealer.id} />
        </div>

        {/* Error */}
        {updateDealer.error && (
          <p style={{ color: "var(--ps-error)" }}>
            {updateDealer.error.message}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button
            type="submit"
            disabled={updateDealer.isPending || !name.trim()}
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
            {updateDealer.isPending ? "Guardando..." : "Guardar cambios"}
          </button>
          <Link
            href={`/admin/organizations/${dealer.id}`}
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
