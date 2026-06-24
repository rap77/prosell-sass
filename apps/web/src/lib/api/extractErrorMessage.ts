import { z } from "zod";

const apiErrorBodySchema = z
  .object({
    detail: z
      .union([z.string(), z.array(z.object({ msg: z.string() }).passthrough())])
      .optional(),
    message: z.string().optional(),
  })
  .passthrough();

/** Extract a human-readable message from a JSON error body shaped like
 * `{ detail }` or `{ message }` (FastAPI's default error shape), falling
 * back to `fallback` when the body doesn't match or carries neither field.
 * `detail` is also accepted as FastAPI's 422 validation-error array
 * (`[{ msg, loc, ... }]`) — the first entry's `msg` is used. */
export function extractErrorMessage(body: unknown, fallback: string): string {
  const parsed = apiErrorBodySchema.safeParse(body);
  if (!parsed.success) {
    return fallback;
  }
  const { detail, message } = parsed.data;
  if (Array.isArray(detail)) {
    return detail[0]?.msg || fallback;
  }
  return detail ?? message ?? fallback;
}
