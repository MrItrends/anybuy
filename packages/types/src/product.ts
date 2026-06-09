import type { CategorySlug } from './category'

export type ProductCondition = 'new' | 'grade_a' | 'grade_b' | 'grade_c'

export const CONDITION_LABELS: Record<ProductCondition, string> = {
  new: 'Brand New',
  grade_a: 'Grade A — Almost New',
  grade_b: 'Grade B — Good',
  grade_c: 'Grade C — Fair',
}

export const CONDITION_SHORT_LABELS: Record<ProductCondition, string> = {
  new: 'New',
  grade_a: 'Grade A',
  grade_b: 'Grade B',
  grade_c: 'Grade C',
}

export const CONDITION_TOOLTIPS: Record<ProductCondition, string> = {
  new: 'Brand new, never used',
  grade_a: 'Almost new — minimal signs of use',
  grade_b: 'Good condition — light wear',
  grade_c: 'Fair condition — visible wear',
}

export const CONDITION_COLORS: Record<ProductCondition, string> = {
  new: '#22C55E',
  grade_a: '#22C55E',
  grade_b: '#F59E0B',
  grade_c: '#6B7280',
}

export type SizeSystem = 'uk' | 'us' | 'generic' | 'shoe_uk' | 'shoe_us'

export interface ProductVariant {
  id: string
  product_id: string
  size_label: string | null
  size_system: SizeSystem | null
  color_name: string | null
  color_hex: string | null
  quantity: number
  created_at: string
}

export const UK_CLOTHING_SIZES  = ['4','6','8','10','12','14','16','18','20','22']
export const US_CLOTHING_SIZES  = ['0','2','4','6','8','10','12','14','16','18']
export const UK_SHOE_SIZES      = ['3','4','5','6','7','8','9','10','11','12']
export const US_SHOE_SIZES      = ['5','6','7','8','9','10','11','12','13','14']
export const GENERIC_SIZES      = ['XS','S','M','L','XL','XXL','XXXL']

export const FASHION_COLORS: { name: string; hex: string }[] = [
  { name: 'Black',      hex: '#000000' },
  { name: 'White',      hex: '#FFFFFF' },
  { name: 'Navy',       hex: '#1E3A5F' },
  { name: 'Grey',       hex: '#9CA3AF' },
  { name: 'Brown',      hex: '#92400E' },
  { name: 'Beige',      hex: '#D4B896' },
  { name: 'Red',        hex: '#DC2626' },
  { name: 'Pink',       hex: '#EC4899' },
  { name: 'Orange',     hex: '#F97316' },
  { name: 'Yellow',     hex: '#FBBF24' },
  { name: 'Green',      hex: '#16A34A' },
  { name: 'Teal',       hex: '#0D9488' },
  { name: 'Blue',       hex: '#2563EB' },
  { name: 'Purple',     hex: '#7C3AED' },
  { name: 'Gold',       hex: '#D4AF37' },
  { name: 'Silver',     hex: '#C0C0C0' },
]

export interface ProductMedia {
  id: string
  url: string
  type: 'image' | 'video'
  order: number
}

export interface Product {
  id: string
  seller_id: string
  title: string
  description: string
  price: number
  original_price?: number | null   // set when item is discounted; price is the sale price
  category: CategorySlug
  subcategory?: string
  condition: ProductCondition
  media: ProductMedia[]
  thumbnail_url: string
  location?: string
  is_negotiable: boolean
  negotiation_floor?: number | null   // min price seller auto-accepts; null = no floor set
  is_available: boolean
  view_count: number
  created_at: string
  updated_at: string
  virtual_tryon_enabled?: boolean
  tryon_image_url?: string | null
  variants?: ProductVariant[]
  seller?: {
    id: string
    full_name: string
    avatar_url?: string
    rating: number
    rating_count: number
    is_verified: boolean
  }
}

export interface CartItem {
  product: Product
  quantity: number
  negotiated_price?: number   // if buyer negotiated a lower price, stored here; otherwise use product.price
}
