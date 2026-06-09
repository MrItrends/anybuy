'use client'

import { createClient } from '@/lib/supabase/client'
import { CalendarClock, Loader2, Radio, Trash2, Users, Video } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface LiveSession {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  status: 'waiting' | 'scheduled' | 'live' | 'ended'
  viewer_count: number
  channel_id: string
  scheduled_at: string | null
  started_at: string | null
  ended_at: string | null
  created_at: string
}

interface LiveTabProps {
  sellerId: string
}

export function LiveTab({ sellerId }: LiveTabProps) {
  const router = useRouter()
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Form
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduleMode, setScheduleMode] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')

  useEffect(() => { load() }, [sellerId])

  async function load() {
    const supabase = createClient()
    const { data } = await supabase
      .from('live_sessions')
      .select('id,title,description,thumbnail_url,status,viewer_count,channel_id,scheduled_at,started_at,ended_at,created_at')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
      .limit(50)
    setSessions(data ?? [])
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { toast.error('Enter a session title'); return }
    if (scheduleMode && !scheduledAt) { toast.error('Pick a date and time'); return }
    if (scheduleMode && new Date(scheduledAt) <= new Date()) {
      toast.error('Scheduled time must be in the future'); return
    }
    setCreating(true)
    const supabase = createClient()
    const channelId = `live_${sellerId.slice(0, 8)}_${Date.now()}`

    const { error: insertError } = await supabase
      .from('live_sessions')
      .insert({
        seller_id: sellerId,
        title: title.trim(),
        description: description.trim() || null,
        channel_id: channelId,
        status: scheduleMode ? 'scheduled' : 'waiting',
        scheduled_at: scheduleMode ? new Date(scheduledAt).toISOString() : null,
      })

    if (insertError) {
      console.error('[LiveTab] insert error:', insertError.code, insertError.message, insertError.details)
      toast.error(insertError.message ?? 'Could not create session')
      setCreating(false)
      return
    }

    const { data, error: fetchError } = await supabase
      .from('live_sessions')
      .select('id')
      .eq('channel_id', channelId)
      .single()

    if (fetchError || !data) {
      toast.error('Session created — open it from the list below')
      setCreating(false)
      load()
      return
    }

    toast.success(scheduleMode ? 'Session scheduled!' : 'Session created! Taking you live…')
    if (!scheduleMode) router.push(`/live/${data.id}`)
    else { load(); setShowForm(false); setTitle(''); setDescription(''); setScheduledAt(''); setScheduleMode(false) }
  }

  async function deleteSession(id: string) {
    if (!window.confirm('Delete this session? This cannot be undone.')) return
    const supabase = createClient()
    await supabase.from('live_sessions').delete().eq('id', id)
    setSessions(prev => prev.filter(s => s.id !== id))
    toast.success('Session deleted')
  }

  function statusPill(s: LiveSession) {
    if (s.status === 'live') return (
      <span className="flex items-center gap-1 bg-red-500/10 text-red-500 text-[11px] font-bold px-2 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />LIVE
      </span>
    )
    if (s.status === 'scheduled') return (
      <span className="flex items-center gap-1 bg-blue-500/10 text-blue-500 text-[11px] font-bold px-2 py-0.5 rounded-full">
        <CalendarClock size={10} />SCHEDULED
      </span>
    )
    if (s.status === 'waiting') return (
      <span className="bg-amber-100 text-amber-600 text-[11px] font-bold px-2 py-0.5 rounded-full">READY</span>
    )
    return (
      <span className="bg-neutral-100 text-neutral-400 text-[11px] font-bold px-2 py-0.5 rounded-full">ENDED</span>
    )
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={24} className="animate-spin text-neutral-300" />
    </div>
  )

  const activeSessions = sessions.filter(s => s.status !== 'ended')

  // Min datetime for scheduler (now + 5 minutes, in local ISO format)
  const minDateTime = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-satoshi text-xl font-bold text-neutral-900">Go Live</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Start a live auction — tag products, set starting prices, and let buyers bid in real time.
          </p>
        </div>
        <button
          onClick={() => setShowForm(f => !f)}
          className="flex items-center gap-1.5 bg-red-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-red-600 transition-all flex-shrink-0"
        >
          <Video size={14} />
          New session
        </button>
      </div>

      {/* Active session banners */}
      {activeSessions.map(s => (
        <div key={s.id} className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <Radio size={18} className="text-red-500" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                {statusPill(s)}
                <p className="font-semibold text-neutral-900 text-sm">{s.title}</p>
              </div>
              {s.status === 'live' && (
                <div className="flex items-center gap-1 text-xs text-neutral-500">
                  <Users size={11} /><span>{s.viewer_count} watching</span>
                </div>
              )}
              {s.status === 'scheduled' && s.scheduled_at && (
                <p className="text-xs text-blue-500">
                  {new Date(s.scheduled_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => router.push(`/live/${s.id}`)}
            className="bg-red-500 text-white text-sm font-bold px-5 py-2 rounded-xl hover:bg-red-600 transition-all flex-shrink-0"
          >
            {s.status === 'live' ? 'Rejoin' : 'Enter studio'}
          </button>
        </div>
      ))}

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-5">
          <h3 className="font-satoshi font-bold text-neutral-900">New live session</h3>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-neutral-700">Session title <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder='e.g. "iPhone 15 auction — Grade A units 🔥"'
              maxLength={80}
              required
              className="h-11 px-4 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-neutral-700">Description <span className="text-neutral-400 font-normal">(optional)</span></label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Tell buyers what to expect in this session…"
              rows={2}
              className="px-4 py-3 border border-neutral-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
            />
          </div>

          {/* Schedule toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setScheduleMode(m => !m)}
              className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 ${scheduleMode ? 'bg-blue-500' : 'bg-neutral-200'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${scheduleMode ? 'translate-x-5' : ''}`} />
            </button>
            <span className="text-sm font-semibold text-neutral-700">Schedule for later</span>
          </div>

          {scheduleMode && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-neutral-700">Date &amp; time</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                min={minDateTime}
                required
                className="h-11 px-4 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
              <p className="text-xs text-neutral-400">Buyers can see this session on the browse page before it starts.</p>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
            <strong>Tip:</strong> Once in the studio, tag products from your store, set starting prices (below the listed price), and optionally a closing price that auto-wins the auction.
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 bg-red-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-red-600 disabled:opacity-50 transition-all"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : scheduleMode ? <CalendarClock size={14} /> : <Video size={14} />}
              {scheduleMode ? 'Schedule session' : 'Create & enter studio'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setTitle(''); setDescription(''); setScheduleMode(false); setScheduledAt('') }}
              className="text-sm text-neutral-500 hover:text-neutral-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Session history */}
      {sessions.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center">
          <Radio size={28} className="text-neutral-200 mx-auto mb-3" />
          <p className="font-semibold text-neutral-600">No sessions yet</p>
          <p className="text-sm text-neutral-400 mt-1">Create a session to start selling live.</p>
        </div>
      ) : (
        <div>
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">All sessions</p>
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden divide-y divide-neutral-100">
            {sessions.map(s => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                  ${s.status === 'live' ? 'bg-red-500/10' : s.status === 'scheduled' ? 'bg-blue-500/10' : s.status === 'waiting' ? 'bg-amber-50' : 'bg-neutral-100'}`}>
                  <Radio size={16} className={
                    s.status === 'live' ? 'text-red-500' :
                    s.status === 'scheduled' ? 'text-blue-500' :
                    s.status === 'waiting' ? 'text-amber-500' : 'text-neutral-300'
                  } />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {statusPill(s)}
                    <p className="font-semibold text-neutral-900 text-sm truncate">{s.title}</p>
                  </div>
                  <p className="text-xs text-neutral-400">
                    {s.status === 'ended'
                      ? `Ended ${s.ended_at ? new Date(s.ended_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} · ${s.viewer_count} viewers`
                      : s.status === 'scheduled' && s.scheduled_at
                        ? `Scheduled for ${new Date(s.scheduled_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}`
                        : `Created ${new Date(s.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}`
                    }
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {s.status !== 'ended' && (
                    <button
                      onClick={() => router.push(`/live/${s.id}`)}
                      className="text-xs font-semibold text-red-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-all"
                    >
                      {s.status === 'live' ? 'Rejoin' : 'Open'}
                    </button>
                  )}
                  <button
                    onClick={() => deleteSession(s.id)}
                    className="p-1.5 text-neutral-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
