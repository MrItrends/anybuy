import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Uses the service role key — bypasses RLS entirely.
// Only called server-side during admin login.
export async function POST(req: NextRequest) {
  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ role: null })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data } = await supabase
    .from('admin_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  return NextResponse.json({ role: data?.role ?? null })
}
