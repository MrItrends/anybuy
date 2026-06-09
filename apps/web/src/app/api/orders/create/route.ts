import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Service role client — bypasses RLS for stock writes + notification inserts
const serviceSupabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function decrementStock(
  productId: string,
  orderQty: number,
  variantId: string | null | undefined,
) {
  if (variantId) {
    // ── Variant path ──────────────────────────────────────────────────────────
    const { data: variant } = await serviceSupabase
      .from('product_variants')
      .select('quantity, product_id')
      .eq('id', variantId)
      .single()

    if (!variant) return

    const newQty = Math.max(0, variant.quantity - orderQty)
    await serviceSupabase
      .from('product_variants')
      .update({ quantity: newQty })
      .eq('id', variantId)

    // Check if ALL variants for this product are now 0
    const { data: remaining } = await serviceSupabase
      .from('product_variants')
      .select('quantity')
      .eq('product_id', productId)

    const allZero = (remaining ?? []).every(v => v.quantity === 0)

    // Fetch product info for notifications
    const { data: product } = await serviceSupabase
      .from('products')
      .select('seller_id, title, low_stock_threshold, is_available')
      .eq('id', productId)
      .single()

    if (!product) return

    if (allZero && product.is_available) {
      await serviceSupabase
        .from('products')
        .update({ is_available: false })
        .eq('id', productId)

      await serviceSupabase.from('notifications').upsert(
        {
          seller_id:  product.seller_id,
          type:       'listing_paused',
          product_id: productId,
          payload:    { product_title: product.title, quantity: 0 },
          read_at:    null,
        },
        { onConflict: 'product_id,type', ignoreDuplicates: false },
      )
    } else if (!allZero && newQty <= product.low_stock_threshold) {
      await serviceSupabase.from('notifications').upsert(
        {
          seller_id:  product.seller_id,
          type:       'low_stock',
          product_id: productId,
          payload:    { product_title: product.title, quantity: newQty, threshold: product.low_stock_threshold },
          read_at:    null,
        },
        { onConflict: 'product_id,type', ignoreDuplicates: true },
      )
    }
  } else {
    // ── Flat (non-variant) path ───────────────────────────────────────────────
    const { data: product } = await serviceSupabase
      .from('products')
      .select('quantity, low_stock_threshold, seller_id, title, is_available')
      .eq('id', productId)
      .single()

    if (!product) return

    const newQty = Math.max(0, product.quantity - orderQty)

    if (newQty === 0) {
      await serviceSupabase
        .from('products')
        .update({ quantity: 0, is_available: false })
        .eq('id', productId)

      await serviceSupabase.from('notifications').upsert(
        {
          seller_id:  product.seller_id,
          type:       'listing_paused',
          product_id: productId,
          payload:    { product_title: product.title, quantity: 0 },
          read_at:    null,
        },
        { onConflict: 'product_id,type', ignoreDuplicates: false },
      )
    } else {
      await serviceSupabase
        .from('products')
        .update({ quantity: newQty })
        .eq('id', productId)

      if (newQty <= product.low_stock_threshold) {
        await serviceSupabase.from('notifications').upsert(
          {
            seller_id:  product.seller_id,
            type:       'low_stock',
            product_id: productId,
            payload:    { product_title: product.title, quantity: newQty, threshold: product.low_stock_threshold },
            read_at:    null,
          },
          { onConflict: 'product_id,type', ignoreDuplicates: true },
        )
      }
    }
  }
}

export async function POST(req: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { items, address, paystackReference } = await req.json()

  // Verify Paystack payment
  const verifyRes = await fetch(
    `https://api.paystack.co/transaction/verify/${paystackReference}`,
    { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
  )
  const verifyData = await verifyRes.json()

  if (!verifyData.status || verifyData.data?.status !== 'success') {
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
  }

  const orders = []

  for (const { product, quantity, variant_id } of items) {
    const unitPrice   = product.price
    const itemTotal   = unitPrice * quantity
    const platformFee = Math.round(itemTotal * 0.05)
    const netSeller   = itemTotal - platformFee

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        buyer_id:         user.id,
        seller_id:        product.seller_id,
        product_id:       product.id,
        variant_id:       variant_id ?? null,
        quantity,
        unit_price:       unitPrice,
        total_amount:     itemTotal,
        status:           'payment_held',
        delivery_street:  address.street,
        delivery_city:    address.city,
        delivery_state:   address.state,
        delivery_country: 'Nigeria',
        escrow_reference: paystackReference,
        confirmation_code: Math.random().toString(36).slice(2, 8).toUpperCase(),
      })
      .select()
      .single()

    if (error) {
      console.error('Order creation error:', error)
      continue
    }

    await supabase.from('payments').insert({
      order_id:          order.id,
      buyer_id:          user.id,
      seller_id:         product.seller_id,
      amount:            itemTotal,
      platform_fee:      platformFee,
      net_seller_amount: netSeller,
      currency:          'NGN',
      status:            'held',
      paystack_reference: paystackReference,
      held_at:           new Date().toISOString(),
    })

    // Decrement stock and emit notifications (non-blocking; failure doesn't abort order)
    decrementStock(product.id, quantity, variant_id).catch(err =>
      console.error('Stock decrement error:', err)
    )

    orders.push(order)
  }

  return NextResponse.json({ orders })
}
