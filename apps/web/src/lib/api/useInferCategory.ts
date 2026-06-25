import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/api/fetchWithAuth";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import {
  CategoryInferenceResponseSchema,
  type CategoryInferenceResponse,
} from "@/lib/api/schemas/categoryInference";

const NO_SUGGESTION: CategoryInferenceResponse = {
  suggestion: null,
  alternatives: [],
};

interface InferCategoryInput {
  title: string;
  attributes: Record<string, unknown>;
}

interface UseInferCategoryOptions {
  enabled?: boolean;
}

export function useInferCategory(
  input: InferCategoryInput,
  options: UseInferCategoryOptions = {},
) {
  const debouncedTitle = useDebouncedValue(input.title, 300);
  const debouncedAttributes = useDebouncedValue(input.attributes, 300);

  const { data, isLoading } = useQuery({
    queryKey: ["infer-category", debouncedTitle, debouncedAttributes],
    queryFn: async () => {
      let res: Response;
      try {
        res = await fetchWithAuth("/api/v1/categories/infer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: debouncedTitle,
            attributes: debouncedAttributes,
          }),
        });
      } catch {
        return NO_SUGGESTION;
      }

      if (!res.ok) return NO_SUGGESTION;

      const parsed = CategoryInferenceResponseSchema.safeParse(
        await res.json(),
      );
      if (!parsed.success) {
        console.error(
          "useInferCategory: invalid response shape",
          parsed.error.message,
        );
        return NO_SUGGESTION;
      }
      return parsed.data;
    },
    enabled: options.enabled ?? false,
    staleTime: 30_000,
  });

  return {
    suggestion: data?.suggestion ?? null,
    alternatives: data?.alternatives ?? [],
    isLoading,
  };
}
