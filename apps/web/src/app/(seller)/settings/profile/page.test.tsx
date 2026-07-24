import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SettingsProfilePage from "./page";

// Mock dependencies
vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    user: {
      first_name: "Test",
      last_name: "User",
      email: "test@example.com",
    },
    updateUser: vi.fn(),
  })),
}));

vi.mock("@/lib/api/userApi", () => ({
  useCurrentOrganizationProfile: vi.fn(() => ({
    data: {
      phone: "+54 11 0000 0000",
    },
    isLoading: false,
  })),
  useUpdateProfile: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

const renderWithQuery = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
};

describe("SettingsProfilePage - Mobile-First", () => {
  it("name row grid should be responsive: grid-cols-1 md:grid-cols-2", () => {
    const { container } = renderWithQuery(<SettingsProfilePage />);

    // Name row (firstName + lastName)
    const nameGrid = container.querySelector(".grid.gap-4");
    expect(nameGrid).toBeTruthy();
    expect(nameGrid?.className).toContain("grid-cols-1");
    expect(nameGrid?.className).toContain("md:grid-cols-2");
  });

  it("submit button should stack on mobile: w-full md:w-auto", () => {
    const { getByText } = renderWithQuery(<SettingsProfilePage />);

    const submitButton = getByText("Guardar cambios").closest("button");
    expect(submitButton).toBeTruthy();
    expect(submitButton?.className).toContain("w-full");
    expect(submitButton?.className).toContain("md:w-auto");
  });
});
