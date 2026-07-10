"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

/**
 * Shared form fields for organization create/edit.
 * Used by both /admin/organizations/new and /admin/organizations/[id]/edit
 */

interface OrganizationFormFieldsProps {
  // Values
  description: string;
  website: string;
  phone: string;
  email: string;
  whatsapp: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  taxId: string;
  instagram: string;
  facebook: string;
  // Setters
  onDescriptionChange: (v: string) => void;
  onWebsiteChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onWhatsappChange: (v: string) => void;
  onStreetAddressChange: (v: string) => void;
  onCityChange: (v: string) => void;
  onStateChange: (v: string) => void;
  onPostalCodeChange: (v: string) => void;
  onCountryChange: (v: string) => void;
  onTaxIdChange: (v: string) => void;
  onInstagramChange: (v: string) => void;
  onFacebookChange: (v: string) => void;
  // Optional: start expanded (for edit mode when data exists)
  defaultExpanded?: boolean;
}

const inputStyle = {
  height: 38,
  padding: "0 12px",
  borderRadius: 8,
  border: "1px solid var(--ps-border-default)",
  background: "var(--ps-bg-elevated)",
  color: "var(--ps-text-primary)",
};

// ponytail: extracted outside render to satisfy React Compiler
function SectionHeader({
  title,
  isOpen,
  onToggle,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "none",
        border: "none",
        color: "var(--ps-text-primary)",
        cursor: "pointer",
        fontSize: 14,
        fontWeight: 600,
        padding: "8px 0",
      }}
    >
      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      {title}
    </button>
  );
}

export function OrganizationFormFields({
  description,
  website,
  phone,
  email,
  whatsapp,
  streetAddress,
  city,
  state,
  postalCode,
  country,
  taxId,
  instagram,
  facebook,
  onDescriptionChange,
  onWebsiteChange,
  onPhoneChange,
  onEmailChange,
  onWhatsappChange,
  onStreetAddressChange,
  onCityChange,
  onStateChange,
  onPostalCodeChange,
  onCountryChange,
  onTaxIdChange,
  onInstagramChange,
  onFacebookChange,
  defaultExpanded = false,
}: OrganizationFormFieldsProps) {
  const [showContact, setShowContact] = useState(
    defaultExpanded || !!(phone || email || whatsapp),
  );
  const [showAddress, setShowAddress] = useState(
    defaultExpanded ||
      !!(streetAddress || city || state || postalCode || country),
  );
  const [showFiscal, setShowFiscal] = useState(defaultExpanded || !!taxId);
  const [showSocial, setShowSocial] = useState(
    defaultExpanded || !!(instagram || facebook),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Description */}
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        Descripción
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={3}
          style={{ ...inputStyle, height: "auto", padding: 12 }}
        />
      </label>

      {/* Website */}
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        Sitio web
        <input
          type="url"
          value={website}
          onChange={(e) => onWebsiteChange(e.target.value)}
          placeholder="https://example.com"
          style={inputStyle}
        />
      </label>

      {/* Contact section */}
      <div
        style={{
          borderTop: "1px solid var(--ps-border-default)",
          paddingTop: 8,
        }}
      >
        <SectionHeader
          title="Contacto"
          isOpen={showContact}
          onToggle={() => setShowContact(!showContact)}
        />
        {showContact && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginTop: 8,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <label
                style={{ display: "flex", flexDirection: "column", gap: 6 }}
              >
                Teléfono
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => onPhoneChange(e.target.value)}
                  style={inputStyle}
                />
              </label>
              <label
                style={{ display: "flex", flexDirection: "column", gap: 6 }}
              >
                Email de contacto
                <input
                  type="email"
                  value={email}
                  onChange={(e) => onEmailChange(e.target.value)}
                  style={inputStyle}
                />
              </label>
            </div>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              WhatsApp
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => onWhatsappChange(e.target.value)}
                style={inputStyle}
              />
            </label>
          </div>
        )}
      </div>

      {/* Address section */}
      <div
        style={{
          borderTop: "1px solid var(--ps-border-default)",
          paddingTop: 8,
        }}
      >
        <SectionHeader
          title="Dirección"
          isOpen={showAddress}
          onToggle={() => setShowAddress(!showAddress)}
        />
        {showAddress && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginTop: 8,
            }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              Calle y número
              <input
                type="text"
                value={streetAddress}
                onChange={(e) => onStreetAddressChange(e.target.value)}
                style={inputStyle}
              />
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <label
                style={{ display: "flex", flexDirection: "column", gap: 6 }}
              >
                Ciudad
                <input
                  type="text"
                  value={city}
                  onChange={(e) => onCityChange(e.target.value)}
                  style={inputStyle}
                />
              </label>
              <label
                style={{ display: "flex", flexDirection: "column", gap: 6 }}
              >
                Provincia/Estado
                <input
                  type="text"
                  value={state}
                  onChange={(e) => onStateChange(e.target.value)}
                  style={inputStyle}
                />
              </label>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <label
                style={{ display: "flex", flexDirection: "column", gap: 6 }}
              >
                Código postal
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => onPostalCodeChange(e.target.value)}
                  style={inputStyle}
                />
              </label>
              <label
                style={{ display: "flex", flexDirection: "column", gap: 6 }}
              >
                País
                <input
                  type="text"
                  value={country}
                  onChange={(e) => onCountryChange(e.target.value)}
                  style={inputStyle}
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Fiscal section */}
      <div
        style={{
          borderTop: "1px solid var(--ps-border-default)",
          paddingTop: 8,
        }}
      >
        <SectionHeader
          title="Información fiscal"
          isOpen={showFiscal}
          onToggle={() => setShowFiscal(!showFiscal)}
        />
        {showFiscal && (
          <div style={{ marginTop: 8 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              CUIT / RUC / NIT
              <input
                type="text"
                value={taxId}
                onChange={(e) => onTaxIdChange(e.target.value)}
                style={inputStyle}
              />
            </label>
          </div>
        )}
      </div>

      {/* Social section */}
      <div
        style={{
          borderTop: "1px solid var(--ps-border-default)",
          paddingTop: 8,
        }}
      >
        <SectionHeader
          title="Redes sociales"
          isOpen={showSocial}
          onToggle={() => setShowSocial(!showSocial)}
        />
        {showSocial && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginTop: 8,
            }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              Instagram
              <input
                type="text"
                value={instagram}
                onChange={(e) => onInstagramChange(e.target.value)}
                placeholder="@usuario"
                style={inputStyle}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              Facebook
              <input
                type="url"
                value={facebook}
                onChange={(e) => onFacebookChange(e.target.value)}
                placeholder="https://facebook.com/..."
                style={inputStyle}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
