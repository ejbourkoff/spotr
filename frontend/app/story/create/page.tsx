'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export default function CreateStoryPage() {
  const router = useRouter()
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : ''

  const handleFilePick = async (file: File) => {
    setLocalPreview(URL.createObjectURL(file))
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      const data = await res.json()
      if (data.url) setImageUrl(data.url)
    } catch {
      setLocalPreview(null)
    } finally {
      setUploading(false)
    }
  }

  const handlePost = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      await fetch(`${API_BASE}/posts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          mediaUrl: imageUrl,
          mediaType: imageUrl ? 'photo' : undefined,
          isStory: true,
        }),
      })
      router.push('/feed')
    } catch {
      setSubmitting(false)
    }
  }

  const bgImg = localPreview || imageUrl

  // Focus textarea when typing mode enabled
  useEffect(() => {
    if (isTyping) textRef.current?.focus()
  }, [isTyping])

  return (
    <div className="fixed inset-0 bg-black flex flex-col select-none">
      {/* Full-screen background */}
      {bgImg ? (
        <img src={bgImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-950" />
      )}

      {/* Scrim */}
      {bgImg && <div className="absolute inset-0 bg-black/20 pointer-events-none" />}

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-14 pb-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
        >
          <svg width="18" height="18" fill="none" stroke="white" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          {/* Text toggle */}
          <button
            onClick={() => setIsTyping(!isTyping)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm transition-all ${
              isTyping || text.length > 0
                ? 'bg-white text-black'
                : 'bg-black/50 text-white border border-white/20'
            }`}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Text
          </button>
        </div>
      </div>

      {/* Center: no-photo state */}
      {!bgImg && (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-6">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center gap-4"
          >
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center">
              <svg width="32" height="32" fill="none" stroke="white" strokeWidth={1.5} viewBox="0 0 24 24" className="opacity-60">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-white/50 text-sm font-medium">Tap to add a photo</p>
          </button>

          {/* Text-only option */}
          <button
            onClick={() => setIsTyping(true)}
            className="text-white/30 text-xs font-medium border border-white/10 px-4 py-2 rounded-full"
          >
            or type a message
          </button>
        </div>
      )}

      {/* Text overlay on image */}
      {bgImg && (
        <div className="relative z-10 flex-1 flex items-center justify-center px-8" onClick={() => !isTyping && setIsTyping(true)}>
          {isTyping ? (
            <textarea
              ref={textRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onBlur={() => !text && setIsTyping(false)}
              placeholder="Type something…"
              rows={3}
              className="w-full bg-black/40 backdrop-blur-sm text-white text-xl font-bold text-center placeholder-white/40 outline-none resize-none rounded-2xl px-4 py-3 border border-white/10"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
            />
          ) : text ? (
            <p
              className="text-white text-xl font-bold text-center px-4 py-3 bg-black/40 backdrop-blur-sm rounded-2xl cursor-text"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)', maxWidth: '100%' }}
              onClick={() => setIsTyping(true)}
            >
              {text}
            </p>
          ) : (
            <button
              onClick={() => setIsTyping(true)}
              className="text-white/30 text-sm font-medium px-4 py-2 border border-white/10 rounded-full backdrop-blur-sm"
            >
              Tap to add text
            </button>
          )}
        </div>
      )}

      {/* Uploading indicator */}
      {uploading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
          <div className="w-8 h-8 border-2 border-[#00E87A] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Bottom bar */}
      <div className="relative z-10 px-4 pb-10 pt-4">
        {!bgImg ? (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full py-4 rounded-2xl bg-[#00E87A] text-black font-black text-[15px] uppercase tracking-wide"
          >
            Choose Photo
          </button>
        ) : (
          <button
            onClick={handlePost}
            disabled={submitting || uploading || !imageUrl}
            className="w-full py-4 rounded-2xl bg-[#00E87A] text-black font-black text-[15px] uppercase tracking-wide disabled:opacity-40 transition-opacity"
          >
            {submitting ? 'Posting…' : 'Add to Story'}
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFilePick(f) }}
      />
    </div>
  )
}
