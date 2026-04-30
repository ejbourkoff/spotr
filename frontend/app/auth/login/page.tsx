'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authApi, setToken } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await authApi.login(email, password)
      setToken(response.token)
      if (response.user.role === 'ATHLETE') {
        router.push('/feed')
      } else if (response.user.role === 'COACH') {
        router.push('/coach/discover')
      } else if (response.user.role === 'BRAND') {
        router.push('/brand/search')
      } else {
        router.push('/feed')
      }
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-2xl font-black text-white mb-8">SPOTR</Link>
        <h1 className="text-2xl font-bold text-white mb-6">Log in</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white placeholder-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Your password"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white placeholder-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
          >
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500">
          Don't have an account?{' '}
          <Link href="/auth/signup" className="text-blue-400 hover:text-blue-300">Sign up</Link>
        </p>
      </div>
    </main>
  )
}
