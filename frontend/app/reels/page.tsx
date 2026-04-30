'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { postApi, athleteApi, likeApi, saveApi, messageApi, Post } from '@/lib/api'
import dynamic from 'next/dynamic'
const MuxPlayer = dynamic(() => import('@mux/mux-player-react'), { ssr: false })

// ── Share sheet (inline) ──────────────────────────────────────────────────────
const SHARE_AVATAR_GRADIENTS = [
  'from-blue-500 to-purple-600', 'from-emerald-500 to-cyan-600',
  'from-orange-500 to-red-600', 'from-pink-500 to-rose-600',
]
function shareAvatarGradient(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return SHARE_AVATAR_GRADIENTS[h % SHARE_AVATAR_GRADIENTS.length]
}
function ReelShareSheet({ reel, onClose }: { reel: Post; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [sentTo, setSentTo] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100) }, [])
  useEffect(() => {
    setLoadingUsers(true)
    const t = setTimeout(async () => {
      try { const r = await messageApi.searchUsers(query); setUsers(r.users) } catch {}
      setLoadingUsers(false)
    }, 250)
    return () => clearTimeout(t)
  }, [query])
  const handleSend = async (userId: string) => {
    if (sentTo.has(userId)) return
    const preview = reel.text ? reel.text.slice(0, 80) : 'a reel'
    try { await messageApi.sendMessage(userId, 'Shared a reel', `Check this out: "${preview}"`); setSentTo(p => new Set([...p, userId])) } catch {}
  }
  const uName = (u: any) => u.athleteProfile?.name || u.coachProfile?.name || u.brandProfile?.name || u.email
  const uSub = (u: any) => u.athleteProfile?.sport || u.coachProfile?.organization || u.brandProfile?.organizationType || ''
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full bg-gray-950 rounded-t-2xl border-t border-gray-800 max-h-[75vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-gray-700" /></div>
        <div className="px-4 pb-2">
          <p className="text-white text-sm font-bold mb-3">Send to someone</p>
          <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-gray-500 flex-shrink-0"><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" /></svg>
            <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name…" className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none" />
          </div>
        </div>
        <div className="overflow-y-auto flex-1 pb-8">
          {loadingUsers && <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-[#00E87A] border-t-transparent rounded-full animate-spin" /></div>}
          {!loadingUsers && users.length === 0 && query.length > 0 && <p className="text-center text-gray-600 text-sm py-8">No users found</p>}
          {!loadingUsers && users.length === 0 && query.length === 0 && <p className="text-center text-gray-700 text-sm py-8">Type a name to search</p>}
          {users.map(u => {
            const name = uName(u); const sub = uSub(u); const sent = sentTo.has(u.id)
            return (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-900">
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${shareAvatarGradient(name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>{name.slice(0,2).toUpperCase()}</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-white truncate">{name}</p>{sub && <p className="text-xs text-gray-500 truncate">{sub}</p>}</div>
                <button onClick={() => handleSend(u.id)} className={`flex-shrink-0 text-xs font-bold px-4 py-1.5 rounded-full transition-all ${sent ? 'bg-[#00E87A]/20 text-[#00E87A] border border-[#00E87A]/30' : 'bg-[#00E87A] text-black'}`}>{sent ? 'Sent' : 'Send'}</button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const BRAND_GREEN = '#00E87A'

const SPORT_COLORS: Record<string, { dot: string; chip: string; chipBg: string }> = {
  Football:   { dot: '#f97316', chip: 'text-orange-400', chipBg: 'bg-orange-500/15 border-orange-500/25' },
  Basketball: { dot: '#ef4444', chip: 'text-red-400',    chipBg: 'bg-red-500/15 border-red-500/25' },
  Soccer:     { dot: '#84cc16', chip: 'text-lime-400',   chipBg: 'bg-lime-500/15 border-lime-500/25' },
  Baseball:   { dot: '#3b82f6', chip: 'text-blue-400',   chipBg: 'bg-blue-500/15 border-blue-500/25' },
  Volleyball: { dot: '#a855f7', chip: 'text-violet-400', chipBg: 'bg-violet-500/15 border-violet-500/25' },
  Swimming:   { dot: '#06b6d4', chip: 'text-cyan-400',   chipBg: 'bg-cyan-500/15 border-cyan-500/25' },
  Track:      { dot: '#eab308', chip: 'text-yellow-400', chipBg: 'bg-yellow-500/15 border-yellow-500/25' },
}
const DEFAULT_SPORT = { dot: '#6b7280', chip: 'text-gray-400', chipBg: 'bg-gray-700/40 border-gray-600/30' }

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

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

function getAuthor(reel: Post) {
  if (reel.author?.athleteProfile) return { name: reel.author.athleteProfile.name, sport: reel.author.athleteProfile.sport, sub: '', isAthlete: true }
  if (reel.author?.coachProfile) return { name: reel.author.coachProfile.name, sport: '', sub: reel.author.coachProfile.organization || '', isAthlete: false }
  if (reel.author?.brandProfile) return { name: reel.author.brandProfile.name, sport: '', sub: reel.author.brandProfile.organizationType || '', isAthlete: false }
  return { name: 'Unknown', sport: '', sub: '', isAthlete: false }
}

function engagementScore(reel: Post) {
  return (reel._count?.likes || 0) * 2 + (reel._count?.comments || 0) * 1.5
}

const SPORT_TABS = ['Football', 'Basketball', 'Soccer', 'Baseball', 'Volleyball']

export default function ReelsPage() {
  const router = useRouter()
  const [allReels, setAllReels] = useState<Post[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Trending')
  const [viewerSport, setViewerSport] = useState<string | null>(null)
  const [shareReel, setShareReel] = useState<Post | null>(null)
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({})
  const touchStartY = useRef<number | null>(null)

  useEffect(() => {
    Promise.all([
      postApi.getReels(50, 0),
      athleteApi.getMyProfile().catch(() => null),
    ]).then(([reelsRes, profileRes]) => {
      setAllReels(reelsRes.reels)
      if (profileRes?.profile?.sport) setViewerSport(profileRes.profile.sport)
    }).catch((err: any) => {
      if (err.message?.includes('Authentication')) router.push('/auth/login')
    }).finally(() => setLoading(false))
  }, [router])

  const displayReels = (() => {
    if (activeTab === 'Trending') {
      const sorted = [...allReels].sort((a, b) => {
        const aScore = engagementScore(a) + (viewerSport && getAuthor(a).sport === viewerSport ? 1000 : 0)
        const bScore = engagementScore(b) + (viewerSport && getAuthor(b).sport === viewerSport ? 1000 : 0)
        return bScore - aScore
      })
      return sorted
    }
    return allReels.filter((r) => getAuthor(r).sport === activeTab)
  })()

  useEffect(() => {
    setCurrentIndex(0)
  }, [activeTab])

  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([id, el]) => {
      if (!el) return
      const reel = displayReels[currentIndex]
      if (reel && id === reel.id) {
        el.play().catch(() => {})
      } else {
        el.pause()
        el.currentTime = 0
      }
    })
  }, [currentIndex, displayReels])

  const handleLike = async (reelId: string) => {
    const reel = allReels.find((r) => r.id === reelId)
    if (!reel) return
    try {
      if (reel.isLiked) {
        await likeApi.unlikePost(reelId)
      } else {
        await likeApi.likePost(reelId)
      }
      setAllReels((prev) => prev.map((r) => r.id === reelId ? {
        ...r,
        isLiked: !r.isLiked,
        _count: { ...r._count!, likes: (r._count?.likes || 0) + (r.isLiked ? -1 : 1) },
      } : r))
    } catch {}
  }

  const handleSave = async (reelId: string) => {
    const reel = allReels.find((r) => r.id === reelId)
    if (!reel) return
    try {
      if (reel.isSaved) {
        await saveApi.unsavePost(reelId)
      } else {
        await saveApi.savePost(reelId)
      }
      setAllReels((prev) => prev.map((r) => r.id === reelId ? { ...r, isSaved: !r.isSaved } : r))
    } catch {}
  }

  const goNext = useCallback(() => {
    if (currentIndex < displayReels.length - 1) setCurrentIndex((i) => i + 1)
  }, [currentIndex, displayReels.length])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1)
  }, [currentIndex])

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    if (e.deltaY > 50) goNext()
    else if (e.deltaY < -50) goPrev()
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return
    const diff = touchStartY.current - e.changedTouches[0].clientY
    if (diff > 60) goNext()
    else if (diff < -60) goPrev()
    touchStartY.current = null
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${BRAND_GREEN} transparent transparent transparent` }} />
      </div>
    )
  }

  const currentReel = displayReels[currentIndex]
  const author = currentReel ? getAuthor(currentReel) : null
  const sport = author?.sport ? (SPORT_COLORS[author.sport] || DEFAULT_SPORT) : DEFAULT_SPORT

  return (
    <div
      className="fixed inset-0 bg-black overflow-hidden"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {shareReel && <ReelShareSheet reel={shareReel} onClose={() => setShareReel(null)} />}
      {/* Full-screen video stack */}
      {displayReels.map((reel, index) => (
        <div
          key={reel.id}
          className="absolute inset-0 transition-transform duration-300 ease-out"
          style={{ transform: `translateY(${(index - currentIndex) * 100}%)` }}
        >
          {reel.muxPlaybackId ? (
            <MuxPlayer
              playbackId={reel.muxPlaybackId}
              streamType="on-demand"
              autoPlay={index === currentIndex}
              loop
              muted={index !== currentIndex}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : reel.mediaUrl ? (
            <video
              ref={(el) => { videoRefs.current[reel.id] = el }}
              src={reel.mediaUrl}
              className="absolute inset-0 w-full h-full object-cover"
              loop
              playsInline
              muted={index !== currentIndex}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
              <p className="text-gray-600 text-sm px-8 text-center">{reel.text}</p>
            </div>
          )}
          {/* Bottom gradient scrim */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 45%, transparent 70%)' }} />
          {/* Top gradient scrim */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 30%)' }} />
        </div>
      ))}

      {/* === TOP UI === */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-14 pb-3">
        {/* Progress dots */}
        <div className="flex gap-1 mb-3">
          {displayReels.slice(0, Math.min(displayReels.length, 12)).map((_, i) => (
            <div
              key={i}
              className="flex-1 h-[2px] rounded-full transition-all duration-300"
              style={{
                background: i < currentIndex ? 'rgba(255,255,255,0.4)' : i === currentIndex ? BRAND_GREEN : 'rgba(255,255,255,0.15)',
              }}
            />
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {/* Highlights label */}
          <span className="text-[10px] font-black tracking-widest mr-2 flex-shrink-0" style={{ color: BRAND_GREEN }}>
            ◉ REELS
          </span>

          {/* Trending tab */}
          <button
            onClick={() => setActiveTab('Trending')}
            className="flex-shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full transition-all"
            style={activeTab === 'Trending'
              ? { background: `${BRAND_GREEN}22`, color: BRAND_GREEN, border: `1px solid ${BRAND_GREEN}44` }
              : { color: 'rgba(255,255,255,0.4)', border: '1px solid transparent' }
            }
          >
            {viewerSport ? `🔥 For You` : '🔥 Trending'}
          </button>

          {SPORT_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full transition-all"
              style={activeTab === tab
                ? { background: `${SPORT_COLORS[tab]?.dot || BRAND_GREEN}22`, color: SPORT_COLORS[tab]?.dot || BRAND_GREEN, border: `1px solid ${SPORT_COLORS[tab]?.dot || BRAND_GREEN}44` }
                : { color: 'rgba(255,255,255,0.4)', border: '1px solid transparent' }
              }
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* === RIGHT ACTION RAIL === */}
      {currentReel && (
        <div className="absolute right-3 bottom-52 z-20 flex flex-col items-center gap-5">
          {/* Like */}
          <button onClick={() => handleLike(currentReel.id)} className="flex flex-col items-center gap-1">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center transition-all"
              style={{ background: currentReel.isLiked ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.1)', border: `1px solid ${currentReel.isLiked ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.15)'}` }}
            >
              <svg width="20" height="20" fill={currentReel.isLiked ? '#ef4444' : 'none'} stroke={currentReel.isLiked ? '#ef4444' : 'white'} strokeWidth={2} viewBox="0 0 24 24">
                <path d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-white text-[11px] font-bold">{currentReel._count?.likes || 0}</span>
          </button>

          {/* Comment */}
          <button className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <svg width="20" height="20" fill="none" stroke="white" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="text-white text-[11px] font-bold">{currentReel._count?.comments || 0}</span>
          </button>

          {/* Save */}
          <button onClick={() => handleSave(currentReel.id)} className="flex flex-col items-center gap-1">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center transition-all"
              style={{ background: currentReel.isSaved ? `${BRAND_GREEN}22` : 'rgba(255,255,255,0.1)', border: `1px solid ${currentReel.isSaved ? `${BRAND_GREEN}44` : 'rgba(255,255,255,0.15)'}` }}
            >
              <svg width="18" height="18" fill={currentReel.isSaved ? BRAND_GREEN : 'none'} stroke={currentReel.isSaved ? BRAND_GREEN : 'white'} strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
          </button>

          {/* Share */}
          <button onClick={() => setShareReel(currentReel)} className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <svg width="18" height="18" fill="none" stroke="white" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </div>
            <span className="text-white text-[11px] font-bold">Send</span>
          </button>
        </div>
      )}

      {/* === BOTTOM PLAYER CARD === */}
      {currentReel && author && (
        <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-6">
          {/* Sport banner */}
          {author.sport && (
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ background: sport.dot }} />
              <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: sport.dot }}>
                {author.sport}
                {author.isAthlete && ' · Highlight'}
              </span>
            </div>
          )}

          {/* Player row */}
          <div className="flex items-end gap-3 mb-2">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatarGradient(author.name)} flex items-center justify-center text-white text-sm font-black flex-shrink-0 border-2 border-white/10`}>
              {initials(author.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-black text-[15px] truncate">{author.name}</span>
                <button
                  className="flex-shrink-0 text-[10px] font-black px-2.5 py-0.5 rounded-full border"
                  style={{ color: BRAND_GREEN, borderColor: `${BRAND_GREEN}55`, background: `${BRAND_GREEN}11` }}
                >
                  + Follow
                </button>
              </div>
              {author.sub && <p className="text-[11px] text-gray-500 mt-0.5 truncate">{author.sub}</p>}
            </div>
          </div>

          {/* Caption */}
          {currentReel.text && (
            <p className="text-white/85 text-[13px] leading-snug mb-3 line-clamp-2">{currentReel.text}</p>
          )}

          {/* Stat chips — from athlete profile stats (if available on reel author) */}
          <div className="flex gap-1.5 flex-wrap">
            {author.isAthlete && author.sport && (
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${sport.chip} ${sport.chipBg}`}>
                {author.sport}
              </span>
            )}
            {activeTab === 'Trending' && viewerSport && author.sport === viewerSport && (
              <span className="text-[10px] font-black px-2.5 py-1 rounded-lg border" style={{ color: BRAND_GREEN, background: `${BRAND_GREEN}11`, borderColor: `${BRAND_GREEN}33` }}>
                ↑ Trending in {viewerSport}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && displayReels.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <p className="text-white font-bold text-lg">No reels yet</p>
          <p className="text-gray-500 text-sm mt-2">
            {activeTab === 'Trending' ? 'No highlights posted yet' : `No ${activeTab} reels yet`}
          </p>
        </div>
      )}
    </div>
  )
}
