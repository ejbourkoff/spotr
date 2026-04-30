'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { offerApi, Offer } from '@/lib/api'

export default function InboxPage() {
  const router = useRouter()
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null)

  useEffect(() => { loadOffers() }, [])

  const loadOffers = async () => {
    try {
      const response = await offerApi.getOffers()
      setOffers(response.offers)
    } catch (error: any) {
      if (error.message.includes('Authentication')) router.push('/auth/login')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (offerId: string) => {
    if (!confirm('Accept this offer?')) return
    try {
      await offerApi.acceptOffer(offerId)
      loadOffers()
      setSelectedOffer(null)
    } catch (error: any) {
      alert(error.message || 'Failed to accept offer')
    }
  }

  const handleDecline = async (offerId: string) => {
    if (!confirm('Decline this offer?')) return
    try {
      await offerApi.declineOffer(offerId)
      loadOffers()
      setSelectedOffer(null)
    } catch (error: any) {
      alert(error.message || 'Failed to decline offer')
    }
  }

  const statusBadge = (status: string) => {
    if (status === 'PENDING') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    if (status === 'ACCEPTED') return 'bg-green-500/10 text-green-400 border-green-500/20'
    return 'bg-red-500/10 text-red-400 border-red-500/20'
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950">
      <div className="max-w-2xl mx-auto px-4 py-5">
        <div className="hidden md:block mb-6">
          <h1 className="text-2xl font-bold text-white">Inbox</h1>
          <p className="text-gray-500 text-sm mt-1">NIL offers from brands</p>
        </div>

        {offers.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-900 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-gray-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-white font-semibold">No offers yet</p>
            <p className="text-gray-500 text-sm mt-1">Brand deals will appear here when brands reach out.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {offers.map((offer) => (
              <button
                key={offer.id}
                onClick={() => setSelectedOffer(offer)}
                className="w-full text-left bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-gray-700 active:bg-gray-800 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{offer.brand?.name || 'Brand'}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{offer.deliverables}</p>
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusBadge(offer.status)}`}>
                      {offer.status}
                    </span>
                    <span className="text-sm font-bold text-white">${offer.compensationAmount.toLocaleString()}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Offer detail modal */}
      {selectedOffer && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Offer Details</h2>
              <button onClick={() => setSelectedOffer(null)} className="text-gray-500 hover:text-white p-1 transition-colors">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Brand</p>
                <p className="text-white font-medium">{selectedOffer.brand?.name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Deliverables</p>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{selectedOffer.deliverables}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Start</p>
                  <p className="text-white text-sm">{new Date(selectedOffer.campaignStartDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">End</p>
                  <p className="text-white text-sm">{new Date(selectedOffer.campaignEndDate).toLocaleDateString()}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Compensation</p>
                <p className="text-2xl font-bold text-white">${selectedOffer.compensationAmount.toLocaleString()}</p>
              </div>
              {selectedOffer.notes && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{selectedOffer.notes}</p>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className={`text-xs px-2 py-1 rounded-full border font-medium ${statusBadge(selectedOffer.status)}`}>
                  {selectedOffer.status}
                </span>
              </div>
            </div>

            {selectedOffer.status === 'PENDING' && (
              <div className="flex gap-3 mt-6 pt-5 border-t border-gray-800">
                <button
                  onClick={() => handleDecline(selectedOffer.id)}
                  className="flex-1 py-3 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600 rounded-xl text-sm font-semibold transition-colors"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleAccept(selectedOffer.id)}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Accept Offer
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
