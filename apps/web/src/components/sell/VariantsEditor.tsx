'use client'

import {
  FASHION_COLORS,
  GENERIC_SIZES,
  UK_CLOTHING_SIZES,
  UK_SHOE_SIZES,
  US_CLOTHING_SIZES,
  US_SHOE_SIZES,
  type SizeSystem,
} from '@anybuy/types'
import { Plus, Trash2 } from 'lucide-react'

export interface VariantRow {
  id: string        // temp client-side id
  size_system: SizeSystem | ''
  size_label: string
  color_name: string
  color_hex: string
  quantity: number
}

interface Props {
  variants: VariantRow[]
  onChange: (variants: VariantRow[]) => void
}

const SIZE_SYSTEMS: { value: SizeSystem | ''; label: string }[] = [
  { value: '',          label: 'No size' },
  { value: 'uk',        label: 'UK Clothing' },
  { value: 'us',        label: 'US Clothing' },
  { value: 'shoe_uk',   label: 'UK Shoe' },
  { value: 'shoe_us',   label: 'US Shoe' },
  { value: 'generic',   label: 'Generic (S/M/L)' },
]

function getSizes(system: SizeSystem | ''): string[] {
  switch (system) {
    case 'uk':       return UK_CLOTHING_SIZES
    case 'us':       return US_CLOTHING_SIZES
    case 'shoe_uk':  return UK_SHOE_SIZES
    case 'shoe_us':  return US_SHOE_SIZES
    case 'generic':  return GENERIC_SIZES
    default:         return []
  }
}

function newRow(): VariantRow {
  return {
    id: Math.random().toString(36).slice(2),
    size_system: 'uk',
    size_label: UK_CLOTHING_SIZES[2],
    color_name: 'Black',
    color_hex: '#000000',
    quantity: 1,
  }
}

export function VariantsEditor({ variants, onChange }: Props) {
  function update(id: string, patch: Partial<VariantRow>) {
    onChange(variants.map(v => v.id === id ? { ...v, ...patch } : v))
  }

  function remove(id: string) {
    onChange(variants.filter(v => v.id !== id))
  }

  function add() {
    onChange([...variants, newRow()])
  }

  return (
    <div className="space-y-3">
      {variants.length === 0 && (
        <p className="text-sm text-neutral-400 text-center py-4 border border-dashed border-neutral-200 rounded-xl">
          No variants yet. Add sizes and colors so buyers can choose exactly what they want.
        </p>
      )}

      {variants.map((v) => {
        const sizes = getSizes(v.size_system)
        return (
          <div key={v.id} className="grid grid-cols-[1fr_1fr_auto_60px_36px] gap-2 items-center bg-neutral-50 rounded-xl p-3">

            {/* Size system + label */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Size system</label>
              <select
                value={v.size_system}
                onChange={e => {
                  const sys = e.target.value as SizeSystem | ''
                  const firstSize = getSizes(sys)[0] ?? ''
                  update(v.id, { size_system: sys, size_label: firstSize })
                }}
                className="h-9 pl-3 pr-2 bg-white border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-orange appearance-none"
              >
                {SIZE_SYSTEMS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Size value */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Size</label>
              {sizes.length > 0 ? (
                <select
                  value={v.size_label}
                  onChange={e => update(v.id, { size_label: e.target.value })}
                  className="h-9 pl-3 pr-2 bg-white border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-orange appearance-none"
                >
                  {sizes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <div className="h-9 flex items-center pl-3 text-sm text-neutral-400 bg-white border border-neutral-200 rounded-lg">
                  —
                </div>
              )}
            </div>

            {/* Color swatch picker */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Color</label>
              <div className="flex items-center gap-1.5 flex-wrap max-w-[220px]">
                {FASHION_COLORS.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.name}
                    onClick={() => update(v.id, { color_name: c.name, color_hex: c.hex })}
                    className="w-6 h-6 rounded-full border-2 transition-all flex-shrink-0"
                    style={{
                      backgroundColor: c.hex,
                      borderColor: v.color_hex === c.hex ? '#FF6A3D' : c.hex === '#FFFFFF' ? '#E5E7EB' : c.hex,
                      transform: v.color_hex === c.hex ? 'scale(1.25)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
              <p className="text-[11px] text-neutral-500 mt-0.5">{v.color_name}</p>
            </div>

            {/* Quantity */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Qty</label>
              <input
                type="number"
                min={0}
                max={999}
                value={v.quantity}
                onChange={e => update(v.id, { quantity: Math.max(0, Number(e.target.value)) })}
                className="h-9 w-full pl-3 bg-white border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-orange"
              />
            </div>

            {/* Remove */}
            <button
              type="button"
              onClick={() => remove(v.id)}
              className="h-9 w-9 flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors self-end"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )
      })}

      <button
        type="button"
        onClick={add}
        className="w-full flex items-center justify-center gap-2 h-10 border border-dashed border-neutral-300 rounded-xl text-sm font-medium text-neutral-500 hover:border-brand-orange hover:text-brand-orange transition-colors"
      >
        <Plus size={15} />
        Add variant
      </button>
    </div>
  )
}
