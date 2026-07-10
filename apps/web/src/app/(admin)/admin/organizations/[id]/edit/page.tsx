"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useDealer, useUpdateDealer } from "@/lib/api/dealers";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { BrokerManager } from "@/components/admin/BrokerManager";
import { OrganizationFormFields } from "@/components/admin/OrganizationFormFields";

/**
 * Edit organization page — uses shared OrganizationFormFields component.
 */
export default function AdminEditOrganizationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isAdmin = useRequireAdmin();
  const { dealer, isLoading, error } = useDealer(id);
  const updateDealer = useUpdateDealer();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [taxId, setTaxId] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");

  // Populate form when dealer loads
  useEffect(() => {
    if (dealer) {
      setName(dealer.name);
      setDescription(dealer.description ?? "");
      setWebsite(dealer.website ?? "");
      setPhone(dealer.phone ?? "");
      setEmail(dealer.email ?? "");
      setWhatsapp(dealer.whatsapp ?? "");
      setStreetAddress(dealer.street_address ?? "");
      setCity(dealer.city ?? "");
      setState(dealer.state ?? "");
      setPostalCode(dealer.postal_code ?? "");
      setCountry(dealer.country ?? "");
      setTaxId(dealer.tax_id ?? "");
      setInstagram(dealer.instagram ?? "");
      setFacebook(dealer.facebook ?? "");
    }
  }, [dealer]);

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
