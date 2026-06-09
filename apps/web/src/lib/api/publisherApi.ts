/**
 * publisherApi - HTTP client for publisher endpoints
 *
 * Covers:
 * POST   /api/v1/publisher/{product_id}/publish    → 202 PublicationResponse
 * PATCH  /api/v1/publisher/{publication_id}        → 200 PublicationResponse
 * DELETE /api/v1/publisher/{publication_id}        → 200 PublicationResponse
 * POST   /api/v1/publisher/{publication_id}/unlock → 200 PublicationResponse
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { z } from "zod";
import { API_BASE_URL } from "./authApi";

// ============================================
// RESPONSE TYPES
// ============================================

const PUBLICATION_STATUS = {
  PENDING: "pending",
  PUBLISHING: "publishing",
  PUBLISHED: "published",
  FAILED: "failed",
  EXPIRED: "expired",
  SOLD: "sold",
} as const;

export type PublicationStatus =
  (typeof PUBLICATION_STATUS)[keyof typeof PUBLICATION_STATUS];

const ERROR_CATEGORY = {
  TRANSIENT: "transient",
  BLOCKING: "blocking",
} as const;

export type ErrorCategory =
  (typeof ERROR_CATEGORY)[keyof typeof ERROR_CATEGORY];

export interface PublicationResponse {
  id: string;
  product_id: string;
  status: PublicationStatus;
  strategy_used?: string;
  fb_listing_id?: string;
  error_message?: string;
  error_category?: ErrorCategory;
  blocked_until_confirmed: boolean;
}

export interface FacebookAccountResponse {
  id: string;
}

export interface FacebookPageOption {
  id: string;
  name: string;
  is_default: boolean;
}

interface ListFacebookAccountsResponse {
  accounts: FacebookAccountResponse[];
}

interface ListFacebookPagesResponse {
  pages: Array<{
    id: string;
    page_name: string;
    is_default: boolean;
  }>;
}

const publicationStatusSchema = z.enum([
  "pending",
  "publishing",
  "published",
  "failed",
  "expired",
  "sold",
]);

const errorCategorySchema = z.enum(["transient", "blocking"]);

const publicationResponseSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  status: publicationStatusSchema,
  strategy_used: z.string().optional(),
  fb_listing_id: z.string().optional(),
  error_message: z.string().optional(),
  error_category: errorCategorySchema.optional(),
  blocked_until_confirmed: z.boolean().default(false),
});

const facebookAccountsResponseSchema = z.object({
  accounts: z.array(
    z.object({
      id: z.string(),
    }),
  ),
});

const facebookPagesResponseSchema = z.object({
  pages: z.array(
    z.object({
      id: z.string(),
      page_name: z.string(),
      is_default: z.boolean(),
    }),
  ),
});

// ============================================
// REQUEST TYPES
// ============================================

export interface PublishVehicleRequest {
  product_id: string;
  tenant_id: string;
  facebook_page_id: string;
  title: string;
  description?: string;
  price_cents: number;
  zip_code: string;
  image_urls: string[];
  hero_shot_index: number;
  // Vehicle-specific fields (required by Facebook Marketplace)
  vehicle_type: string;
  year: number;
  make: string;
  model: string;
  mileage: number;
  body_style?: string;
  exterior_color?: string;
  interior_color?: string;
  vehicle_condition?: string;
  fuel_type?: string;
  transmission?: string;
  clean_title: boolean;
  vin?: string;
}

export interface UpdateListingRequest {
  title?: string;
  description?: string;
  price_cents?: number;
}

// ============================================
// ERROR HANDLING
// ============================================

export class PublisherApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "PublisherApiError";
  }
}

function isErrorBody(
  value: unknown,
): value is { detail?: unknown; message?: unknown } {
  return typeof value === "object" && value !== null;
}

async function handlePublisherResponse<T>(
  response: Response,
  parser: (data: unknown) => T,
): Promise<T> {
  if (!response.ok) {
    const errorData: unknown = await response
      .json()
      .catch(() => ({ detail: "Error desconocido" }));

    let message: string;
    if (!isErrorBody(errorData)) {
      message = "Error en la petición";
    } else if (Array.isArray(errorData.detail)) {
      message = errorData.detail
        .map((entry) =>
          typeof entry === "object" &&
          entry !== null &&
          "msg" in entry &&
          typeof entry.msg === "string"
            ? entry.msg
            : "Error de validación",
        )
        .join(", ");
    } else if (typeof errorData.detail === "string") {
      message = errorData.detail;
    } else if (typeof errorData.message === "string") {
      message = errorData.message;
    } else {
      message = "Error en la petición";
    }

    throw new PublisherApiError(message, response.status);
  }

  const data: unknown = await response.json();
  return parser(data);
}

// ============================================
// API CLIENT
// ============================================

/**
 * Publish a vehicle to Facebook Marketplace.
 * POST /api/v1/publisher/{product_id}/publish → 202 PublicationResponse
 */
export async function publishVehicle(
  productId: string,
  data: PublishVehicleRequest,
): Promise<PublicationResponse> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/publisher/${productId}/publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // httpOnly cookie auth
      body: JSON.stringify(data),
    },
  );
  return handlePublisherResponse(res, (data) =>
    publicationResponseSchema.parse(data),
  );
}

/**
 * Update an existing Facebook Marketplace listing.
 * PATCH /api/v1/publisher/{publication_id} → 200 PublicationResponse
 */
export async function updateListing(
  publicationId: string,
  data: UpdateListingRequest,
): Promise<PublicationResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/publisher/${publicationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  return handlePublisherResponse(res, (data) =>
    publicationResponseSchema.parse(data),
  );
}

/**
 * Delete / finalize a Facebook Marketplace listing.
 * DELETE /api/v1/publisher/{publication_id} → 200 PublicationResponse
 */
export async function deleteListing(
  publicationId: string,
): Promise<PublicationResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/publisher/${publicationId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return handlePublisherResponse(res, (data) =>
    publicationResponseSchema.parse(data),
  );
}

/**
 * Unlock a Category B blocked publication after human verification.
 * POST /api/v1/publisher/{publication_id}/unlock → 200 PublicationResponse
 */
export async function unlockCategoryB(
  publicationId: string,
): Promise<PublicationResponse> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/publisher/${publicationId}/unlock`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    },
  );
  return handlePublisherResponse(res, (data) =>
    publicationResponseSchema.parse(data),
  );
}

export async function listFacebookAccounts(): Promise<
  FacebookAccountResponse[]
> {
  const res = await fetch(`${API_BASE_URL}/api/v1/facebook/accounts`, {
    credentials: "include",
  });

  const data = await handlePublisherResponse(res, (value) =>
    facebookAccountsResponseSchema.parse(value),
  );
  return data.accounts;
}

export async function listFacebookPages(
  accountId: string,
): Promise<FacebookPageOption[]> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/facebook/accounts/${accountId}/pages`,
    {
      credentials: "include",
    },
  );

  const data = await handlePublisherResponse(res, (value) =>
    facebookPagesResponseSchema.parse(value),
  );
  return data.pages.map((page) => ({
    id: page.id,
    name: page.page_name,
    is_default: page.is_default,
  }));
}

export function useFacebookPages(): UseQueryResult<
  FacebookPageOption[],
  Error
> {
  return useQuery({
    queryKey: ["facebook-pages"],
    queryFn: async () => {
      const accounts = await listFacebookAccounts();

      if (accounts.length === 0) {
        return [];
      }

      const pagesByAccount = await Promise.all(
        accounts.map((account) => listFacebookPages(account.id)),
      );

      return pagesByAccount
        .flat()
        .toSorted(
          (left, right) => Number(right.is_default) - Number(left.is_default),
        );
    },
    staleTime: 60 * 1000,
  });
}
