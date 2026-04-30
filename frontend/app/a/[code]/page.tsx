import { redirect } from 'next/navigation'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export default async function ShortLinkPage({ params }: { params: { code: string } }) {
  // Server-side: look up the code and redirect
  try {
    const res = await fetch(`${API_BASE}/public/s/${params.code}`, { redirect: 'manual' })
    if (res.status === 302 || res.status === 301) {
      const location = res.headers.get('location')
      if (location) redirect(location)
    }
  } catch {}

  // Fallback branded 404
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 text-center px-4">
      <p className="text-3xl font-black text-white">SPOTR</p>
      <p className="text-gray-400">This athlete profile link has expired or doesn't exist.</p>
      <a href="/auth/signup?role=COACH" className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors">
        Sign up as a coach
      </a>
    </div>
  )
}
