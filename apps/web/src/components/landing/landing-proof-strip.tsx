export function LandingProofStrip() {
  return (
    <div style={{
      borderTop: "1px solid rgba(77,184,255,0.08)",
      padding: "36px 32px 60px",
      display: "flex", flexDirection: "column", gap: 22, alignItems: "center",
    }}>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ps-text-disabled)", margin: 0 }}>
        Más de 2.400 equipos comerciales ya usan ProSell
      </p>
      <div style={{ display: "flex", gap: 52, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
        {["MERIDIAN", "STACKFLOW", "NOVA GROUP", "AXION", "VELTRIX"].map((n) => (
          <span key={n} style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.18em", color: "var(--ps-text-disabled)" }}>{n}</span>
        ))}
      </div>
    </div>
  );
}
