'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { offerApi, Offer } from '@/lib/api'

export default function BrandOffersPage() {
  const router = useRouter()
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null)

  useEffect(() => {
    loadOffers()
  }, [])

  const loadOffers = async () => {
    try {
      const response = await offerApi.getOffers()
      setOffers(response.offers)
    } catch (error: any) {
      if (error.message.includes('Authentication')) {
        router.push('/auth/login')
      }
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'ACCEPTED':
        return 'bg-green-100 text-green-800'
      case 'DECLINED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <div className="max-w-4xl mx-auto p-8">Loading offers...</div>
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My NIL Offers</h1>
          <p className="text-gray-600 mt-2">Track and manage your NIL offers to athletes</p>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          {offers.length === 0 ? (
            <p className="text-gray-500">No offers sent yet</p>
          ) : (
            <div className="space-y-4">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className="border border-gray-700 rounded-xl p-4 cursor-pointer hover:bg-gray-950"
                  onClick={() => setSelectedOffer(offer)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">
                        {offer.athlete?.name || 'Unknown Athlete'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Compensation: ${offer.compensationAmount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(offer.campaignStartDate).toLocaleDateString()} -{' '}
                        {new Date(offer.campaignEndDate).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${getStatusColor(offer.status)}`}
                    >
                      {offer.status}
                    </span>
                  </div>
                  {offer.deal && (
                    <p className="text-sm text-green-600 mt-2">
                      Deal Status: {offer.deal.status}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedOffer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold">Offer Details</h2>
                <button
                  onClick={() => setSelectedOffer(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">Athlete</h3>
                  <p>{selectedOffer.athlete?.name || 'Unknown'}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Deliverables</h3>
                  <p className="whitespace-pre-wrap">{selectedOffer.deliverables}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Campaign Dates</h3>
                  <p>
                    {new Date(selectedOffer.campaignStartDate).toLocaleDateString()} -{' '}
                    {new Date(selectedOffer.campaignEndDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold">Compensation</h3>
                  <p>${selectedOffer.compensationAmount.toLocaleString()}</p>
                </div>
                {selectedOffer.notes && (
                  <div>
                    <h3 className="font-semibold">Notes</h3>
                    <p className="whitespace-pre-wrap">{selectedOffer.notes}</p>
                  </div>
                )}
                <div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${getStatusColor(selectedOffer.status)}`}
                  >
                    {selectedOffer.status}
                  </span>
                </div>
                {selectedOffer.deal && (
                  <div>
                    <h3 className="font-semibold">Deal</h3>
                    <p>Status: {selectedOffer.deal.status}</p>
                    {selectedOffer.deal.completedAt && (
                      <p>Completed: {new Date(selectedOffer.deal.completedAt).toLocaleDateString()}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
