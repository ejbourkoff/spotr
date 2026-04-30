'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { authApi, removeToken } from '@/lib/api'

interface User {
  id: string
  email: string
  role: 'ATHLETE' | 'COACH' | 'BRAND'
  avatarUrl?: string | null
}

const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
)
const ReelIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
)
const DiscoverIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)
const ProfileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)
const MessageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
)
const OfferIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)
const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
)

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  match?: (path: string) => boolean
}

function getNavItems(role: User['role']): NavItem[] {
  if (role === 'ATHLETE') {
    return [
      { href: '/feed', label: 'Home', icon: <HomeIcon /> },
      { href: '/reels', label: 'Reels', icon: <ReelIcon />, match: (p) => p.startsWith('/reels') },
      { href: '/discover', label: 'Explore', icon: <DiscoverIcon /> },
      { href: '/messages', label: 'Messages', icon: <MessageIcon />, match: (p) => p.startsWith('/messages') },
      { href: '/athlete/profile', label: 'Profile', icon: <ProfileIcon />, match: (p) => p.startsWith('/athlete/profile') },
    ]
  }
  if (role === 'COACH') {
    return [
      { href: '/feed', label: 'Home', icon: <HomeIcon /> },
      { href: '/reels', label: 'Reels', icon: <ReelIcon />, match: (p) => p.startsWith('/reels') },
      { href: '/discover', label: 'Explore', icon: <DiscoverIcon /> },
      { href: '/messages', label: 'Messages', icon: <MessageIcon />, match: (p) => p.startsWith('/messages') },
      { href: '/coach/discover', label: 'Athletes', icon: <ProfileIcon />, match: (p) => p.startsWith('/coach/discover') || p.startsWith('/coach/onboarding') },
    ]
  }
  return [
    { href: '/feed', label: 'Home', icon: <HomeIcon /> },
    { href: '/reels', label: 'Reels', icon: <ReelIcon />, match: (p) => p.startsWith('/reels') },
    { href: '/brand/search', label: 'NIL Search', icon: <DiscoverIcon /> },
    { href: '/brand/offers', label: 'Offers', icon: <OfferIcon /> },
    { href: '/messages', label: 'Messages', icon: <MessageIcon />, match: (p) => p.startsWith('/messages') },
  ]
}

function initials(email: string) {
  return email.slice(0, 2).toUpperCase()
}

function roleBadge(role: User['role']) {
  const map = { ATHLETE: 'Athlete', COACH: 'Coach', BRAND: 'Brand' }
  const colors = { ATHLETE: 'bg-blue-500', COACH: 'bg-emerald-500', BRAND: 'bg-purple-500' }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full text-white font-medium ${colors[role]}`}>
      {map[role]}
    </span>
  )
}

export default function Navigation() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authApi.getMe().then((r) => setUser(r.user)).catch(() => setUser(null)).finally(() => setLoading(false))
  }, [])

  const handleLogout = () => {
    removeToken()
    router.push('/auth/login')
  }

  if (
    pathname === '/' ||
    pathname?.startsWith('/auth') ||
    pathname?.startsWith('/onboarding') ||
    pathname?.startsWith('/athletes/') ||
    pathname?.startsWith('/a/')
  ) return null

  // Unauthenticated top bar
  if (!user) {
    return (
      <header className="fixed top-0 inset-x-0 z-50 bg-gray-950/90 backdrop-blur border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-xl font-black tracking-tight text-white">
            <span className="text-brand">S</span>POT<span className="text-brand">R</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/auth/login" className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5">
              Log in
            </Link>
            <Link href="/auth/signup" className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg font-medium transition-colors">
              Get started
            </Link>
          </div>
        </div>
      </header>
    )
  }

  const navItems = getNavItems(user.role)

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-50 bg-gray-950/95 backdrop-blur border-b border-gray-800 h-12 flex items-center justify-between px-4">
        <Link href="/feed" className="text-xl font-black tracking-tight text-white">
          <span className="text-brand">S</span>POT<span className="text-brand">R</span>
        </Link>
        <Link href="/post/create" className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D0D0F" strokeWidth={2.5}>
            <path strokeLinecap="round" d="M12 5v14M5 12h14" />
          </svg>
        </Link>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 h-full w-60 bg-gray-950 border-r border-gray-800 flex-col z-50">
        <div className="px-6 py-5 border-b border-gray-800">
          <Link href="/feed" className="text-2xl font-black tracking-tight text-white">
            <span className="text-brand">S</span>POT<span className="text-brand">R</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = item.match ? item.match(pathname || '') : pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-3 border-t border-gray-800">
          <Link href="/post/create"
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-brand text-spotr-black font-display font-black italic uppercase text-sm w-full"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D0D0F" strokeWidth={2.5}>
              <path strokeLinecap="round" d="M12 5v14M5 12h14" />
            </svg>
            New Post
          </Link>
        </div>
        <div className="px-4 py-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden">
              {user.avatarUrl
                ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                : initials(user.email)
              }
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
              <div className="mt-0.5">{roleBadge(user.role)}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
          >
            <LogoutIcon />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-gray-950 border-t border-gray-800 flex">
        {navItems.map((item) => {
          const active = item.match ? item.match(pathname || '') : pathname === item.href
          return (
            <Link key={item.href} href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-medium transition-colors ${active ? 'text-brand' : 'text-gray-500'}`}
            >
              <span className={active ? 'text-brand' : 'text-gray-500'}>{item.icon}</span>
              <span className="text-[10px]">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
