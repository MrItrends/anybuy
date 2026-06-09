import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('seller_id', user.id)
    .is('read_at', null)

  return NextResponse.json({ ok: true })
}
