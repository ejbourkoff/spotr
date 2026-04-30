'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

interface Message {
  id: string
  senderId: string
  receiverId: string
  subject: string
  body: string
  readAt: string | null
  createdAt: string
  sender: {
    email: string
    athleteProfile?: { name: string } | null
    coachProfile?: { name: string } | null
    brandProfile?: { name: string } | null
  }
  receiver: {
    email: string
    athleteProfile?: { name: string } | null
    coachProfile?: { name: string } | null
    brandProfile?: { name: string } | null
  }
}

function senderName(msg: Message) {
  return (
    msg.sender.athleteProfile?.name ||
    msg.sender.coachProfile?.name ||
    msg.sender.brandProfile?.name ||
    msg.sender.email
  )
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function InboxPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Message | null>(null)
  const [composing, setComposing] = useState(false)
  const [form, setForm] = useState({ receiverEmail: '', subject: '', body: '' })
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    authApi.getMe()
      .catch(() => router.push('/auth/login'))

    apiFetch('/messages')
      .then((d) => setMessages(d.messages || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [router])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError('')
    try {
      await apiFetch('/messages', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      setComposing(false)
      setForm({ receiverEmail: '', subject: '', body: '' })
      const d = await apiFetch('/messages')
      setMessages(d.messages || [])
    } catch (err: any) {
      setError(err.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
            <p className="text-sm text-gray-500 mt-0.5">Messages and NIL communications</p>
          </div>
          <button
            onClick={() => setComposing(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Compose
          </button>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          {/* Compose modal */}
          {composing && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg p-6">
                <h2 className="text-lg font-bold mb-4">New Message</h2>
                {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
                <form onSubmit={handleSend} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">To (email address)</label>
                    <input
                      type="email"
                      required
                      value={form.receiverEmail}
                      onChange={(e) => setForm({ ...form, receiverEmail: e.target.value })}
                      placeholder="recipient@spotr.com"
                      className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
                    <input
                      type="text"
                      required
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder="NIL Partnership Opportunity"
                      className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Message</label>
                    <textarea
                      required
                      value={form.body}
                      onChange={(e) => setForm({ ...form, body: e.target.value })}
                      rows={5}
                      className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setComposing(false)}
                      className="flex-1 py-2.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={sending}
                      className="flex-1 py-2.5 text-sm text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl font-medium transition-colors"
                    >
                      {sending ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Message thread */}
          {selected ? (
            <div>
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800">
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{selected.subject}</p>
                  <p className="text-xs text-gray-400">from {senderName(selected)}</p>
                </div>
              </div>
              <div className="px-5 py-6">
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{selected.body}</p>
                <p className="text-xs text-gray-400 mt-4">{new Date(selected.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="font-medium">No messages yet</p>
              <p className="text-sm mt-1">Compose a message to get started</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {messages.map((msg) => (
                <li key={msg.id}>
                  <button
                    className={`w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-gray-950 transition-colors ${!msg.readAt ? 'bg-blue-500/5' : ''}`}
                    onClick={() => setSelected(msg)}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                      {senderName(msg)[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className={`text-sm ${!msg.readAt ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {senderName(msg)}
                        </p>
                        <p className="text-xs text-gray-400 flex-shrink-0 ml-2">{timeAgo(msg.createdAt)}</p>
                      </div>
                      <p className={`text-sm truncate ${!msg.readAt ? 'text-gray-800 font-medium' : 'text-gray-600'}`}>
                        {msg.subject}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{msg.body}</p>
                    </div>
                    {!msg.readAt && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}
