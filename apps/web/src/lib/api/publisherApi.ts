/**
 * publisherApi - HTTP client for publisher endpoints
 *
 * Covers:
 * POST   /api/v1/publisher/{product_id}/publish    → 202 PublicationResponse
 * PATCH  /api/v1/publisher/{publication_id}        → 200 PublicationResponse
 * DELETE /api/v1/publisher/{publication_id}        → 200 PublicationResponse
 * POST   /api/v1/publisher/{publication_id}/unlock → 200 PublicationResponse
 */

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

async function handlePublisherResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: "Error desconocido" }));

    let message: string;
    if (Array.isArray(errorData.detail)) {
      message = errorData.detail.map((e: { msg: string }) => e.msg).join(", ");
    } else if (typeof errorData.detail === "string") {
      message = errorData.detail;
    } else {
      message = errorData.message || "Error en la petición";
    }

    throw new PublisherApiError(message, response.status);
  }

  return response.json() as Promise<T>;
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
  return handlePublisherResponse<PublicationResponse>(res);
}

/**
 * Update an existing Facebook Marketplace listing.
 * PATCH /api/v1/publisher/{publication_id} → 200 PublicationResponse
 */
export async function updateListing(
  publicationId: string,
  data: UpdateListingRequest,
): Promise<PublicationResponse> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/publisher/${publicationId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    },
  );
  return handlePublisherResponse<PublicationResponse>(res);
}

/**
 * Delete / finalize a Facebook Marketplace listing.
 * DELETE /api/v1/publisher/{publication_id} → 200 PublicationResponse
 */
export async function deleteListing(
  publicationId: string,
): Promise<PublicationResponse> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/publisher/${publicationId}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    },
  );
  return handlePublisherResponse<PublicationResponse>(res);
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
  return handlePublisherResponse<PublicationResponse>(res);
}
