'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { athleteApi, offerApi, AthleteProfile, Offer } from '@/lib/api'

export default function BrandSearchPage() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<AthleteProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteProfile | null>(null)
  const [showOfferForm, setShowOfferForm] = useState(false)
  const [offerForm, setOfferForm] = useState({
    deliverables: '',
    campaignStartDate: '',
    campaignEndDate: '',
    compensationAmount: '',
    notes: '',
  })

  const filters = {
    openToNIL: true, // Focus on NIL
  }

  useEffect(() => {
    searchAthletes()
  }, [])

  const searchAthletes = async () => {
    setLoading(true)
    try {
      const response = await athleteApi.search(filters)
      setProfiles(response.profiles)
    } catch (error: any) {
      if (error.message.includes('Authentication')) {
        router.push('/auth/login')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSendOffer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAthlete) return

    try {
      await offerApi.createOffer({
        athleteId: selectedAthlete.id,
        deliverables: offerForm.deliverables,
        campaignStartDate: offerForm.campaignStartDate,
        campaignEndDate: offerForm.campaignEndDate,
        compensationAmount: parseFloat(offerForm.compensationAmount),
        notes: offerForm.notes || undefined,
      })
      alert('Offer sent successfully!')
      setShowOfferForm(false)
      setSelectedAthlete(null)
      setOfferForm({
        deliverables: '',
        campaignStartDate: '',
        campaignEndDate: '',
        compensationAmount: '',
        notes: '',
      })
    } catch (error: any) {
      alert(error.message || 'Failed to send offer')
    }
  }

  if (loading) {
    return <div className="max-w-6xl mx-auto p-8">Loading athletes...</div>
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">NIL Search</h1>
          <p className="text-gray-600 mt-2">Find athletes open to NIL opportunities</p>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            Showing athletes open to NIL opportunities. Click on an athlete to send an offer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="bg-gray-900 rounded-xl border border-gray-800 p-6 hover:shadow-lg transition cursor-pointer"
              onClick={() => {
                setSelectedAthlete(profile)
                setShowOfferForm(true)
              }}
            >
              <h3 className="text-xl font-bold mb-2">{profile.name}</h3>
              <p className="text-gray-600 mb-2">{profile.sport}</p>
              {profile.position && <p className="text-sm text-gray-500 mb-2">{profile.position}</p>}
              {profile.schoolTeam && (
                <p className="text-sm text-gray-500 mb-2">{profile.schoolTeam}</p>
              )}
              {profile.location && <p className="text-sm text-gray-500 mb-4">{profile.location}</p>}
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                Open to NIL
              </span>
            </div>
          ))}
        </div>

        {profiles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No athletes found open to NIL.</p>
          </div>
        )}

        {showOfferForm && selectedAthlete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold">
                  Send NIL Offer to {selectedAthlete.name}
                </h2>
                <button
                  onClick={() => {
                    setShowOfferForm(false)
                    setSelectedAthlete(null)
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSendOffer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Deliverables *
                  </label>
                  <textarea
                    value={offerForm.deliverables}
                    onChange={(e) =>
                      setOfferForm({ ...offerForm, deliverables: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 border rounded"
                    rows={4}
                    placeholder="Describe what you're asking the athlete to do..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Campaign Start Date *
                    </label>
                    <input
                      type="date"
                      value={offerForm.campaignStartDate}
                      onChange={(e) =>
                        setOfferForm({ ...offerForm, campaignStartDate: e.target.value })
                      }
                      required
                      className="w-full px-4 py-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Campaign End Date *
                    </label>
                    <input
                      type="date"
                      value={offerForm.campaignEndDate}
                      onChange={(e) =>
                        setOfferForm({ ...offerForm, campaignEndDate: e.target.value })
                      }
                      required
                      className="w-full px-4 py-2 border rounded"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Compensation Amount ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={offerForm.compensationAmount}
                    onChange={(e) =>
                      setOfferForm({ ...offerForm, compensationAmount: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 border rounded"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                  <textarea
                    value={offerForm.notes}
                    onChange={(e) => setOfferForm({ ...offerForm, notes: e.target.value })}
                    className="w-full px-4 py-2 border rounded"
                    rows={3}
                  />
                </div>
                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowOfferForm(false)
                      setSelectedAthlete(null)
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Send Offer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
