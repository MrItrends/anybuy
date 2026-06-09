export const BRAND = {
  colors: {
    primary: {
      dark: '#0E2A2B',
      orange: '#FF6A3D',
      green: '#22C55E',
      offWhite: '#FBF9FA',
    },
    neutral: {
      nearBlack: '#111827',
      mediumGray: '#6B7280',
      lightGray: '#E5E7EB',
      surfaceGray: '#F3F4F6',
    },
    category: {
      phones: '#3B82F6',
      fashion: '#A855F7',
      home: '#F59E0B',
      electronics: '#14B8A6',
      sports: '#EC4899',
    },
  },
  fonts: {
    heading: 'Satoshi',
    body: 'Inter',
  },
  tagline: 'Buy better. Sell smarter.',
} as const

export const APP_CONFIG = {
  name: 'AnyBuy',
  domain: 'anybuy.com',
  currency: 'NGN',
  currencySymbol: '₦',
  platformFeePercent: 5,
  escrowReleaseDays: 3,
} as const

export const ROUTES = {
  home: '/',
  search: '/search',
  live: '/live',
  sell: '/sell',
  orders: '/orders',
  cart: '/cart',
  profile: '/profile',
  product: (id: string) => `/products/${id}`,
  liveSession: (id: string) => `/live/${id}`,
  category: (slug: string) => `/category/${slug}`,
} as const
