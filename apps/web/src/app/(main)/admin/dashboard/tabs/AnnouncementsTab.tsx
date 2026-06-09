'use client'

import { createClient } from '@/lib/supabase/client'
import {
  Loader2, Megaphone, Plus, Tag, Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface Announcement {
  id: string
  type: 'notification' | 'banner' | 'sale_event'
  occasion: string | null
  title: string
  body: string | null
  target_audience: 'all' | 'buyers' | 'sellers' | 'riders'
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  created_at: string
}

const TYPES = [
  { value: 'notification', label: '🔔 Notification' },
  { value: 'banner',       label: '📢 Banner' },
  { value: 'sale_event',   label: '🏷️ Sale event' },
]
const AUDIENCES = [
  { value: 'all',     label: 'Everyone' },
  { value: 'buyers',  label: 'Buyers only' },
  { value: 'sellers', label: 'Sellers only' },
  { value: 'riders',  label: 'Riders only' },
]
const OCCASIONS = [
  'black_friday', 'christmas', 'new_year', 'easter', 'ramadan', 'salah', 'custom',
]

const TYPE_COLOR: Record<string, string> = {
  notification: 'bg-blue-500/10 text-blue-400',
  banner:       'bg-purple-500/10 text-purple-400',
  sale_event:   'bg-brand-orange/10 text-brand-orange',
}

export function AnnouncementsTab({ adminId }: { adminId: string }) {
  const [items, setItems]       = useState<Announcement[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)

  // Form
  const [type, setType]           = useState<Announcement['type']>('notification')
  const [occasion, setOccasion]   = useState('')
  const [title, setTitle]         = useState('')
  const [body, setBody]           = useState('')
  const [audience, setAudience]   = useState<Announcement['target_audience']>('all')
  const [startsAt, setStartsAt]   = useState('')
  const [endsAt, setEndsAt]       = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const supabase = createClient()
    const { data } = await supabase
      .from('platform_announcements')
      .select('*')
      .order('created_at', { ascending: false })
    setItems(data ?? [])
    setLoading(false)
  }

  function resetForm() {
    setType('notification'); setOccasion(''); setTitle(''); setBody('')
    setAudience('all'); setStartsAt(''); setEndsAt('')
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { toast.error('Enter a title'); return }
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('platform_announcements')
      .insert({
        created_by: adminId,
        type,
        occasion: occasion || null,
        title: title.trim(),
        body: body.trim() || null,
        target_audience: audience,
        is_active: true,
        starts_at: startsAt || null,
        ends_at: endsAt || null,
      })
      .select()
      .single()

    if (error) {
      toast.error('Could not create announcement')
    } else {
      setItems(prev => [data, ...prev])
      setShowForm(false)
      resetForm()
      toast.success('Announcement published!')
    }
    setSaving(false)
  }

  async function toggleActive(item: Announcement) {
    const supabase = createClient()
    await supabase.from('platform_announcements').update({ is_active: !item.is_active }).eq('id', item.id)
    setItems(prev => prev.map(a => a.id === item.id ? { ...a, is_active: !a.is_active } : a))
  }

  async function deleteItem(id: string) {
    if (!window.confirm('Delete this announcement?')) return
    const supabase = createClient()
    await supabase.from('platform_announcements').delete().eq('id', id)
    setItems(prev => prev.filter(a => a.id !== id))
    toast.success('Deleted')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-white/30" />
      </div>
    )
  }

  const inputCls = `h-11 px-4 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white
    placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition-all`

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-satoshi text-xl font-bold text-white">Announcements</h1>
          <p className="text-white/45 text-sm mt-1">Push notifications, banners, and sale events to users.</p>
        </div>
        <button
          onClick={() => { setShowForm(f => !f); if (showForm) resetForm() }}
          className="flex items-center gap-1.5 bg-brand-orange text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#e85a2d] transition-all flex-shrink-0"
        >
          <Plus size={14} />New announcement
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleSave} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 space-y-5">
          <h3 className="font-satoshi font-bold text-white">New announcement</h3>

          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Type</label>
            <div className="flex rounded-xl overflow-hidden border border-white/[0.08]">
              {TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => setType(t.value as Announcement['type'])}
                  className={`flex-1 py-2.5 text-sm font-medium transition-all
                    ${type === t.value
                      ? 'bg-white/[0.1] text-white'
                      : 'text-white/40 hover:text-white hover:bg-white/[0.05]'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Audience */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Audience</label>
            <div className="flex gap-2 flex-wrap">
              {AUDIENCES.map(a => (
                <button key={a.value} type="button" onClick={() => setAudience(a.value as Announcement['target_audience'])}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all
                    ${audience === a.value
                      ? 'bg-brand-orange text-white border-brand-orange'
                      : 'text-white/50 border-white/[0.08] hover:border-white/20 hover:text-white'}`}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title + occasion */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
                placeholder="e.g. Black Friday Sale is Live!"
                className={inputCls} />
            </div>
            {type === 'sale_event' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Occasion</label>
                <select value={occasion} onChange={e => setOccasion(e.target.value)}
                  className="h-11 px-4 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white
                    focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition-all">
                  <option value="" className="bg-[#0d1117]">None</option>
                  {OCCASIONS.map(o => <option key={o} value={o} className="bg-[#0d1117]">{o.replace('_', ' ')}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              Message <span className="text-white/25 font-normal normal-case">(optional)</span>
            </label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={3}
              placeholder="Additional details about this announcement…"
              className="px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white
                placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent
                resize-none transition-all" />
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Starts</label>
              <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)}
                className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Ends</label>
              <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)}
                className={inputCls} />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 bg-brand-orange text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#e85a2d] disabled:opacity-50 transition-all">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Megaphone size={14} />}
              Publish
            </button>
            <button type="button" onClick={() => { setShowForm(false); resetForm() }}
              className="text-sm text-white/40 hover:text-white/70 transition-colors">Cancel</button>
          </div>
        </form>
      )}

      {/* List */}
      {items.length === 0 ? (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-12 text-center">
          <Megaphone size={28} className="text-white/15 mx-auto mb-3" />
          <p className="font-semibold text-white/60">No announcements yet</p>
          <p className="text-sm text-white/35 mt-1">Create one to alert buyers, sellers, or riders.</p>
        </div>
      ) : (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
          {items.map(item => (
            <div key={item.id} className="flex items-start gap-4 px-5 py-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${TYPE_COLOR[item.type] ?? 'bg-white/[0.06] text-white/40'}`}>
                {item.type === 'sale_event' ? <Tag size={16} /> : <Megaphone size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-white text-sm">{item.title}</p>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${item.is_active ? 'bg-green-500/15 text-green-400' : 'bg-white/[0.06] text-white/35'}`}>
                    {item.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-[11px] font-semibold text-white/35 capitalize">{item.target_audience}</span>
                </div>
                {item.body && <p className="text-xs text-white/45 mt-0.5 truncate">{item.body}</p>}
                <p className="text-[11px] text-white/30 mt-1">
                  {new Date(item.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {item.ends_at && ` · Ends ${new Date(item.ends_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                <button onClick={() => toggleActive(item)}
                  className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${item.is_active ? 'bg-green-500' : 'bg-white/20'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${item.is_active ? 'left-4' : 'left-0.5'}`} />
                </button>
                <button onClick={() => deleteItem(item.id)}
                  className="p-1.5 text-white/25 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
