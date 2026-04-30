'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { athleteApi, postApi, followApi, AthleteProfile, Post } from '@/lib/api'

export default function AthleteProfileViewPage() {
  const router = useRouter()
  const params = useParams()
  const profileId = params.id as string
  const [profile, setProfile] = useState<AthleteProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    loadProfile()
    loadPosts()
    checkFollowStatus()
  }, [profileId])

  const loadProfile = async () => {
    try {
      const response = await athleteApi.getProfile(profileId)
      setProfile(response.profile)
      // Get userId from profile - need to find user associated with this athlete profile
      // TODO: Backend should return userId in profile response
    } catch (error: any) {
      console.error('Failed to load profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPosts = async () => {
    try {
      // TODO: Need to get userId from profile to load posts
      // For now, this is a placeholder
      // const response = await postApi.getUserPosts(userId)
      // setPosts(response.posts)
    } catch (error: any) {
      console.error('Failed to load posts:', error)
    }
  }

  const checkFollowStatus = async () => {
    if (!userId) return
    try {
      const response = await followApi.getFollowStatus(userId)
      setIsFollowing(response.isFollowing)
    } catch (error: any) {
      console.error('Failed to check follow status:', error)
    }
  }

  const handleFollow = async () => {
    if (!userId) return
    try {
      if (isFollowing) {
        await followApi.unfollowUser(userId)
        setIsFollowing(false)
      } else {
        await followApi.followUser(userId)
        setIsFollowing(true)
      }
    } catch (error: any) {
      alert(error.message || 'Failed to follow/unfollow')
    }
  }

  if (loading) {
    return <div className="max-w-4xl mx-auto p-8">Loading profile...</div>
  }

  if (!profile) {
    return <div className="max-w-4xl mx-auto p-8">Profile not found</div>
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold">{profile.name}</h1>
              <p className="text-gray-600">{profile.sport}</p>
              {profile.position && <p className="text-gray-500">{profile.position}</p>}
            </div>
            {userId && (
              <button
                onClick={handleFollow}
                className={`px-4 py-2 rounded ${
                  isFollowing
                    ? 'bg-gray-200 text-gray-800'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
          {profile.bio && <p className="mb-4 whitespace-pre-wrap">{profile.bio}</p>}
          <div className="flex gap-2 mb-4">
            {profile.openToNIL && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                Open to NIL
              </span>
            )}
            {profile.openToSemiProPro && (
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                Open to Pro
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {profile.schoolTeam && (
              <div>
                <span className="font-semibold">Team:</span> {profile.schoolTeam}
              </div>
            )}
            {profile.classYear && (
              <div>
                <span className="font-semibold">Class:</span> {profile.classYear}
              </div>
            )}
            {profile.location && (
              <div>
                <span className="font-semibold">Location:</span> {profile.location}
              </div>
            )}
            {profile.height && (
              <div>
                <span className="font-semibold">Height:</span> {profile.height}
              </div>
            )}
          </div>
        </div>

        {profile.stats && profile.stats.length > 0 && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">Stats</h2>
            <div className="space-y-2">
              {profile.stats.map((stat) => (
                <div key={stat.id} className="flex justify-between border-b pb-2">
                  <span>
                    {stat.statType} ({stat.season})
                  </span>
                  <span className="font-semibold">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {profile.highlights && profile.highlights.length > 0 && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">Highlights</h2>
            <div className="space-y-4">
              {profile.highlights.map((highlight) => (
                <div key={highlight.id}>
                  <h3 className="font-semibold">{highlight.title || 'Untitled'}</h3>
                  <a
                    href={highlight.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View Highlight
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-2xl font-bold mb-4">Posts</h2>
          {posts.length === 0 ? (
            <p className="text-gray-500">No posts yet</p>
          ) : (
            <div className="space-y-4">
              {/* TODO: Render posts */}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
