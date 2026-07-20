export function LandingProofStrip() {
  return (
    <div className="border-t border-ps-border-subtle pt-9 px-8 pb-[60px] flex flex-col gap-[22px] items-center">
      <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-ps-text-secondary m-0">
        Más de 2.400 equipos comerciales ya usan ProSell
      </p>
      <div className="flex gap-[52px] items-center flex-wrap justify-center">
        {["MERIDIAN", "STACKFLOW", "NOVA GROUP", "AXION", "VELTRIX"].map(
          (n) => (
            <span
              key={n}
              className="text-[15px] font-bold tracking-[0.18em] text-ps-text-secondary"
            >
              {n}
            </span>
          ),
        )}
      </div>
    </div>
  );
}
