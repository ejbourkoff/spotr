'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

const SCHOOL_LEVELS = [
  { value: 'D1', label: 'NCAA D1' },
  { value: 'D2', label: 'NCAA D2' },
  { value: 'D3', label: 'NCAA D3' },
  { value: 'NAIA', label: 'NAIA' },
  { value: 'JUCO', label: 'JUCO / Community College' },
  { value: 'OTHER', label: 'Other / Club' },
]

const SPORTS = [
  'Baseball', 'Basketball', 'Cross Country', 'Football', 'Golf', 'Gymnastics',
  'Ice Hockey', 'Lacrosse', 'Rowing', 'Rugby', 'Soccer', 'Softball', 'Swimming',
  'Tennis', 'Track & Field', 'Volleyball', 'Water Polo', 'Wrestling',
]

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
]

export default function CoachOnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [school, setSchool] = useState('')
  const [schoolLevel, setSchoolLevel] = useState('')
  const [selectedSports, setSelectedSports] = useState<string[]>([])
  const [selectedStates, setSelectedStates] = useState<string[]>([])

  useEffect(() => {
    authApi.getMe().catch(() => router.push('/auth/login'))
  }, [router])

  const toggleSport = (sport: string) => {
    setSelectedSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    )
  }

  const toggleState = (state: string) => {
    setSelectedStates((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !title || !school || !schoolLevel) {
      setError('Name, title, school, and level are required.')
      return
    }
    setSaving(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/coaches/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          title,
          school,
          schoolLevel,
          sport: selectedSports,
          statePrefs: selectedStates,
        }),
      })

      if (!res.ok) throw new Error('Failed to save profile')
      router.push('/coach/discover')
    } catch (err: any) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <p className="text-sm text-blue-400 font-medium mb-1">Step 1 of 1</p>
          <h1 className="text-2xl font-bold">Set up your coach profile</h1>
          <p className="text-gray-400 text-sm mt-1">
            You can browse athletes right after. Your account is pending review — contact info unlocks once verified.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Basic info */}
          <div className="bg-gray-900 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Your info</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1.5">Full name</label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Coach Mike Smith"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1.5">Title</label>
                <input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Head Coach"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="school" className="block text-sm font-medium text-gray-300 mb-1.5">School / Program</label>
                <input
                  id="school"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  required
                  placeholder="University of North Carolina"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="schoolLevel" className="block text-sm font-medium text-gray-300 mb-1.5">Level</label>
                <select
                  id="schoolLevel"
                  value={schoolLevel}
                  onChange={(e) => setSchoolLevel(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select level…</option>
                  {SCHOOL_LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Sports */}
          <div className="bg-gray-900 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Sports you recruit for <span className="text-gray-600 normal-case font-normal">(select all that apply)</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {SPORTS.map((sport) => (
                <button
                  key={sport}
                  type="button"
                  onClick={() => toggleSport(sport)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    selectedSports.includes(sport)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {sport}
                </button>
              ))}
            </div>
          </div>

          {/* States */}
          <div className="bg-gray-900 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Preferred recruiting states <span className="text-gray-600 normal-case font-normal">(optional)</span>
            </h2>
            <p className="text-xs text-gray-600 mb-3">Leave empty to search all states.</p>
            <div className="flex flex-wrap gap-1.5">
              {US_STATES.map((state) => (
                <button
                  key={state}
                  type="button"
                  onClick={() => toggleState(state)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    selectedStates.includes(state)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {state}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-base"
          >
            {saving ? 'Saving…' : 'You\'re all set. Browse athletes →'}
          </button>
        </form>
      </div>
    </div>
  )
}
