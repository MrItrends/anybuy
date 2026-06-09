import { createHmac } from 'crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function b64url(obj: object | string): string {
  const str = typeof obj === 'string' ? obj : JSON.stringify(obj)
  return Buffer.from(str).toString('base64url')
}

function makeToken(apiKey: string, apiSecret: string, identity: string, room: string, canPublish: boolean): string {
  const now = Math.floor(Date.now() / 1000)
  const header = b64url({ alg: 'HS256', typ: 'JWT' })
  const payload = b64url({
    iss: apiKey,
    sub: identity,
    iat: now,
    nbf: now,
    exp: now + 4 * 60 * 60, // 4 hours
    video: {
      roomJoin: true,
      room,
      canPublish,
      canSubscribe: true,
      canPublishData: true,
    },
  })
  const data = `${header}.${payload}`
  const sig = createHmac('sha256', apiSecret).update(data).digest('base64url')
  return `${data}.${sig}`
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const room = searchParams.get('room')
  const canPublish = searchParams.get('publish') === 'true'

  if (!room) return NextResponse.json({ error: 'Missing room' }, { status: 400 })

  const apiKey    = process.env.LIVEKIT_API_KEY!
  const apiSecret = process.env.LIVEKIT_API_SECRET!

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: 'LiveKit not configured' }, { status: 500 })
  }

  const token = makeToken(apiKey, apiSecret, user.id, room, canPublish)
  return NextResponse.json({ token })
}
