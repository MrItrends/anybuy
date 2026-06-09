'use client'

import { createClient } from '@/lib/supabase/client'
import {
  Loader2, MessageSquare, Send, User,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface ConvRow {
  id: string
  product_id: string
  seller_id: string
  buyer_id: string
  created_at: string
  last_message: string | null
  unread_count: number
  product: { title: string } | null
  buyer: { full_name: string } | null
  seller_profile: { store_name: string } | null
}

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
}

export function ChatInboxTab({ adminId }: { adminId: string }) {
  const [convs, setConvs]       = useState<ConvRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<ConvRow | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [msgLoading, setMsgLoading] = useState(false)
  const [reply, setReply]       = useState('')
  const [sending, setSending]   = useState(false)
  const bottomRef               = useRef<HTMLDivElement>(null)

  useEffect(() => { loadConvs() }, [])
  useEffect(() => {
    if (selected) loadMessages(selected.id)
  }, [selected])
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadConvs() {
    const supabase = createClient()
    const { data } = await supabase
      .from('conversations')
      .select(`
        id, product_id, seller_id, buyer_id, created_at,
        product:products!product_id(title),
        buyer:profiles!buyer_id(full_name),
        seller_profile:seller_profiles!seller_id(store_name)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (!data) { setLoading(false); return }

    const convIds = data.map((c: any) => c.id)
    const { data: lastMsgs } = await supabase
      .from('messages')
      .select('conversation_id, content, created_at')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false })

    const lastMsgMap: Record<string, string> = {}
    ;(lastMsgs ?? []).forEach((m: any) => {
      if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m.content
    })

    setConvs(data.map((c: any) => ({
      ...c,
      product: Array.isArray(c.product) ? c.product[0] : c.product,
      buyer: Array.isArray(c.buyer) ? c.buyer[0] : c.buyer,
      seller_profile: Array.isArray(c.seller_profile) ? c.seller_profile[0] : c.seller_profile,
      last_message: lastMsgMap[c.id] ?? null,
      unread_count: 0,
    })))
    setLoading(false)
  }

  async function loadMessages(convId: string) {
    setMsgLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, content, created_at')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    setMessages(data ?? [])
    setMsgLoading(false)
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!reply.trim() || !selected) return
    setSending(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: selected.id,
        sender_id: adminId,
        content: reply.trim(),
      })
      .select()
      .single()

    if (!error && data) {
      setMessages(prev => [...prev, data])
      setReply('')
    }
    setSending(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-white/30" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-satoshi text-xl font-bold text-white">Chat Inbox</h1>
        <p className="text-white/45 text-sm mt-1">Monitor and respond to buyer–seller conversations.</p>
      </div>

      <div className="flex gap-4 h-[calc(100vh-200px)] min-h-[500px]">
        {/* Conversation list */}
        <div className="w-72 flex-shrink-0 bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wide">{convs.length} conversations</p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
            {convs.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center px-4">
                <MessageSquare size={24} className="text-white/15 mb-2" />
                <p className="text-sm text-white/35">No conversations yet</p>
              </div>
            ) : convs.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelected(conv)}
                className={`w-full text-left px-4 py-3 transition-colors
                  ${selected?.id === conv.id
                    ? 'bg-brand-orange/10 border-r-2 border-brand-orange'
                    : 'hover:bg-white/[0.03]'}`}
              >
                <p className="font-semibold text-white text-sm truncate">{conv.buyer?.full_name ?? 'Unknown buyer'}</p>
                <p className="text-xs text-white/35 truncate mt-0.5">{conv.product?.title ?? 'Product'}</p>
                {conv.last_message && (
                  <p className="text-xs text-white/40 truncate mt-1 italic">"{conv.last_message}"</p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Message thread */}
        <div className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <MessageSquare size={32} className="text-white/15 mx-auto mb-3" />
                <p className="font-semibold text-white/50">Select a conversation</p>
                <p className="text-sm text-white/30 mt-1">Pick a thread from the left to read and respond.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-orange/10 flex items-center justify-center flex-shrink-0">
                  <User size={16} className="text-brand-orange" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{selected.buyer?.full_name ?? 'Buyer'}</p>
                  <p className="text-xs text-white/35">
                    Re: {selected.product?.title ?? '—'} · Seller: {selected.seller_profile?.store_name ?? '—'}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {msgLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={20} className="animate-spin text-white/30" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-sm text-white/30 py-8">No messages in this conversation.</p>
                ) : messages.map(msg => {
                  const isAdmin = msg.sender_id === adminId
                  const isBuyer = msg.sender_id === selected.buyer_id
                  return (
                    <div key={msg.id} className={`flex ${isAdmin || !isBuyer ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm
                        ${isAdmin
                          ? 'bg-brand-orange text-white rounded-br-sm'
                          : isBuyer
                            ? 'bg-white/[0.08] text-white/90 rounded-bl-sm'
                            : 'bg-white/[0.05] text-white/70 rounded-br-sm'}`}>
                        {!isBuyer && !isAdmin && (
                          <p className="text-[11px] font-bold mb-1 opacity-60">SELLER</p>
                        )}
                        {isAdmin && (
                          <p className="text-[11px] font-bold mb-1 opacity-70">ADMIN</p>
                        )}
                        <p>{msg.content}</p>
                        <p className="text-[11px] mt-1 opacity-50">
                          {new Date(msg.created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* Reply box */}
              <form onSubmit={handleSend} className="px-5 py-4 border-t border-white/[0.06] flex gap-3">
                <input
                  type="text"
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  placeholder="Reply as admin…"
                  className="flex-1 h-10 px-4 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white
                    placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition-all"
                />
                <button type="submit" disabled={sending || !reply.trim()}
                  className="flex items-center gap-2 bg-brand-orange text-white text-sm font-semibold px-4 h-10 rounded-xl hover:bg-[#e85a2d] disabled:opacity-50 transition-all">
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
