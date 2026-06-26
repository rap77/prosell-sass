import type { Metadata } from "next";
import { SchemaAdminClient } from "./schema-admin-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Category Schema — ${id}` };
}

export default async function CategorySchemaPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <div>
        <h1 className="text-xl font-semibold">Category Schema</h1>
        <p className="text-sm text-muted-foreground">
          Configure attribute fields for products in this category.
        </p>
      </div>
      <SchemaAdminClient categoryId={id} />
    </div>
  );
}
