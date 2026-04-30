'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

interface Stat {
  id: string
  season: string
  statType: string
  value: number
}

interface Highlight {
  id: string
  url: string
  title?: string
}

interface PublicProfile {
  id: string
  slug: string
  name: string
  sport: string
  position?: string
  schoolTeam?: string
  classYear?: string
  state?: string
  height?: string
  weight?: number
  bio?: string
  hudlUrl?: string
  stats: Stat[]
  highlights: Highlight[]
  shortLinks: { code: string }[]
  user: { id: string; email?: string; phone?: string }
}

function ShareIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

export default function PublicAthletePage() {
  const params = useParams()
  const slug = params.slug as string
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [canSeeContact, setCanSeeContact] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [shared, setShared] = useState(false)
  const [shortCode, setShortCode] = useState<string | null>(null)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    fetch(`${API_BASE}/public/athletes/${slug}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null }
        return r.json()
      })
      .then((data) => {
        if (!data) return
        setProfile(data.profile)
        setCanSeeContact(data.canSeeContact)
        if (data.profile.shortLinks?.length > 0) {
          setShortCode(data.profile.shortLinks[0].code)
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  const handleShare = useCallback(async () => {
    let code = shortCode
    if (!code) {
      const token = localStorage.getItem('token')
      if (token) {
        const res = await fetch(`${API_BASE}/public/athletes/${slug}/short-link`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          code = data.code
          setShortCode(code)
        }
      }
    }

    const shareUrl = code
      ? `${window.location.origin}/a/${code}`
      : window.location.href

    const shareData = {
      title: profile ? `${profile.name} — ${profile.sport} on SPOTR` : 'SPOTR Athlete Profile',
      url: shareUrl,
    }

    if (navigator.share) {
      try { await navigator.share(shareData) } catch {}
    } else {
      navigator.clipboard.writeText(shareUrl)
      setShared(true)
      setTimeout(() => setShared(false), 2500)
    }
  }, [slug, profile, shortCode])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 text-center px-4">
        <p className="text-xl font-bold text-white">This athlete profile doesn't exist.</p>
        <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">Back to SPOTR</Link>
      </div>
    )
  }

  const latestStats = profile.stats.slice(0, 3)
  const hudlEmbed = profile.hudlUrl || (profile.highlights[0]?.url ?? null)
  const isLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem('token')

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top bar */}
      <header className="border-b border-gray-800 bg-gray-950/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-xl font-black tracking-tight text-white">SPOTR</Link>
          <div className="flex items-center gap-2">
            <Link href="/auth/login" className="text-sm text-gray-400 hover:text-white px-3 py-1.5 transition-colors">
              Log in
            </Link>
            <Link href="/auth/signup?role=COACH" className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg font-medium transition-colors">
              Sign up as coach
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pb-16">
        {/* Hero */}
        <div className="pt-8 pb-6 border-b border-gray-800">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-black flex-shrink-0">
              {profile.name.slice(0, 1)}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">{profile.name}</h1>
              <p className="text-gray-300 mt-1 text-sm sm:text-base">
                {[profile.sport, profile.position].filter(Boolean).join(' · ')}
                {profile.classYear && <span className="text-gray-500"> · Class of {profile.classYear}</span>}
              </p>
              {(profile.schoolTeam || profile.state) && (
                <p className="text-gray-500 text-sm mt-0.5">
                  {[profile.schoolTeam, profile.state].filter(Boolean).join(' · ')}
                </p>
              )}
              {(profile.height || profile.weight) && (
                <p className="text-gray-600 text-xs mt-1">
                  {[profile.height, profile.weight ? `${profile.weight} lbs` : null].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>

          {/* Share button — above fold, primary CTA */}
          <button
            onClick={handleShare}
            className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-600/20"
          >
            {shared ? <CheckIcon /> : <ShareIcon />}
            {shared ? 'Link copied!' : 'Share your card'}
          </button>
        </div>

        {/* Stats */}
        {latestStats.length > 0 && (
          <div className="py-6 border-b border-gray-800">
            {/* Unverified banner */}
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-amber-700 flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span className="text-amber-700 text-xs font-medium">Stats are self-reported and unverified.</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {latestStats.map((s) => (
                <div key={s.id} className="bg-gray-900 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">{s.statType}</p>
                  <p className="text-xs text-gray-700 mt-0.5">{s.season}</p>
                </div>
              ))}
              {latestStats.length === 0 && [0, 1, 2].map((i) => (
                <div key={i} className="bg-gray-900 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-700">—</p>
                  <p className="text-xs text-gray-700 uppercase tracking-wide mt-1">No stats</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Highlights / Hudl */}
        <div className="py-6 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Highlights</h2>
          {hudlEmbed ? (
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-gray-900">
              <iframe
                src={hudlEmbed.includes('hudl.com') ? hudlEmbed.replace('/video/', '/video/embed/') : hudlEmbed}
                className="w-full h-full"
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="aspect-video w-full rounded-xl bg-gray-900 flex items-center justify-center">
              <p className="text-gray-600 text-sm">No highlights added yet.</p>
            </div>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="py-6 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">About</h2>
            <p className="text-gray-300 text-sm leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {/* Contact section */}
        <div className="py-6">
          {canSeeContact && profile.user.email ? (
            <div className="bg-gray-900 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Contact</h2>
              {profile.user.email && (
                <p className="text-sm text-white">{profile.user.email}</p>
              )}
              {profile.user.phone && (
                <p className="text-sm text-white mt-1">{profile.user.phone}</p>
              )}
            </div>
          ) : isLoggedIn ? (
            <div className="bg-gray-900 rounded-xl p-5 text-center">
              <p className="text-gray-400 text-sm">Your account is pending review. Contact info unlocks once verified.</p>
            </div>
          ) : (
            /* Unauthenticated coach CTA — the viral acquisition loop */
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
              <p className="text-lg font-bold text-white">You're a coach?</p>
              <p className="text-gray-400 text-sm mt-1 mb-4">
                Find more athletes like {profile.name}. SPOTR is free for coaches at every level.
              </p>
              <div className="flex items-center gap-3">
                <Link
                  href="/auth/signup?role=COACH"
                  className="flex-1 text-center bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors"
                >
                  Sign up as a coach →
                </Link>
                <Link
                  href="/auth/login"
                  className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-2.5"
                >
                  Log in
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
