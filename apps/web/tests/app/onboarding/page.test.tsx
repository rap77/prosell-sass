import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OnboardingPage from "@/app/onboarding/page";
import { orgApi, type Organization } from "@/lib/api/orgApi";

const mockReplace = vi.fn();
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function renderWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <OnboardingPage />
    </QueryClientProvider>,
  );
}

const mockOrg: Organization = {
  id: "org-1",
  name: "AutoVentas Córdoba",
  code: null,
  color: null,
  tenant_id: "org-1",
  status: "active",
  logo_url: null,
  banner_url: null,
  description: null,
  website: null,
  phone: null,
  email: null,
  whatsapp: null,
  street_address: null,
  city: null,
  state: null,
  postal_code: null,
  country: null,
  tax_id: null,
  instagram: null,
  facebook: null,
  wallet_id: null,
  setup_complete: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  verified_at: null,
  verified_by: null,
};

describe("OnboardingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders step 1 pre-filled with the fetched organization name when setup is incomplete", async () => {
    vi.spyOn(orgApi, "getMyOrganization").mockResolvedValue(mockOrg);

    renderWithClient();

    const nameInput = await screen.findByLabelText(
      /nombre de la organización/i,
    );
    await waitFor(() => expect(nameInput).toHaveValue(mockOrg.name));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("redirects to /dashboard when the organization already has setup_complete", async () => {
    vi.spyOn(orgApi, "getMyOrganization").mockResolvedValue({
      ...mockOrg,
      setup_complete: true,
    });

    renderWithClient();

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/dashboard"));
  });

  it("renders step 1 with empty defaults when there is no organization yet (fetch rejects)", async () => {
    vi.spyOn(orgApi, "getMyOrganization").mockRejectedValue(
      new Error("Not found"),
    );

    renderWithClient();

    const nameInput = await screen.findByLabelText(
      /nombre de la organización/i,
    );
    expect(nameInput).toHaveValue("");
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
