'use client'

import { useVoiceSearch } from '@/hooks/useVoiceSearch'
import { Mic, MicOff, Search, SlidersHorizontal, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest' },
  { value: 'price_asc',  label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
]

interface SearchBarProps {
  defaultQ: string
  defaultSort: string
  defaultCategory: string
}

export function SearchBar({ defaultQ, defaultSort, defaultCategory }: SearchBarProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [query, setQuery] = useState(defaultQ)
  const [sort, setSort] = useState(defaultSort)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function push(q: string, s: string, cat: string) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (s && s !== 'newest') params.set('sort', s)
    if (cat) params.set('category', cat)
    startTransition(() => router.push(`/search?${params.toString()}`))
  }

  function handleQueryChange(val: string) {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => push(val, sort, defaultCategory), 350)
  }

  function handleSortChange(val: string) {
    setSort(val)
    push(query, val, defaultCategory)
  }

  function handleClear() {
    setQuery('')
    push('', sort, defaultCategory)
    inputRef.current?.focus()
  }

  // Sync when navigating via category pills
  useEffect(() => { setQuery(defaultQ) }, [defaultQ])
  useEffect(() => { setSort(defaultSort) }, [defaultSort])

  // Voice search — result populates the input and triggers a search immediately
  const { status: voiceStatus, supported: voiceSupported, start: startVoice } = useVoiceSearch({
    onResult: (text) => {
      setQuery(text)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      push(text, sort, defaultCategory)
    },
  })

  return (
    <div className="flex items-center gap-3">
      {/* Search input */}
      <div className="relative flex-1">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />

        <input
          ref={inputRef}
          autoFocus
          value={voiceStatus === 'listening' ? '' : query}
          onChange={e => handleQueryChange(e.target.value)}
          placeholder={voiceStatus === 'listening' ? 'Listening…' : 'Search for anything…'}
          className={`w-full h-11 pl-11 pr-20 bg-neutral-50 border rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:border-transparent text-sm transition-all
            ${voiceStatus === 'listening'
              ? 'border-brand-orange ring-2 ring-brand-orange placeholder:text-brand-orange placeholder:animate-pulse'
              : 'border-neutral-200 focus:ring-brand-orange'}`}
        />

        {/* Right-side icon group */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {/* Clear — only when there's text and not listening */}
          {query && voiceStatus !== 'listening' && (
            <button
              onClick={handleClear}
              className="text-neutral-400 hover:text-neutral-600 transition-colors p-0.5"
            >
              <X size={15} />
            </button>
          )}

          {/* Mic */}
          {voiceSupported && (
            <button
              onClick={startVoice}
              disabled={voiceStatus === 'listening'}
              title={voiceStatus === 'listening' ? 'Listening…' : 'Search by voice'}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all
                ${voiceStatus === 'listening'
                  ? 'bg-brand-orange text-white animate-pulse cursor-default'
                  : voiceStatus === 'error'
                    ? 'bg-red-100 text-red-500'
                    : 'text-neutral-400 hover:text-brand-orange hover:bg-brand-orange/10'}`}
            >
              {voiceStatus === 'error' ? <MicOff size={15} /> : <Mic size={15} />}
            </button>
          )}
        </div>
      </div>

      {/* Sort */}
      <select
        value={sort}
        onChange={e => handleSortChange(e.target.value)}
        className="h-11 px-3 text-sm bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange cursor-pointer hidden sm:block"
      >
        {SORT_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Filter */}
      <button className="flex items-center gap-1.5 h-11 px-3 bg-white border border-neutral-200 rounded-xl text-sm text-neutral-600 hover:border-neutral-400 transition-colors flex-shrink-0">
        <SlidersHorizontal size={14} />
        <span className="hidden sm:inline">Filter</span>
      </button>
    </div>
  )
}
