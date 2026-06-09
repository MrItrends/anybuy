'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { formatPrice } from '@anybuy/utils'
import {
  CheckCircle2, ChevronLeft, Crown, Loader2, MessageSquare,
  Mic, MicOff, Package, Plus, Radio, Send,
  ShoppingCart, Shuffle, Trophy, Users, Video, VideoOff, Vote, X, Zap,
} from 'lucide-react'
import { Room, RoomEvent, Track } from 'livekit-client'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'

// ─── Anonymous name ───────────────────────────────────────────────────────────
function anonName(userId: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let h = 5381
  for (let i = 0; i < userId.length; i++) h = (Math.imul(h, 33) ^ userId.charCodeAt(i)) >>> 0
  return 'Buyer_' + [0, 5, 10, 15].map(s => chars[(h >> s) & 31]).join('')
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface LiveSession {
  id: string
  seller_id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  status: string
  viewer_count: number
  channel_id: string
  started_at: string | null
  seller_profile: { store_name: string } | null
}
interface LiveDrop {
  id: string
  session_id: string
  product_id: string | null
  title: string
  image_url: string | null
  drop_type: 'auction' | 'fixed' | 'grab'
  start_price: number            // seller's starting price (must be < product list price)
  current_price: number | null
  closing_price: number | null   // optional: first bid ≥ this wins automatically
  min_increment: number
  timer_seconds: number
  ends_at: string | null
  status: 'waiting' | 'active' | 'ending' | 'sold' | 'cancelled'
  winner_id: string | null
  winner_name: string | null
  final_price: number | null
  claim_deadline: string | null  // winner has 15 min from here
  claim_status: 'none' | 'pending' | 'claimed' | 'expired' | null
  sort_order: number
}
interface ChatMessage {
  id: string
  user_id: string
  user_name: string
  content: string
  type: 'message' | 'system' | 'reaction' | 'bid_placed'
  created_at: string
}
interface Bid {
  id: string
  drop_id: string
  bidder_id: string
  bidder_name: string
  amount: number
  created_at: string
}
interface Poll {
  id: string
  question: string
  options: { text: string; votes: number }[]
  ends_at: string | null
  is_active: boolean
}
interface SellerProduct {
  id: string
  title: string
  price: number
  thumbnail_url: string | null
}

// ─── Emoji reactions ──────────────────────────────────────────────────────────
const REACTION_EMOJIS = ['❤️', '🔥', '😂', '👏', '💰', '🎉', '😍', '💪']
interface FloatingReaction { id: string; emoji: string; x: number }

// ─── Countdown hook ───────────────────────────────────────────────────────────
function useCountdown(endsAt: string | null | undefined): number {
  const [remaining, setRemaining] = useState(0)
  useEffect(() => {
    if (!endsAt) { setRemaining(0); return }
    const tick = () => setRemaining(Math.max(0, Math.round((new Date(endsAt).getTime() - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endsAt])
  return remaining
}

// ─────────────────────────────────────────────────────────────────────────────
export default function LiveRoomPage() {
  const params    = useParams()
  const router    = useRouter()
  const { user, openLoginModal } = useAuthStore()
  const { addItem } = useCartStore()
  const sessionId = params.sessionId as string

  const [session, setSession]       = useState<LiveSession | null>(null)
  const [drops, setDrops]           = useState<LiveDrop[]>([])
  const [activeDrop, setActiveDrop] = useState<LiveDrop | null>(null)
  const [messages, setMessages]     = useState<ChatMessage[]>([])
  const [bids, setBids]             = useState<Bid[]>([])
  const [poll, setPoll]             = useState<Poll | null>(null)
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState<'chat' | 'bids' | 'poll'>('chat')
  const [chatUnread, setChatUnread] = useState(0)
  const [bidsNew, setBidsNew]       = useState(false)
  const [pollNew, setPollNew]       = useState(false)
  const [chatInput, setChatInput]   = useState('')
  const [bidInput, setBidInput]     = useState('')
  const [sending, setSending]       = useState(false)
  const [placingBid, setPlacingBid] = useState(false)
  const [grabbing, setGrabbing]     = useState(false)
  const [claiming, setClaiming]     = useState(false)
  const [reactions, setReactions]   = useState<FloatingReaction[]>([])
  const [selectingWinner, setSelectingWinner] = useState(false)

  // Seller controls
  const [showDropForm, setShowDropForm]   = useState(false)
  const [showPollForm, setShowPollForm]   = useState(false)
  const [dropMode, setDropMode]           = useState<'catalog' | 'freeform'>('catalog')
  const [sellerProducts, setSellerProducts] = useState<SellerProduct[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [selectedProductId, setSelectedProductId]     = useState<string | null>(null)
  const [selectedProductPrice, setSelectedProductPrice] = useState<number>(0)
  const [dropImageUrl, setDropImageUrl]   = useState('')
  const [dropTitle, setDropTitle]         = useState('')
  const [dropPrice, setDropPrice]         = useState('')     // starting price
  const [dropClosingPrice, setDropClosingPrice] = useState('')
  const [dropTimer, setDropTimer]         = useState('60')
  const [dropType, setDropType]           = useState<'auction' | 'fixed' | 'grab'>('auction')
  const [pollQuestion, setPollQuestion]   = useState('')
  const [pollOptions, setPollOptions]     = useState(['', ''])
  const [creatingDrop, setCreatingDrop]   = useState(false)
  const [creatingPoll, setCreatingPoll]   = useState(false)
  const [endingDrop, setEndingDrop]       = useState(false)

  // Camera / LiveKit
  const videoRef       = useRef<HTMLVideoElement>(null)   // seller local preview
  const remoteVideoRef = useRef<HTMLVideoElement>(null)   // buyer remote video
  const roomRef        = useRef<Room | null>(null)
  const streamRef      = useRef<MediaStream | null>(null)
  const analyserRef    = useRef<AnalyserNode | null>(null)
  const rafRef         = useRef<number | null>(null)
  const [liveStream, setLiveStream]     = useState<MediaStream | null>(null)  // video preview only
  const [audioStream, setAudioStream]   = useState<MediaStream | null>(null)  // mic analyser only
  const [remoteVideoReady, setRemoteVideoReady] = useState(false)
  const [camOn, setCamOn] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [micLevel, setMicLevel] = useState(0) // 0–100

  const chatBottomRef = useRef<HTMLDivElement>(null)

  // Countdown timers
  const dropCountdown  = useCountdown(activeDrop?.ends_at)
  const claimCountdown = useCountdown(
    activeDrop?.claim_status === 'pending' ? activeDrop?.claim_deadline : null
  )

  const isSeller = user?.id === session?.seller_id

  // Derived: buyer won and claim is pending
  const iWon = !isSeller && !!user && activeDrop?.winner_id === user.id && activeDrop?.claim_status === 'pending'

  // Derived: claim deadline has passed but status still 'pending' (seller sees backup UI)
  const claimExpired = isSeller &&
    activeDrop?.claim_status === 'pending' &&
    claimCountdown === 0 &&
    !!activeDrop?.claim_deadline

  // Unique bidders for the active drop (ordered by highest bid, excluding original winner if expired)
  const dropBids   = activeDrop ? bids.filter(b => b.drop_id === activeDrop.id) : []
  const topBid     = dropBids[0] ?? null
  const uniqueBidders: { id: string; name: string; maxBid: number }[] = (() => {
    const map = new Map<string, { id: string; name: string; maxBid: number }>()
    for (const b of dropBids) {
      const existing = map.get(b.bidder_id)
      if (!existing || b.amount > existing.maxBid) map.set(b.bidder_id, { id: b.bidder_id, name: b.bidder_name, maxBid: b.amount })
    }
    return [...map.values()].sort((a, b) => b.maxBid - a.maxBid)
  })()
  const backupBidders = uniqueBidders.filter(b => b.id !== activeDrop?.winner_id)

  // ── Load session ────────────────────────────────────────────────────────────
  useEffect(() => { loadSession() }, [sessionId])

  async function loadSession() {
    const supabase = createClient()
    const [{ data: s }, { data: d }, { data: m }, { data: b }, { data: p }] = await Promise.all([
      supabase.from('live_sessions')
        .select('*')
        .eq('id', sessionId).maybeSingle(),
      supabase.from('live_drops').select('*').eq('session_id', sessionId).order('sort_order'),
      supabase.from('live_messages').select('*').eq('session_id', sessionId).order('created_at').limit(200),
      supabase.from('live_bids').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }).limit(200),
      supabase.from('live_polls').select('*').eq('session_id', sessionId).eq('is_active', true).order('created_at', { ascending: false }).limit(1),
    ])
    if (!s) { router.replace('/live'); return }

    // Fetch seller profile separately (no direct FK from live_sessions.seller_id → seller_profiles)
    const { data: profileData } = await supabase
      .from('seller_profiles')
      .select('store_name')
      .eq('user_id', s.seller_id)
      .maybeSingle()

    const sess: LiveSession = { ...s, seller_profile: profileData ?? null }
    setSession(sess)
    setDrops(d ?? [])
    setActiveDrop((d ?? []).find((x: LiveDrop) => ['active', 'ending'].includes(x.status)) ?? null)
    setMessages(m ?? [])
    setBids(b ?? [])
    setPoll(p && p.length > 0 ? p[0] : null)
    setLoading(false)
  }

  // ── LiveKit connection ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!session?.channel_id || !user) return
    connectLiveKit()
    if (isSeller) loadSellerProducts()
    return () => {
      roomRef.current?.disconnect()
      streamRef.current?.getTracks().forEach(t => t.stop())
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      // Decrement viewer count when buyer leaves
      if (!isSeller && session?.id) {
        const supabase = createClient()
        supabase.from('live_sessions').select('viewer_count').eq('id', session.id).single()
          .then(({ data }) => {
            if (data) supabase.from('live_sessions')
              .update({ viewer_count: Math.max(0, (data.viewer_count ?? 1) - 1) })
              .eq('id', session.id)
          })
      }
    }
  }, [session?.channel_id, user?.id])

  // Attach local seller preview to video element
  useEffect(() => {
    if (!liveStream || !videoRef.current) return
    videoRef.current.srcObject = liveStream
  }, [liveStream])

  // ── Mic level analyser ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!audioStream) return
    const ctx = new AudioContext()
    const source = ctx.createMediaStreamSource(audioStream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    analyserRef.current = analyser
    const data = new Uint8Array(analyser.frequencyBinCount)
    function tick() {
      analyser.getByteFrequencyData(data)
      const avg = data.reduce((a, b) => a + b, 0) / data.length
      setMicLevel(Math.min(100, Math.round((avg / 128) * 100)))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      ctx.close()
    }
  }, [audioStream])

  async function connectLiveKit() {
    if (!session?.channel_id || !user) return
    try {
      // 1. Get token
      const res = await fetch(`/api/livekit/token?room=${encodeURIComponent(session.channel_id)}&publish=${isSeller}`)
      if (!res.ok) throw new Error('Token fetch failed')
      const { token } = await res.json()

      // 2. Build room
      const room = new Room({ adaptiveStream: true, dynacast: true })
      roomRef.current = room

      // 3. Handle incoming tracks (buyers receive seller's video + audio)
      room.on(RoomEvent.TrackSubscribed, (track, _pub, _participant) => {
        if (track.kind === Track.Kind.Video) {
          if (remoteVideoRef.current) {
            track.attach(remoteVideoRef.current)
            setRemoteVideoReady(true)
          }
        } else if (track.kind === Track.Kind.Audio) {
          track.attach()
        }
      })

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach()
        if (track.kind === Track.Kind.Video) setRemoteVideoReady(false)
      })

      // Emoji reactions via LiveKit data channel (no DB, instant for all participants)
      room.on(RoomEvent.DataReceived, (payload) => {
        try {
          const msg = JSON.parse(new TextDecoder().decode(payload))
          if (msg.type === 'reaction') triggerReaction(msg.emoji)
        } catch {}
      })

      // 4. Connect
      await room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, token)

      // 5. Buyer: update viewer count
      if (!isSeller) {
        const supabase = createClient()
        const { data: cur } = await supabase
          .from('live_sessions').select('viewer_count').eq('id', sessionId).single()
        await supabase
          .from('live_sessions')
          .update({ viewer_count: (cur?.viewer_count ?? 0) + 1 })
          .eq('id', sessionId)
      }

      // 6. Seller: publish camera + mic
      if (isSeller) {
        await room.localParticipant.enableCameraAndMicrophone()
        // Local video → self-preview in <video> element
        const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera)
        const localVideoTrack = camPub?.videoTrack
        if (localVideoTrack) {
          const videoMs = new MediaStream([localVideoTrack.mediaStreamTrack])
          streamRef.current = videoMs
          setLiveStream(videoMs)
        }
        // Local audio → mic level analyser (separate stream, no video)
        const micPub = room.localParticipant.getTrackPublication(Track.Source.Microphone)
        const localAudioTrack = micPub?.audioTrack
        if (localAudioTrack) {
          setAudioStream(new MediaStream([localAudioTrack.mediaStreamTrack]))
        }
      }
    } catch (err) {
      console.error('[LiveKit]', err)
      toast.error('Could not connect to live stream')
    }
  }

  async function loadSellerProducts() {
    if (!session) return
    const supabase = createClient()
    const { data } = await supabase
      .from('products').select('id, title, price, thumbnail_url')
      .eq('seller_id', session.seller_id).eq('is_available', true)
      .order('created_at', { ascending: false }).limit(50)
    setSellerProducts(data ?? [])
  }

  function toggleCam() {
    const next = !camOn
    roomRef.current?.localParticipant.setCameraEnabled(next)
    setCamOn(next)
  }
  function toggleMic() {
    const next = !micOn
    roomRef.current?.localParticipant.setMicrophoneEnabled(next)
    setMicOn(next)
    if (!next) setMicLevel(0)
  }

  // Switch tab and clear its badge
  function switchTab(t: 'chat' | 'bids' | 'poll') {
    setTab(t)
    if (t === 'chat') setChatUnread(0)
    if (t === 'bids') setBidsNew(false)
    if (t === 'poll') setPollNew(false)
  }

  // ── Realtime ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return
    const supabase = createClient()
    const ch = supabase.channel(`live:${sessionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_messages', filter: `session_id=eq.${sessionId}` },
        ({ new: msg }) => {
          const m = msg as ChatMessage
          if (m.type === 'reaction') {
            if (m.user_id !== user?.id) triggerReaction(m.content)
          } else {
            setMessages(prev => [...prev.slice(-299), m])
            // Badge if not currently on chat tab and message isn't from self
            if (m.user_id !== user?.id) {
              setTab(prev => { if (prev !== 'chat') setChatUnread(u => u + 1); return prev })
            }
          }
        })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_bids', filter: `session_id=eq.${sessionId}` },
        ({ new: bid }) => {
          const b = bid as Bid
          setBids(prev => [b, ...prev.slice(0, 299)])
          setActiveDrop(prev => prev && prev.id === b.drop_id ? { ...prev, current_price: b.amount } : prev)
          setActiveDrop(prev => {
            if (!prev || !isSeller) return prev
            if (prev.closing_price && b.amount >= prev.closing_price && prev.id === b.drop_id) {
              declareWinner(b.bidder_id, b.bidder_name, b.amount, prev)
            }
            return prev
          })
          // Badge on bids tab if not already there
          setTab(prev => { if (prev !== 'bids') setBidsNew(true); return prev })
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_drops', filter: `session_id=eq.${sessionId}` },
        ({ eventType, new: drop }) => {
          const d = drop as LiveDrop
          setDrops(prev => {
            const idx = prev.findIndex(x => x.id === d.id)
            if (eventType === 'INSERT') return [...prev, d]
            if (idx === -1) return prev
            return prev.map(x => x.id === d.id ? d : x)
          })
          if (['active', 'ending'].includes(d.status)) {
            setActiveDrop(d)
            // Auto-switch to Bids tab and pulse badge
            setTab('bids')
            setBidsNew(false)
          }
          if (['sold', 'cancelled'].includes(d.status)) setActiveDrop(prev => prev?.id === d.id ? d : prev)
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_sessions', filter: `id=eq.${sessionId}` },
        ({ new: s }) => setSession(prev => prev ? { ...prev, ...(s as any) } : prev))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_polls', filter: `session_id=eq.${sessionId}` },
        ({ new: p }) => {
          setPoll(p as Poll)
          // Auto-switch to Poll tab when a new poll goes active
          if ((p as Poll).is_active) {
            setTab('poll')
            setPollNew(false)
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [session?.id])

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // ── Reactions ───────────────────────────────────────────────────────────────
  // Local-only animation (called for sender immediately, and for others via realtime)
  function triggerReaction(emoji: string) {
    const id = Math.random().toString(36).slice(2)
    setReactions(prev => [...prev, { id, emoji, x: 10 + Math.random() * 80 }])
    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 3000)
  }

  // Broadcast reaction via LiveKit data channel — instant, no DB writes needed
  function sendReaction(emoji: string) {
    triggerReaction(emoji) // show immediately for sender
    if (!roomRef.current) return
    const payload = new TextEncoder().encode(JSON.stringify({ type: 'reaction', emoji }))
    roomRef.current.localParticipant.publishData(payload, { reliable: false })
  }

  // ── Go Live / End Live ──────────────────────────────────────────────────────
  async function goLive() {
    const supabase = createClient()
    await supabase.from('live_sessions').update({ status: 'live', started_at: new Date().toISOString() }).eq('id', sessionId)
    setSession(prev => prev ? { ...prev, status: 'live' } : prev)
    toast.success('You\'re live! 🔴')
  }
  async function endLive() {
    if (!window.confirm('End this live session?')) return
    const supabase = createClient()
    await supabase.from('live_sessions').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', sessionId)
    streamRef.current?.getTracks().forEach(t => t.stop())
    router.push('/seller/dashboard')
  }

  // ── Declare winner ──────────────────────────────────────────────────────────
  async function declareWinner(winnerId: string, winnerName: string, finalPrice: number, drop?: LiveDrop | null) {
    const target = drop ?? activeDrop
    if (!target) return
    setSelectingWinner(true)
    const supabase = createClient()
    const deadline = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    await supabase.from('live_drops').update({
      status: 'sold',
      winner_id: winnerId,
      winner_name: winnerName,
      final_price: finalPrice,
      claim_deadline: deadline,
      claim_status: 'pending',
    }).eq('id', target.id)
    // Announce in chat
    await supabase.from('live_messages').insert({
      session_id: sessionId,
      user_id: user!.id,
      user_name: 'AnyBuy Live',
      content: `🏆 ${winnerName} won "${target.title}" for ${formatPrice(finalPrice)}! They have 15 minutes to claim.`,
      type: 'system',
    })
    setSelectingWinner(false)
  }

  async function randomWinner() {
    if (uniqueBidders.length === 0) { toast.error('No bidders to pick from'); return }
    const pick = uniqueBidders[Math.floor(Math.random() * uniqueBidders.length)]
    await declareWinner(pick.id, pick.name, pick.maxBid)
  }

  async function selectBackupWinner(bidderId: string, bidderName: string) {
    if (!activeDrop) return
    setSelectingWinner(true)
    const supabase = createClient()
    const deadline = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    await supabase.from('live_drops').update({
      winner_id: bidderId,
      winner_name: bidderName,
      final_price: uniqueBidders.find(b => b.id === bidderId)?.maxBid ?? activeDrop.final_price,
      claim_deadline: deadline,
      claim_status: 'pending',
    }).eq('id', activeDrop.id)
    // Notify in chat
    await supabase.from('live_messages').insert({
      session_id: sessionId,
      user_id: user!.id,
      user_name: 'AnyBuy Live',
      content: `🎉 ${bidderName} — you've been selected as the new winner! You have 15 minutes to claim.`,
      type: 'system',
    })
    setSelectingWinner(false)
    toast.success(`${bidderName} notified in chat`)
  }

  async function randomBackupWinner() {
    if (backupBidders.length === 0) { toast.error('No other bidders available'); return }
    const pick = backupBidders[Math.floor(Math.random() * backupBidders.length)]
    await selectBackupWinner(pick.id, pick.name)
  }

  async function cancelAuction() {
    if (!activeDrop) return
    if (!window.confirm('Cancel this auction? This cannot be undone.')) return
    const supabase = createClient()
    await supabase.from('live_drops').update({ status: 'cancelled', claim_status: 'expired' }).eq('id', activeDrop.id)
    await supabase.from('live_messages').insert({
      session_id: sessionId,
      user_id: user!.id,
      user_name: 'AnyBuy Live',
      content: `❌ The auction for "${activeDrop.title}" has been cancelled.`,
      type: 'system',
    })
    toast.success('Auction cancelled')
  }

  // ── Buyer: Claim win ─────────────────────────────────────────────────────────
  async function claimWin() {
    if (!activeDrop || !user) return
    setClaiming(true)
    const supabase = createClient()

    // Mark claimed and re-fetch in one round-trip — guarantees authoritative final_price
    // (activeDrop state may be stale if realtime update hasn't arrived yet)
    const { data: freshDrop } = await supabase
      .from('live_drops')
      .update({ claim_status: 'claimed' })
      .eq('id', activeDrop.id)
      .select('final_price, start_price, product_id')
      .single()

    // DB-authoritative winning bid price; fall back through state values as safety net
    const winPrice = freshDrop?.final_price ?? activeDrop.final_price ?? activeDrop.start_price

    if (activeDrop.product_id) {
      const { data: product } = await supabase.from('products').select('*').eq('id', activeDrop.product_id).single()
      if (product) {
        addItem(product, winPrice)
        toast.success('Added to cart! Complete your purchase.')
        router.push('/checkout')
      }
    } else {
      toast.success('Claimed! Contact the seller to complete your purchase.')
    }
    setClaiming(false)
  }

  // ── Buyer: Grab ──────────────────────────────────────────────────────────────
  async function handleGrab() {
    if (!user) { openLoginModal('purchase'); return }
    if (!activeDrop) return
    setGrabbing(true)
    const supabase = createClient()
    const deadline = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    const { error } = await supabase.from('live_drops')
      .update({ status: 'sold', winner_id: user.id, winner_name: anonName(user.id), final_price: activeDrop.start_price, claim_deadline: deadline, claim_status: 'pending' })
      .eq('id', activeDrop.id).eq('status', 'active')
    if (error) toast.error('Too slow! Someone else grabbed it 😅')
    else toast.success('🎉 You grabbed it! Claim below.')
    setGrabbing(false)
  }

  // ── Create drop ──────────────────────────────────────────────────────────────
  async function handleCreateDrop(e: React.FormEvent) {
    e.preventDefault()
    const price = parseFloat(dropPrice)
    if (!dropTitle.trim() || !price || price <= 0) { toast.error('Enter title and starting price'); return }
    // Starting price must be below product's listed price
    if (selectedProductId && selectedProductPrice > 0 && price >= selectedProductPrice) {
      toast.error(`Starting price must be below the listed price (${formatPrice(selectedProductPrice)})`); return
    }
    const closingPrice = dropClosingPrice ? parseFloat(dropClosingPrice) : null
    if (closingPrice && closingPrice <= price) { toast.error('Closing price must be above starting price'); return }
    setCreatingDrop(true)
    const supabase = createClient()
    const { error } = await supabase.from('live_drops').insert({
      session_id: sessionId,
      product_id: selectedProductId ?? null,
      image_url: dropImageUrl || null,
      title: dropTitle.trim(),
      drop_type: dropType,
      start_price: price,
      current_price: price,
      closing_price: closingPrice,
      min_increment: Math.max(50, Math.round(price * 0.02)),
      timer_seconds: parseInt(dropTimer),
      status: 'waiting',
      sort_order: drops.length,
    })
    if (error) { toast.error('Failed to create drop') }
    else {
      setDropTitle(''); setDropPrice(''); setDropClosingPrice(''); setDropTimer('60')
      setSelectedProductId(null); setSelectedProductPrice(0); setDropImageUrl(''); setProductSearch('')
      setShowDropForm(false)
      toast.success('Drop added to queue')
    }
    setCreatingDrop(false)
  }

  function selectProduct(p: SellerProduct) {
    setSelectedProductId(p.id)
    setSelectedProductPrice(p.price)
    setDropTitle(p.title)
    setDropPrice('')  // seller must set their own starting price
    setDropImageUrl(p.thumbnail_url ?? '')
  }

  // ── Start drop timer ──────────────────────────────────────────────────────────
  async function startDrop(drop: LiveDrop) {
    const supabase = createClient()
    const endsAt = new Date(Date.now() + drop.timer_seconds * 1000).toISOString()
    await supabase.from('live_drops').update({ status: 'active', ends_at: endsAt, current_price: drop.start_price }).eq('id', drop.id)
    await supabase.from('live_messages').insert({
      session_id: sessionId, user_id: user!.id, user_name: 'AnyBuy Live',
      content: `🔥 ${drop.drop_type === 'auction' ? 'Auction started' : drop.drop_type === 'grab' ? '⚡ Flash sale' : 'Item available'}: ${drop.title} — Starting at ${formatPrice(drop.start_price)}${drop.closing_price ? ` · Auto-closes at ${formatPrice(drop.closing_price)}` : ''}`,
      type: 'system',
    })
  }

  // ── Place bid (with auto-extend) ──────────────────────────────────────────────
  async function placeBid(e: React.FormEvent) {
    e.preventDefault()
    if (!user) { openLoginModal('bid'); return }
    if (!activeDrop) return
    const amount = parseFloat(bidInput)
    const minBid = (activeDrop.current_price ?? activeDrop.start_price) + activeDrop.min_increment
    if (!amount || amount < minBid) { toast.error(`Minimum bid is ${formatPrice(minBid)}`); return }
    if (activeDrop.status !== 'active') { toast.error('Drop is not active'); return }
    setPlacingBid(true)
    const supabase = createClient()
    const displayName = anonName(user.id)
    const { error } = await supabase.from('live_bids').insert({
      drop_id: activeDrop.id, session_id: sessionId,
      bidder_id: user.id, bidder_name: displayName, amount,
    })
    if (error) { toast.error('Bid failed') }
    else {
      setBidInput('')
      toast.success(`Bid of ${formatPrice(amount)} placed!`)
      // Auto-extend: if < 10s left, extend timer
      if (activeDrop.ends_at) {
        const remaining = (new Date(activeDrop.ends_at).getTime() - Date.now()) / 1000
        if (remaining < 10) {
          const newEndsAt = new Date(Date.now() + 10000).toISOString()
          await supabase.from('live_drops').update({ ends_at: newEndsAt }).eq('id', activeDrop.id)
          toast('⏱️ Timer extended 10s!', { icon: '⚡' })
        }
      }
    }
    setPlacingBid(false)
  }

  // ── Chat ──────────────────────────────────────────────────────────────────────
  async function sendChat(e: React.FormEvent) {
    e.preventDefault()
    if (!chatInput.trim()) return
    if (!user) { openLoginModal('live'); return }
    setSending(true)
    const supabase = createClient()
    const displayName = isSeller ? (session?.seller_profile?.store_name ?? user.full_name ?? 'Seller') : anonName(user.id)
    const content = chatInput.trim()

    // Optimistic update — sender sees their message immediately
    const optimisticId = `opt_${Date.now()}`
    const optimistic: ChatMessage = {
      id: optimisticId, user_id: user.id, user_name: displayName,
      content, type: 'message', created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev.slice(-299), optimistic])
    setChatInput('')

    const { error } = await supabase.from('live_messages').insert({
      session_id: sessionId, user_id: user.id,
      user_name: displayName, content, type: 'message',
    })
    if (error) {
      console.error('[sendChat]', error.code, error.message)
      toast.error('Message failed to send')
      // Roll back optimistic message
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
    }
    setSending(false)
  }

  // ── Poll vote ─────────────────────────────────────────────────────────────────
  async function votePoll(optionIndex: number) {
    if (!user) { openLoginModal('live'); return }
    if (!poll) return
    const supabase = createClient()
    const { error } = await supabase.from('live_poll_votes').insert({ poll_id: poll.id, user_id: user.id, option_index: optionIndex })
    if (error?.code === '23505') { toast('Already voted!', { icon: '✅' }); return }
    setPoll(prev => prev ? { ...prev, options: prev.options.map((o, i) => i === optionIndex ? { ...o, votes: o.votes + 1 } : o) } : prev)
  }

  // ── Poll create ───────────────────────────────────────────────────────────────
  async function handleCreatePoll(e: React.FormEvent) {
    e.preventDefault()
    const opts = pollOptions.filter(o => o.trim())
    if (!pollQuestion.trim() || opts.length < 2) { toast.error('Need question + 2 options'); return }
    setCreatingPoll(true)
    const supabase = createClient()
    if (poll) await supabase.from('live_polls').update({ is_active: false }).eq('id', poll.id)
    await supabase.from('live_polls').insert({
      session_id: sessionId, question: pollQuestion.trim(),
      options: opts.map(t => ({ text: t.trim(), votes: 0 })), is_active: true,
    })
    setPollQuestion(''); setPollOptions(['', '']); setShowPollForm(false); setTab('poll')
    setCreatingPoll(false)
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function timerColor(secs: number) {
    if (secs <= 5) return 'text-red-500'
    if (secs <= 15) return 'text-amber-400'
    return 'text-white'
  }
  const filteredProducts = productSearch.trim()
    ? sellerProducts.filter(p => p.title.toLowerCase().includes(productSearch.toLowerCase()))
    : sellerProducts
  const minNextBid = activeDrop ? (activeDrop.current_price ?? activeDrop.start_price) + activeDrop.min_increment : 0

  if (loading) return (
    <div className="h-screen bg-neutral-900 flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-white/40" />
    </div>
  )
  if (!session) return null

  // ── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div className="bg-neutral-950 flex overflow-hidden" style={{ height: '100dvh' }}>

      {/* ── VIDEO AREA ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 relative bg-black min-h-0 overflow-hidden">

          {/* Seller: local camera preview */}
          {isSeller && (
            <video ref={videoRef} autoPlay muted playsInline
              className={`w-full h-full object-cover ${!camOn ? 'opacity-0' : ''}`} />
          )}
          {isSeller && !camOn && (
            <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
              <VideoOff size={48} className="text-white/20" />
            </div>
          )}

          {/* Buyer: remote seller video stream */}
          {!isSeller && (
            <>
              <video ref={remoteVideoRef} autoPlay playsInline
                className={`w-full h-full object-cover ${remoteVideoReady ? '' : 'hidden'}`} />
              {!remoteVideoReady && (
                <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-neutral-900 to-neutral-950">
                  <div className="w-20 h-20 rounded-2xl bg-brand-orange/20 flex items-center justify-center mb-4">
                    <Radio size={36} className="text-brand-orange animate-pulse" />
                  </div>
                  <p className="text-white font-satoshi font-bold text-xl">{session.seller_profile?.store_name ?? 'Live Seller'}</p>
                  <p className="text-white/40 text-sm mt-1">{session.title}</p>
                  {session.status === 'waiting' && <p className="text-amber-400 text-sm mt-4 font-semibold">⏳ Seller is getting ready…</p>}
                  {session.status === 'live' && <p className="text-white/40 text-sm mt-4">Connecting to stream…</p>}
                </div>
              )}
            </>
          )}

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-4">
            <button onClick={() => router.back()}
              className="flex items-center gap-1.5 bg-black/40 hover:bg-black/60 text-white text-sm font-medium px-3 py-2 rounded-xl backdrop-blur transition-all">
              <ChevronLeft size={16} />Back
            </button>
            <div className="flex items-center gap-2">
              {session.status === 'live' && <LiveBadgeInline viewers={session.viewer_count} />}
              {isSeller && session.status === 'waiting' && (
                <button onClick={goLive} className="bg-red-500 hover:bg-red-600 text-white font-bold text-sm px-5 py-2 rounded-full flex items-center gap-2">
                  <Radio size={14} className="animate-pulse" />Go Live
                </button>
              )}
              {isSeller && session.status === 'live' && (
                <button onClick={endLive} className="bg-black/40 hover:bg-red-500/80 text-white text-sm font-medium px-3 py-2 rounded-xl backdrop-blur">
                  End Live
                </button>
              )}
            </div>
          </div>

          {/* Active drop info bar */}
          {activeDrop && ['active', 'ending', 'sold'].includes(activeDrop.status) && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/60 to-transparent p-4">
              <div className="flex items-end justify-between gap-3">
                <div className="flex items-end gap-3">
                  {activeDrop.image_url && (
                    <img src={activeDrop.image_url} alt={activeDrop.title}
                      className="w-14 h-14 rounded-xl object-cover border border-white/20 flex-shrink-0" />
                  )}
                  <div>
                    <p className="text-white/60 text-xs font-semibold uppercase tracking-wide">
                      {activeDrop.drop_type === 'auction' ? '🔨 Auction'
                        : activeDrop.drop_type === 'grab' ? '⚡ Flash sale' : '💳 Fixed price'}
                      {activeDrop.closing_price ? ` · Auto-close at ${formatPrice(activeDrop.closing_price)}` : ''}
                    </p>
                    <p className="text-white font-satoshi font-bold text-xl leading-tight">{activeDrop.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-brand-orange font-satoshi font-bold text-2xl">
                        {formatPrice(activeDrop.current_price ?? activeDrop.start_price)}
                      </p>
                      {topBid && activeDrop.drop_type === 'auction' && (
                        <p className="text-white/60 text-sm">Leading: {topBid.bidder_name}</p>
                      )}
                    </div>
                  </div>
                </div>
                {activeDrop.ends_at && activeDrop.status === 'active' && (
                  <div className={`text-right flex-shrink-0 ${timerColor(dropCountdown)}`}>
                    <p className={`text-4xl font-satoshi font-bold leading-none ${dropCountdown <= 5 ? 'animate-pulse' : ''}`}>
                      {dropCountdown > 60
                        ? `${Math.floor(dropCountdown / 60)}:${String(dropCountdown % 60).padStart(2, '0')}`
                        : dropCountdown}
                    </p>
                    <p className="text-xs opacity-60 mt-0.5">seconds left</p>
                  </div>
                )}
                {activeDrop.status === 'sold' && activeDrop.winner_name && (
                  <div className="text-right flex-shrink-0">
                    <Crown size={20} className="text-amber-400 mx-auto mb-1" />
                    <p className="text-amber-400 text-xs font-bold">{activeDrop.winner_name}</p>
                    <p className="text-white/40 text-[10px]">Won!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 🏆 Winner claim banner (buyer who won) */}
          {iWon && activeDrop && claimCountdown > 0 && (
            <div className="absolute inset-x-4 bottom-32 z-20">
              <div className="bg-white rounded-2xl p-5 shadow-2xl border-2 border-brand-orange">
                <div className="text-center">
                  <div className="text-3xl mb-2">🏆</div>
                  <h3 className="font-satoshi font-bold text-neutral-900 text-lg">You won!</h3>
                  <p className="text-sm text-neutral-600 mt-1 mb-3">
                    {activeDrop.title} — <span className="font-bold text-brand-orange">{formatPrice(activeDrop.final_price ?? activeDrop.start_price)}</span>
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 mb-3">
                    <p className="text-amber-700 text-sm font-bold">
                      ⏰ Claim within: {Math.floor(claimCountdown / 60)}:{String(claimCountdown % 60).padStart(2, '0')}
                    </p>
                  </div>
                  <button onClick={claimWin} disabled={claiming}
                    className="w-full bg-brand-orange hover:bg-[#e85a2d] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all">
                    {claiming ? <Loader2 size={16} className="animate-spin" /> : <><ShoppingCart size={16} />Claim Now → Go to Cart</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Floating reactions */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {reactions.map(r => (
              <div key={r.id} className="absolute bottom-20 text-3xl"
                style={{ left: `${r.x}%`, animation: 'floatUp 3s ease-out forwards' }}>
                {r.emoji}
              </div>
            ))}
          </div>

        </div>

        {/* Bottom bar — reactions (all) + mic/cam (seller only) */}
        <div className="bg-neutral-950 border-t border-white/10 px-3 py-2 flex items-center gap-3">
          {/* Emoji reactions */}
          <div className="flex items-center gap-1.5 flex-1">
            {REACTION_EMOJIS.map(emoji => (
              <button key={emoji} onClick={() => sendReaction(emoji)}
                className="text-xl hover:scale-125 transition-transform leading-none">{emoji}</button>
            ))}
          </div>

          {/* Seller mic/cam — Meet/TikTok style pill buttons */}
          {isSeller && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={toggleMic}
                title={micOn ? 'Mute' : 'Unmute'}
                className={`relative flex flex-col items-center justify-center w-14 h-12 rounded-2xl transition-all overflow-hidden
                  ${micOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
              >
                {/* Audio level fill — rises from bottom when mic is active */}
                {micOn && micLevel > 2 && (
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-green-500/30 transition-all duration-75"
                    style={{ height: `${micLevel}%` }}
                  />
                )}
                <span className="relative z-10">
                  {micOn ? <Mic size={18} /> : <MicOff size={18} />}
                </span>
                <span className="relative z-10 text-[9px] font-bold mt-0.5 leading-none">
                  {micOn ? (micLevel > 2 ? '🎙️' : 'Mute') : 'Unmute'}
                </span>
              </button>
              <button
                onClick={toggleCam}
                title={camOn ? 'Stop cam' : 'Start cam'}
                className={`flex flex-col items-center justify-center w-14 h-12 rounded-2xl transition-all
                  ${camOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
              >
                {camOn ? <Video size={18} /> : <VideoOff size={18} />}
                <span className="text-[9px] font-bold mt-0.5 leading-none">{camOn ? 'Cam' : 'Cam off'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────────────────── */}
      <div className="w-80 bg-neutral-900 border-l border-white/10 flex flex-col flex-shrink-0 min-h-0">

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {([
            { key: 'chat', label: 'Chat', icon: MessageSquare, badge: chatUnread > 0 ? chatUnread : null },
            { key: 'bids', label: 'Bids', icon: Trophy, badge: bidsNew ? true : null },
            { key: 'poll', label: 'Poll', icon: Vote, badge: pollNew ? true : null },
          ] as const).map(({ key, label, icon: Icon, badge }) => (
            <button key={key} onClick={() => switchTab(key)}
              className={`flex-1 relative flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-all
                ${tab === key ? 'text-white border-b-2 border-brand-orange' : 'text-white/40 hover:text-white/70'}`}>
              <Icon size={14} />{label}
              {badge !== null && badge !== undefined && (
                <span className="absolute top-1.5 right-3 min-w-[16px] h-4 px-1 bg-brand-orange text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {typeof badge === 'number' ? (badge > 9 ? '9+' : badge) : ''}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── CHAT ── */}
        {tab === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {messages.length === 0 && <p className="text-white/20 text-xs text-center py-8">No messages yet. Say hello! 👋</p>}
              {messages.map(msg => (
                <div key={msg.id} className={`text-sm ${msg.type === 'system' ? 'text-center' : ''}`}>
                  {msg.type === 'system' ? (
                    <span className="text-brand-orange text-xs bg-brand-orange/10 px-3 py-1 rounded-full inline-block">{msg.content}</span>
                  ) : (
                    <div>
                      <span className={`font-bold text-xs mr-1.5 ${msg.user_id === session.seller_id ? 'text-brand-orange' : 'text-white/60'}`}>
                        {msg.user_id === session.seller_id ? '👑 ' : ''}{msg.user_name}
                      </span>
                      <span className="text-white/80">{msg.content}</span>
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>
            <form onSubmit={sendChat} className="px-3 pb-3 flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                placeholder={user ? 'Say something…' : 'Sign in to chat'} readOnly={!user}
                onClick={() => { if (!user) openLoginModal('live') }}
                className="flex-1 h-9 px-3 bg-white/10 text-white placeholder:text-white/30 text-sm rounded-xl border border-white/10 focus:outline-none focus:border-brand-orange" />
              <button type="submit" disabled={sending || !chatInput.trim()}
                className="w-9 h-9 flex items-center justify-center bg-brand-orange hover:bg-[#e85a2d] disabled:opacity-40 rounded-xl">
                <Send size={14} className="text-white" />
              </button>
            </form>
          </>
        )}

        {/* ── BIDS ── */}
        {tab === 'bids' && (
          <>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {!activeDrop ? (
                <div className="text-center py-12">
                  <Trophy size={24} className="text-white/10 mx-auto mb-2" />
                  <p className="text-white/30 text-sm">No active drop</p>
                  <p className="text-white/20 text-xs mt-1">Bids appear here when a drop starts</p>
                </div>
              ) : (
                <>
                  {/* Drop header */}
                  <div className="bg-white/5 rounded-xl p-3 mb-3 flex items-start gap-3">
                    {activeDrop.image_url && (
                      <img src={activeDrop.image_url} alt={activeDrop.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white/50 text-xs font-semibold uppercase">
                        {activeDrop.drop_type === 'auction' ? '🔨' : activeDrop.drop_type === 'grab' ? '⚡' : '💳'} {activeDrop.drop_type}
                      </p>
                      <p className="text-white text-sm font-semibold truncate">{activeDrop.title}</p>
                      <p className="text-brand-orange font-satoshi font-bold text-lg">
                        {formatPrice(activeDrop.current_price ?? activeDrop.start_price)}
                      </p>
                      {activeDrop.closing_price && (
                        <p className="text-green-400 text-[11px] font-semibold mt-0.5">
                          Auto-wins at {formatPrice(activeDrop.closing_price)}
                        </p>
                      )}
                      {uniqueBidders.length > 0 && (
                        <p className="text-white/30 text-[11px] mt-0.5">{uniqueBidders.length} bidder{uniqueBidders.length !== 1 ? 's' : ''}</p>
                      )}
                    </div>
                  </div>

                  {/* Bid list */}
                  {activeDrop.drop_type === 'auction' && (
                    <div className="space-y-1.5 mb-3">
                      {dropBids.length === 0
                        ? <p className="text-white/20 text-xs text-center py-4">No bids yet — be the first!</p>
                        : dropBids.slice(0, 15).map((bid, i) => (
                          <div key={bid.id} className={`flex items-center justify-between px-3 py-2 rounded-xl
                            ${i === 0 ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-white/5'}`}>
                            <div className="flex items-center gap-2">
                              {i === 0 && <Trophy size={12} className="text-amber-400" />}
                              <span className={`text-xs ${i === 0 ? 'text-white font-semibold' : 'text-white/60'}`}>{bid.bidder_name}</span>
                            </div>
                            <span className={`text-xs font-satoshi font-bold ${i === 0 ? 'text-amber-400' : 'text-white/40'}`}>{formatPrice(bid.amount)}</span>
                          </div>
                        ))
                      }
                    </div>
                  )}

                  {/* ── Claim expired — seller picks backup ── */}
                  {claimExpired && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-3">
                      <p className="text-red-400 text-xs font-bold mb-2">⚠️ {activeDrop.winner_name} didn't claim in time</p>
                      <p className="text-white/40 text-[11px] mb-3">Pick a backup winner or cancel the auction.</p>
                      <div className="space-y-1.5 mb-2 max-h-32 overflow-y-auto">
                        {backupBidders.map(b => (
                          <div key={b.id} className="flex items-center justify-between bg-white/5 rounded-lg px-2.5 py-2">
                            <div>
                              <p className="text-white text-xs font-semibold">{b.name}</p>
                              <p className="text-white/40 text-[10px]">{formatPrice(b.maxBid)}</p>
                            </div>
                            <button onClick={() => selectBackupWinner(b.id, b.name)} disabled={selectingWinner}
                              className="text-[11px] font-bold text-brand-orange hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-brand-orange">
                              Select
                            </button>
                          </div>
                        ))}
                        {backupBidders.length === 0 && <p className="text-white/20 text-[11px] text-center">No other bidders</p>}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={randomBackupWinner} disabled={selectingWinner || backupBidders.length === 0}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-brand-orange/20 hover:bg-brand-orange/30 text-brand-orange text-[11px] font-bold rounded-lg disabled:opacity-40">
                          <Shuffle size={10} />Randomize
                        </button>
                        <button onClick={cancelAuction}
                          className="flex-1 py-1.5 bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 text-[11px] font-bold rounded-lg">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Buyer: Auction bid input */}
            {activeDrop && !isSeller && activeDrop.drop_type === 'auction' && activeDrop.status === 'active' && (
              <form onSubmit={placeBid} className="px-3 pb-3 space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm font-bold">₦</span>
                    <input type="number" value={bidInput} onChange={e => setBidInput(e.target.value)}
                      placeholder={formatPrice(minNextBid).replace('₦', '')}
                      className="w-full h-9 pl-7 pr-3 bg-white/10 text-white placeholder:text-white/30 text-sm rounded-xl border border-white/10 focus:outline-none focus:border-brand-orange" />
                  </div>
                  <button type="submit" disabled={placingBid}
                    className="px-4 h-9 bg-brand-orange hover:bg-[#e85a2d] disabled:opacity-50 text-white text-xs font-bold rounded-xl">
                    {placingBid ? <Loader2 size={13} className="animate-spin" /> : 'BID'}
                  </button>
                </div>
                <button type="button" onClick={() => setBidInput(String(minNextBid))}
                  className="w-full text-xs text-white/40 hover:text-white/70 text-center">
                  Quick bid: {formatPrice(minNextBid)}
                </button>
              </form>
            )}

            {/* Buyer: Fixed price */}
            {activeDrop && !isSeller && activeDrop.drop_type === 'fixed' && activeDrop.status === 'active' && (
              <div className="px-3 pb-3">
                <button onClick={() => {
                  if (!user) { openLoginModal('purchase'); return }
                  if (activeDrop.product_id) router.push(`/products/${activeDrop.product_id}`)
                  else toast('Contact the seller in chat to purchase', { icon: '💬' })
                }} className="w-full h-10 bg-brand-orange hover:bg-[#e85a2d] text-white font-bold text-sm rounded-xl">
                  Buy Now — {formatPrice(activeDrop.start_price)}
                </button>
              </div>
            )}

            {/* Buyer: Grab */}
            {activeDrop && !isSeller && activeDrop.drop_type === 'grab' && activeDrop.status === 'active' && (
              <div className="px-3 pb-3">
                <button onClick={handleGrab} disabled={grabbing}
                  className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-white font-bold text-base rounded-xl flex items-center justify-center gap-2">
                  {grabbing ? <Loader2 size={16} className="animate-spin" /> : <><Zap size={16} />GRAB IT — {formatPrice(activeDrop.start_price)}</>}
                </button>
                <p className="text-white/30 text-xs text-center mt-2">First to tap wins!</p>
              </div>
            )}

            {/* Seller: winner selection for active auction */}
            {isSeller && activeDrop && activeDrop.status === 'active' && activeDrop.drop_type === 'auction' && !claimExpired && (
              <div className="px-3 pb-3 space-y-2">
                <div className="flex gap-2">
                  <button onClick={randomWinner} disabled={selectingWinner || uniqueBidders.length === 0}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl disabled:opacity-40">
                    <Shuffle size={13} />Random winner
                  </button>
                  {topBid && (
                    <button onClick={() => declareWinner(topBid.bidder_id, topBid.bidder_name, topBid.amount)} disabled={selectingWinner}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl disabled:opacity-50">
                      <CheckCircle2 size={13} />Sell to top
                    </button>
                  )}
                </div>
                <button onClick={() => { if (window.confirm('Cancel this drop?')) cancelAuction() }}
                  className="w-full py-1.5 text-white/30 hover:text-red-400 text-xs text-center">
                  Cancel drop
                </button>
              </div>
            )}

            {/* Sold state — winner claimed or pending */}
            {activeDrop && activeDrop.status === 'sold' && activeDrop.claim_status === 'claimed' && (
              <div className="px-3 pb-3">
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center">
                  <CheckCircle2 size={20} className="text-green-400 mx-auto mb-1" />
                  <p className="text-green-400 text-xs font-bold">Item claimed by {activeDrop.winner_name}</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── POLL ── */}
        {tab === 'poll' && (
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
            {!poll ? (
              <div className="text-center py-12">
                <Vote size={24} className="text-white/10 mx-auto mb-2" />
                <p className="text-white/30 text-sm">No active poll</p>
              </div>
            ) : (
              <>
                <p className="text-white font-semibold text-sm">{poll.question}</p>
                {isSeller ? (
                  /* Seller: read-only live results — cannot vote on own poll */
                  <>
                    <div className="space-y-2">
                      {poll.options.map((opt, i) => {
                        const total = poll.options.reduce((s, o) => s + o.votes, 0)
                        const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0
                        return (
                          <div key={i} className="relative overflow-hidden rounded-xl bg-white/10 px-4 py-3">
                            <div className="absolute inset-0 bg-brand-orange/20 transition-all duration-500" style={{ width: `${pct}%` }} />
                            <div className="relative flex items-center justify-between">
                              <span className="text-white text-sm">{opt.text}</span>
                              <span className="text-brand-orange text-xs font-bold">{pct}% · {opt.votes}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-white/30 text-xs text-center">
                      {poll.options.reduce((s, o) => s + o.votes, 0)} votes · Results update live
                    </p>
                  </>
                ) : (
                  /* Buyer: interactive vote buttons */
                  <>
                    <div className="space-y-2">
                      {poll.options.map((opt, i) => {
                        const total = poll.options.reduce((s, o) => s + o.votes, 0)
                        const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0
                        return (
                          <button key={i} onClick={() => votePoll(i)}
                            className="w-full text-left relative overflow-hidden rounded-xl bg-white/10 px-4 py-3 hover:bg-white/15">
                            <div className="absolute inset-0 bg-brand-orange/20" style={{ width: `${pct}%` }} />
                            <div className="relative flex items-center justify-between">
                              <span className="text-white text-sm">{opt.text}</span>
                              <span className="text-white/50 text-xs font-bold">{pct}%</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-white/30 text-xs text-center">{poll.options.reduce((s, o) => s + o.votes, 0)} votes</p>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ── SELLER: DROP QUEUE + CONTROLS ─────────────────────────────────── */}
        {isSeller && (
          <div className="border-t border-white/10 p-3 space-y-3">
            {/* Drop queue */}
            {drops.filter(d => d.status === 'waiting').length > 0 && (
              <div>
                <p className="text-white/40 text-[11px] uppercase tracking-widest mb-2">Up next</p>
                <div className="space-y-1.5">
                  {drops.filter(d => d.status === 'waiting').map(drop => (
                    <div key={drop.id} className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
                      {drop.image_url
                        ? <img src={drop.image_url} alt={drop.title} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                        : <Package size={13} className="text-white/40 flex-shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">{drop.title}</p>
                        <p className="text-white/40 text-[11px]">
                          Start: {formatPrice(drop.start_price)}
                          {drop.closing_price ? ` · Close: ${formatPrice(drop.closing_price)}` : ''} · {drop.timer_seconds}s ·{' '}
                          {drop.drop_type === 'auction' ? '🔨' : drop.drop_type === 'grab' ? '⚡' : '💳'}
                        </p>
                      </div>
                      {!activeDrop && (
                        <button onClick={() => startDrop(drop)}
                          className="bg-brand-orange text-white text-[11px] font-bold px-2.5 py-1 rounded-lg hover:bg-[#e85a2d] flex-shrink-0">
                          Start
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <button onClick={() => { setShowDropForm(f => !f); setShowPollForm(false) }}
                className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold py-2 rounded-xl">
                <Plus size={13} />Drop
              </button>
              <button onClick={() => { setShowPollForm(f => !f); setShowDropForm(false) }}
                className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold py-2 rounded-xl">
                <Vote size={13} />Poll
              </button>
            </div>

            {/* ── Drop form ── */}
            {showDropForm && (
              <form onSubmit={handleCreateDrop} className="space-y-2 bg-white/5 rounded-xl p-3">
                {/* Mode toggle */}
                <div className="flex bg-white/10 rounded-lg p-0.5">
                  {(['catalog', 'freeform'] as const).map(m => (
                    <button key={m} type="button" onClick={() => { setDropMode(m); setSelectedProductId(null); setSelectedProductPrice(0); setDropImageUrl('') }}
                      className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all ${dropMode === m ? 'bg-white/20 text-white' : 'text-white/40'}`}>
                      {m === 'catalog' ? '📦 From store' : '✏️ New item'}
                    </button>
                  ))}
                </div>

                {dropMode === 'catalog' ? (
                  <div className="space-y-2">
                    <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                      placeholder="Search listings…"
                      className="w-full h-8 px-3 bg-white/10 text-white placeholder:text-white/30 text-xs rounded-lg border border-white/10 focus:outline-none focus:border-brand-orange" />
                    {sellerProducts.length === 0
                      ? <p className="text-white/30 text-xs text-center py-3">No active listings</p>
                      : (
                        <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                          {filteredProducts.map(p => (
                            <button key={p.id} type="button" onClick={() => selectProduct(p)}
                              className={`relative rounded-lg overflow-hidden border-2 text-left transition-all
                                ${selectedProductId === p.id ? 'border-brand-orange' : 'border-transparent'}`}>
                              {p.thumbnail_url
                                ? <img src={p.thumbnail_url} alt={p.title} className="w-full aspect-square object-cover" />
                                : <div className="w-full aspect-square bg-white/10 flex items-center justify-center"><Package size={16} className="text-white/30" /></div>
                              }
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                              <div className="absolute bottom-0 left-0 right-0 p-1.5">
                                <p className="text-white text-[10px] font-semibold line-clamp-1">{p.title}</p>
                                <p className="text-neutral-300 text-[10px]">Listed: {formatPrice(p.price)}</p>
                              </div>
                              {selectedProductId === p.id && (
                                <div className="absolute top-1 right-1 w-4 h-4 bg-brand-orange rounded-full flex items-center justify-center">
                                  <CheckCircle2 size={10} className="text-white" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )
                    }
                    {selectedProductId && (
                      <div className="bg-brand-orange/10 border border-brand-orange/30 rounded-lg px-2.5 py-1.5 text-xs text-brand-orange font-semibold truncate">
                        ✓ {dropTitle}
                      </div>
                    )}
                  </div>
                ) : (
                  <input type="text" value={dropTitle} onChange={e => setDropTitle(e.target.value)}
                    placeholder="Item name" required
                    className="w-full h-8 px-3 bg-white/10 text-white placeholder:text-white/30 text-xs rounded-lg border border-white/10 focus:outline-none focus:border-brand-orange" />
                )}

                {/* Starting price */}
                <div>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-white/40 text-xs">₦</span>
                    <input type="number" value={dropPrice} onChange={e => setDropPrice(e.target.value)}
                      placeholder="Starting price" min="1" required
                      className="w-full h-8 pl-6 pr-2 bg-white/10 text-white placeholder:text-white/30 text-xs rounded-lg border border-white/10 focus:outline-none focus:border-brand-orange" />
                  </div>
                  {selectedProductPrice > 0 && (
                    <p className="text-amber-400 text-[10px] mt-0.5 pl-1">Must be below {formatPrice(selectedProductPrice)}</p>
                  )}
                </div>

                {/* Closing price (optional) */}
                {dropType === 'auction' && (
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-white/40 text-xs">₦</span>
                    <input type="number" value={dropClosingPrice} onChange={e => setDropClosingPrice(e.target.value)}
                      placeholder="Closing price (optional — auto-win)"
                      className="w-full h-8 pl-6 pr-2 bg-white/10 text-white placeholder:text-white/30 text-[11px] rounded-lg border border-white/10 focus:outline-none focus:border-green-400" />
                  </div>
                )}

                {/* Timer */}
                <div className="relative">
                  <input type="number" value={dropTimer} onChange={e => setDropTimer(e.target.value)}
                    placeholder="Timer (seconds)" min="30" max="600"
                    className="w-full h-8 px-3 bg-white/10 text-white placeholder:text-white/30 text-xs rounded-lg border border-white/10 focus:outline-none focus:border-brand-orange" />
                </div>

                {/* Drop type */}
                <div className="flex gap-1.5">
                  {(['auction', 'fixed', 'grab'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setDropType(t)}
                      className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all
                        ${dropType === t ? 'bg-brand-orange text-white' : 'bg-white/10 text-white/60'}`}>
                      {t === 'auction' ? '🔨 Bid' : t === 'fixed' ? '💳 Fixed' : '⚡ Grab'}
                    </button>
                  ))}
                </div>

                <button type="submit" disabled={creatingDrop || (dropMode === 'catalog' && !selectedProductId)}
                  className="w-full py-1.5 bg-brand-orange hover:bg-[#e85a2d] disabled:opacity-50 text-white text-xs font-bold rounded-lg">
                  {creatingDrop ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Add to queue'}
                </button>
              </form>
            )}

            {/* Poll form */}
            {showPollForm && (
              <form onSubmit={handleCreatePoll} className="space-y-2 bg-white/5 rounded-xl p-3">
                <input type="text" value={pollQuestion} onChange={e => setPollQuestion(e.target.value)}
                  placeholder="Poll question" required
                  className="w-full h-8 px-3 bg-white/10 text-white placeholder:text-white/30 text-xs rounded-lg border border-white/10 focus:outline-none focus:border-brand-orange" />
                {pollOptions.map((opt, i) => (
                  <input key={i} type="text" value={opt}
                    onChange={e => { const n = [...pollOptions]; n[i] = e.target.value; setPollOptions(n) }}
                    placeholder={`Option ${i + 1}`}
                    className="w-full h-8 px-3 bg-white/10 text-white placeholder:text-white/30 text-xs rounded-lg border border-white/10 focus:outline-none focus:border-brand-orange" />
                ))}
                <button type="button" onClick={() => setPollOptions(p => [...p, ''])}
                  className="text-white/40 hover:text-white/70 text-xs">+ Add option</button>
                <button type="submit" disabled={creatingPoll}
                  className="w-full py-1.5 bg-brand-orange hover:bg-[#e85a2d] disabled:opacity-50 text-white text-xs font-bold rounded-lg">
                  {creatingPoll ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Launch poll'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function LiveBadgeInline({ viewers }: { viewers: number }) {
  return (
    <div className="flex items-center gap-2 bg-black/40 backdrop-blur rounded-full px-3 py-1.5">
      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
      <span className="text-white text-xs font-bold">LIVE</span>
      <div className="flex items-center gap-1 text-white/60">
        <Users size={11} /><span className="text-xs">{viewers}</span>
      </div>
    </div>
  )
}
