'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { athleteApi, authApi, postApi, AthleteProfile, StatLine, Post, removeToken } from '@/lib/api'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

const SPORT_RING: Record<string, string> = {
  Football:   'from-orange-500 to-purple-600',
  Basketball: 'from-blue-500 to-red-500',
  Soccer:     'from-lime-500 to-emerald-600',
  Baseball:   'from-blue-500 to-sky-400',
  Volleyball: 'from-violet-500 to-pink-500',
  Swimming:   'from-cyan-500 to-blue-500',
  Track:      'from-yellow-500 to-orange-500',
}
const DEFAULT_RING = 'from-blue-500 to-purple-600'

const SPORT_AVATAR: Record<string, string> = {
  Football:   'from-orange-500 to-red-600',
  Basketball: 'from-blue-500 to-purple-600',
  Soccer:     'from-lime-500 to-green-600',
  Baseball:   'from-blue-400 to-cyan-600',
  Volleyball: 'from-violet-500 to-indigo-600',
  Swimming:   'from-cyan-500 to-teal-600',
  Track:      'from-amber-500 to-orange-600',
}
const DEFAULT_AVATAR = 'from-blue-500 to-purple-600'

function initials(name: string) {
  if (!name?.trim()) return ''
  return name.split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

const PersonIcon = () => (
  <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-white/60">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)

type Tab = 'Posts' | 'Stats' | 'Highlights'

export default function AthleteProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<AthleteProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<AthleteProfile>>({})
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('Posts')

  // Stats sheet state
  const [statsSheet, setStatsSheet] = useState(false)
  const [statForm, setStatForm] = useState({ season: '', statType: '', value: '' })
  const [addingstat, setAddingStat] = useState(false)
  const [deletingStatId, setDeletingStatId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      athleteApi.getMyProfile(),
      authApi.getMe(),
    ])
      .then(async ([profileRes, meRes]) => {
        setProfile(profileRes.profile)
        setFormData(profileRes.profile)
        try {
          const postsRes = await postApi.getUserPosts(meRes.user.id)
          setPosts(postsRes.posts)
        } catch {}
      })
      .catch((err: any) => {
        if (err.message?.includes('Authentication')) router.push('/auth/login')
      })
      .finally(() => setLoading(false))
  }, [router])

  const handleSave = async () => {
    setSaving(true)
    try {
      const r = await athleteApi.updateProfile(formData)
      setProfile(r.profile)
      setFormData(r.profile)
      setEditing(false)
    } catch (err: any) {
      alert(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleShare = async () => {
    if (!(profile as any).slug) return
    const token = localStorage.getItem('token')
    let shortCode: string | null = null
    if (token) {
      const res = await fetch(`${API_BASE}/public/athletes/${(profile as any).slug}/short-link`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        shortCode = data.code
      }
    }
    const url = shortCode
      ? `${window.location.origin}/a/${shortCode}`
      : `${window.location.origin}/athletes/${(profile as any).slug}`

    if (navigator.share) {
      try { await navigator.share({ title: `${profile!.name} on SPOTR`, url }) } catch {}
    } else {
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const handleAddStat = async () => {
    if (!statForm.season.trim() || !statForm.statType.trim() || !statForm.value) return
    setAddingStat(true)
    try {
      const r = await athleteApi.addStat(statForm.season.trim(), statForm.statType.trim(), parseFloat(statForm.value))
      setProfile((prev) => prev ? { ...prev, stats: [...(prev.stats || []), r.statLine] } : prev)
      setStatForm({ season: '', statType: '', value: '' })
    } catch (err: any) {
      alert(err.message || 'Failed to add stat')
    } finally {
      setAddingStat(false)
    }
  }

  const handleDeleteStat = async (id: string) => {
    setDeletingStatId(id)
    try {
      await athleteApi.deleteStat(id)
      setProfile((prev) => prev ? { ...prev, stats: (prev.stats || []).filter(s => s.id !== id) } : prev)
    } catch (err: any) {
      alert(err.message || 'Failed to delete stat')
    } finally {
      setDeletingStatId(null)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0D0D0F]">
        <div className="w-7 h-7 border-2 border-[#00E87A] border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0D0D0F]">
        <p className="text-gray-500">Profile not found.</p>
      </main>
    )
  }

  const ring = SPORT_RING[profile.sport] || DEFAULT_RING
  const avatarGrad = SPORT_AVATAR[profile.sport] || DEFAULT_AVATAR
  const ins = initials(profile.name)
  const stats = profile.stats || []
  const highlightPosts = posts.filter(p => (p as any).isHighlight)

  if (editing) {
    return (
      <main className="min-h-screen bg-[#0D0D0F]">
        <div className="px-4 pt-5 pb-4 flex items-center justify-between border-b border-gray-800">
          <button
            onClick={() => { setEditing(false); setFormData(profile) }}
            className="text-sm text-gray-400 font-medium"
          >
            Cancel
          </button>
          <span className="text-sm font-bold text-white">Edit Profile</span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-sm font-bold text-[#00E87A] disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        <div className="px-4 pt-6 pb-10 space-y-5">
          {/* Bio */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-black mb-2">Bio</p>
            <textarea
              value={formData.bio || ''}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={4}
              placeholder="Tell your story…"
              className="w-full text-sm bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:border-[#00E87A] resize-none placeholder-gray-600"
            />
          </div>

          {/* Fields */}
          {[
            { label: 'Name', key: 'name' as keyof AthleteProfile },
            { label: 'Sport', key: 'sport' as keyof AthleteProfile },
            { label: 'Position', key: 'position' as keyof AthleteProfile },
            { label: 'School / Team', key: 'schoolTeam' as keyof AthleteProfile },
            { label: 'Class Year', key: 'classYear' as keyof AthleteProfile },
            { label: 'Location', key: 'location' as keyof AthleteProfile },
            { label: 'Height', key: 'height' as keyof AthleteProfile },
          ].map(({ label, key }) => (
            <div key={key}>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-black mb-2">{label}</p>
              <input
                type="text"
                value={(formData[key] as string) || ''}
                onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                className="w-full text-sm bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:border-[#00E87A]"
              />
            </div>
          ))}

          {/* Toggles */}
          <div className="space-y-4 pt-2">
            {[
              { label: 'Open to NIL deals', key: 'openToNIL' as const, color: 'bg-green-500' },
              { label: 'Open to Semi-Pro / Pro interest', key: 'openToSemiProPro' as const, color: 'bg-blue-500' },
            ].map(({ label, key, color }) => (
              <label key={key} className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-300">{label}</span>
                <div
                  onClick={() => setFormData({ ...formData, [key]: !formData[key] })}
                  className={`w-11 h-6 rounded-full transition-colors relative ${formData[key] ? color : 'bg-gray-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${formData[key] ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </label>
            ))}
          </div>

          {/* Sign out */}
          <div className="pt-4 border-t border-gray-800">
            <button
              onClick={() => { removeToken(); router.push('/auth/login') }}
              className="text-sm text-red-400 font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0D0D0F]">
      {/* Hero */}
      <div className="px-4 pt-5 pb-0">
        <div className="flex items-start gap-4 mb-4">
          {/* Avatar with gradient ring */}
          <div className="flex-shrink-0">
            <div className={`p-[3px] rounded-full bg-gradient-to-br ${ring}`}>
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-white text-2xl font-black border-2 border-[#060810]`}>
                {ins || <PersonIcon />}
              </div>
            </div>
          </div>

          {/* Name + info */}
          <div className="flex-1 pt-1">
            <h1 className="text-lg font-black text-white leading-tight">{profile.name || <span className="text-gray-500 font-medium">No name</span>}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/20">
                {profile.sport}
              </span>
              {profile.position && (
                <span className="text-[10px] text-gray-500">{profile.position}</span>
              )}
            </div>
            {(profile.schoolTeam || profile.classYear) && (
              <p className="text-xs text-gray-500 mt-1">
                {[profile.schoolTeam, profile.classYear].filter(Boolean).join(' · ')}
              </p>
            )}
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {profile.openToNIL && (
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-green-500/12 text-green-400 border border-green-500/25">
                  ✓ Open to NIL
                </span>
              )}
              {profile.openToSemiProPro && (
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#00E87A]/12 text-[#00E87A] border border-[#00E87A]/25">
                  ✓ Open to Pro
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stat row */}
        {stats.length > 0 && (
          <div className="flex border-t border-b border-gray-800 -mx-4">
            {stats.slice(0, 4).map((stat: StatLine, i: number) => (
              <div key={stat.id} className={`flex-1 py-3 text-center ${i > 0 ? 'border-l border-gray-800' : ''}`}>
                <p className="text-lg font-black text-white leading-none">{stat.value}</p>
                <p className="text-[10px] text-gray-500 mt-1 font-medium leading-none">{stat.statType}</p>
              </div>
            ))}
          </div>
        )}

        {/* Action row */}
        <div className="flex gap-2 py-3">
          <button
            onClick={() => setEditing(true)}
            className="flex-1 py-2 bg-gray-900 border border-gray-800 rounded-xl text-sm font-semibold text-white text-center"
          >
            ✏ Edit Profile
          </button>
          {(profile as any).slug ? (
            <button
              onClick={handleShare}
              className="flex-1 py-2 bg-[#00E87A] rounded-xl text-sm font-semibold text-white text-center"
            >
              {copied ? '✓ Copied!' : '↗ Share'}
            </button>
          ) : (
            <button
              onClick={() => { removeToken(); router.push('/auth/login') }}
              className="flex-1 py-2 bg-gray-900 border border-gray-800 rounded-xl text-sm font-semibold text-gray-400 text-center"
            >
              Sign out
            </button>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm text-gray-400 leading-relaxed pb-3">{profile.bio}</p>
        )}
        {(profile as any).slug && (
          <div className="flex items-center justify-between pb-3">
            <Link href={`/athletes/${(profile as any).slug}`} target="_blank" className="text-xs text-[#00E87A] hover:text-[#00E87A]/70">
              View public profile →
            </Link>
            <button
              onClick={() => { removeToken(); router.push('/auth/login') }}
              className="text-xs text-gray-600 hover:text-gray-400"
            >
              Sign out
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {(['Posts', 'Stats', 'Highlights'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-white text-white'
                : 'border-transparent text-gray-600 hover:text-gray-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'Posts' && (
        posts.length > 0 ? (
          <div className="grid grid-cols-3 gap-0.5">
            {posts.map((post) => (
              <div
                key={post.id}
                className="aspect-square bg-gray-900 flex items-center justify-center relative overflow-hidden"
              >
                {post.mediaUrl ? (
                  post.mediaType === 'video' || post.isReel ? (
                    <>
                      {post.thumbnailUrl
                        ? <img src={post.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center"><span className="text-2xl">🎬</span></div>
                      }
                      <span className="absolute top-1.5 right-1.5 text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded">▶</span>
                    </>
                  ) : (
                    <img src={post.mediaUrl} alt="" className="w-full h-full object-cover" />
                  )
                ) : (
                  <p className="text-[11px] text-gray-500 px-2 text-center leading-snug line-clamp-3">{post.text}</p>
                )}
                {(post as any).isHighlight && (
                  <span className="absolute bottom-1.5 left-1.5 text-[9px] font-black text-[#00E87A] bg-black/70 px-1.5 py-0.5 rounded uppercase tracking-wide">⭐</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <p className="text-gray-500 font-medium">No posts yet</p>
            <p className="text-gray-700 text-sm mt-1">Share highlights and updates with your followers</p>
          </div>
        )
      )}

      {activeTab === 'Stats' && (
        <div className="px-4 py-4">
          {/* Header row with button */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-black">Season Stats</p>
            <button
              onClick={() => setStatsSheet(true)}
              className="text-xs font-black uppercase tracking-wide text-[#00E87A] border border-[#00E87A]/30 px-3 py-1.5 rounded-lg"
            >
              {stats.length === 0 ? '+ Add Stats' : '✏ Edit Stats'}
            </button>
          </div>

          {stats.length > 0 ? stats.map((stat: StatLine) => (
            <div key={stat.id} className="flex items-center justify-between py-3 border-b border-gray-900">
              <div>
                <p className="text-sm text-gray-300 font-medium">{stat.statType}</p>
                {stat.season && <p className="text-[10px] text-gray-600 mt-0.5">{stat.season}</p>}
              </div>
              <span className="text-sm font-black text-white">{stat.value}</span>
            </div>
          )) : (
            <div className="py-16 text-center">
              <p className="text-gray-500 font-medium">No stats yet</p>
              <p className="text-gray-700 text-sm mt-1">Tap "Add Stats" to get started</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'Highlights' && (
        <div>
          {highlightPosts.length > 0 ? (
            <div className="grid grid-cols-3 gap-0.5">
              {highlightPosts.map((post) => (
                <div
                  key={post.id}
                  className="aspect-square bg-gray-900 flex items-center justify-center relative overflow-hidden"
                >
                  {post.mediaUrl ? (
                    post.mediaType === 'video' || post.isReel ? (
                      <>
                        {post.thumbnailUrl
                          ? <img src={post.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center"><span className="text-2xl">🎬</span></div>
                        }
                        <span className="absolute top-1.5 right-1.5 text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded">▶</span>
                      </>
                    ) : (
                      <img src={post.mediaUrl} alt="" className="w-full h-full object-cover" />
                    )
                  ) : (
                    <p className="text-[11px] text-gray-500 px-2 text-center leading-snug line-clamp-3">{post.text}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center px-6">
              <p className="text-gray-500 font-medium">No highlights yet</p>
              <p className="text-gray-700 text-sm mt-1">When you create a post, toggle "Mark as Highlight" to show it here</p>
            </div>
          )}
        </div>
      )}

      <div className="h-10" />

      {/* Stats bottom sheet */}
      {statsSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setStatsSheet(false)} />
          <div className="relative bg-[#111113] rounded-t-2xl px-4 pt-4 pb-10 max-h-[85vh] overflow-y-auto">
            {/* Handle */}
            <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black text-white">Season Stats</h2>
              <button onClick={() => setStatsSheet(false)} className="text-gray-500 text-sm">Done</button>
            </div>

            {/* Existing stats with delete */}
            {stats.length > 0 && (
              <div className="mb-5">
                {stats.map((stat: StatLine) => (
                  <div key={stat.id} className="flex items-center justify-between py-3 border-b border-gray-800">
                    <div>
                      <p className="text-sm text-gray-200 font-semibold">{stat.statType}</p>
                      {stat.season && <p className="text-[10px] text-gray-600 mt-0.5">{stat.season}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-white">{stat.value}</span>
                      <button
                        onClick={() => handleDeleteStat(stat.id)}
                        disabled={deletingStatId === stat.id}
                        className="text-red-500/70 hover:text-red-400 disabled:opacity-40 p-1"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add new stat form */}
            <p className="text-xs text-gray-500 uppercase tracking-widest font-black mb-3">Add a Stat</p>
            <div className="space-y-3">
              <input
                type="text"
                value={statForm.statType}
                onChange={(e) => setStatForm({ ...statForm, statType: e.target.value })}
                placeholder="Stat type (e.g. PPG, Yards, Goals)"
                className="w-full text-sm bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:border-[#00E87A] placeholder-gray-600"
              />
              <div className="flex gap-3">
                <input
                  type="number"
                  value={statForm.value}
                  onChange={(e) => setStatForm({ ...statForm, value: e.target.value })}
                  placeholder="Value"
                  className="flex-1 text-sm bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:border-[#00E87A] placeholder-gray-600"
                />
                <input
                  type="text"
                  value={statForm.season}
                  onChange={(e) => setStatForm({ ...statForm, season: e.target.value })}
                  placeholder="Season (e.g. 2024-25)"
                  className="flex-1 text-sm bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:border-[#00E87A] placeholder-gray-600"
                />
              </div>
              <button
                onClick={handleAddStat}
                disabled={addingstat || !statForm.statType.trim() || !statForm.value || !statForm.season.trim()}
                className="w-full py-3 bg-[#00E87A] text-[#0D0D0F] font-black uppercase text-sm rounded-xl disabled:opacity-40 transition-opacity"
              >
                {addingstat ? 'Adding…' : '+ Add Stat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
