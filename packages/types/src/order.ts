export type OrderStatus =
  | 'pending_payment'
  | 'payment_held'
  | 'preparing'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'confirmed'
  | 'disputed'
  | 'refunded'
  | 'completed'

export interface DeliveryAddress {
  street: string
  city: string
  state: string
  postal_code?: string
  country: string
}

export interface Order {
  id: string
  buyer_id: string
  seller_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_amount: number
  status: OrderStatus
  delivery_address: DeliveryAddress
  tracking_code?: string
  confirmation_code?: string
  escrow_reference?: string
  created_at: string
  updated_at: string
}

export type DisputeStatus = 'open' | 'under_review' | 'resolved_refund' | 'resolved_partial' | 'resolved_rejected'

export interface Dispute {
  id: string
  order_id: string
  buyer_id: string
  reason: string
  evidence_urls: string[]
  status: DisputeStatus
  admin_notes?: string
  created_at: string
  resolved_at?: string
}
