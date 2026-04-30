'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { athleteApi, followApi, AthleteProfile, StatLine } from '@/lib/api'

type AthleteWithUser = AthleteProfile & { user?: { id: string } }

const SPORT_COLORS: Record<string, { border: string; stat: string; statBg: string }> = {
  Football:   { border: 'border-l-orange-500',  stat: 'text-orange-400', statBg: 'bg-orange-500/10 border-orange-500/20' },
  Basketball: { border: 'border-l-red-500',     stat: 'text-red-400',    statBg: 'bg-red-500/10 border-red-500/20' },
  Soccer:     { border: 'border-l-lime-500',    stat: 'text-lime-400',   statBg: 'bg-lime-500/10 border-lime-500/20' },
  Baseball:   { border: 'border-l-blue-500',    stat: 'text-blue-400',   statBg: 'bg-blue-500/10 border-[#00E87A]/20' },
  Volleyball: { border: 'border-l-violet-500',  stat: 'text-violet-400', statBg: 'bg-violet-500/10 border-violet-500/20' },
  Swimming:   { border: 'border-l-cyan-500',    stat: 'text-cyan-400',   statBg: 'bg-cyan-500/10 border-cyan-500/20' },
  Track:      { border: 'border-l-yellow-500',  stat: 'text-yellow-400', statBg: 'bg-yellow-500/10 border-yellow-500/20' },
}

const DEFAULT_SPORT = { border: 'border-l-gray-600', stat: 'text-gray-400', statBg: 'bg-gray-700/40 border-gray-600/30' }

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

function topStat(stats?: StatLine[]): string | null {
  if (!stats || stats.length === 0) return null
  const s = stats[0]
  return `${s.value} ${s.statType}`
}

function SectionDivider({ icon, label, right }: { icon: string; label: string; right?: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-900/80 border-t border-b border-gray-800/60">
      <span className="text-sm">{icon}</span>
      <span className="text-[10px] font-800 font-black text-gray-400 uppercase tracking-widest">{label}</span>
      {right && <span className="text-[10px] text-gray-600 ml-auto">{right}</span>}
    </div>
  )
}

interface AthleteRowProps {
  athlete: AthleteWithUser
  rank?: number
  followed: boolean
  onFollow: (userId: string) => void
}

function AthleteRow({ athlete, rank, followed, onFollow }: AthleteRowProps) {
  const sport = SPORT_COLORS[athlete.sport] || DEFAULT_SPORT
  const stat = topStat(athlete.stats)

  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-gray-800/50 bg-gray-950 border-l-[3px] ${sport.border}`}>
      {rank != null && (
        <span className={`text-sm font-black w-5 text-center flex-shrink-0 ${rank <= 3 ? 'text-amber-400' : 'text-gray-700'}`}>
          {rank}
        </span>
      )}

      <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarGradient(athlete.name)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
        {initials(athlete.name)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-white truncate">{athlete.name}</p>
          {rank != null && rank <= 3 && <span className="text-amber-400 text-xs">↑</span>}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 truncate">
          {[athlete.schoolTeam, athlete.position, athlete.classYear].filter(Boolean).join(' · ')}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        {stat && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${sport.stat} ${sport.statBg}`}>
            {stat}
          </span>
        )}
        <div className="flex items-center gap-1.5">
          {athlete.openToNIL && (
            <span className="text-[9px] font-black text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded">
              NIL
            </span>
          )}
          {athlete.user?.id ? (
            <button
              onClick={() => onFollow(athlete.user!.id)}
              className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors ${
                followed
                  ? 'bg-[#00E87A]/15 text-[#00E87A] border border-[#00E87A]/30'
                  : 'border border-[#00E87A]/40 text-[#00E87A] hover:bg-[#00E87A]/10'
              }`}
            >
              {followed ? 'Following' : 'Follow'}
            </button>
          ) : (
            <Link
              href={`/athlete/profile/${athlete.id}`}
              className="text-xs px-3 py-1 rounded-lg font-semibold border border-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              View
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

const SPORT_TABS = ['All', 'Football', 'Basketball', 'Soccer', 'Baseball', 'Volleyball']

export default function DiscoverPage() {
  const router = useRouter()
  const [athletes, setAthletes] = useState<AthleteWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState('All')
  const [followed, setFollowed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    athleteApi.search({})
      .then((r) => setAthletes(r.profiles as AthleteWithUser[]))
      .catch((err: any) => {
        if (err.message?.includes('Authentication')) router.push('/auth/login')
      })
      .finally(() => setLoading(false))
  }, [router])

  const handleFollow = async (userId: string) => {
    try {
      if (followed[userId]) {
        await followApi.unfollowUser(userId)
        setFollowed((p) => ({ ...p, [userId]: false }))
      } else {
        await followApi.followUser(userId)
        setFollowed((p) => ({ ...p, [userId]: true }))
      }
    } catch {}
  }

  const base = athletes.filter((a) => {
    if (activeTab !== 'All' && a.sport !== activeTab) return false
    if (query) {
      const q = query.toLowerCase()
      return (
        a.name.toLowerCase().includes(q) ||
        a.sport.toLowerCase().includes(q) ||
        a.schoolTeam?.toLowerCase().includes(q) ||
        a.position?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const trending = base.slice(0, 3)
  const nilAthletes = base.filter((a) => a.openToNIL && !trending.includes(a))
  const rest = base.filter((a) => !trending.includes(a) && !nilAthletes.includes(a))

  const isSearching = query.length > 0

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-7 h-7 border-2 border-[#00E87A] border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Search */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5">
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className="text-gray-500 flex-shrink-0">
            <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search athletes..."
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-600 hover:text-gray-400">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Sport tabs */}
      <div className="flex overflow-x-auto scrollbar-hide border-b border-gray-800 px-4 gap-1">
        {SPORT_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-sm font-semibold whitespace-nowrap px-3 py-2.5 border-b-2 transition-colors flex-shrink-0 ${
              activeTab === tab
                ? 'border-[#00E87A] text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {base.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 font-medium">No athletes found</p>
          <p className="text-gray-600 text-sm mt-1">Try a different search or sport</p>
        </div>
      ) : isSearching ? (
        /* Search results — flat list, no sections */
        <div>
          <SectionDivider icon="🔍" label={`${base.length} results`} />
          {base.map((a) => (
            <AthleteRow key={a.id} athlete={a} followed={!!followed[a.user?.id || '']} onFollow={handleFollow} />
          ))}
        </div>
      ) : (
        /* Sectioned view */
        <>
          {trending.length > 0 && (
            <>
              <SectionDivider icon="🔥" label="Trending This Week" right="↑ rising fast" />
              {trending.map((a, i) => (
                <AthleteRow key={a.id} athlete={a} rank={i + 1} followed={!!followed[a.user?.id || '']} onFollow={handleFollow} />
              ))}
            </>
          )}

          {nilAthletes.length > 0 && (
            <>
              <SectionDivider icon="💰" label="Open to NIL" right={`${nilAthletes.length} athletes`} />
              {nilAthletes.map((a) => (
                <AthleteRow key={a.id} athlete={a} followed={!!followed[a.user?.id || '']} onFollow={handleFollow} />
              ))}
            </>
          )}

          {rest.length > 0 && (
            <>
              <SectionDivider icon="👤" label="All Athletes" right="See all" />
              {rest.map((a) => (
                <AthleteRow key={a.id} athlete={a} followed={!!followed[a.user?.id || '']} onFollow={handleFollow} />
              ))}
            </>
          )}
        </>
      )}
    </main>
  )
}
