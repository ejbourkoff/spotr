'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authApi, setToken } from '@/lib/api'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'ATHLETE' | 'COACH' | 'BRAND' | 'FAN'>('ATHLETE')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const r = searchParams.get('role')
    if (r === 'COACH') setRole('COACH')
    else if (r === 'BRAND') setRole('BRAND')
    else if (r === 'FAN') setRole('FAN')
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await authApi.signup(email, password, role)
      setToken(response.token)
      router.push('/onboarding')
    } catch (err: any) {
      setError(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-spotr-black flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link href="/" className="block font-display font-black italic text-3xl uppercase tracking-wide text-spotr-white mb-8">
          <span className="text-brand">S</span>POTR
        </Link>
        <h1 className="font-display font-black italic text-4xl uppercase text-spotr-white mb-2 leading-none">
          CREATE YOUR<br /><span className="text-brand">ACCOUNT</span>
        </h1>
        <p className="text-spotr-white/40 text-sm mb-8 font-mono uppercase tracking-widest">Your profile awaits</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-700/50 text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="role" className="block text-xs font-mono font-bold uppercase tracking-widest text-spotr-white/40 mb-2">I am a...</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'ATHLETE' | 'COACH' | 'BRAND' | 'FAN')}
              className="w-full px-4 py-3 bg-spotr-white/5 border border-spotr-white/10 text-spotr-white rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50 appearance-none"
            >
              <option value="ATHLETE">Athlete</option>
              <option value="COACH">Coach / Scout</option>
              <option value="BRAND">Brand / Collective</option>
              <option value="FAN">Fan</option>
            </select>
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-mono font-bold uppercase tracking-widest text-spotr-white/40 mb-2">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-4 py-3 bg-spotr-white/5 border border-spotr-white/10 text-spotr-white placeholder-spotr-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-mono font-bold uppercase tracking-widest text-spotr-white/40 mb-2">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="At least 8 characters"
              className="w-full px-4 py-3 bg-spotr-white/5 border border-spotr-white/10 text-spotr-white placeholder-spotr-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-brand disabled:opacity-50 text-spotr-black font-display font-black italic text-lg uppercase tracking-wider rounded-xl transition-opacity hover:opacity-90"
          >
            {loading ? 'Creating account…' : 'Get started →'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-spotr-white/30">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-brand hover:opacity-80">Log in</Link>
        </p>
      </div>
    </main>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
