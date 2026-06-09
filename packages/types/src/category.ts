export type CategorySlug =
  | 'phones'
  | 'electronics'
  | 'fashion'
  | 'home'
  | 'beauty'
  | 'sports'
  | 'gaming'
  | 'kids'
  | 'automotive'
  | 'books'
  | 'office'
  | 'other'

export interface Subcategory {
  label: string
  value: string
}

export interface Category {
  id: string
  name: string
  slug: CategorySlug
  icon: string
  accent_color: string
  product_count?: number
}

export const CATEGORIES: Category[] = [
  { id: '1',  name: 'Phones & Tablets',       slug: 'phones',      icon: 'smartphone',      accent_color: '#3B82F6' },
  { id: '2',  name: 'Electronics',             slug: 'electronics', icon: 'cpu',             accent_color: '#14B8A6' },
  { id: '3',  name: 'Fashion',                 slug: 'fashion',     icon: 'shirt',           accent_color: '#A855F7' },
  { id: '4',  name: 'Home & Living',           slug: 'home',        icon: 'home',            accent_color: '#F59E0B' },
  { id: '5',  name: 'Beauty & Personal Care',  slug: 'beauty',      icon: 'sparkles',        accent_color: '#EC4899' },
  { id: '6',  name: 'Sports & Fitness',        slug: 'sports',      icon: 'dumbbell',        accent_color: '#EF4444' },
  { id: '7',  name: 'Gaming',                  slug: 'gaming',      icon: 'gamepad-2',       accent_color: '#0EA5E9' },
  { id: '8',  name: 'Kids & Baby',             slug: 'kids',        icon: 'baby',            accent_color: '#F97316' },
  { id: '9',  name: 'Automotive',              slug: 'automotive',  icon: 'car',             accent_color: '#64748B' },
  { id: '10', name: 'Books & Media',           slug: 'books',       icon: 'book-open',       accent_color: '#16A34A' },
  { id: '11', name: 'Office & Stationery',     slug: 'office',      icon: 'briefcase',       accent_color: '#78716C' },
  { id: '12', name: 'Other',                   slug: 'other',       icon: 'more-horizontal', accent_color: '#9CA3AF' },
]

export const SUBCATEGORIES: Record<CategorySlug, Subcategory[]> = {
  phones: [
    { label: 'Smartphones',  value: 'smartphones' },
    { label: 'Tablets',      value: 'tablets' },
    { label: 'Accessories',  value: 'accessories' },
  ],
  electronics: [
    { label: 'Laptops',       value: 'laptops' },
    { label: 'TVs',           value: 'tvs' },
    { label: 'Audio Devices', value: 'audio' },
    { label: 'Cameras',       value: 'cameras' },
  ],
  fashion: [
    { label: "Men's",   value: 'men' },
    { label: "Women's", value: 'women' },
    { label: 'Shoes',   value: 'shoes' },
    { label: 'Bags',    value: 'bags' },
    { label: 'Watches', value: 'watches' },
  ],
  home: [
    { label: 'Furniture',   value: 'furniture' },
    { label: 'Kitchen',     value: 'kitchen' },
    { label: 'Decor',       value: 'decor' },
    { label: 'Appliances',  value: 'appliances' },
  ],
  beauty: [
    { label: 'Skincare',   value: 'skincare' },
    { label: 'Hair',       value: 'hair' },
    { label: 'Fragrance',  value: 'fragrance' },
  ],
  sports: [
    { label: 'Equipment',    value: 'equipment' },
    { label: 'Apparel',      value: 'apparel' },
    { label: 'Outdoor Gear', value: 'outdoor' },
  ],
  gaming: [
    { label: 'Consoles',     value: 'consoles' },
    { label: 'Games',        value: 'games' },
    { label: 'Accessories',  value: 'accessories' },
  ],
  kids: [
    { label: 'Toys',      value: 'toys' },
    { label: 'Clothing',  value: 'clothing' },
    { label: 'Baby Gear', value: 'baby-gear' },
  ],
  automotive: [
    { label: 'Car Accessories', value: 'car-accessories' },
    { label: 'Parts',           value: 'parts' },
  ],
  books: [
    { label: 'Books',   value: 'books' },
    { label: 'Music',   value: 'music' },
    { label: 'Movies',  value: 'movies' },
  ],
  office: [
    { label: 'Office Tools', value: 'office-tools' },
    { label: 'Supplies',     value: 'supplies' },
  ],
  other: [
    { label: 'Other', value: 'other' },
  ],
}
