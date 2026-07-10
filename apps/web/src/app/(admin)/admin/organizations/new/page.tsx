"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Permission } from "@/lib/auth/permissions";
import { useCategories } from "@/lib/api/categories";
import { useCreateDealer, useUpdateDealer } from "@/lib/api/dealers";
import { OrganizationFormFields } from "@/components/admin/OrganizationFormFields";

/**
 * Staff form to create a dealer org + invite its owner — Subsystem E Task 16.
 *
 * Gates on hasPermission(DEALER_ADMIN_VIEW_ALL) directly rather than
 * useRequireAdmin(), which checks role-identity (isAdmin) instead of the
 * permission itself.
 */
export default function AdminNewDealerPage() {
  const router = useRouter();
  const { hasPermission, isLoading: authLoading } = useAuth();
  const canCreate = hasPermission(Permission.DEALER_ADMIN_VIEW_ALL);

  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories();

  // ponytail: Only level 0 categories are verticals (top-level industry niches)
  const verticals = categories.filter((c) => c.level === 0);
  const createDealer = useCreateDealer();
  const updateDealer = useUpdateDealer();

  const [name, setName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [verticalIds, setVerticalIds] = useState<string[]>([]);
  const [brokers, setBrokers] = useState<
    Array<{ name: string; email: string }>
  >([]);
  const [brokerName, setBrokerName] = useState("");
  const [brokerEmail, setBrokerEmail] = useState("");

  // Optional fields
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
    if (
      trimmedName &&
      trimmedEmail &&
      !brokers.some((b) => b.email === trimmedEmail)
    ) {
      setBrokers((prev) => [
        ...prev,
        { name: trimmedName, email: trimmedEmail },
      ]);
      setBrokerName("");
      setBrokerEmail("");
    }
  };

  const removeBroker = (email: string) => {
    setBrokers((prev) => prev.filter((b) => b.email !== email));
  };

  const hasOptionalFields = () =>
    description ||
    website ||
    phone ||
    email ||
    whatsapp ||
    streetAddress ||
    city ||
    state ||
    postalCode ||
    country ||
    taxId ||
    instagram ||
    facebook;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createDealer.mutateAsync({
        name,
        vertical_ids: verticalIds,
        owner_email: ownerEmail,
        brokers: brokers.length > 0 ? brokers : undefined,
      });

      // If optional fields were filled, update the org immediately
      if (hasOptionalFields()) {
        await updateDealer.mutateAsync({
          dealerId: result.organization_id,
          data: {
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
      }

      router.push("/admin/organizations");
    } catch {
      // Error handled by mutation state
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h1
        style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 700,
          color: "var(--ps-text-primary)",
        }}
      >
        Nueva organización
      </h1>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxWidth: 480,
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          Nombre
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{
              height: 38,
              padding: "0 12px",
              borderRadius: 8,
              border: "1px solid var(--ps-border-default)",
              background: "var(--ps-bg-elevated)",
              color: "var(--ps-text-primary)",
            }}
          />
        </label>

        <fieldset
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            border: "none",
            padding: 0,
          }}
        >
          <legend style={{ fontSize: 13.5, marginBottom: 6 }}>Verticals</legend>
          {categoriesLoading && <p>Cargando verticals…</p>}
          {!categoriesLoading && verticals.length === 0 && (
            <p style={{ color: "var(--ps-text-secondary)" }}>
              No hay verticals activos disponibles. No se puede crear una
              organización hasta que exista al menos uno.
            </p>
          )}
          {verticals.map((vertical) => (
            <label
              key={vertical.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 6,
                background: verticalIds.includes(vertical.id)
                  ? "var(--ps-cyan-10)"
                  : "var(--ps-bg-elevated)",
                border: verticalIds.includes(vertical.id)
                  ? "1px solid var(--ps-cyan)"
                  : "1px solid var(--ps-border-default)",
                cursor: "pointer",
              }}
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

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          Email del owner
          <input
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            required
            style={{
              height: 38,
              padding: "0 12px",
              borderRadius: 8,
              border: "1px solid var(--ps-border-default)",
              background: "var(--ps-bg-elevated)",
              color: "var(--ps-text-primary)",
            }}
          />
        </label>

        {/* Brokers section */}
        <fieldset
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            border: "none",
            padding: 0,
          }}
        >
          <legend style={{ fontSize: 13.5, marginBottom: 6 }}>
            Brokers{" "}
            <span style={{ color: "var(--ps-text-tertiary)", fontWeight: 400 }}>
              (opcional)
            </span>
          </legend>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "var(--ps-text-secondary)",
            }}
          >
            Los brokers son personas que pueden ser propietarias de productos.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={brokerName}
              onChange={(e) => setBrokerName(e.target.value)}
              placeholder="Nombre"
              style={{
                flex: 1,
                height: 38,
                padding: "0 12px",
                borderRadius: 8,
                border: "1px solid var(--ps-border-default)",
                background: "var(--ps-bg-elevated)",
                color: "var(--ps-text-primary)",
              }}
            />
            <input
              type="email"
              value={brokerEmail}
              onChange={(e) => setBrokerEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addBroker();
                }
              }}
              placeholder="Email"
              style={{
                flex: 1,
                height: 38,
                padding: "0 12px",
                borderRadius: 8,
                border: "1px solid var(--ps-border-default)",
                background: "var(--ps-bg-elevated)",
                color: "var(--ps-text-primary)",
              }}
            />
            <button
              type="button"
              onClick={addBroker}
              disabled={!brokerName.trim() || !brokerEmail.trim()}
              style={{
                height: 38,
                padding: "0 12px",
                borderRadius: 8,
                border: "1px solid var(--ps-border-default)",
                background: "var(--ps-bg-elevated)",
                color: "var(--ps-text-primary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Plus size={14} /> Agregar
            </button>
          </div>
          {brokers.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {brokers.map((broker) => (
                <div
                  key={broker.email}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "var(--ps-cyan-10)",
                    border: "1px solid var(--ps-cyan)",
                    fontSize: 13,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{broker.name}</div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--ps-text-secondary)",
                      }}
                    >
                      {broker.email}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeBroker(broker.email)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      border: "none",
                      background: "transparent",
                      color: "var(--ps-text-secondary)",
                      cursor: "pointer",
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </fieldset>

        {/* Shared form fields - same component as edit page */}
        <div
          style={{
            borderTop: "1px solid var(--ps-border-default)",
            paddingTop: 16,
            marginTop: 8,
          }}
        >
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
          />
        </div>

        {(createDealer.error || updateDealer.error) && (
          <p style={{ color: "var(--ps-error)" }}>
            {createDealer.error?.message || updateDealer.error?.message}
          </p>
        )}

        <button
          type="submit"
          disabled={
            createDealer.isPending ||
            updateDealer.isPending ||
            verticalIds.length === 0
          }
          style={{
            height: 40,
            borderRadius: 8,
            background: "var(--ps-cyan)",
            border: "none",
            color: "var(--ps-bg-base)",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {createDealer.isPending || updateDealer.isPending
            ? "Creando..."
            : "Crear organización"}
        </button>
      </form>
    </div>
  );
}
