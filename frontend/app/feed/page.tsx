'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { postApi, likeApi, commentApi, saveApi, messageApi, Post, Comment } from '@/lib/api'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

// ── Sport accent colors ────────────────────────────────────────────────────────
const SPORT_DOT: Record<string, string> = {
  Football:   '#f97316',
  Basketball: '#3b82f6',
  Soccer:     '#84cc16',
  Baseball:   '#3b82f6',
  Volleyball: '#a78bfa',
  Swimming:   '#06b6d4',
  Track:      '#f59e0b',
}
const SPORT_PILL: Record<string, string> = {
  Football:   'text-orange-400 bg-orange-500/10',
  Basketball: 'text-[#00E87A] bg-blue-500/10',
  Soccer:     'text-lime-400 bg-lime-500/10',
  Baseball:   'text-[#00E87A] bg-blue-500/10',
  Volleyball: 'text-violet-400 bg-violet-500/10',
  Swimming:   'text-cyan-400 bg-cyan-500/10',
  Track:      'text-amber-400 bg-amber-500/10',
}
function sportDot(sport: string) { return SPORT_DOT[sport] || '#6b7280' }
function sportPill(sport: string) { return SPORT_PILL[sport] || 'text-gray-400 bg-gray-700/40' }

// ── Helpers ───────────────────────────────────────────────────────────────────
const AVATAR_GRADIENTS = [
  'from-blue-500 to-purple-600',
  'from-emerald-500 to-cyan-600',
  'from-orange-500 to-red-600',
  'from-pink-500 to-rose-600',
  'from-violet-500 to-indigo-600',
  'from-amber-500 to-orange-600',
]
function avatarGradient(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length]
}
function authorName(post: Post) {
  return post.author?.athleteProfile?.name || post.author?.coachProfile?.name || post.author?.brandProfile?.name || 'Unknown'
}
function authorSport(post: Post) { return post.author?.athleteProfile?.sport || '' }
function authorSchool(post: Post) { return post.author?.athleteProfile?.schoolTeam || '' }
function authorInitials(post: Post) {
  const n = authorName(post).split(' ').filter(Boolean)
  return n.length >= 2 ? n[0][0] + n[1][0] : authorName(post).slice(0, 2).toUpperCase()
}
function timeAgo(date: string) {
  const d = Date.now() - new Date(date).getTime()
  const m = Math.floor(d / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const HeartIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
)
const CommentIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
)
const BookmarkIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
  </svg>
)
const SendIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
)
const CameraIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)
const VideoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
)

// ── Stories row ───────────────────────────────────────────────────────────────
function StoriesRow({ stories }: { stories: Post[] }) {
  const seen = new Set<string>()
  const authors = stories.filter((p) => {
    const name = authorName(p)
    if (seen.has(name)) return false
    seen.add(name)
    return true
  }).slice(0, 7)

  return (
    <div className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide border-b border-gray-800/60">
      {/* Your Story button */}
      <Link href="/post/create" className="flex flex-col items-center gap-1.5 flex-shrink-0">
        <div className="w-[58px] h-[58px] rounded-full bg-gray-900 border-2 border-dashed border-gray-700 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00E87A" strokeWidth={2}>
            <path strokeLinecap="round" d="M12 5v14M5 12h14" />
          </svg>
        </div>
        <span className="text-[10px] text-gray-500 max-w-[54px] text-center truncate">Your Story</span>
      </Link>
      {authors.map((post) => {
        const name = authorName(post)
        const inits = authorInitials(post)
        const firstName = name.split(' ')[0]
        return (
          <div key={post.id} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className="w-[58px] h-[58px] rounded-full p-[2px]" style={{ background: 'linear-gradient(135deg, #00E87A, #009950)' }}>
              <div className={`w-full h-full rounded-full bg-gradient-to-br ${avatarGradient(name)} flex items-center justify-center text-white text-base font-bold border-2 border-gray-950`}>
                {inits}
              </div>
            </div>
            <span className="text-[10px] text-gray-400 max-w-[54px] text-center truncate">{firstName}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Composer ──────────────────────────────────────────────────────────────────
function Composer({ onPost }: { onPost: (post: Post) => void }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)

  const pickFile = (f: File) => {
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setOpen(true)
  }
  const clearFile = () => {
    setFile(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() && !file) return
    setSubmitting(true)
    try {
      let mediaUrl: string | undefined
      let mediaType: string | undefined
      let isReel = false
      if (file) {
        setUploading(true)
        const token = localStorage.getItem('token')
        const form = new FormData()
        form.append('file', file)
        const res = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        })
        const data = await res.json()
        mediaUrl = data.url
        mediaType = data.mediaType
        isReel = data.mediaType === 'video'
        setUploading(false)
      }
      const response = await postApi.createPost(text.trim() || '', mediaUrl, mediaType, isReel, undefined)
      onPost(response.post)
      setText(''); clearFile(); setOpen(false)
    } catch (err: any) { alert(err.message || 'Post failed') }
    finally { setSubmitting(false); setUploading(false) }
  }

  return (
    <div className="border-b border-gray-800/60">
      {!open ? (
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0" />
          <button
            onClick={() => setOpen(true)}
            className="flex-1 text-left text-gray-600 text-sm py-2.5 px-4 bg-gray-900 rounded-full border border-gray-800"
          >
            Drop a highlight or update…
          </button>
          <button onClick={() => photoRef.current?.click()} className="text-gray-600 hover:text-[#00E87A] transition-colors"><CameraIcon /></button>
          <button onClick={() => videoRef.current?.click()} className="text-gray-600 hover:text-[#00E87A] transition-colors"><VideoIcon /></button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-4">
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Share a highlight, update, or thought…"
                className="w-full bg-transparent text-white text-sm resize-none outline-none placeholder:text-gray-600 min-h-[60px]"
                autoFocus
              />
              {preview && (
                <div className="relative mt-2 rounded-xl overflow-hidden bg-gray-900 max-h-72">
                  {file?.type.startsWith('video/') ? (
                    <video src={preview} className="w-full max-h-72 object-cover" muted />
                  ) : (
                    <img src={preview} alt="" className="w-full max-h-72 object-cover" />
                  )}
                  <button type="button" onClick={clearFile} className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              )}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => photoRef.current?.click()} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#00E87A]"><CameraIcon /> Photo</button>
                  <button type="button" onClick={() => videoRef.current?.click()} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#00E87A]"><VideoIcon /> Reel</button>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => { setOpen(false); clearFile(); setText('') }} className="text-sm text-gray-500 px-3 py-1.5">Cancel</button>
                  <button type="submit" disabled={submitting || (!text.trim() && !file)}
                    className="text-sm bg-[#00E87A] hover:bg-blue-500 disabled:opacity-40 text-white font-semibold px-5 py-1.5 rounded-full">
                    {uploading ? 'Uploading…' : submitting ? 'Posting…' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
      <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])} />
      <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])} />
    </div>
  )
}

// ── Share sheet ───────────────────────────────────────────────────────────────
function ShareSheet({ post, onClose }: { post: Post; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [sentTo, setSentTo] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100) }, [])

  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await messageApi.searchUsers(query)
        setUsers(res.users)
      } catch {}
      setLoading(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  const handleSend = async (userId: string) => {
    if (sentTo.has(userId)) return
    const preview = post.text ? post.text.slice(0, 80) : 'a post'
    try {
      await messageApi.sendMessage(userId, 'Shared a post', `Check this out: "${preview}"`)
      setSentTo((prev) => new Set([...prev, userId]))
    } catch {}
  }

  const userName = (u: any) =>
    u.athleteProfile?.name || u.coachProfile?.name || u.brandProfile?.name || u.email

  const userSub = (u: any) =>
    u.athleteProfile?.sport || u.coachProfile?.organization || u.brandProfile?.organizationType || ''

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full bg-gray-950 rounded-t-2xl border-t border-gray-800 max-h-[75vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-700" />
        </div>

        <div className="px-4 pb-2">
          <p className="text-white text-sm font-bold mb-3">Send to someone</p>
          <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-gray-500 flex-shrink-0">
              <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name…"
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 pb-8">
          {loading && (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-[#00E87A] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!loading && users.length === 0 && query.length > 0 && (
            <p className="text-center text-gray-600 text-sm py-8">No users found</p>
          )}
          {!loading && users.length === 0 && query.length === 0 && (
            <p className="text-center text-gray-700 text-sm py-8">Type a name to search</p>
          )}
          {users.map((u) => {
            const name = userName(u)
            const sub = userSub(u)
            const sent = sentTo.has(u.id)
            return (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-900">
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient(name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                  {name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{name}</p>
                  {sub && <p className="text-xs text-gray-500 truncate">{sub}</p>}
                </div>
                <button
                  onClick={() => handleSend(u.id)}
                  className={`flex-shrink-0 text-xs font-bold px-4 py-1.5 rounded-full transition-all ${
                    sent
                      ? 'bg-[#00E87A]/20 text-[#00E87A] border border-[#00E87A]/30'
                      : 'bg-[#00E87A] text-black'
                  }`}
                >
                  {sent ? 'Sent' : 'Send'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Post card ─────────────────────────────────────────────────────────────────
function PostCard({ post, onLike, onSave, onComment, onShare }: {
  post: Post
  onLike: (id: string, liked: boolean) => void
  onSave: (id: string, saved: boolean) => void
  onComment: (id: string, text: string) => void
  onShare: (post: Post) => void
}) {
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const name = authorName(post)
  const sport = authorSport(post)
  const school = authorSchool(post)
  const inits = authorInitials(post)
  const likeCount = post._count?.likes ?? post.likes?.length ?? 0
  const commentCount = post._count?.comments ?? post.comments?.length ?? 0
  const isVideo = post.mediaType === 'video' || post.mediaUrl?.match(/\.(mp4|webm|ogg|mov)$/i)

  const submitComment = () => {
    if (!commentText.trim()) return
    onComment(post.id, commentText.trim())
    setCommentText('')
  }

  return (
    <article className="border-b border-gray-800/60 bg-gray-950">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-2.5">
        {/* Sport dot */}
        <div className="w-[3px] self-stretch rounded-full flex-shrink-0" style={{ background: sportDot(sport) }} />
        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient(name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
          {inits}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-white leading-tight">{name}</p>
            {sport && (
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${sportPill(sport)}`}>{sport}</span>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-0.5">
            {[school, timeAgo(post.createdAt)].filter(Boolean).join(' · ')}
          </p>
        </div>
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-gray-700 flex-shrink-0">
          <circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/>
        </svg>
      </div>

      {/* Text */}
      {post.text && (
        <p className="px-4 pb-2.5 text-sm text-gray-200 leading-relaxed">{post.text}</p>
      )}

      {/* Media */}
      {post.mediaUrl && (
        <div className="relative bg-gray-900">
          {isVideo ? (
            <>
              <video src={post.mediaUrl} controls={!post.isReel} loop={post.isReel} playsInline
                className="w-full object-cover"
                style={{ maxHeight: post.isReel ? 480 : 420, aspectRatio: post.isReel ? '9/16' : '4/3' }}
              />
              {post.isReel && (
                <div className="absolute bottom-3 right-3">
                  <Link href="/reels" className="text-xs bg-black/60 text-white px-2.5 py-1 rounded-full font-medium backdrop-blur-sm">
                    Full screen ↗
                  </Link>
                </div>
              )}
            </>
          ) : (
            <img src={post.mediaUrl} alt="" className="w-full object-cover" style={{ maxHeight: 420 }} loading="lazy" />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 px-4 py-2.5">
        <button
          onClick={() => onLike(post.id, post.isLiked || false)}
          className={`flex items-center gap-1.5 transition-colors ${post.isLiked ? 'text-red-500' : 'text-gray-500'}`}
        >
          <HeartIcon filled={post.isLiked} />
          {likeCount > 0 && <span className="text-sm font-medium">{likeCount}</span>}
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className={`flex items-center gap-1.5 transition-colors ${showComments ? 'text-[#00E87A]' : 'text-gray-500'}`}
        >
          <CommentIcon />
          {commentCount > 0 && <span className="text-sm font-medium">{commentCount}</span>}
        </button>

        <button onClick={() => onShare(post)} className="text-gray-500 hover:text-[#00E87A] transition-colors">
          <SendIcon />
        </button>

        <button
          onClick={() => onSave(post.id, post.isSaved || false)}
          className={`ml-auto transition-colors ${post.isSaved ? 'text-[#00E87A]' : 'text-gray-600'}`}
        >
          <BookmarkIcon filled={post.isSaved} />
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="px-4 pb-3 border-t border-gray-800/60 pt-3">
          <div className="space-y-2 mb-3">
            {(post.comments || []).map((c: Comment) => {
              const cn = c.user?.athleteProfile?.name || c.user?.coachProfile?.name || c.user?.brandProfile?.name || 'Unknown'
              return (
                <div key={c.id} className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{cn[0]}</div>
                  <div className="bg-gray-800/60 rounded-2xl px-3 py-1.5">
                    <span className="text-xs font-semibold text-gray-200">{cn} </span>
                    <span className="text-xs text-gray-400">{c.text}</span>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitComment() }}
              placeholder="Add a comment…"
              className="flex-1 text-sm bg-gray-900 border border-gray-800 text-white placeholder-gray-600 rounded-full px-4 py-2 outline-none focus:border-[#00E87A]"
            />
            <button onClick={submitComment} className="text-sm text-[#00E87A] font-semibold px-2">Post</button>
          </div>
        </div>
      )}
    </article>
  )
}

// ── Reel snap card ────────────────────────────────────────────────────────────
function ReelSnapCard({ post }: { post: Post }) {
  const name = authorName(post)
  const inits = authorInitials(post)
  const sport = authorSport(post)
  return (
    <div className="relative bg-black" style={{ height: '100svh' }}>
      {post.mediaUrl ? (
        <video src={post.mediaUrl} className="absolute inset-0 w-full h-full object-cover" loop muted playsInline autoPlay />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900"><VideoIcon /></div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
      <div className="absolute bottom-20 left-4 right-16">
        <div className="flex items-center gap-2.5 mb-2">
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient(name)} flex items-center justify-center text-white text-xs font-bold ring-2 ring-white/30`}>
            {inits}
          </div>
          <div>
            <p className="text-white text-sm font-bold leading-tight">{name}</p>
            {sport && <p className="text-gray-300 text-xs">{sport}</p>}
          </div>
        </div>
        {post.text && <p className="text-white text-sm leading-snug">{post.text}</p>}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function FeedPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [reels, setReels] = useState<Post[]>([])
  const [stories, setStories] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [sharePost, setSharePost] = useState<Post | null>(null)

  const loadFeed = useCallback(async () => {
    try {
      const [feedRes, reelsRes, storiesRes] = await Promise.all([
        postApi.getFeed(),
        postApi.getReels(10, 0),
        postApi.getStories(),
      ])
      setPosts(feedRes.posts)
      setReels(reelsRes.reels)
      setStories(storiesRes.stories)
    } catch (err: any) {
      if (err.message?.includes('Authentication')) router.push('/auth/login')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { loadFeed() }, [loadFeed])

  const handleLike = async (postId: string, isLiked: boolean) => {
    setPosts((prev) => prev.map((p) =>
      p.id === postId
        ? { ...p, isLiked: !isLiked, _count: { likes: (p._count?.likes || 0) + (isLiked ? -1 : 1), comments: p._count?.comments || 0, saves: p._count?.saves || 0 } }
        : p
    ))
    try { isLiked ? await likeApi.unlikePost(postId) : await likeApi.likePost(postId) }
    catch { loadFeed() }
  }

  const handleSave = async (postId: string, isSaved: boolean) => {
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, isSaved: !isSaved } : p))
    try { isSaved ? await saveApi.unsavePost(postId) : await saveApi.savePost(postId) }
    catch { loadFeed() }
  }

  const handleComment = async (postId: string, text: string) => {
    try { await commentApi.addComment(postId, text); loadFeed() }
    catch (err: any) { alert(err.message) }
  }

  const handleShare = (post: Post) => setSharePost(post)

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-[#00E87A] border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  return (
    <main className="bg-gray-950">
      {sharePost && <ShareSheet post={sharePost} onClose={() => setSharePost(null)} />}
      <div className="max-w-[480px] mx-auto">
        <StoriesRow stories={stories} />
        <Composer onPost={(post) => setPosts((prev) => [post, ...prev])} />

        {posts.length === 0 && reels.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 font-medium mb-1">Nothing here yet</p>
            <p className="text-gray-600 text-sm">Follow athletes or check back soon.</p>
          </div>
        )}

        {posts.map((post) => (
          <PostCard key={post.id} post={post} onLike={handleLike} onSave={handleSave} onComment={handleComment} onShare={handleShare} />
        ))}
      </div>

      {reels.length > 0 && (
        <>
          <div className="max-w-[480px] mx-auto px-4 py-3 border-t border-gray-800 flex items-center gap-2">
            <div className="w-1 h-5 bg-blue-500 rounded-full" />
            <p className="text-white text-sm font-bold">Reels</p>
            <span className="text-gray-600 text-xs ml-1">keep scrolling</span>
          </div>
          <div className="snap-y snap-mandatory overflow-y-auto" style={{ height: '100svh' }}>
            {reels.map((reel) => (
              <div key={reel.id} className="snap-start snap-always" style={{ height: '100svh' }}>
                <ReelSnapCard post={reel} />
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  )
}
