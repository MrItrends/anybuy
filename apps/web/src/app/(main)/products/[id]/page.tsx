import { ProductDetailClient } from '@/components/product/ProductDetailClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params
  return <ProductDetailClient id={id} />
}
