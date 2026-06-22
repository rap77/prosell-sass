import { z } from "zod";

const apiErrorBodySchema = z
  .object({ detail: z.string().optional(), message: z.string().optional() })
  .passthrough();

/** Extract a human-readable message from a JSON error body shaped like
 * `{ detail }` or `{ message }` (FastAPI's default error shape), falling
 * back to `fallback` when the body doesn't match or carries neither field. */
export function extractErrorMessage(body: unknown, fallback: string): string {
  const parsed = apiErrorBodySchema.safeParse(body);
  return (
    (parsed.success && (parsed.data.detail ?? parsed.data.message)) || fallback
  );
}
