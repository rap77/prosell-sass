/**
 * organizationsApi — admin organization endpoints (Subsystem D Phase 4 backend).
 *
 * GET /api/v1/admin/organizations
 * GET /api/v1/admin/organizations/{id}/products
 *
 * Both endpoints are gated server-side behind Permission.ORG_ADMIN_VIEW_ALL
 * — a non-admin caller gets a 403, surfaced here as a thrown Error.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { extractErrorMessage } from "@/lib/api/extractErrorMessage";
import {
  BrokerListResponseSchema,
  BrokerSchema,
  CreateOrganizationResponseSchema,
  OrganizationListResponseSchema,
  OrganizationProductListResponseSchema,
  OrganizationVerticalsResponseSchema,
  UpdateOrganizationResponseSchema,
  type Broker,
  type CreateOrganizationResponse,
  type Organization,
  type OrganizationProduct,
  type UpdateOrganizationResponse,
} from "@/lib/api/schemas/organizations";

interface BrokerInput {
  name: string;
  email: string;
  phone?: string;
}

interface CreateOrganizationInput {
  name: string;
  vertical_ids: string[];
  /** Optional: only set if the org should receive an owner invitation now. */
  owner_email?: string;
  brokers?: BrokerInput[];
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { credentials: "include" });

  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(body, "Error en la petición"));
  }

  return res.json();
}

async function postJson(url: string, body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const responseBody: unknown = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(responseBody, "Error en la petición"));
  }

  return res.json();
}

/** List every organization organization. */
export function useOrganizations(): UseQueryResult<Organization[], Error> {
  return useQuery({
    queryKey: ["admin-organizations"],
    queryFn: async () => {
      const raw = await getJson("/api/v1/admin/organizations");
      return OrganizationListResponseSchema.parse(raw).organizations;
    },
  });
}

/** Find a single organization by id from the organizations list (no dedicated GET-by-id endpoint). */
export function useOrganization(
  organizationId: string | undefined,
): UseQueryResult<Organization[], Error> & {
  organization: Organization | undefined;
} {
  const query = useOrganizations();
  const organization = query.data?.find((d) => d.id === organizationId);
  return { ...query, organization };
}

/** List a specific organization's products. */
export function useOrganizationProducts(
  organizationId: string | undefined,
): UseQueryResult<OrganizationProduct[], Error> {
  return useQuery({
    queryKey: ["admin-organization-products", organizationId],
    queryFn: async () => {
      const raw = await getJson(
        `/api/v1/admin/organizations/${organizationId}/products`,
      );
      return OrganizationProductListResponseSchema.parse(raw).products;
    },
    enabled: !!organizationId,
  });
}

/** Create a organization org + enable verticals + invite its owner. */
export function useCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: CreateOrganizationInput,
    ): Promise<CreateOrganizationResponse> => {
      const raw = await postJson("/api/v1/admin/organizations", input);
      return CreateOrganizationResponseSchema.parse(raw);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
    },
  });
}

/** Resend (or freshly issue) the owner invitation for an existing organization. */
export function useResendOrganizationInvitation() {
  return useMutation({
    mutationFn: async (
      organizationId: string,
    ): Promise<CreateOrganizationResponse> => {
      const raw = await postJson(
        `/api/v1/admin/organizations/${organizationId}/resend-invitation`,
        {},
      );
      return CreateOrganizationResponseSchema.parse(raw);
    },
  });
}

interface UpdateOrganizationInput {
  name?: string;
  code?: string;
  color?: string;
  description?: string;
  website?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  street_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  tax_id?: string;
  instagram?: string;
  facebook?: string;
}

/** Update a organization's details. */
export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      organizationId,
      data,
    }: {
      organizationId: string;
      data: UpdateOrganizationInput;
    }): Promise<UpdateOrganizationResponse> => {
      const res = await fetch(`/api/v1/admin/organizations/${organizationId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body: unknown = await res.json().catch(() => null);
        throw new Error(
          extractErrorMessage(body, "Error updating organization"),
        );
      }
      return UpdateOrganizationResponseSchema.parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
    },
  });
}

// -----------------------------------------------------------------------------
// Broker hooks
// -----------------------------------------------------------------------------

/** List brokers for a organization. */
export function useOrganizationBrokers(
  organizationId: string | undefined,
): UseQueryResult<Broker[], Error> {
  return useQuery({
    queryKey: ["admin-organization-brokers", organizationId],
    queryFn: async () => {
      const raw = await getJson(
        `/api/v1/admin/organizations/${organizationId}/brokers`,
      );
      return BrokerListResponseSchema.parse(raw).brokers;
    },
    enabled: !!organizationId,
  });
}

/** Create a broker for a organization. */
export function useCreateOrganizationBroker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      organizationId,
      name,
      email,
      phone,
    }: {
      organizationId: string;
      name: string;
      email: string;
      phone?: string;
    }): Promise<Broker> => {
      const res = await fetch(
        `/api/v1/admin/organizations/${organizationId}/brokers`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, phone }),
        },
      );
      if (!res.ok) {
        const body: unknown = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(body, "Error creating broker"));
      }
      return BrokerSchema.parse(await res.json());
    },
    onSuccess: (_, { organizationId }) => {
      queryClient.invalidateQueries({
        queryKey: ["admin-organization-brokers", organizationId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
    },
  });
}

/** Update a broker (only if status is pending). */
export function useUpdateOrganizationBroker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      organizationId,
      brokerId,
      name,
      email,
      phone,
    }: {
      organizationId: string;
      brokerId: string;
      name?: string;
      email?: string;
      phone?: string;
    }): Promise<Broker> => {
      const res = await fetch(
        `/api/v1/admin/organizations/${organizationId}/brokers/${brokerId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, phone }),
        },
      );
      if (!res.ok) {
        const body: unknown = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(body, "Error updating broker"));
      }
      return BrokerSchema.parse(await res.json());
    },
    onSuccess: (_, { organizationId }) => {
      queryClient.invalidateQueries({
        queryKey: ["admin-organization-brokers", organizationId],
      });
    },
  });
}

/** Delete a broker. */
export function useDeleteOrganizationBroker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      organizationId,
      brokerId,
    }: {
      organizationId: string;
      brokerId: string;
    }): Promise<void> => {
      const res = await fetch(
        `/api/v1/admin/organizations/${organizationId}/brokers/${brokerId}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!res.ok) {
        const body: unknown = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(body, "Error deleting broker"));
      }
    },
    onSuccess: (_, { organizationId }) => {
      queryClient.invalidateQueries({
        queryKey: ["admin-organization-brokers", organizationId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
    },
  });
}

interface VerticalWithProductCount {
  vertical_id: string;
  product_count: number;
}

interface OrganizationVerticalsData {
  organization_id: string;
  vertical_ids: string[];
  product_counts: VerticalWithProductCount[];
}

/** Get organization verticals with product counts. */
export function useOrganizationVerticals(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["admin-organization-verticals", organizationId],
    queryFn: async (): Promise<OrganizationVerticalsData> => {
      if (!organizationId) {
        return { organization_id: "", vertical_ids: [], product_counts: [] };
      }
      const raw = await getJson(
        `/api/v1/admin/organizations/${organizationId}/verticals`,
      );
      return OrganizationVerticalsResponseSchema.parse(raw);
    },
    enabled: !!organizationId,
  });
}

/** Update organization verticals. */
export function useUpdateOrganizationVerticals() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      organizationId,
      verticalIds,
    }: {
      organizationId: string;
      verticalIds: string[];
    }): Promise<OrganizationVerticalsData> => {
      const res = await fetch(
        `/api/v1/admin/organizations/${organizationId}/verticals`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vertical_ids: verticalIds }),
        },
      );
      if (!res.ok) {
        const body: unknown = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(body, "Error updating verticals"));
      }
      const body: unknown = await res.json();
      return OrganizationVerticalsResponseSchema.parse(body);
    },
    onSuccess: (_, { organizationId }) => {
      queryClient.invalidateQueries({
        queryKey: ["admin-organization-verticals", organizationId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
    },
  });
}
