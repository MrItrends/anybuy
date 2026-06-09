'use client'

import { Camera, Download, Loader2, MoveIcon, RotateCcw, Upload, X, ZoomIn, ZoomOut } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

// ── Types ────────────────────────────────────────────────────────────────────

type TryonArea = 'full_body' | 'upper_body' | 'lower_body' | 'feet' | 'head'
type Mode = 'prompt' | 'cam_loading' | 'cam_live' | 'result'
interface PixelRect { x: number; y: number; w: number; h: number }
interface OverlayState { x: number; y: number; w: number; opacity: number }

// ── Area detection ────────────────────────────────────────────────────────────

function detectArea(category: string, subcategory?: string | null): TryonArea {
  const s = (subcategory ?? '').toLowerCase()
  const c = (category ?? '').toLowerCase()
  if (/shoe|sneaker|boot|sandal|heel|loafer|slipper|footwear|trainer/.test(s)) return 'feet'
  if (/hat|cap|beanie|glasses|sunglass|spectacle|headwear|jewel|necklace|earring|watch|scarf/.test(s)) return 'head'
  if (/dress|jumpsuit|overalls?|romper|suit|gown|tracksuit/.test(s)) return 'full_body'
  if (/pant|trouser|short|skirt|jean|legging|chino|cargo|jogger/.test(s)) return 'lower_body'
  if (/accessor|jewel/.test(c)) return 'head'
  if (/shoe|footwear/.test(c)) return 'feet'
  return 'upper_body'
}

const AREA_META: Record<TryonArea, { label: string; emoji: string; instruction: string; tip: string }> = {
  full_body:  { label: 'Full Body',    emoji: '🧍', instruction: 'Stand 1–2 m back so your full body is visible', tip: 'Plain background works best' },
  upper_body: { label: 'Upper Body',   emoji: '👕', instruction: 'Show shoulders down to your hips',              tip: 'Arms slightly away from your sides' },
  lower_body: { label: 'Lower Body',   emoji: '👖', instruction: 'Show waist down to your feet',                  tip: 'Stand straight, feet shoulder-width apart' },
  feet:       { label: 'Feet & Shoes', emoji: '👟', instruction: 'Point the camera at your feet',                 tip: 'Bare feet or socks work best' },
  head:       { label: 'Head & Face',  emoji: '🧢', instruction: 'Frame your head and upper shoulders',           tip: 'Face straight on to the camera' },
}

// ── MoveNet pose → clothing rect ─────────────────────────────────────────────
// MoveNet keypoints (pixel coords, original/unmirrored space):
// 0=nose 1=L_eye 2=R_eye 3=L_ear 4=R_ear
// 5=L_shoulder 6=R_shoulder 7=L_elbow 8=R_elbow 9=L_wrist 10=R_wrist
// 11=L_hip 12=R_hip 13=L_knee 14=R_knee 15=L_ankle 16=R_ankle

function poseToRect(
  kps: Array<{ x: number; y: number; score?: number }>,
  area: TryonArea,
  cw: number,
  productAspect: number,
): PixelRect | null {
  const MIN = 0.3

  // Mirror X so the rect is in the same space as the mirrored canvas
  function k(i: number): { x: number; y: number } | null {
    const p = kps[i]
    if (!p || (p.score ?? 1) < MIN) return null
    return { x: cw - p.x, y: p.y }
  }
  const mid = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(b.x - a.x, b.y - a.y)

  switch (area) {
    case 'upper_body': {
      const ls = k(5), rs = k(6)
      if (!ls || !rs) return null
      const c = mid(ls, rs)
      const w = dist(ls, rs) * 1.75
      const h = w / productAspect
      return { x: c.x - w / 2, y: c.y - h * 0.1, w, h }
    }
    case 'full_body': {
      const ls = k(5), rs = k(6)
      if (!ls || !rs) return null
      const c = mid(ls, rs)
      const w = dist(ls, rs) * 1.8
      const la = k(15), ra = k(16)
      const h = la && ra ? (Math.max(la.y, ra.y) - c.y) * 1.12 : w / productAspect
      return { x: c.x - w / 2, y: c.y - h * 0.05, w, h }
    }
    case 'lower_body': {
      const lh = k(11), rh = k(12)
      if (!lh || !rh) return null
      const c = mid(lh, rh)
      const w = dist(lh, rh) * 1.75
      const la = k(15), ra = k(16)
      const h = la && ra ? (Math.max(la.y, ra.y) - c.y) * 1.12 : w / productAspect
      return { x: c.x - w / 2, y: c.y - h * 0.06, w, h }
    }
    case 'feet': {
      const la = k(15), ra = k(16)
      const lk = k(13), rk = k(14)
      if (!la && !ra) return null
      const anks = [la, ra].filter(Boolean) as { x: number; y: number }[]
      const cx = anks.reduce((s, p) => s + p.x, 0) / anks.length
      const cy = anks.reduce((s, p) => s + p.y, 0) / anks.length
      const kneeY = lk && rk ? (lk.y + rk.y) / 2 : cy - 120
      const h = (cy - kneeY) * 0.95
      const w = h * productAspect
      return { x: cx - w / 2, y: cy - h * 0.85, w, h }
    }
    case 'head': {
      const nose = k(0)
      const le = k(1), re = k(2)
      if (!nose) return null
      const eyeY = le && re ? (le.y + re.y) / 2 : nose.y - 30
      const eyeSpan = le && re ? dist(le, re) : cw * 0.12
      const w = eyeSpan * 4.2
      const h = w / productAspect
      return { x: nose.x - w / 2, y: eyeY - h * 0.9, w, h }
    }
  }
  return null
}

// ── EMA smoother for jitter-free tracking ─────────────────────────────────────

class EmaRect {
  private r = { x: 0, y: 0, w: 0, h: 0 }
  private init = false
  update(next: PixelRect, α = 0.22) {
    if (!this.init) { this.r = { ...next }; this.init = true; return }
    this.r.x += α * (next.x - this.r.x)
    this.r.y += α * (next.y - this.r.y)
    this.r.w += α * (next.w - this.r.w)
    this.r.h += α * (next.h - this.r.h)
  }
  get(): PixelRect { return { ...this.r } }
  reset() { this.init = false }
  get initialized() { return this.init }
}

// ── Strip white/near-white background from clothing image ─────────────────────

async function stripBg(img: HTMLImageElement): Promise<HTMLImageElement> {
  try {
    const tmp = document.createElement('canvas')
    tmp.width = img.naturalWidth; tmp.height = img.naturalHeight
    const ctx = tmp.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const id = ctx.getImageData(0, 0, tmp.width, tmp.height)
    const px = id.data
    for (let i = 0; i < px.length; i += 4) {
      const mn = Math.min(px[i], px[i + 1], px[i + 2])
      const mx = Math.max(px[i], px[i + 1], px[i + 2])
      const sat = mx === 0 ? 0 : (mx - mn) / mx
      if (mn > 210 && sat < 0.12) {
        px[i + 3] = Math.round((1 - (mn - 210) / 45) * px[i + 3])
      }
    }
    ctx.putImageData(id, 0, 0)
    return await new Promise<HTMLImageElement>(res => {
      const out = new Image()
      out.onload = () => res(out)
      out.onerror = () => res(img)
      out.src = tmp.toDataURL('image/png')
    })
  } catch { return img }
}

// ── Default overlay position per area ─────────────────────────────────────────

const AREA_DEFAULTS: Record<TryonArea, { xFrac: number; yFrac: number; wFrac: number }> = {
  upper_body: { xFrac: 0.12, yFrac: 0.08,  wFrac: 0.75 },
  full_body:  { xFrac: 0.12, yFrac: 0.04,  wFrac: 0.75 },
  lower_body: { xFrac: 0.12, yFrac: 0.38,  wFrac: 0.75 },
  feet:       { xFrac: 0.10, yFrac: 0.55,  wFrac: 0.80 },
  head:       { xFrac: 0.25, yFrac: 0.02,  wFrac: 0.50 },
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  productTitle: string
  tryonImageUrl: string
  category: string
  subcategory?: string | null
  onClose: () => void
}

export function VirtualTryOn({ productTitle, tryonImageUrl, category, subcategory, onClose }: Props) {
  const area = detectArea(category, subcategory)
  const meta = AREA_META[area]
  const def  = AREA_DEFAULTS[area]

  // Refs
  const previewRef   = useRef<HTMLCanvasElement>(null)  // live cam canvas
  const resultRef    = useRef<HTMLCanvasElement>(null)  // result canvas
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef     = useRef<HTMLVideoElement>(null)   // hidden video source
  const streamRef    = useRef<MediaStream | null>(null)
  const detectorRef  = useRef<any>(null)
  const rafRef       = useRef<number>(0)
  const emaRef       = useRef(new EmaRect())
  const detectingRef = useRef(false)
  const posesRef     = useRef<any[]>([])

  // State
  const [mode, setMode]             = useState<Mode>('prompt')
  const [productImg, setProductImg] = useState<HTMLImageElement | null>(null)
  const [basePhoto, setBasePhoto]   = useState<HTMLImageElement | null>(null)
  const [overlay, setOverlay]       = useState<OverlayState>({ x: 0, y: 0, w: 0, opacity: 1 })
  const [poseOk, setPoseOk]         = useState(false)
  const [error, setError]           = useState('')
  const [saved, setSaved]           = useState(false)
  const [dragging, setDragging]     = useState(false)
  const [dragStart, setDragStart]   = useState({ mx: 0, my: 0, ox: 0, oy: 0 })

  // Load & strip clothing image
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload  = () => stripBg(img).then(setProductImg)
    img.onerror = () => setProductImg(img)
    img.src = tryonImageUrl
  }, [tryonImageUrl])

  // Re-render result canvas whenever overlay or basePhoto changes
  useEffect(() => {
    if (mode !== 'result' || !basePhoto || !resultRef.current) return
    const canvas = resultRef.current
    const ctx = canvas.getContext('2d')!
    canvas.width  = basePhoto.naturalWidth
    canvas.height = basePhoto.naturalHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(basePhoto, 0, 0)
    if (productImg && overlay.w > 0) {
      const aspect = productImg.naturalWidth / productImg.naturalHeight
      const h = overlay.w / aspect
      ctx.globalAlpha = overlay.opacity
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(productImg, overlay.x, overlay.y, overlay.w, h)
      ctx.globalAlpha = 1
    }
  }, [mode, basePhoto, productImg, overlay])

  // ── Camera start ──────────────────────────────────────────────────────────────

  async function startCamera() {
    setMode('cam_loading')
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream

      // Dynamically load TF.js pose detection (optional — falls back gracefully)
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const [, pdMod] = await Promise.all([
          import('@tensorflow/tfjs-core').then(async m => {
            await import('@tensorflow/tfjs-backend-webgl')
            await m.ready()
            return m
          }),
          import('@tensorflow-models/pose-detection'),
        ])
        detectorRef.current = await pdMod.createDetector(
          pdMod.SupportedModels.MoveNet,
          { modelType: (pdMod as any).movenet.modelType.SINGLEPOSE_LIGHTNING },
        )
      } catch {
        // pose detection unavailable — live overlay still works without tracking
      }

      setMode('cam_live')
    } catch {
      setMode('prompt')
      setError('Camera access denied. Please allow camera access and try again.')
    }
  }

  // Bind video stream when cam_live mounts the hidden video element
  useEffect(() => {
    if (mode !== 'cam_live') return
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [mode])

  // ── RAF drawing loop ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (mode !== 'cam_live') { cancelAnimationFrame(rafRef.current); return }
    const aspect = productImg ? productImg.naturalWidth / productImg.naturalHeight : 1

    function draw() {
      const canvas = previewRef.current
      const video  = videoRef.current
      if (!canvas || !video || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(draw); return
      }
      const cw = video.videoWidth  || 640
      const ch = video.videoHeight || 480
      canvas.width = cw; canvas.height = ch
      const ctx = canvas.getContext('2d')!

      // Draw mirrored video
      ctx.save()
      ctx.translate(cw, 0); ctx.scale(-1, 1)
      ctx.drawImage(video, 0, 0)
      ctx.restore()

      // Compute rect from latest pose
      const rect = posesRef.current.length > 0
        ? poseToRect(posesRef.current[0].keypoints, area, cw, aspect)
        : null

      if (rect && productImg) {
        emaRef.current.update(rect)
        const s = emaRef.current.get()
        setPoseOk(true)
        ctx.globalAlpha = 0.92
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(productImg, s.x, s.y, s.w, s.h)
        ctx.globalAlpha = 1
      } else {
        // Keep ghost of last known position while re-detecting
        if (emaRef.current.initialized) {
          const s = emaRef.current.get()
          ctx.globalAlpha = 0.35
          if (productImg) ctx.drawImage(productImg, s.x, s.y, s.w, s.h)
          ctx.globalAlpha = 1
        }
        setPoseOk(false)
      }

      // Async pose detection — runs as fast as model allows, doesn't block rendering
      if (!detectingRef.current && detectorRef.current && video.readyState >= 2) {
        detectingRef.current = true
        detectorRef.current
          .estimatePoses(video, { flipHorizontal: false })
          .then((p: any[]) => { posesRef.current = p; detectingRef.current = false })
          .catch(() => { detectingRef.current = false })
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [mode, productImg, area])

  // ── Capture ───────────────────────────────────────────────────────────────────

  function capturePhoto() {
    const video = videoRef.current
    if (!video) return

    // Save mirrored raw frame (no clothing) as basePhoto
    const raw = document.createElement('canvas')
    raw.width  = video.videoWidth
    raw.height = video.videoHeight
    const ctx = raw.getContext('2d')!
    ctx.save(); ctx.translate(raw.width, 0); ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0); ctx.restore()

    const img = new Image()
    img.onload = () => {
      setBasePhoto(img)
      // Init overlay from last EMA rect if available, else use defaults
      if (emaRef.current.initialized) {
        const r = emaRef.current.get()
        setOverlay({ x: r.x, y: r.y, w: r.w, opacity: 1 })
      } else {
        setOverlay({
          x: img.naturalWidth  * def.xFrac,
          y: img.naturalHeight * def.yFrac,
          w: img.naturalWidth  * def.wFrac,
          opacity: 1,
        })
      }
      setMode('result')
    }
    img.src = raw.toDataURL('image/jpeg', 0.95)
    stopCamera()
  }

  function stopCamera() {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    posesRef.current = []
    emaRef.current.reset()
    setPoseOk(false)
    if (mode !== 'result') setMode('prompt')
  }

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── File upload ────────────────────────────────────────────────────────────────

  function handleFileUpload(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        setBasePhoto(img)
        setOverlay({
          x: img.naturalWidth  * def.xFrac,
          y: img.naturalHeight * def.yFrac,
          w: img.naturalWidth  * def.wFrac,
          opacity: 1,
        })
        setMode('result')
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  // ── Result canvas drag (mouse + touch) ────────────────────────────────────────

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = resultRef.current!
    const r = c.getBoundingClientRect()
    setDragging(true)
    setDragStart({
      mx: (e.clientX - r.left) * (c.width / r.width),
      my: (e.clientY - r.top)  * (c.height / r.height),
      ox: overlay.x, oy: overlay.y,
    })
  }, [overlay])

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging || !resultRef.current) return
    const c = resultRef.current
    const r = c.getBoundingClientRect()
    const mx = (e.clientX - r.left) * (c.width / r.width)
    const my = (e.clientY - r.top)  * (c.height / r.height)
    setOverlay(p => ({ ...p, x: dragStart.ox + mx - dragStart.mx, y: dragStart.oy + my - dragStart.my }))
  }, [dragging, dragStart])

  const onMouseUp = useCallback(() => setDragging(false), [])

  const onTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const c = resultRef.current!
    const r = c.getBoundingClientRect()
    const t = e.touches[0]
    setDragging(true)
    setDragStart({
      mx: (t.clientX - r.left) * (c.width / r.width),
      my: (t.clientY - r.top)  * (c.height / r.height),
      ox: overlay.x, oy: overlay.y,
    })
  }, [overlay])

  const onTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!dragging || !resultRef.current) return
    const c = resultRef.current
    const r = c.getBoundingClientRect()
    const t = e.touches[0]
    const mx = (t.clientX - r.left) * (c.width / r.width)
    const my = (t.clientY - r.top)  * (c.height / r.height)
    setOverlay(p => ({ ...p, x: dragStart.ox + mx - dragStart.mx, y: dragStart.oy + my - dragStart.my }))
  }, [dragging, dragStart])

  function resetOverlay() {
    if (!basePhoto) return
    setOverlay({
      x: basePhoto.naturalWidth  * def.xFrac,
      y: basePhoto.naturalHeight * def.yFrac,
      w: basePhoto.naturalWidth  * def.wFrac,
      opacity: 1,
    })
  }

  function downloadResult() {
    const canvas = resultRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `anybuy-tryon-${Date.now()}.jpg`
    link.href = canvas.toDataURL('image/jpeg', 0.92)
    link.click()
    setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const widthPct = basePhoto ? Math.round((overlay.w / basePhoto.naturalWidth) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <h2 className="font-satoshi font-bold text-neutral-900">Virtual Try-On</h2>
              <p className="text-xs text-neutral-500 mt-0.5 truncate max-w-[200px]">{productTitle}</p>
            </div>
            <span className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-brand-orange bg-brand-orange/10 px-2.5 py-1 rounded-full flex-shrink-0">
              {meta.emoji} {meta.label}
            </span>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-colors flex-shrink-0">
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">

          {/* ── Main area ── */}
          <div className="flex-1 bg-neutral-900 flex items-center justify-center min-h-0 relative overflow-hidden">

            {/* PROMPT */}
            {mode === 'prompt' && (
              <div className="flex flex-col items-center gap-4 p-6 max-w-sm w-full text-center">
                {/* Animated silhouette guide */}
                <div className="w-full aspect-[3/4] bg-neutral-800 rounded-2xl overflow-hidden relative flex-shrink-0">
                  <AreaSilhouette area={area} />
                  <div className="absolute top-3 inset-x-0 flex justify-center">
                    <span className="text-xs font-bold text-white bg-brand-orange/80 px-3 py-1 rounded-full">
                      {meta.emoji} {meta.label.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-left w-full">
                  <p className="text-xs font-semibold text-amber-800 mb-1">📸 For best results</p>
                  <p className="text-xs text-amber-700 leading-relaxed">{meta.instruction}</p>
                  <p className="text-xs text-amber-600 mt-1">💡 {meta.tip}</p>
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}

                <div className="flex gap-3 w-full">
                  <button onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 h-11 bg-brand-dark text-white rounded-xl text-sm font-semibold hover:bg-[#1a4445] transition-colors">
                    <Upload size={15} /> Upload photo
                  </button>
                  <button onClick={startCamera}
                    className="flex-1 flex items-center justify-center gap-2 h-11 border-2 border-brand-orange text-brand-orange rounded-xl text-sm font-semibold hover:bg-brand-orange/5 transition-colors">
                    <Camera size={15} /> Use camera
                  </button>
                </div>

                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }} />
              </div>
            )}

            {/* LOADING */}
            {mode === 'cam_loading' && (
              <div className="flex flex-col items-center gap-4 text-white text-center p-8">
                <Loader2 size={44} className="animate-spin text-brand-orange" />
                <p className="font-semibold text-lg">Activating AI tracking…</p>
                <p className="text-sm text-white/60 max-w-[220px]">
                  Loading the body tracking model — this takes a few seconds the first time
                </p>
              </div>
            )}

            {/* CAMERA LIVE */}
            {mode === 'cam_live' && (
              <div className="relative w-full h-full">
                {/* Hidden video — used as source for pose detection and canvas drawing */}
                <video ref={videoRef} autoPlay playsInline muted
                  className="absolute w-0 h-0 opacity-0 pointer-events-none" />

                {/* Live preview: mirrored video + real-time clothing overlay */}
                <canvas ref={previewRef} className="w-full h-full object-contain" />

                {/* Pose status */}
                <div className="absolute top-3 left-3">
                  <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm transition-all ${
                    poseOk
                      ? 'bg-green-500/85 text-white'
                      : 'bg-black/55 text-white/70'
                  }`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${poseOk ? 'bg-white animate-pulse' : 'bg-white/40'}`} />
                    {poseOk ? `${meta.label} detected` : `Move into frame — ${meta.instruction.toLowerCase()}`}
                  </span>
                </div>

                {/* Area label */}
                <div className="absolute top-3 right-3">
                  <span className="text-xs font-semibold text-white bg-brand-orange/80 backdrop-blur-sm px-2.5 py-1 rounded-full">
                    {meta.emoji} {meta.label}
                  </span>
                </div>

                {/* Cancel + Capture */}
                <div className="absolute bottom-5 inset-x-0 flex justify-center items-center gap-6">
                  <button onClick={stopCamera}
                    className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors">
                    <X size={16} className="text-white" />
                  </button>
                  <button onClick={capturePhoto}
                    className="w-16 h-16 rounded-full bg-white shadow-xl border-4 border-brand-orange flex items-center justify-center hover:scale-105 active:scale-95 transition-transform">
                    <Camera size={24} className="text-brand-dark" />
                  </button>
                  <div className="w-10" />
                </div>
              </div>
            )}

            {/* RESULT */}
            {mode === 'result' && (
              <div className="relative w-full h-full flex items-center justify-center p-4">
                <canvas
                  ref={resultRef}
                  className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl cursor-move select-none"
                  onMouseDown={onMouseDown} onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
                  onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onMouseUp}
                />
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm text-white text-xs px-2.5 py-1.5 rounded-full pointer-events-none">
                  <MoveIcon size={11} /> Drag to fine-tune
                </div>
              </div>
            )}
          </div>

          {/* ── Controls panel (result mode only) ── */}
          {mode === 'result' ? (
            <div className="w-full lg:w-64 border-t lg:border-t-0 lg:border-l border-neutral-100 bg-white p-5 flex flex-col gap-4 flex-shrink-0 overflow-y-auto">

              {/* Re-shoot */}
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Photo</p>
                <div className="flex gap-2">
                  <button onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-600 hover:border-brand-orange hover:text-brand-orange transition-colors">
                    <Upload size={13} /> Upload
                  </button>
                  <button onClick={startCamera}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-600 hover:border-brand-orange hover:text-brand-orange transition-colors">
                    <Camera size={13} /> Retake
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }} />
              </div>

              {/* Size */}
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Item size</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setOverlay(p => ({ ...p, w: Math.max(10, p.w * 0.93) }))}
                    className="w-9 h-9 rounded-xl border border-neutral-200 flex items-center justify-center hover:bg-neutral-100 transition-colors">
                    <ZoomOut size={15} />
                  </button>
                  <div className="flex-1 text-center text-sm font-medium text-neutral-900">{widthPct}%</div>
                  <button onClick={() => setOverlay(p => ({ ...p, w: Math.min(p.w * 1.08, (basePhoto?.naturalWidth ?? 9999) * 1.5) }))}
                    className="w-9 h-9 rounded-xl border border-neutral-200 flex items-center justify-center hover:bg-neutral-100 transition-colors">
                    <ZoomIn size={15} />
                  </button>
                </div>
                <input type="range" min={15} max={130} value={widthPct}
                  onChange={e => setOverlay(p => ({ ...p, w: (Number(e.target.value) / 100) * (basePhoto?.naturalWidth ?? 600) }))}
                  className="w-full mt-2 accent-brand-orange" />
              </div>

              {/* Blend */}
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Blend</p>
                <input type="range" min={30} max={100} value={Math.round(overlay.opacity * 100)}
                  onChange={e => setOverlay(p => ({ ...p, opacity: Number(e.target.value) / 100 }))}
                  className="w-full accent-brand-orange" />
                <div className="flex justify-between text-xs text-neutral-400 mt-1">
                  <span>Ghost</span><span>Solid</span>
                </div>
              </div>

              {/* Reset */}
              <button onClick={resetOverlay}
                className="flex items-center justify-center gap-2 h-9 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-600 hover:border-neutral-400 transition-colors">
                <RotateCcw size={13} /> Reset position
              </button>

              <div className="flex-1" />

              {/* Save */}
              <button onClick={downloadResult}
                className="w-full flex items-center justify-center gap-2 h-11 bg-brand-orange text-white font-semibold rounded-xl text-sm hover:bg-brand-orange/90 transition-colors">
                <Download size={16} />
                {saved ? 'Saved!' : 'Save photo'}
              </button>

              <p className="text-[11px] text-neutral-400 text-center leading-relaxed">
                Your photo stays on your device and is never uploaded.
              </p>
            </div>
          ) : (
            /* Privacy note shown alongside prompt/loading/live views */
            <div className="hidden lg:flex w-56 items-end justify-center pb-6 flex-shrink-0">
              <p className="text-[11px] text-neutral-500 text-center leading-relaxed px-4">
                Your photo stays on your device and is never uploaded.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Area silhouette SVG for the prompt screen ─────────────────────────────────

function AreaSilhouette({ area }: { area: TryonArea }) {
  return (
    <svg viewBox="0 0 100 133" preserveAspectRatio="xMidYMid meet" className="w-full h-full opacity-60">
      {area === 'full_body' && (
        <g stroke="white" strokeWidth="1.5" strokeDasharray="4 2.5" fill="none">
          <ellipse cx="50" cy="12" rx="9" ry="10" />
          <line x1="50" y1="22" x2="50" y2="72" />
          <line x1="50" y1="35" x2="22" y2="55" />
          <line x1="50" y1="35" x2="78" y2="55" />
          <line x1="40" y1="72" x2="34" y2="115" />
          <line x1="60" y1="72" x2="66" y2="115" />
          <rect x="20" y="3" width="60" height="126" rx="4" stroke="#FF6A3D" strokeDasharray="6 3" />
        </g>
      )}
      {area === 'upper_body' && (
        <g stroke="white" strokeWidth="1.5" strokeDasharray="4 2.5" fill="none">
          <ellipse cx="50" cy="16" rx="10" ry="12" />
          <line x1="50" y1="28" x2="50" y2="78" />
          <line x1="50" y1="38" x2="20" y2="58" />
          <line x1="50" y1="38" x2="80" y2="58" />
          <line x1="38" y1="78" x2="30" y2="108" />
          <line x1="62" y1="78" x2="70" y2="108" />
          <rect x="8" y="4" width="84" height="90" rx="4" stroke="#FF6A3D" strokeDasharray="6 3" />
        </g>
      )}
      {area === 'lower_body' && (
        <g stroke="white" strokeWidth="1.5" strokeDasharray="4 2.5" fill="none">
          <line x1="50" y1="8" x2="50" y2="48" />
          <line x1="24" y1="8" x2="76" y2="8" />
          <line x1="38" y1="48" x2="32" y2="122" />
          <line x1="62" y1="48" x2="68" y2="122" />
          <rect x="18" y="40" width="64" height="86" rx="4" stroke="#FF6A3D" strokeDasharray="6 3" />
        </g>
      )}
      {area === 'feet' && (
        <g stroke="white" strokeWidth="1.5" strokeDasharray="4 2.5" fill="none">
          <line x1="32" y1="12" x2="32" y2="70" />
          <line x1="68" y1="12" x2="68" y2="70" />
          <path d="M20,70 Q32,92 50,92 Q68,92 80,70" />
          <ellipse cx="34" cy="100" rx="19" ry="10" />
          <ellipse cx="68" cy="100" rx="19" ry="10" />
          <rect x="8" y="60" width="84" height="62" rx="4" stroke="#FF6A3D" strokeDasharray="6 3" />
        </g>
      )}
      {area === 'head' && (
        <g stroke="white" strokeWidth="1.5" strokeDasharray="4 2.5" fill="none">
          <ellipse cx="50" cy="55" rx="28" ry="36" />
          <line x1="28" y1="91" x2="72" y2="91" />
          <rect x="18" y="8" width="64" height="88" rx="4" stroke="#FF6A3D" strokeDasharray="6 3" />
        </g>
      )}
    </svg>
  )
}
