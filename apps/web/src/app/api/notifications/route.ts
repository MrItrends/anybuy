import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, type, product_id, payload, read_at, created_at')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const unread_count = (notifications ?? []).filter(n => !n.read_at).length

  return NextResponse.json({ notifications: notifications ?? [], unread_count })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('seller_id', user.id)   // RLS double-lock

  return NextResponse.json({ ok: true })
}
