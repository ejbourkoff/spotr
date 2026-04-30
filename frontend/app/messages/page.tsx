'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

interface ContactUser {
  id: string
  email: string
  athleteProfile?: { name: string; sport?: string; position?: string }
  coachProfile?: { name: string; organization?: string }
  brandProfile?: { name: string; organizationType?: string }
  connected?: boolean
  iFollow?: boolean
  theyFollow?: boolean
}

interface Message {
  id: string
  subject: string
  body: string
  readAt: string | null
  createdAt: string
  sender: {
    email: string
    athleteProfile?: { name: string }
    coachProfile?: { name: string }
    brandProfile?: { name: string }
  }
  receiver: {
    email: string
    athleteProfile?: { name: string }
    coachProfile?: { name: string }
    brandProfile?: { name: string }
  }
}

type Filter = 'all' | 'requests' | 'brands' | 'coaches' | 'athletes' | 'unread'

function displayName(u: Message['sender']) {
  return u.athleteProfile?.name || u.coachProfile?.name || u.brandProfile?.name || u.email
}

function initials(name: string) {
  const parts = name.split(' ')
  return parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2)
}

function timeAgo(date: string) {
  const d = Date.now() - new Date(date).getTime()
  const m = Math.floor(d / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const days = Math.floor(h / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(date).getDay()]
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getRole(u: Message['sender']): 'brand' | 'coach' | 'athlete' | null {
  if (u.brandProfile) return 'brand'
  if (u.coachProfile) return 'coach'
  if (u.athleteProfile) return 'athlete'
  return null
}

function getIntent(subject: string, body: string): { label: string; cls: string } | null {
  const text = (subject + ' ' + body).toLowerCase()
  if (text.includes('offer') || text.includes('contract') || text.includes('deal') || text.includes('sponsor')) {
    return { label: 'Offer', cls: 'bg-[#00E87A]/12 text-[#00E87A]' }
  }
  if (text.includes('collab') || text.includes('campaign') || text.includes('partner') || text.includes('creative')) {
    return { label: 'Collab', cls: 'bg-indigo-500/12 text-indigo-400' }
  }
  if (text.includes('recruit') || text.includes('combine') || text.includes('pro day') || text.includes('scout') || text.includes('highlight')) {
    return { label: 'Scout', cls: 'bg-orange-500/12 text-orange-400' }
  }
  if (text.includes('film') || text.includes('review') || text.includes('practice') || text.includes('schedule')) {
    return { label: 'Film', cls: 'bg-white/8 text-white/40' }
  }
  return null
}

const ROLE_AVATAR: Record<string, string> = {
  brand: 'from-[#00E87A] to-[#009950]',
  coach: 'from-orange-400 to-orange-600',
  athlete: 'from-violet-400 to-violet-700',
}
const FALLBACK_GRADIENTS = [
  'from-blue-400 to-blue-600',
  'from-pink-400 to-rose-600',
  'from-amber-400 to-amber-600',
  'from-teal-400 to-teal-600',
]
function avatarGradient(name: string, role: ReturnType<typeof getRole>) {
  if (role && ROLE_AVATAR[role]) return ROLE_AVATAR[role]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return FALLBACK_GRADIENTS[h % FALLBACK_GRADIENTS.length]
}

function displayNameFromContact(c: ContactUser) {
  return c.athleteProfile?.name || c.coachProfile?.name || c.brandProfile?.name || c.email
}

function ContactRow({ contact, onSelect }: { contact: ContactUser; onSelect: () => void }) {
  const name = displayNameFromContact(contact)
  const role = contact.brandProfile ? 'brand' : contact.coachProfile ? 'coach' : contact.athleteProfile ? 'athlete' : null
  const sub = contact.coachProfile?.organization || contact.athleteProfile?.sport || contact.brandProfile?.organizationType || ''
  const grad = role === 'brand' ? 'from-[#00E87A] to-[#009950]'
    : role === 'coach' ? 'from-orange-400 to-orange-600'
    : role === 'athlete' ? 'from-violet-400 to-violet-700'
    : 'from-blue-400 to-blue-600'
  const ROLE_PILL: Record<string, string> = {
    brand: 'bg-[#00E87A]/12 text-[#00E87A]',
    coach: 'bg-orange-500/12 text-orange-400',
    athlete: 'bg-violet-500/10 text-violet-400',
  }
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.05] transition-colors text-left"
    >
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center font-display font-black italic text-base text-spotr-black uppercase flex-shrink-0`}>
        {initials(name).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-spotr-white truncate">{name}</span>
          {role && <span className={`font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${ROLE_PILL[role]}`}>{role}</span>}
          {contact.connected && (
            <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded flex-shrink-0 bg-brand/12 text-brand">Connected</span>
          )}
        </div>
        {sub && <span className="text-[11px] text-spotr-white/35 truncate block">{sub}</span>}
      </div>
    </button>
  )
}

export default function MessagesPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [myEmail, setMyEmail] = useState('')
  const [myId, setMyId] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<Message | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [sending, setSending] = useState(false)
  const [selectedContact, setSelectedContact] = useState<ContactUser | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ContactUser[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showDrop, setShowDrop] = useState(false)
  const [sendFollowReq, setSendFollowReq] = useState(false)
  const toInputRef = useRef<HTMLInputElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/auth/login'); return }
    fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => {
        if (d.user?.email) setMyEmail(d.user.email)
        if (d.user?.id) setMyId(d.user.id)
      }).catch(() => {})
    loadMessages(token)
  }, [router])

  const loadMessages = async (token?: string) => {
    const t = token || localStorage.getItem('token')
    if (!t) return
    try {
      const r = await fetch(`${API_BASE}/messages`, { headers: { Authorization: `Bearer ${t}` } })
      const d = await r.json()
      setMessages(d.messages || [])
    } catch {}
    setLoading(false)
  }

  const markRead = async (msg: Message) => {
    if (!msg.readAt && msg.receiver?.email === myEmail) {
      const token = localStorage.getItem('token')
      await fetch(`${API_BASE}/messages/${msg.id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, readAt: new Date().toISOString() } : m))
    }
    setSelected(msg)
  }

  const openCompose = (prefillContact: ContactUser | null = null, prefillSubject = '') => {
    setSelectedContact(prefillContact)
    setSearchQuery(prefillContact ? displayNameFromContact(prefillContact) : '')
    setComposeSubject(prefillSubject)
    setComposeBody('')
    setSearchResults([])
    setShowDrop(false)
    setSendFollowReq(false)
    setShowCompose(true)
  }

  const handleSearchInput = (val: string) => {
    setSearchQuery(val)
    setSelectedContact(null)
    setSendFollowReq(false)
    if (!val.trim()) { setSearchResults([]); setShowDrop(false); return }
    setShowDrop(true)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    setSearchLoading(true)
    searchTimer.current = setTimeout(async () => {
      const token = localStorage.getItem('token')
      try {
        const r = await fetch(`${API_BASE}/users/search?q=${encodeURIComponent(val.trim())}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const d = await r.json()
        setSearchResults(d.users || [])
      } catch {}
      setSearchLoading(false)
    }, 300)
  }

  const selectContact = (c: ContactUser) => {
    setSelectedContact(c)
    setSearchQuery(displayNameFromContact(c))
    setShowDrop(false)
    setSendFollowReq(!c.connected && !c.iFollow)
  }

  const send = async () => {
    if (!selectedContact || !composeBody.trim()) return
    setSending(true)
    const token = localStorage.getItem('token')
    try {
      // Optionally send follow request first
      if (sendFollowReq && selectedContact.id) {
        await fetch(`${API_BASE}/users/${selectedContact.id}/follow`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {})
      }
      const r = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: selectedContact.id,
          subject: composeSubject.trim() || 'Message',
          body: composeBody.trim(),
        }),
      })
      if (!r.ok) {
        const d = await r.json()
        alert(d.error || 'Failed to send')
      } else {
        setShowCompose(false)
        setSelectedContact(null)
        setSearchQuery('')
        setComposeSubject('')
        setComposeBody('')
        setShowDrop(false)
        setSendFollowReq(false)
        loadMessages()
      }
    } catch { alert('Failed to send') }
    setSending(false)
  }

  const threads = messages.map(msg => {
    const isReceived = msg.receiver?.email === myEmail
    const other = isReceived ? msg.sender : msg.receiver
    const role = getRole(other)
    const unread = isReceived && !msg.readAt
    return { msg, other, role, unread, isReceived }
  })

  const requestCount = threads.filter(t => t.unread && t.isReceived).length


  const filtered = threads.filter(t => {
    if (filter === 'requests') return t.unread && t.isReceived
    if (filter === 'brands') return t.role === 'brand'
    if (filter === 'coaches') return t.role === 'coach'
    if (filter === 'athletes') return t.role === 'athlete'
    if (filter === 'unread') return t.unread
    return true
  })

  const unreadCount = threads.filter(t => t.unread).length
  const unreadThreads = filtered.filter(t => t.unread)
  const readThreads = filtered.filter(t => !t.unread)

  const ROLE_PILL: Record<string, string> = {
    brand: 'bg-[#00E87A]/12 text-[#00E87A]',
    coach: 'bg-orange-500/12 text-orange-400',
    athlete: 'bg-violet-500/10 text-violet-400',
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-spotr-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  const ThreadRow = ({ msg, other, role, unread, isReceived }: typeof threads[0]) => {
    const name = displayName(other)
    const intent = getIntent(msg.subject, msg.body)
    const grad = avatarGradient(name, role)
    const orgText = other.brandProfile ? 'Brand' : other.coachProfile ? 'Coach' : other.athleteProfile ? 'Athlete' : null

    return (
      <button
        onClick={() => markRead(msg)}
        className="w-full flex gap-3 px-5 py-3 text-left active:bg-white/[0.03] transition-colors"
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className={`
            w-[52px] h-[52px] rounded-2xl bg-gradient-to-br ${grad}
            flex items-center justify-center
            font-display font-black italic text-xl text-spotr-black uppercase
            ${unread ? 'ring-2 ring-brand ring-offset-1 ring-offset-spotr-black' : ''}
          `}>
            {initials(name).toUpperCase()}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-0.5">
            <span className={`text-[15px] font-bold truncate max-w-[200px] ${unread ? 'text-spotr-white' : 'text-spotr-white/60'}`}>
              {name}
            </span>
            <span className={`font-mono text-[11px] flex-shrink-0 ml-2 ${unread ? 'text-brand font-bold' : 'text-spotr-white/30'}`}>
              {timeAgo(msg.createdAt)}
            </span>
          </div>

          {/* Role + org line */}
          {role && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className={`font-mono text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded ${ROLE_PILL[role]}`}>
                {role}
              </span>
              {orgText && <span className="text-[11px] text-spotr-white/35">{orgText}</span>}
            </div>
          )}

          {/* Bubble preview */}
          <div className={`
            rounded-tl-none rounded-tr-[10px] rounded-bl-[10px] rounded-br-[10px]
            px-2.5 py-1.5 text-[12px] leading-snug
            truncate
            ${unread ? 'bg-brand/8 text-spotr-white/80' : 'bg-white/[0.06] text-spotr-white/50'}
          `}>
            {intent && (
              <span className={`inline font-mono text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded mr-1.5 ${intent.cls}`}>
                {intent.label}
              </span>
            )}
            {!isReceived && <span className="text-spotr-white/35">You: </span>}
            {msg.body}
          </div>
        </div>
      </button>
    )
  }

  return (
    <main className="min-h-screen bg-spotr-black">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="px-5 pt-4 pb-0">
          <div className="flex justify-between items-center mb-3">
            <h1 className="font-display font-black italic text-4xl uppercase tracking-tight text-spotr-white">DMs</h1>
            <div className="flex gap-2 items-center">
              <button className="w-[34px] h-[34px] rounded-full bg-white/[0.07] flex items-center justify-center text-spotr-white/70">
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path strokeLinecap="round" d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </button>
              <button
                onClick={() => openCompose()}
                className="w-[34px] h-[34px] rounded-full bg-brand flex items-center justify-center text-spotr-black"
              >
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M12 5v14M5 12h14"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-spotr-white/30" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              readOnly
              placeholder="Search messages…"
              className="w-full h-[38px] bg-white/[0.06] border border-white/[0.08] rounded-[10px] pl-9 pr-4 text-[13px] text-spotr-white/40 font-sans placeholder:text-spotr-white/30 outline-none"
            />
          </div>

          {/* Filter chips */}
          <div className="flex gap-1.5 pb-3 overflow-x-auto scrollbar-hide">
            {([
              { key: 'all', label: 'All' },
              { key: 'requests', label: 'Requests', count: requestCount },
              { key: 'brands', label: '● Brands' },
              { key: 'coaches', label: '● Coaches' },
              { key: 'athletes', label: '● Athletes' },
              { key: 'unread', label: `Unread · ${unreadCount}` },
            ] as { key: Filter; label: string; count?: number }[]).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`relative flex-shrink-0 h-7 px-3 rounded-full font-mono text-[11px] font-bold uppercase tracking-wide transition-colors ${
                  filter === key
                    ? 'bg-brand text-spotr-black'
                    : 'bg-white/[0.07] text-spotr-white/50'
                }`}
              >
                {label}
                {count != null && count > 0 && filter !== key && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white font-mono text-[9px] font-bold flex items-center justify-center border-2 border-spotr-black">
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.06] flex items-center justify-center mb-4">
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-spotr-white/30" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-spotr-white font-bold text-base">No messages yet</p>
            <p className="text-spotr-white/40 text-sm mt-1 mb-6">Start a conversation with a coach or brand.</p>
            <button
              onClick={() => openCompose()}
              className="px-6 py-2.5 bg-brand text-spotr-black rounded-xl font-bold text-sm"
            >
              New Message
            </button>
          </div>
        )}

        {/* Unread section */}
        {unreadThreads.length > 0 && (
          <>
            <div className="flex items-center gap-3 px-5 py-2">
              <div className="flex-1 h-px bg-brand/25" />
              <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-brand">
                {unreadThreads.length} new
              </span>
              <div className="flex-1 h-px bg-brand/25" />
            </div>
            {unreadThreads.map(t => (
              <div key={t.msg.id}>
                <ThreadRow {...t} />
                <div className="h-px bg-white/[0.05] mx-5" />
              </div>
            ))}
          </>
        )}

        {/* Earlier section */}
        {readThreads.length > 0 && (
          <>
            {unreadThreads.length > 0 && (
              <div className="flex items-center gap-3 px-5 py-2 mt-1">
                <div className="flex-1 h-px bg-white/[0.07]" />
                <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-spotr-white/25">Earlier</span>
                <div className="flex-1 h-px bg-white/[0.07]" />
              </div>
            )}
            {readThreads.map(t => (
              <div key={t.msg.id}>
                <ThreadRow {...t} />
                <div className="h-px bg-white/[0.05] mx-5" />
              </div>
            ))}
          </>
        )}
      </div>

      {/* Message detail */}
      {selected && (() => {
        const isReceived = selected.receiver?.email === myEmail
        const other = isReceived ? selected.sender : selected.receiver
        const role = getRole(other)
        const name = displayName(other)
        const grad = avatarGradient(name, role)
        return (
          <div className="fixed inset-0 bg-black/75 flex items-end sm:items-center justify-center z-50">
            <div className="bg-[#161618] border border-white/10 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl p-6 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center font-display font-black italic text-lg text-spotr-black uppercase flex-shrink-0`}>
                  {initials(name).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-spotr-white text-sm">{name}</p>
                  {role && (
                    <span className={`font-mono text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded ${ROLE_PILL[role]}`}>
                      {role}
                    </span>
                  )}
                </div>
                <button onClick={() => setSelected(null)} className="text-spotr-white/40 hover:text-spotr-white p-1">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {selected.subject && selected.subject !== 'Message' && (
                <h2 className="font-bold text-spotr-white text-base mb-3">{selected.subject}</h2>
              )}
              <p className="text-spotr-white/70 text-sm leading-relaxed whitespace-pre-wrap">{selected.body}</p>
              <p className="font-mono text-[10px] text-spotr-white/25 mt-4">
                {new Date(selected.createdAt).toLocaleString()}
              </p>
              {isReceived && (
                <button
                  onClick={() => {
                    const replyContact: ContactUser = {
                      id: '',
                      email: selected.sender.email,
                      athleteProfile: selected.sender.athleteProfile,
                      coachProfile: selected.sender.coachProfile,
                      brandProfile: selected.sender.brandProfile,
                      connected: true,
                    }
                    setSelected(null)
                    openCompose(replyContact, `Re: ${selected.subject}`)
                  }}
                  className="mt-4 w-full py-3 bg-brand text-spotr-black rounded-xl text-sm font-bold"
                >
                  Reply
                </button>
              )}
            </div>
          </div>
        )
      })()}

      {/* Compose */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/75 flex items-end sm:items-center justify-center z-50" onClick={() => setShowDrop(false)}>
          <div className="bg-[#161618] border border-white/10 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-black italic text-xl uppercase text-spotr-white">New DM</h2>
              <button onClick={() => setShowCompose(false)} className="text-spotr-white/40 hover:text-spotr-white p-1">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              {/* To field */}
              <div className="relative">
                <div className={`flex items-center gap-2 px-4 bg-white/[0.06] border rounded-xl transition-colors ${showDrop ? 'border-brand/40' : 'border-white/[0.08]'}`}>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-spotr-white/30 flex-shrink-0">To</span>
                  {selectedContact ? (
                    // Pill showing selected person
                    <div className="flex-1 flex items-center gap-2 py-3">
                      <span className="text-sm font-semibold text-spotr-white">{displayNameFromContact(selectedContact)}</span>
                      {selectedContact.connected && (
                        <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded bg-brand/12 text-brand">Connected</span>
                      )}
                    </div>
                  ) : (
                    <input
                      ref={toInputRef}
                      value={searchQuery}
                      onChange={e => handleSearchInput(e.target.value)}
                      onFocus={() => { if (searchQuery) setShowDrop(true) }}
                      placeholder="Search by name…"
                      autoFocus
                      className="flex-1 h-12 bg-transparent text-spotr-white placeholder:text-spotr-white/25 text-sm outline-none"
                    />
                  )}
                  {(selectedContact || searchQuery) && (
                    <button
                      onClick={() => { setSelectedContact(null); setSearchQuery(''); setSearchResults([]); setShowDrop(false); setSendFollowReq(false); setTimeout(() => toInputRef.current?.focus(), 50) }}
                      className="text-spotr-white/30 hover:text-spotr-white/60 flex-shrink-0"
                    >
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  )}
                </div>

                {/* Search dropdown */}
                {showDrop && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-[#1c1c1e] border border-white/[0.1] rounded-xl overflow-hidden z-10 shadow-2xl max-h-64 overflow-y-auto">
                    {searchLoading && (
                      <div className="flex items-center justify-center py-4">
                        <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {!searchLoading && searchResults.length === 0 && searchQuery.length >= 1 && (
                      <div className="px-4 py-4 text-sm text-spotr-white/30 text-center">No users found</div>
                    )}
                    {!searchLoading && searchResults.map(c => (
                      <ContactRow key={c.id} contact={c} onSelect={() => selectContact(c)} />
                    ))}
                  </div>
                )}
              </div>

              {/* Not-connected notice + follow request toggle */}
              {selectedContact && !selectedContact.connected && (
                <div className="flex items-start gap-3 px-3 py-2.5 bg-white/[0.04] rounded-xl border border-white/[0.07]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(244,244,240,0.4)" strokeWidth={2} className="flex-shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-spotr-white/50 leading-snug">
                      {selectedContact.iFollow
                        ? "You follow them but they haven't followed back — message goes to their Requests."
                        : "Not connected — message will land in their Requests inbox."}
                    </p>
                    <button
                      onClick={() => setSendFollowReq(v => !v)}
                      className="mt-2 flex items-center gap-2 text-[12px] font-semibold text-spotr-white/70"
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${sendFollowReq ? 'bg-brand border-brand' : 'border-white/30 bg-transparent'}`}>
                        {sendFollowReq && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0D0D0F" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                      </div>
                      Also send a follow request
                    </button>
                  </div>
                </div>
              )}

              <input
                value={composeSubject}
                onChange={e => setComposeSubject(e.target.value)}
                placeholder="Subject (optional)"
                className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.08] text-spotr-white placeholder:text-spotr-white/25 rounded-xl text-sm outline-none focus:border-brand/40"
              />
              <textarea
                value={composeBody}
                onChange={e => setComposeBody(e.target.value)}
                placeholder="Write a message…"
                rows={5}
                className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.08] text-spotr-white placeholder:text-spotr-white/25 rounded-xl text-sm outline-none focus:border-brand/40 resize-none"
              />
            </div>

            <button
              onClick={send}
              disabled={sending || !selectedContact || !composeBody.trim()}
              className="mt-4 w-full py-3 bg-brand disabled:opacity-40 text-spotr-black rounded-xl text-sm font-bold"
            >
              {sending ? 'Sending…' : sendFollowReq ? 'Send + Follow Request' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
