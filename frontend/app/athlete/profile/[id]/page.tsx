'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { athleteApi, postApi, followApi, AthleteProfile, Post } from '@/lib/api'

const AVATAR_GRADIENTS = [
  'from-blue-500 to-purple-600', 'from-emerald-500 to-cyan-600',
  'from-orange-500 to-red-600',  'from-pink-500 to-rose-600',
  'from-violet-500 to-indigo-600', 'from-amber-500 to-orange-600',
]
function avatarGradient(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length]
}
function initials(name: string) {
  return name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

export default function AthleteProfileViewPage() {
  const router = useRouter()
  const { id: profileId } = useParams() as { id: string }

  const [profile, setProfile] = useState<AthleteProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const { profile: p } = await athleteApi.getProfile(profileId)
        setProfile(p)

        const userId = p.user?.id
        if (userId) {
          const [postsRes, followRes] = await Promise.allSettled([
            postApi.getUserPosts(userId),
            followApi.getFollowStatus(userId),
          ])
          if (postsRes.status === 'fulfilled') setPosts(postsRes.value.posts.filter(p => !p.isStory))
          if (followRes.status === 'fulfilled') setIsFollowing(followRes.value.isFollowing)
        }
      } catch (err: any) {
        if (err.message?.includes('Authentication')) router.push('/auth/login')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [profileId, router])

  const handleFollow = async () => {
    if (!profile?.user?.id || followLoading) return
    setFollowLoading(true)
    try {
      if (isFollowing) {
        await followApi.unfollowUser(profile.user.id)
        setIsFollowing(false)
      } else {
        await followApi.followUser(profile.user.id)
        setIsFollowing(true)
      }
    } catch (err: any) {
      alert(err.message || 'Failed')
    } finally {
      setFollowLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0D0D0F] flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-[#00E87A] border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }
  if (!profile) {
    return (
      <main className="min-h-screen bg-[#0D0D0F] flex items-center justify-center">
        <p className="text-gray-500">Profile not found</p>
      </main>
    )
  }

  const grad = avatarGradient(profile.name || '')
  const ins = initials(profile.name || '')
  const nonStoryPosts = posts.filter(p => !p.isStory && !p.isReel)
  const highlights = posts.filter(p => (p as any).isHighlight)

  return (
    <main className="min-h-screen bg-[#0D0D0F]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-3 border-b border-gray-800/60">
        <button onClick={() => router.back()} className="p-1 text-gray-400">
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-bold text-white flex-1 truncate">{profile.name}</h1>
      </div>

      {/* Profile hero */}
      <div className="px-4 pt-5 pb-0">
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white text-2xl font-black flex-shrink-0`}>
            {ins}
          </div>
          <div className="flex-1 pt-1 min-w-0">
            <h2 className="text-lg font-black text-white leading-tight truncate">{profile.name}</h2>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {profile.sport && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/20">
                  {profile.sport}
                </span>
              )}
              {profile.position && <span className="text-[10px] text-gray-500">{profile.position}</span>}
            </div>
            {(profile.schoolTeam || profile.classYear) && (
              <p className="text-xs text-gray-500 mt-1">{[profile.schoolTeam, profile.classYear].filter(Boolean).join(' · ')}</p>
            )}
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {profile.openToNIL && (
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-green-500/12 text-green-400 border border-green-500/25">✓ NIL</span>
              )}
              {profile.openToSemiProPro && (
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#00E87A]/12 text-[#00E87A] border border-[#00E87A]/25">✓ Pro</span>
              )}
            </div>
          </div>
        </div>

        {/* Follow button */}
        {profile.user?.id && (
          <button
            onClick={handleFollow}
            disabled={followLoading}
            className={`w-full py-2.5 rounded-xl text-sm font-bold mb-3 transition-all ${
              isFollowing
                ? 'bg-gray-800 border border-gray-700 text-gray-300'
                : 'bg-[#00E87A] text-black'
            }`}
          >
            {followLoading ? '…' : isFollowing ? 'Following' : '+ Follow'}
          </button>
        )}

        {/* Bio */}
        {profile.bio && <p className="text-sm text-gray-400 leading-relaxed pb-3">{profile.bio}</p>}

        {/* Stats row */}
        {(profile.stats?.length ?? 0) > 0 && (
          <div className="flex border-t border-b border-gray-800 -mx-4 mb-0">
            {profile.stats!.slice(0, 4).map((stat, i) => (
              <div key={stat.id} className={`flex-1 py-3 text-center ${i > 0 ? 'border-l border-gray-800' : ''}`}>
                <p className="text-base font-black text-white leading-none">{stat.value}</p>
                <p className="text-[10px] text-gray-500 mt-1 font-medium">{stat.statType}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Posts grid */}
      <div className="mt-3">
        <p className="px-4 text-[10px] text-gray-600 uppercase tracking-widest font-black mb-2">Posts</p>
        {nonStoryPosts.length > 0 ? (
          <div className="grid grid-cols-3 gap-0.5">
            {nonStoryPosts.map(post => (
              <div key={post.id} className="aspect-square bg-gray-900 flex items-center justify-center relative overflow-hidden">
                {post.mediaUrl ? (
                  <img src={post.mediaUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <p className="text-[11px] text-gray-500 px-2 text-center leading-snug line-clamp-3">{post.text}</p>
                )}
                {(post as any).isHighlight && (
                  <span className="absolute bottom-1.5 left-1.5 text-[9px] font-black text-[#00E87A] bg-black/70 px-1.5 py-0.5 rounded uppercase">HL</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-600 text-sm py-12">No posts yet</p>
        )}
      </div>

      <div className="h-16" />
    </main>
  )
}
