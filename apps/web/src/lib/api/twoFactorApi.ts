import { z } from "zod";

// Relative URL — Next.js rewrites proxy /api/:path* to the backend container.
// See apps/web/next.config.ts and PR #3 for context.
const BACKEND_URL = "";

const ENABLE_TWO_FACTOR_RESPONSE_SCHEMA = z.object({
  qr_code_uri: z.string().min(1),
  backup_codes: z.array(z.string()),
  message: z.string(),
});

const VERIFY_TWO_FACTOR_RESPONSE_SCHEMA = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    full_name: z.string(),
    tenant_id: z.string().nullable().optional(),
  }),
});

const MESSAGE_RESPONSE_SCHEMA = z.object({
  message: z.string(),
});

const TOTP_CODE_SCHEMA = z.string().trim().regex(/^\d{6}$/);

interface ApiErrorPayload {
  detail?: unknown;
  message?: unknown;
}

export interface EnableTwoFactorResponse {
  qrCode: string;
  backupCodes: string[];
  message: string;
}

function getErrorMessage(payload: ApiErrorPayload): string {
  if (Array.isArray(payload.detail)) {
    const detailMessages = payload.detail
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (
          item &&
          typeof item === "object" &&
          "msg" in item &&
          typeof item.msg === "string"
        ) {
          return item.msg;
        }

        return null;
      })
      .filter((item): item is string => item !== null)
      .join(" ");

    if (detailMessages.length > 0) {
      return detailMessages;
    }
  }

  if (typeof payload.detail === "string") {
    return payload.detail;
  }

  if (typeof payload.message === "string") {
    return payload.message;
  }

  return "Error en la petición";
}

async function parseJson<T>(
  response: Response,
  schema: z.ZodSchema<T>,
): Promise<T> {
  const data: unknown = await response.json();
  return schema.parse(data);
}

async function postJson<T>(
  path: string,
  body: Record<string, string>,
  schema: z.ZodSchema<T>,
): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload: ApiErrorPayload = await response
      .json()
      .catch(() => ({ message: "No se pudo completar la operación" }));

    throw new Error(getErrorMessage(payload));
  }

  return parseJson(response, schema);
}

export const twoFactorApi = {
  async enable(): Promise<EnableTwoFactorResponse> {
    const response = await postJson(
      `${BACKEND_URL}/api/v1/auth/2fa/enable`,
      {},
      ENABLE_TWO_FACTOR_RESPONSE_SCHEMA,
    );

    return {
      qrCode: response.qr_code_uri,
      backupCodes: response.backup_codes,
      message: response.message,
    };
  },

  async verify(code: string) {
    const parsedCode = TOTP_CODE_SCHEMA.parse(code);
    return postJson(
      `${BACKEND_URL}/api/v1/auth/2fa/verify`,
      { code: parsedCode },
      VERIFY_TWO_FACTOR_RESPONSE_SCHEMA,
    );
  },

  async disable(totpCode: string) {
    const parsedCode = TOTP_CODE_SCHEMA.parse(totpCode);
    return postJson(
      `${BACKEND_URL}/api/v1/auth/2fa/disable`,
      { totp_code: parsedCode },
      MESSAGE_RESPONSE_SCHEMA,
    );
  },
};
