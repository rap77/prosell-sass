export interface Product {
  id: string;
  title: string;
  price_cents: number;
  category_id: string;
  attributes: Record<string, unknown>;
  status: "draft" | "active" | "sold";
  created_at: string;
  updated_at: string;
}

export interface CreateProductRequest {
  title: string;
  price_cents: number;
  category_id: string;
  attributes: Record<string, unknown>;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  page_size: number;
}
