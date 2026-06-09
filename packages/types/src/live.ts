export type LiveSessionStatus = 'scheduled' | 'live' | 'ended'

export interface LiveSession {
  id: string
  seller_id: string
  title: string
  thumbnail_url?: string
  room_name: string
  livekit_token?: string
  status: LiveSessionStatus
  viewer_count: number
  product_ids: string[]
  scheduled_at?: string
  started_at?: string
  ended_at?: string
  created_at: string
  seller?: {
    id: string
    full_name: string
    avatar_url?: string
    is_verified: boolean
  }
}

export interface LiveMessage {
  id: string
  session_id: string
  user_id: string
  user_name: string
  message: string
  created_at: string
}
