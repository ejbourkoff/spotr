'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

interface AthleteResult {
  id: string
  slug?: string
  name: string
  sport: string
  position?: string
  schoolTeam?: string
  classYear?: string
  state?: string
  stats: { statType: string; value: number; season: string }[]
}

const SPORTS = [
  '', 'Baseball', 'Basketball', 'Cross Country', 'Football', 'Golf', 'Gymnastics',
  'Ice Hockey', 'Lacrosse', 'Rowing', 'Rugby', 'Soccer', 'Softball', 'Swimming',
  'Tennis', 'Track & Field', 'Volleyball', 'Water Polo', 'Wrestling',
]

const US_STATES = [
  '', 'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
]

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

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-4 border-b border-gray-800 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-gray-800 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-gray-800 rounded w-40" />
        <div className="h-3 bg-gray-800 rounded w-56" />
      </div>
      <div className="w-16 h-8 bg-gray-800 rounded-lg" />
    </div>
  )
}

export default function CoachDiscoverPage() {
  const router = useRouter()
  const [athletes, setAthletes] = useState<AthleteResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [gated, setGated] = useState(false)
  const [total, setTotal] = useState(0)
  const [verified, setVerified] = useState(false)

  const [sport, setSport] = useState('')
  const [position, setPosition] = useState('')
  const [classYear, setClassYear] = useState('')
  const [state, setState] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/auth/login'); return }

    fetch(`${API_BASE}/coaches/profile/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => { if (d.profile?.verified) setVerified(true) })
      .catch(() => {})
  }, [router])

  const search = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const token = localStorage.getItem('token')
    if (!token) return

    setLoading(true)
    setGated(false)

    const params = new URLSearchParams()
    if (sport) params.set('sport', sport)
    if (position) params.set('position', position)
    if (classYear) params.set('classYear', classYear)
    if (state) params.set('state', state)

    try {
      const res = await fetch(`${API_BASE}/coaches/search/athletes?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()

      if (res.status === 403 && data.gated) {
        setGated(true)
        setAthletes([])
        setTotal(0)
      } else if (res.ok) {
        setAthletes(data.profiles)
        setTotal(data.total)
      }
    } catch {}
    setLoading(false)
    setSearched(true)
  }

  const sportLabel = sport || 'athletes'
  const stateLabel = state || null

  return (
    <main className="min-h-screen bg-gray-950">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Unverified banner */}
        {!verified && (
          <div className="mb-5 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-amber-400 flex-shrink-0 mt-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
            </svg>
            <p className="text-amber-400 text-sm">
              Account pending review. You can browse but contact info is hidden until verified.
            </p>
          </div>
        )}

        {/* Filter bar */}
        <form onSubmit={search} className="mb-5">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label htmlFor="sport" className="block text-xs font-medium text-gray-500 mb-1.5">Sport</label>
              <select
                id="sport"
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 text-white rounded-xl text-sm focus:outline-none focus:border-blue-500 appearance-none"
              >
                <option value="">All sports</option>
                {SPORTS.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="position" className="block text-xs font-medium text-gray-500 mb-1.5">Position</label>
              <input
                id="position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Any position"
                className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 text-white placeholder-gray-600 rounded-xl text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="classYear" className="block text-xs font-medium text-gray-500 mb-1.5">Grad year</label>
              <select
                id="classYear"
                value={classYear}
                onChange={(e) => setClassYear(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 text-white rounded-xl text-sm focus:outline-none focus:border-blue-500 appearance-none"
              >
                <option value="">Any year</option>
                {['2025', '2026', '2027', '2028', '2029'].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="state" className="block text-xs font-medium text-gray-500 mb-1.5">State</label>
              <select
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 text-white rounded-xl text-sm focus:outline-none focus:border-blue-500 appearance-none"
              >
                <option value="">All states</option>
                {US_STATES.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors"
          >
            Search Athletes
          </button>
        </form>

        {/* Results */}
        {gated ? (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-10 text-center">
            <p className="text-lg font-bold text-white mb-2">Athlete search coming soon</p>
            <p className="text-gray-500 text-sm">
              We&apos;re building out the athlete database. You&apos;ll be first to know when it&apos;s ready.
            </p>
          </div>
        ) : loading ? (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : !searched ? (
          <div className="py-16 text-center">
            <p className="text-gray-500 text-sm">Set your filters and search to find athletes.</p>
          </div>
        ) : athletes.length === 0 ? (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-10 text-center">
            <p className="text-white font-semibold mb-1">
              No {sportLabel} found{stateLabel ? ` in ${stateLabel}` : ''}.
            </p>
            <p className="text-gray-500 text-sm mb-4">Try broadening your search.</p>
            <button
              onClick={() => { setSport(''); setPosition(''); setClassYear(''); setState(''); }}
              className="text-sm text-blue-500 hover:text-blue-400 font-medium"
            >
              Clear all filters
            </button>
            <p className="text-gray-600 text-xs mt-4">
              Know an athlete who should be here?{' '}
              <button
                onClick={() => navigator.clipboard.writeText(window.location.origin + '/auth/signup').then(() => alert('Link copied!'))}
                className="text-blue-500 underline"
              >
                Send invite link
              </button>
            </p>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800">
              <p className="text-sm text-gray-500">{total} athlete{total !== 1 ? 's' : ''} found</p>
            </div>
            {athletes.map((a) => {
              const topStats = a.stats.slice(0, 2)
              const profileUrl = a.slug ? `/athletes/${a.slug}` : `/athletes/${a.id}`
              return (
                <div key={a.id} className="flex items-center gap-3 px-4 py-4 border-b border-gray-800 last:border-0 active:bg-gray-800 transition-colors">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGradient(a.name)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                    {a.name.slice(0, 1)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {a.name}
                      {a.sport && <span className="ml-1.5 text-[10px] font-medium text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-full">{a.sport}</span>}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {[a.schoolTeam, a.classYear ? `Class of ${a.classYear}` : null, a.state].filter(Boolean).join(' · ')}
                    </p>
                    {topStats.length > 0 && (
                      <div className="flex items-center gap-3 mt-1">
                        {topStats.map((s) => (
                          <span key={s.statType} className="text-xs text-gray-400">
                            <span className="text-white font-semibold">{s.value}</span> {s.statType}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <Link
                    href={profileUrl}
                    className="flex-shrink-0 text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-2 rounded-lg transition-colors"
                  >
                    View
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
