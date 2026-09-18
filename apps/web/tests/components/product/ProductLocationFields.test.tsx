import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { ProductLocationFields } from "@/components/product/ProductLocationFields";

/**
 * Controlled harness — mirrors how a real parent (product detail view)
 * would wire `city`/`state` through `onChange`, and `onSave` through the
 * existing product PATCH mutation (mocked here as a plain spy per
 * unit-test-instructions.md § Mocking/Stubbing).
 */
function Harness({
  initialCity = null as string | null,
  initialState = null as string | null,
  isInherited,
  onSave,
}: {
  initialCity?: string | null;
  initialState?: string | null;
  isInherited: boolean;
  onSave: (city: string | null, state: string | null) => void;
}) {
  const [city, setCity] = useState(initialCity);
  const [state, setState] = useState(initialState);
  return (
    <ProductLocationFields
      city={city}
      state={state}
      isInherited={isInherited}
      onChange={(field, value) =>
        field === "city" ? setCity(value) : setState(value)
      }
      onSave={onSave}
    />
  );
}

describe("ProductLocationFields", () => {
  it("persists a full override when both fields are completed and saved (AC2.1.1/AC2.1.4)", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<Harness isInherited={false} onSave={onSave} />);

    await user.type(screen.getByLabelText("Ciudad"), "Rosario");
    await user.type(screen.getByLabelText("Provincia"), "Santa Fe");
    await user.click(screen.getByRole("button", { name: "Guardar ubicación" }));

    expect(onSave).toHaveBeenCalledWith("Rosario", "Santa Fe");
  });

  it("shows the 'Heredado de organización' badge when isInherited=true (AC2.1.2)", () => {
    render(
      <Harness
        initialCity="Rosario"
        initialState="Santa Fe"
        isInherited
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText("Heredado de organización")).toBeInTheDocument();
  });

  it("hides the badge when the product has its own override (isInherited=false)", () => {
    render(
      <Harness
        initialCity="Rosario"
        initialState="Santa Fe"
        isInherited={false}
        onSave={vi.fn()}
      />,
    );

    expect(
      screen.queryByText("Heredado de organización"),
    ).not.toBeInTheDocument();
  });

  it("rejects a partial pair (city without state) with an inline error, never calling onSave (AC2.1.5)", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<Harness isInherited={false} onSave={onSave} />);

    await user.type(screen.getByLabelText("Ciudad"), "Rosario");
    await user.click(screen.getByRole("button", { name: "Guardar ubicación" }));

    expect(
      screen.getByText(
        "Completá ambos campos o dejalos vacíos para heredar el default de organización",
      ),
    ).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("rejects a partial pair (state without city) with an inline error, never calling onSave (AC2.1.5)", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<Harness isInherited={false} onSave={onSave} />);

    await user.type(screen.getByLabelText("Provincia"), "Santa Fe");
    await user.click(screen.getByRole("button", { name: "Guardar ubicación" }));

    expect(
      screen.getByText(
        "Completá ambos campos o dejalos vacíos para heredar el default de organización",
      ),
    ).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("reverts to the organization default when both fields are cleared after having an override (AC2.1.5)", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <Harness
        initialCity="Rosario"
        initialState="Santa Fe"
        isInherited={false}
        onSave={onSave}
      />,
    );

    await user.clear(screen.getByLabelText("Ciudad"));
    await user.clear(screen.getByLabelText("Provincia"));
    await user.click(screen.getByRole("button", { name: "Guardar ubicación" }));

    // AC2.1.5: an empty pair is NOT an error — it's interpreted as
    // reverting to the inherited organization default.
    expect(
      screen.queryByText(
        "Completá ambos campos o dejalos vacíos para heredar el default de organización",
      ),
    ).not.toBeInTheDocument();
    expect(onSave).toHaveBeenCalledWith(null, null);
  });

  it("clears a previously shown partial-pair error once the pair becomes valid again", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<Harness isInherited={false} onSave={onSave} />);

    await user.type(screen.getByLabelText("Ciudad"), "Rosario");
    await user.click(screen.getByRole("button", { name: "Guardar ubicación" }));
    expect(
      screen.getByText(
        "Completá ambos campos o dejalos vacíos para heredar el default de organización",
      ),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("Provincia"), "Santa Fe");
    await user.click(screen.getByRole("button", { name: "Guardar ubicación" }));

    expect(
      screen.queryByText(
        "Completá ambos campos o dejalos vacíos para heredar el default de organización",
      ),
    ).not.toBeInTheDocument();
    expect(onSave).toHaveBeenCalledWith("Rosario", "Santa Fe");
  });

  it("disables the save button when disabled=true", () => {
    render(
      <ProductLocationFields
        city="Rosario"
        state="Santa Fe"
        isInherited={false}
        onChange={vi.fn()}
        onSave={vi.fn()}
        disabled
      />,
    );

    expect(
      screen.getByRole("button", { name: "Guardar ubicación" }),
    ).toBeDisabled();
  });
});
