import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import SettingsProfilePage from "./page";

// Mock dependencies
vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    user: {
      name: "Test User",
      email: "test@example.com",
      phone: "+54 11 0000 0000",
    },
  })),
}));

vi.mock("@/lib/api/users", () => ({
  useUpdateProfile: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

describe("SettingsProfilePage - Mobile-First", () => {
  it("name row grid should be responsive: grid-cols-1 md:grid-cols-2", () => {
    const { container } = render(<SettingsProfilePage />);

    // Name row (firstName + lastName)
    const nameGrid = container.querySelector(".grid.gap-4");
    expect(nameGrid).toBeTruthy();
    expect(nameGrid?.className).toContain("grid-cols-1");
    expect(nameGrid?.className).toContain("md:grid-cols-2");
  });

  it("submit button should stack on mobile: w-full md:w-auto", () => {
    const { getByText } = render(<SettingsProfilePage />);

    const submitButton = getByText("Guardar cambios").closest("button");
    expect(submitButton).toBeTruthy();
    expect(submitButton?.className).toContain("w-full");
    expect(submitButton?.className).toContain("md:w-auto");
  });
});
