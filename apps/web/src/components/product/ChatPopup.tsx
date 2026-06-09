'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { formatDate } from '@anybuy/utils'
import { ChevronDown, Loader2, Send, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface Message {
  id: string
  sender_id: string
  body: string
  created_at: string
  read_at: string | null
}

interface ChatPopupProps {
  productId: string
  productTitle: string
  sellerId: string
  sellerName: string
  onClose: () => void
}

export function ChatPopup({
  productId,
  productTitle,
  sellerId,
  sellerName,
  onClose,
}: ChatPopupProps) {
  const { user } = useAuthStore()
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [minimised, setMinimised] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  // ── Boot: get or create conversation ───────────────────────────────────────
  useEffect(() => {
    if (!user) return

    async function init() {
      const supabase = createClient()

      // Try to find existing conversation
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('product_id', productId)
        .eq('buyer_id', user!.id)
        .eq('seller_id', sellerId)
        .maybeSingle()

      let convId = existing?.id ?? null

      // Create if not found
      if (!convId) {
        const { data: created } = await supabase
          .from('conversations')
          .insert({ product_id: productId, buyer_id: user!.id, seller_id: sellerId })
          .select('id')
          .single()
        convId = created?.id ?? null
      }

      if (!convId) { setLoading(false); return }
      setConversationId(convId)

      // Load existing messages
      const { data: msgs } = await supabase
        .from('messages')
        .select('id, sender_id, body, created_at, read_at')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })

      setMessages(msgs ?? [])
      setLoading(false)

      // Subscribe to new messages in real-time
      supabase
        .channel(`chat:${convId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` },
          (payload) => {
            setMessages(prev => {
              // Avoid duplicates (optimistic update already added it)
              if (prev.some(m => m.id === payload.new.id)) return prev
              return [...prev, payload.new as Message]
            })
          }
        )
        .subscribe()
    }

    init()
  }, [user, productId, sellerId])

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, minimised])

  // Focus input when opened / restored
  useEffect(() => {
    if (!minimised && !loading) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [minimised, loading])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed || !conversationId || !user) return

    setSending(true)
    const supabase = createClient()

    // Optimistic update
    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      sender_id: user.id,
      body: trimmed,
      created_at: new Date().toISOString(),
      read_at: null,
    }
    setMessages(prev => [...prev, optimistic])
    setBody('')

    const { data: sent } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: user.id, body: trimmed })
      .select('id, sender_id, body, created_at, read_at')
      .single()

    // Replace optimistic with real
    if (sent) {
      setMessages(prev => prev.map(m => m.id === optimistic.id ? sent : m))
    }
    setSending(false)
  }

  const isMe = (senderId: string) => senderId === user?.id

  return (
    /* Floating panel — bottom-right corner */
    <div className="fixed bottom-6 right-6 z-50 flex flex-col shadow-2xl rounded-2xl overflow-hidden w-[340px]"
      style={{ maxHeight: minimised ? 'auto' : '520px' }}>

      {/* ── Header ── */}
      <div className="bg-brand-dark px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <p className="flex-1 min-w-0 text-white font-semibold text-sm truncate">{sellerName}</p>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinimised(m => !m)}
            className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <ChevronDown
              size={16}
              className={`transition-transform ${minimised ? 'rotate-180' : ''}`}
            />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── Body (hidden when minimised) ── */}
      {!minimised && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-neutral-50 px-4 py-4 space-y-3"
            style={{ minHeight: '280px', maxHeight: '360px' }}>

            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={20} className="text-neutral-300 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-8">
                <div className="w-12 h-12 rounded-2xl bg-brand-orange/10 flex items-center justify-center">
                  <span className="text-2xl">👋</span>
                </div>
                <p className="text-sm font-semibold text-neutral-700">Say hello to {sellerName}</p>
                <p className="text-xs text-neutral-400 leading-relaxed max-w-[200px]">
                  Ask about availability, condition, or anything else about this item.
                </p>
              </div>
            ) : (
              messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${isMe(msg.sender_id) ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[76%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed
                      ${isMe(msg.sender_id)
                        ? 'bg-brand-orange text-white rounded-br-sm'
                        : 'bg-white text-neutral-800 border border-neutral-100 rounded-bl-sm shadow-sm'}`}
                  >
                    <p>{msg.body}</p>
                    <p className={`text-[11px] mt-1 ${isMe(msg.sender_id) ? 'text-white/60 text-right' : 'text-neutral-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* ── Input ── */}
          <form
            onSubmit={handleSend}
            className="bg-white border-t border-neutral-100 px-3 py-3 flex items-center gap-2 flex-shrink-0"
          >
            <input
              ref={inputRef}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Type a message…"
              disabled={loading}
              maxLength={1000}
              className="flex-1 h-9 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition-all"
            />
            <button
              type="submit"
              disabled={!body.trim() || sending || loading}
              className="w-9 h-9 rounded-xl bg-brand-orange hover:bg-[#e85a2d] disabled:opacity-40 text-white flex items-center justify-center flex-shrink-0 transition-all"
            >
              {sending
                ? <Loader2 size={15} className="animate-spin" />
                : <Send size={15} />}
            </button>
          </form>

          {/* Disclaimer */}
          <p className="bg-white text-center text-[11px] text-neutral-400 pb-2.5 border-t-0">
            Messages are monitored to keep AnyBuy safe
          </p>
        </>
      )}
    </div>
  )
}
