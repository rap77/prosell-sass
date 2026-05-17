import { CatalogDetailView } from "@/components/catalog/CatalogDetailView";

interface CatalogDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CatalogDetailPage({
  params,
}: CatalogDetailPageProps) {
  const { id } = await params;

  return <CatalogDetailView productId={id} />;
}
