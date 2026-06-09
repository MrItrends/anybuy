'use client'

import { ImagePlus, Play, X } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

export interface MediaFile {
  file: File
  preview: string
  type: 'image' | 'video'
}

interface ImageUploadProps {
  files: MediaFile[]
  onChange: (files: MediaFile[]) => void
  maxFiles?: number
}

export function ImageUpload({ files, onChange, maxFiles = 5 }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return
    const newMedia: MediaFile[] = Array.from(incoming)
      .filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'))
      .map(f => ({
        file: f,
        preview: URL.createObjectURL(f),
        type: f.type.startsWith('video/') ? 'video' : 'image',
      }))
    const merged = [...files, ...newMedia].slice(0, maxFiles)
    onChange(merged)
  }, [files, maxFiles, onChange])

  const remove = (index: number) => {
    URL.revokeObjectURL(files[index].preview)
    onChange(files.filter((_, i) => i !== index))
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-neutral-700">
        Photos & Videos{' '}
        <span className="text-neutral-400 font-normal">({files.length}/{maxFiles})</span>
      </label>

      <div className="flex flex-wrap gap-3">
        {/* Previews */}
        {files.map((media, i) => (
          <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-neutral-200 flex-shrink-0 bg-neutral-100">
            {media.type === 'video' ? (
              <>
                <video src={media.preview} className="w-full h-full object-cover" muted />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play size={18} className="text-white fill-white" />
                </div>
              </>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={media.preview} alt="" className="w-full h-full object-cover" />
            )}

            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X size={10} className="text-white" />
            </button>

            {i === 0 && (
              <span className="absolute bottom-1 left-1 text-[9px] font-bold bg-brand-orange text-white px-1.5 py-0.5 rounded-full">
                Cover
              </span>
            )}
          </div>
        ))}

        {/* Drop zone */}
        {files.length < maxFiles && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`w-24 h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all flex-shrink-0
              ${dragging
                ? 'border-brand-orange bg-brand-orange/5'
                : 'border-neutral-300 hover:border-brand-orange hover:bg-neutral-50'
              }`}
          >
            <ImagePlus size={20} className="text-neutral-400" />
            <span className="text-[11px] text-neutral-400 font-medium text-center leading-tight px-1">
              Add photo or video
            </span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={e => addFiles(e.target.files)}
      />

      <p className="text-xs text-neutral-500">
        First file is the cover image. Up to {maxFiles} photos or videos.
      </p>
    </div>
  )
}
