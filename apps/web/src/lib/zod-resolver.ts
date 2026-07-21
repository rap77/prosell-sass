import { ZodSchema, ZodError } from 'zod';

/**
 * Custom Zod resolver for React Hook Form + Zod 4
 * Replaces @hookform/resolvers/zod which doesn't support Zod 4
 *
 * Works with any Zod schema and provides proper error mapping
 */
export function zodResolver<TValues extends Record<string, any> = any>(
  schema: ZodSchema,
) {
  return async (values: TValues) => {
    try {
      const data = await schema.parseAsync(values);
      return {
        values: data,
        errors: {},
      };
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, any> = {};

        for (const issue of error.issues) {
          const path = issue.path.join('.');

          if (path) {
            errors[path] = {
              type: issue.code,
              message: issue.message,
            };
          }
        }

        return {
          values: {},
          errors,
        };
      }

      throw error;
    }
  };
}
