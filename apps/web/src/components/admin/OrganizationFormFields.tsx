"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

// ponytail: E.164 format — + followed by 1-15 digits, optional spaces/dashes for readability
const E164_REGEX = /^\+[1-9]\d{0,14}$/;

/** Validate phone number. Empty is valid (optional field). */
export function isValidPhone(value: string): boolean {
  if (!value.trim()) return true;
  // Strip formatting characters for validation
  const cleaned = value.replace(/[\s\-()]/g, "");
  return E164_REGEX.test(cleaned);
}

/**
 * Shared form fields for organization create/edit.
 * Used by both /admin/organizations/new and /admin/organizations/[id]/edit
 *
 * Includes identity fields (name/code/color) + optional fields
 * (description, contact, address, fiscal, social).
 */

interface OrganizationFormFieldsProps {
  // Identity
  name: string;
  code: string;
  color: string;
  onNameChange: (v: string) => void;
  onCodeChange: (v: string) => void;
  onColorChange: (v: string) => void;
  // Optional fields
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

// ponytail: extracted to module scope to satisfy React Compiler
const inputStyle = {
  height: 38,
  padding: "0 12px",
  borderRadius: 8,
  border: "1px solid var(--ps-border-default)",
  background: "var(--ps-bg-elevated)",
  color: "var(--ps-text-primary)",
};

const inputErrorStyle = {
  ...inputStyle,
  border: "1px solid var(--ps-error)",
};

const errorTextStyle = {
  fontSize: 11,
  color: "var(--ps-error)",
  marginTop: 4,
};

const sectionDividerStyle = {
  borderTop: "1px solid var(--ps-border-default)",
  paddingTop: 8,
};

const sectionBodyStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 12,
  marginTop: 8,
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
      className="flex items-center gap-2 bg-none border-0 text-ps-text-primary cursor-pointer text-sm font-semibold py-2 px-0"
    >
      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      {title}
    </button>
  );
}

export function OrganizationFormFields({
  name,
  code,
  color,
  onNameChange,
  onCodeChange,
  onColorChange,
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

  // ponytail: track touched state for validation UX
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [whatsappTouched, setWhatsappTouched] = useState(false);

  const phoneError = phoneTouched && !isValidPhone(phone);
  const whatsappError = whatsappTouched && !isValidPhone(whatsapp);

  return (
    <div className="flex flex-col gap-4">
      {/* Identity row: Name + Siglas + Color */}
      <div
        className="grid gap-3 items-end"
        style={{ gridTemplateColumns: "1fr auto auto" }}
      >
        <label className="flex flex-col gap-1.5">
          Nombre *
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            required
            style={inputStyle}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          Siglas
          <input
            type="text"
            value={code}
            onChange={(e) =>
              onCodeChange(e.target.value.toUpperCase().slice(0, 5))
            }
            maxLength={5}
            placeholder="ACME"
            style={{ ...inputStyle, width: 80, textTransform: "uppercase" }}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          Color
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            style={{
              ...inputStyle,
              width: 50,
              padding: 4,
              cursor: "pointer",
            }}
          />
        </label>
      </div>

      {/* Description */}
      <label className="flex flex-col gap-1.5">
        Descripción
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={3}
          style={{ ...inputStyle, height: "auto", padding: 12 }}
        />
      </label>

      {/* Website */}
      <label className="flex flex-col gap-1.5">
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
      <div style={sectionDividerStyle}>
        <SectionHeader
          title="Contacto"
          isOpen={showContact}
          onToggle={() => setShowContact(!showContact)}
        />
        {showContact && (
          <div style={sectionBodyStyle}>
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: "1fr 1fr" }}
            >
              <label className="flex flex-col gap-1.5">
                Teléfono
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => onPhoneChange(e.target.value)}
                  onBlur={() => setPhoneTouched(true)}
                  placeholder="+54 9 11 1234-5678"
                  style={phoneError ? inputErrorStyle : inputStyle}
                />
                {phoneError && (
                  <span style={errorTextStyle}>
                    Formato E.164: +código país + número
                  </span>
                )}
              </label>
              <label className="flex flex-col gap-1.5">
                Email de contacto
                <input
                  type="email"
                  value={email}
                  onChange={(e) => onEmailChange(e.target.value)}
                  style={inputStyle}
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              WhatsApp
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => onWhatsappChange(e.target.value)}
                onBlur={() => setWhatsappTouched(true)}
                placeholder="+54 9 11 1234-5678"
                style={whatsappError ? inputErrorStyle : inputStyle}
              />
              {whatsappError && (
                <span style={errorTextStyle}>
                  Formato E.164: +código país + número
                </span>
              )}
            </label>
          </div>
        )}
      </div>

      {/* Address section */}
      <div style={sectionDividerStyle}>
        <SectionHeader
          title="Dirección"
          isOpen={showAddress}
          onToggle={() => setShowAddress(!showAddress)}
        />
        {showAddress && (
          <div style={sectionBodyStyle}>
            <label className="flex flex-col gap-1.5">
              Calle y número
              <input
                type="text"
                value={streetAddress}
                onChange={(e) => onStreetAddressChange(e.target.value)}
                style={inputStyle}
              />
            </label>
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: "1fr 1fr" }}
            >
              <label className="flex flex-col gap-1.5">
                Ciudad
                <input
                  type="text"
                  value={city}
                  onChange={(e) => onCityChange(e.target.value)}
                  style={inputStyle}
                />
              </label>
              <label className="flex flex-col gap-1.5">
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
              className="grid gap-3"
              style={{ gridTemplateColumns: "1fr 1fr" }}
            >
              <label className="flex flex-col gap-1.5">
                Código postal
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => onPostalCodeChange(e.target.value)}
                  style={inputStyle}
                />
              </label>
              <label className="flex flex-col gap-1.5">
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
      <div style={sectionDividerStyle}>
        <SectionHeader
          title="Información fiscal"
          isOpen={showFiscal}
          onToggle={() => setShowFiscal(!showFiscal)}
        />
        {showFiscal && (
          <div className="mt-2">
            <label className="flex flex-col gap-1.5">
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
      <div style={sectionDividerStyle}>
        <SectionHeader
          title="Redes sociales"
          isOpen={showSocial}
          onToggle={() => setShowSocial(!showSocial)}
        />
        {showSocial && (
          <div
            className="grid gap-3 mt-2"
            style={{ gridTemplateColumns: "1fr 1fr" }}
          >
            <label className="flex flex-col gap-1.5">
              Instagram
              <input
                type="text"
                value={instagram}
                onChange={(e) => onInstagramChange(e.target.value)}
                placeholder="@usuario"
                style={inputStyle}
              />
            </label>
            <label className="flex flex-col gap-1.5">
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
