export type PaymentStatus = 'pending' | 'held' | 'released' | 'refunded' | 'failed'

export interface Payment {
  id: string
  order_id: string
  buyer_id: string
  seller_id: string
  amount: number
  platform_fee: number
  net_seller_amount: number
  currency: 'NGN'
  status: PaymentStatus
  paystack_reference?: string
  paystack_transaction_id?: string
  held_at?: string
  released_at?: string
  refunded_at?: string
  created_at: string
}
