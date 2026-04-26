export interface Category {
  id: string;
  name: string;
  slug: string;
  attribute_schema: Record<string, boolean>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryListResponse {
  categories: Category[];
  total: number;
  page: number;
  page_size: number;
}

export interface CategoryOption {
  value: string;
  label: string;
}
