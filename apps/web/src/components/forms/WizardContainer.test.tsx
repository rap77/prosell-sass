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
});
