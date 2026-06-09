'use client'

import { MapPin } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export interface AddressResult {
  street: string
  city: string
  state: string
}

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onAddressSelect: (result: AddressResult) => void
  label?: string
  placeholder?: string
}

// ── Script loader (singleton — loads once per page, reuses across mounts) ────
let gmapsReady = false
let gmapsLoading = false
const readyCallbacks: (() => void)[] = []

function loadGoogleMaps(apiKey: string, onReady: () => void) {
  if (gmapsReady) { onReady(); return }
  readyCallbacks.push(onReady)
  if (gmapsLoading) return
  gmapsLoading = true

  const script = document.createElement('script')
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
  script.async = true
  script.defer = true
  script.onload = () => {
    gmapsReady = true
    readyCallbacks.forEach(fn => fn())
    readyCallbacks.length = 0
  }
  document.head.appendChild(script)
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  label = 'Street Address',
  placeholder = 'Start typing your address…',
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)
  const [ready, setReady] = useState(false)

  // Load Google Maps script on mount
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') return
    loadGoogleMaps(apiKey, () => setReady(true))
  }, [])

  // Initialise Autocomplete once the script is loaded
  useEffect(() => {
    if (!ready || !inputRef.current) return
    const google = (window as any).google
    if (!google?.maps?.places) return

    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'ng' }, // Nigeria only
      fields: ['address_components', 'formatted_address'],
    })

    const listener = autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace()
      if (!place?.address_components) return

      let streetNumber = ''
      let route = ''
      let city = ''
      let state = ''

      for (const component of place.address_components as google.maps.GeocoderAddressComponent[]) {
        const types = component.types
        if (types.includes('street_number')) streetNumber = component.long_name
        if (types.includes('route')) route = component.long_name
        // City: try locality first, fall back to admin_area_level_2
        if (types.includes('locality') && !city) city = component.long_name
        if (types.includes('administrative_area_level_2') && !city) city = component.long_name
        if (types.includes('administrative_area_level_1')) state = component.long_name
      }

      const street =
        [streetNumber, route].filter(Boolean).join(' ') ||
        place.formatted_address ||
        ''

      onChange(street)
      onAddressSelect({ street, city, state })
    })

    return () => {
      ;(window as any).google?.maps?.event?.removeListener(listener)
    }
  }, [ready, onChange, onAddressSelect])

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-semibold text-neutral-700">{label}</label>
      )}
      <div className="relative">
        <MapPin
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none z-10"
        />
        <input
          ref={inputRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full h-11 pl-9 pr-4 bg-white border border-neutral-200 rounded-2xl text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition-all"
        />
      </div>
    </div>
  )
}
