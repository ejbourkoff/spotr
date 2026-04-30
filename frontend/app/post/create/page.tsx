'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

type Mode = 'post' | 'reel'

type UploadState = 'idle' | 'uploading' | 'processing' | 'ready' | 'error'

export default function CreatePostPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('post')
  const [text, setText] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [muxUploadId, setMuxUploadId] = useState<string | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const imageRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : ''
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const handleImagePick = async (file: File) => {
    setUploadState('uploading')
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
      setUploadState('ready')
    } catch {
      setUploadState('error')
    }
  }

  const handleVideoPick = async (file: File) => {
    setVideoPreview(URL.createObjectURL(file))
    setUploadState('uploading')
    setUploadProgress(0)
    try {
      // 1. Get a Mux direct upload URL
      const urlRes = await fetch(`${API_BASE}/mux/upload-url`, { method: 'POST', headers })
      const { uploadUrl, uploadId } = await urlRes.json()

      // 2. Upload directly to Mux with XHR for progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => (xhr.status < 400 ? resolve() : reject())
        xhr.onerror = reject
        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.send(file)
      })

      setMuxUploadId(uploadId)
      setUploadState('processing')
    } catch {
      setUploadState('error')
    }
  }

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const body: Record<string, any> = { text, isReel: mode === 'reel' }
      if (mode === 'reel') {
        body.muxUploadId = muxUploadId
      } else if (imageUrl) {
        body.mediaUrl = imageUrl
        body.mediaType = 'photo'
      }

      await fetch(`${API_BASE}/posts`, { method: 'POST', headers, body: JSON.stringify(body) })
      router.push(mode === 'reel' ? '/reels' : '/feed')
    } catch {
      setSubmitting(false)
    }
  }

  const canPost = mode === 'reel'
    ? (uploadState === 'processing' || uploadState === 'ready') && !!muxUploadId
    : text.trim().length > 0 || !!imageUrl

  return (
    <main className="min-h-screen bg-spotr-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-14 pb-4 border-b border-white/[0.06]">
        <button onClick={() => router.back()} className="text-spotr-white/50 p-1">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="font-display font-black italic text-lg uppercase text-spotr-white">
          <span className="text-brand">New</span> {mode === 'reel' ? 'Reel' : 'Post'}
        </div>
        <button
          onClick={handleSubmit}
          disabled={!canPost || submitting}
          className="font-display font-black italic uppercase text-[15px] text-brand disabled:opacity-30 transition-opacity"
        >
          {submitting ? '...' : 'Post'}
        </button>
      </div>

      {/* Mode toggle */}
      <div className="flex mx-4 mt-4 bg-white/[0.05] rounded-xl p-1">
        {(['post', 'reel'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setImageUrl(null); setMuxUploadId(null); setVideoPreview(null); setUploadState('idle') }}
            className={`flex-1 py-2 rounded-lg font-display font-black italic uppercase text-[13px] transition-all ${
              mode === m ? 'bg-brand text-spotr-black' : 'text-spotr-white/40'
            }`}
          >
            {m === 'post' ? '📸 Post' : '🎬 Reel'}
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 pt-5 flex flex-col gap-4">
        {/* Text input */}
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={mode === 'reel' ? 'Add a caption...' : "What's on your mind?"}
          rows={mode === 'reel' ? 2 : 4}
          className="w-full bg-white/[0.04] border border-white/[0.07] rounded-2xl px-4 py-3 text-spotr-white placeholder:text-spotr-white/25 font-sans text-[15px] outline-none focus:border-brand/30 transition-colors resize-none"
        />

        {/* Post: image upload */}
        {mode === 'post' && (
          <div>
            <input ref={imageRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImagePick(f) }} />
            {imageUrl ? (
              <div className="relative rounded-2xl overflow-hidden">
                <img src={imageUrl} alt="" className="w-full max-h-80 object-cover" />
                <button
                  onClick={() => setImageUrl(null)}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
                    <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={() => imageRef.current?.click()}
                className="w-full h-28 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 text-spotr-white/30 active:border-brand/40 transition-colors"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-mono text-[9px] font-bold tracking-widest uppercase">Add Photo</span>
              </button>
            )}
          </div>
        )}

        {/* Reel: video upload */}
        {mode === 'reel' && (
          <div>
            <input ref={videoRef} type="file" accept="video/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleVideoPick(f) }} />

            {uploadState === 'idle' && (
              <button
                onClick={() => videoRef.current?.click()}
                className="w-full h-48 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3 text-spotr-white/30 active:border-brand/40 transition-colors"
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="font-mono text-[9px] font-bold tracking-widest uppercase">Select Video</span>
              </button>
            )}

            {uploadState === 'uploading' && (
              <div className="w-full h-48 bg-white/[0.04] rounded-2xl flex flex-col items-center justify-center gap-3">
                {videoPreview && <video src={videoPreview} className="h-24 rounded-xl object-cover" muted />}
                <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
                <span className="font-mono text-[9px] font-bold tracking-widest uppercase text-spotr-white/40">
                  Uploading {uploadProgress}%
                </span>
              </div>
            )}

            {(uploadState === 'processing' || uploadState === 'ready') && videoPreview && (
              <div className="relative rounded-2xl overflow-hidden bg-black">
                <video src={videoPreview} className="w-full max-h-64 object-cover" controls muted />
                <div className="absolute top-2 left-2 bg-brand/90 text-spotr-black font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded-full">
                  {uploadState === 'processing' ? 'Processing...' : 'Ready'}
                </div>
                <button
                  onClick={() => { setUploadState('idle'); setMuxUploadId(null); setVideoPreview(null) }}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
                    <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {uploadState === 'error' && (
              <div className="w-full h-24 bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col items-center justify-center gap-2">
                <span className="text-red-400 font-mono text-[10px] font-bold tracking-widest uppercase">Upload failed</span>
                <button onClick={() => setUploadState('idle')} className="text-red-400/70 font-mono text-[9px] tracking-widest uppercase underline">Try again</button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
