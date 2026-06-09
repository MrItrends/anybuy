export type UserRole = 'buyer' | 'seller' | 'admin' | 'rider'

export interface User {
  id: string
  email: string
  phone?: string
  full_name: string
  avatar_url?: string
  role: UserRole
  is_verified: boolean
  rating: number
  rating_count: number
  created_at: string
  updated_at: string
}

export interface SellerProfile {
  user_id: string
  store_name: string
  store_description?: string
  total_sales: number
  response_rate: number
  verified_seller: boolean
}

export interface AuthState {
  user: User | null
  session: { access_token: string; refresh_token: string } | null
  loading: boolean
}
