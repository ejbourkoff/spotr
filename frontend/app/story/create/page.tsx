'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

const COLORS = ['#FFFFFF', '#000000', '#00E87A', '#FFD700', '#FF3B30', '#007AFF', '#FF2D92', '#FF9F0A', '#5E5CE6']

interface TextItem {
  id: string
  text: string
  x: number  // % of container
  y: number
  color: string
  size: number  // px
}

export default function CreateStoryPage() {
  const router = useRouter()
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Text items on the canvas
  const [items, setItems] = useState<TextItem[]>([])

  // Edit overlay state
  const [editing, setEditing] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editColor, setEditColor] = useState('#FFFFFF')
  const [editSize, setEditSize] = useState(36)

  // Drag state
  const containerRef = useRef<HTMLDivElement>(null)
  const dragId = useRef<string | null>(null)
  const dragOrigin = useRef<{ tx: number; ty: number; ex: number; ey: number } | null>(null)
  const didDrag = useRef(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : ''

  useEffect(() => {
    if (editing) setTimeout(() => textareaRef.current?.focus(), 80)
  }, [editing])

  const openNew = () => {
    setEditId(null); setEditText(''); setEditColor('#FFFFFF'); setEditSize(36); setEditing(true)
  }

  const openEdit = (item: TextItem) => {
    setEditId(item.id); setEditText(item.text); setEditColor(item.color); setEditSize(item.size); setEditing(true)
  }

  const commitEdit = () => {
    const trimmed = editText.trim()
    if (editId) {
      if (!trimmed) {
        setItems(p => p.filter(i => i.id !== editId))
      } else {
        setItems(p => p.map(i => i.id === editId ? { ...i, text: trimmed, color: editColor, size: editSize } : i))
      }
    } else if (trimmed) {
      setItems(p => [...p, { id: Date.now().toString(), text: trimmed, x: 50, y: 45, color: editColor, size: editSize }])
    }
    setEditing(false)
  }

  const deleteItem = (id: string) => setItems(p => p.filter(i => i.id !== id))

  // ── Touch drag ────────────────────────────────────────────────────────────────
  const onItemTouchStart = useCallback((e: React.TouchEvent, id: string) => {
    e.stopPropagation()
    const item = items.find(i => i.id === id)
    if (!item) return
    didDrag.current = false
    dragId.current = id
    dragOrigin.current = { tx: e.touches[0].clientX, ty: e.touches[0].clientY, ex: item.x, ey: item.y }
  }, [items])

  const onCanvasTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragId.current || !dragOrigin.current || !containerRef.current) return
    const { width, height } = containerRef.current.getBoundingClientRect()
    const dx = ((e.touches[0].clientX - dragOrigin.current.tx) / width) * 100
    const dy = ((e.touches[0].clientY - dragOrigin.current.ty) / height) * 100
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) didDrag.current = true
    const nx = Math.max(5, Math.min(95, dragOrigin.current.ex + dx))
    const ny = Math.max(5, Math.min(95, dragOrigin.current.ey + dy))
    setItems(p => p.map(i => i.id === dragId.current ? { ...i, x: nx, y: ny } : i))
  }, [])

  const onCanvasTouchEnd = useCallback((e: React.TouchEvent) => {
    const id = dragId.current
    dragId.current = null
    dragOrigin.current = null
    if (id && !didDrag.current) {
      const item = items.find(i => i.id === id)
      if (item) openEdit(item)
    }
  }, [items])

  // ── File upload ───────────────────────────────────────────────────────────────
  const handleFile = async (file: File) => {
    setLocalPreview(URL.createObjectURL(file))
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
      })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      if (!data.url) throw new Error('No URL returned')
      setImageUrl(data.url)
    } catch { setLocalPreview(null); alert('Photo upload failed. Check your connection and try again.') }
    finally { setUploading(false) }
  }

  const handlePost = async () => {
    if (submitting) return
    setSubmitting(true)
    const combined = items.map(i => i.text).join(' ')
    try {
      await fetch(`${API_BASE}/posts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: combined, mediaUrl: imageUrl, mediaType: imageUrl ? 'photo' : undefined, isStory: true }),
      })
      router.push('/feed')
    } catch { setSubmitting(false) }
  }

  const bg = localPreview || imageUrl

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black overflow-hidden touch-none"
      onTouchMove={onCanvasTouchMove}
      onTouchEnd={onCanvasTouchEnd}
    >
      {/* Background */}
      {bg
        ? <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
        : <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-950 pointer-events-none" />
      }

      {/* Light scrim so text stays readable */}
      {bg && <div className="absolute inset-0 bg-black/10 pointer-events-none" />}

      {/* Text overlays */}
      {items.map(item => (
        <div
          key={item.id}
          onTouchStart={e => onItemTouchStart(e, item.id)}
          style={{
            position: 'absolute',
            left: `${item.x}%`,
            top: `${item.y}%`,
            transform: 'translate(-50%, -50%)',
            color: item.color,
            fontSize: item.size,
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.01em',
            textAlign: 'center',
            whiteSpace: 'pre-wrap',
            maxWidth: '85%',
            textShadow: '0 1px 6px rgba(0,0,0,0.85)',
            WebkitTextStroke: item.color === '#FFFFFF' ? '0px' : '0.5px rgba(0,0,0,0.3)',
            cursor: 'grab',
            userSelect: 'none',
            zIndex: 10,
          }}
        >
          {item.text}
        </div>
      ))}

      {/* ── Top bar ── */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-12 pb-2">
        <button
          onTouchEnd={e => { e.stopPropagation(); router.back() }}
          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
        >
          <svg width="18" height="18" fill="none" stroke="white" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <button
          onTouchEnd={e => { e.stopPropagation(); openNew() }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 active:scale-90 transition-transform"
        >
          <span className="text-white font-black text-base leading-none" style={{ fontFamily: 'Georgia, serif' }}>Aa</span>
        </button>
      </div>

      {/* ── Empty state (no photo) ── */}
      {!bg && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 pointer-events-none">
          <div className="flex flex-col items-center gap-3 pointer-events-auto" onTouchEnd={() => fileRef.current?.click()}>
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/25 flex items-center justify-center">
              <svg width="30" height="30" fill="none" stroke="white" strokeWidth={1.5} viewBox="0 0 24 24" className="opacity-40">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-white/40 text-sm">Tap to add a photo</p>
          </div>
        </div>
      )}

      {/* ── Bottom bar ── */}
      {!editing && (
        <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-10 pt-2">
          {!bg ? (
            <button
              onTouchEnd={() => fileRef.current?.click()}
              className="w-full py-4 rounded-2xl bg-[#00E87A] text-black font-black text-[15px] uppercase tracking-wide active:scale-[0.98] transition-transform"
            >
              Choose Photo
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onTouchEnd={() => fileRef.current?.click()}
                className="w-12 h-12 rounded-2xl bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center active:scale-90 transition-transform"
              >
                <svg width="20" height="20" fill="none" stroke="white" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button
                onTouchEnd={e => { e.stopPropagation(); handlePost() }}
                disabled={submitting || uploading || !imageUrl}
                className="flex-1 py-4 rounded-2xl bg-[#00E87A] text-black font-black text-[15px] uppercase tracking-wide disabled:opacity-40 active:scale-[0.98] transition-all"
              >
                {submitting ? 'Posting…' : 'Add to Story'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Text edit overlay ── */}
      {editing && (
        <div className="absolute inset-0 z-30 flex flex-col" onClick={e => e.stopPropagation()}>
          {/* Blurred dark bg */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

          {/* Top: size + colors */}
          <div className="relative z-10 pt-12 px-4 flex items-center gap-3">
            {/* Size controls */}
            <div className="flex items-center gap-1 bg-black/40 rounded-xl px-2 py-1.5">
              <button
                onTouchEnd={() => setEditSize(s => Math.max(16, s - 4))}
                className="w-8 h-8 rounded-lg bg-white/10 text-white text-lg font-bold flex items-center justify-center"
              >−</button>
              <span className="text-white text-xs font-bold w-6 text-center">{editSize}</span>
              <button
                onTouchEnd={() => setEditSize(s => Math.min(80, s + 4))}
                className="w-8 h-8 rounded-lg bg-white/10 text-white text-lg font-bold flex items-center justify-center"
              >+</button>
            </div>
            {/* Colors */}
            <div className="flex-1 flex gap-2 overflow-x-auto scrollbar-hide py-1">
              {COLORS.map(c => (
                <button
                  key={c}
                  onTouchEnd={() => setEditColor(c)}
                  className="flex-shrink-0 rounded-full transition-all duration-150"
                  style={{
                    width: editColor === c ? 30 : 26,
                    height: editColor === c ? 30 : 26,
                    background: c,
                    border: `2px solid ${editColor === c ? 'white' : 'rgba(255,255,255,0.25)'}`,
                    boxShadow: editColor === c ? '0 0 0 2px rgba(255,255,255,0.5)' : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Center: text input */}
          <div className="relative z-10 flex-1 flex items-center justify-center px-6">
            <textarea
              ref={textareaRef}
              value={editText}
              onChange={e => setEditText(e.target.value)}
              placeholder="Type something…"
              rows={3}
              className="w-full bg-transparent text-center placeholder-white/30 outline-none resize-none"
              style={{
                color: editColor,
                fontSize: editSize,
                fontWeight: 800,
                lineHeight: 1.2,
                textShadow: '0 1px 6px rgba(0,0,0,0.9)',
                caretColor: editColor,
              }}
            />
          </div>

          {/* Bottom: delete (if editing existing) + done */}
          <div className="relative z-10 px-4 pb-10 flex items-center gap-3">
            {editId && (
              <button
                onTouchEnd={() => { deleteItem(editId); setEditing(false) }}
                className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center"
              >
                <svg width="18" height="18" fill="none" stroke="#ff4444" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            <button
              onTouchEnd={commitEdit}
              className="flex-1 py-4 rounded-2xl bg-[#00E87A] text-black font-black text-[15px] uppercase tracking-wide"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Upload spinner */}
      {uploading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-8 h-8 border-2 border-[#00E87A] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
    </div>
  )
}
