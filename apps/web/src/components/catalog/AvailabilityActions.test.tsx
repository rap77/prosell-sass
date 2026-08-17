import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AvailabilityActions } from "./AvailabilityActions";
import * as authHooks from "@/hooks/useAuth";
import * as productsApi from "@/lib/api/products";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/api/products", () => ({
  useSubmitProductForApproval: vi.fn(),
  useReserveProduct: vi.fn(),
  usePauseProduct: vi.fn(),
  useResumeProduct: vi.fn(),
  useMarkProductSold: vi.fn(),
}));

const product = {
  id: "product-1",
  title: "Toyota Corolla 2020",
  description: "Excelente estado, único dueño.",
};

const reserveMutateAsync = vi.fn();
const pauseMutateAsync = vi.fn();
const resumeMutateAsync = vi.fn();
const soldMutateAsync = vi.fn();
const submitMutateAsync = vi.fn();

// ponytail: partial mocks — only fields the component actually uses
function mockHooks(hasPermission: boolean): void {
  vi.mocked(authHooks.useAuth).mockReturnValue({
    hasPermission: () => hasPermission,
  } as unknown as ReturnType<typeof authHooks.useAuth>);
  vi.mocked(productsApi.useSubmitProductForApproval).mockReturnValue({
    mutateAsync: submitMutateAsync,
    isPending: false,
    error: null,
  } as unknown as ReturnType<typeof productsApi.useSubmitProductForApproval>);
  vi.mocked(productsApi.useReserveProduct).mockReturnValue({
    mutateAsync: reserveMutateAsync,
    isPending: false,
    error: null,
  } as unknown as ReturnType<typeof productsApi.useReserveProduct>);
  vi.mocked(productsApi.usePauseProduct).mockReturnValue({
    mutateAsync: pauseMutateAsync,
    isPending: false,
    error: null,
  } as unknown as ReturnType<typeof productsApi.usePauseProduct>);
  vi.mocked(productsApi.useResumeProduct).mockReturnValue({
    mutateAsync: resumeMutateAsync,
    isPending: false,
    error: null,
  } as unknown as ReturnType<typeof productsApi.useResumeProduct>);
  vi.mocked(productsApi.useMarkProductSold).mockReturnValue({
    mutateAsync: soldMutateAsync,
    isPending: false,
    error: null,
  } as unknown as ReturnType<typeof productsApi.useMarkProductSold>);
}

describe("AvailabilityActions", () => {
  it("does not render for users without marketplace publishing permission", () => {
    mockHooks(false);

    render(<AvailabilityActions {...product} status="published" />);

    expect(
      screen.queryByRole("button", { name: "Cambiar disponibilidad" }),
    ).not.toBeInTheDocument();
  });

  it("shows only the legal transitions for a published vehicle", async () => {
    mockHooks(true);
    const user = userEvent.setup();

    render(<AvailabilityActions {...product} status="published" />);
    await user.click(
      screen.getByRole("button", { name: "Cambiar disponibilidad" }),
    );

    expect(screen.getByRole("button", { name: "Apartar" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "En mantenimiento" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Marcar vendido" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Volver a publicado" }),
    ).not.toBeInTheDocument();
  });

  it("only offers a return to published for a paused vehicle", async () => {
    mockHooks(true);
    const user = userEvent.setup();

    render(<AvailabilityActions {...product} status="paused" />);
    await user.click(
      screen.getByRole("button", { name: "Cambiar disponibilidad" }),
    );

    expect(
      screen.getByRole("button", { name: "Volver a publicado" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Apartar" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Marcar vendido" }),
    ).not.toBeInTheDocument();
  });

  it("confirms before reserving the vehicle", async () => {
    reserveMutateAsync.mockResolvedValueOnce({});
    mockHooks(true);
    const user = userEvent.setup();

    render(<AvailabilityActions {...product} status="published" />);
    await user.click(
      screen.getByRole("button", { name: "Cambiar disponibilidad" }),
    );
    await user.click(screen.getByRole("button", { name: "Apartar" }));
    await user.click(
      screen.getByRole("button", { name: "Confirmar apartado" }),
    );

    expect(reserveMutateAsync).toHaveBeenCalledWith("product-1");
  });

  it("prepares a user-initiated WhatsApp message after marking the vehicle sold", async () => {
    soldMutateAsync.mockResolvedValueOnce({});
    mockHooks(true);
    const user = userEvent.setup();

    render(<AvailabilityActions {...product} status="published" />);
    await user.click(
      screen.getByRole("button", { name: "Cambiar disponibilidad" }),
    );
    await user.click(screen.getByRole("button", { name: "Marcar vendido" }));
    await user.click(screen.getByRole("button", { name: "Confirmar venta" }));

    const whatsAppLink = await screen.findByRole("link", {
      name: "Abrir WhatsApp",
    });
    expect(whatsAppLink).toHaveAttribute(
      "href",
      "https://wa.me/?text=VENDIDO%3A%20Toyota%20Corolla%202020%0AExcelente%20estado%2C%20%C3%BAnico%20due%C3%B1o.",
    );
    expect(whatsAppLink).toHaveAttribute("target", "_blank");
  });
});
