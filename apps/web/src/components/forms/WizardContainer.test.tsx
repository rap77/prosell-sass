import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WizardContainer } from "./WizardContainer";

describe("WizardContainer desktop navigation", () => {
  beforeEach(() => {
    vi.mocked(Element.prototype.scrollIntoView).mockClear();
  });

  it("scrolls the currently rendered section after the sidebar is mounted", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <WizardContainer variant="desktop">
        <form>
          <section>
            <h2 data-label="Detalles">Detalles</h2>
          </section>
          <section>
            <h2 data-label="Precio">Precio</h2>
          </section>
        </form>
      </WizardContainer>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Precio" })).toBeVisible();
    });

    expect(container.querySelector('[aria-hidden="true"]')).toHaveClass(
      "h-[calc(100vh-8rem)]",
    );

    const priceSection = screen
      .getByRole("heading", { name: "Precio" })
      .closest("section");
    expect(priceSection).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Precio" }));

    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
    expect(vi.mocked(Element.prototype.scrollIntoView).mock.contexts).toContain(
      priceSection,
    );
  });

  it("keeps localized progress and save actions in a sticky top bar on desktop", async () => {
    render(
      <WizardContainer
        variant="desktop"
        actions={
          <>
            <button type="submit">Guardar cambios</button>
            <button type="button">Cancelar</button>
          </>
        }
      >
        <form>
          <section>
            <h2 data-label="Detalles">Detalles</h2>
          </section>
          <section>
            <h2 data-label="Precio">Precio</h2>
          </section>
        </form>
      </WizardContainer>,
    );

    await waitFor(() => {
      expect(screen.getByText("Paso 1 de 2")).toBeVisible();
    });

    expect(
      screen.getByRole("button", { name: "Guardar cambios" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeVisible();
    expect(screen.getByTestId("wizard-desktop-action-bar")).toHaveClass(
      "sticky",
    );
  });
});

describe("WizardContainer mobile navigation", () => {
  it("keeps save and sequential navigation available on the first edit step", async () => {
    const user = userEvent.setup();
    render(
      <WizardContainer
        variant="mobile"
        showActionsOnEveryMobileStep
        actions={<button type="submit">Guardar cambios</button>}
      >
        <form>
          <section>
            <h2 data-label="Detalles">Detalles</h2>
          </section>
          <section>
            <h2 data-label="Precio">Precio</h2>
          </section>
        </form>
      </WizardContainer>,
    );

    await waitFor(() => {
      expect(screen.getByText("Paso 1 de 2")).toBeVisible();
    });

    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Guardar cambios" }),
    ).toBeVisible();
    expect(screen.getByTestId("wizard-mobile-action-bar")).toHaveClass("fixed");

    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByText("Paso 2 de 2")).toBeVisible();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "Siguiente" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Guardar cambios" }),
    ).toBeVisible();
  });

  it("keeps create save final-step-only while navigation remains available", async () => {
    const user = userEvent.setup();
    render(
      <WizardContainer
        variant="mobile"
        actions={<button type="submit">Crear producto</button>}
      >
        <form>
          <section>
            <h2 data-label="Detalles">Detalles</h2>
          </section>
          <section>
            <h2 data-label="Precio">Precio</h2>
          </section>
        </form>
      </WizardContainer>,
    );

    await waitFor(() => {
      expect(screen.getByText("Paso 1 de 2")).toBeVisible();
    });

    expect(
      screen.queryByRole("button", { name: "Crear producto" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(
      screen.getByRole("button", { name: "Crear producto" }),
    ).toBeVisible();
  });
});
