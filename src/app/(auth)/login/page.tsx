'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

/* ── 역할별 사용자 목록 ── */
const QUICK_USERS = [
  { email: 'hun.sinabro@gmail.com',         name: 'leehun',           role: 'ceo',        icon: '👔', label: '대표 / GĐ',        color: 'from-red-500 to-rose-600' },
  { email: 'hoale.sinabro@gmail.com',        name: 'HOA LE',           role: 'director_m',  icon: '🏢', label: '관리임원 / QL',     color: 'from-purple-500 to-violet-600' },
  { email: 'nguyenkhiet.sinabro@gmail.com', name: 'NGUYEN QUANG KHIET', role: 'director_f', icon: '🏗️', label: '현장임원 / CT',     color: 'from-indigo-500 to-blue-600' },
  { email: 'test2.sinabro@gmail.com',       name: 'test2_회계',       role: 'account',     icon: '💰', label: '회계 / KT',         color: 'from-emerald-500 to-teal-600' },
  { email: 'test3.sinabro@gmail.com',       name: 'test3_총무',       role: 'hr',          icon: '👥', label: '인사총무 / HC',     color: 'from-cyan-500 to-sky-600' },
  { email: 'test4.sinabro@gmail.com',       name: 'test4_공무',       role: 'qs',          icon: '📐', label: '공무 / QS',         color: 'from-amber-500 to-orange-600' },
  { email: 'test1.sinabro@gmail.com',       name: 'test1_현장기술자', role: 'engineer',    icon: '🔧', label: '현장소장 / KS',     color: 'from-blue-500 to-indigo-600' },
  { email: 'test5.sinabro@gmail.com',       name: 'test5_운전기사',   role: 'driver',      icon: '🚗', label: '운전기사 / TX',     color: 'from-gray-500 to-slate-600' },
]

const DEFAULT_PW = 'sinabro1234'

export default function LoginPage() {
  const router = useRouter()
  const login = useAuthStore((s) => s.login)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingUser, setLoadingUser] = useState<string | null>(null)
  const [showManual, setShowManual] = useState(false)

  /* 빠른 로그인 */
  const quickLogin = async (userEmail: string) => {
    setError('')
    setLoadingUser(userEmail)
    const result = await login(userEmail, DEFAULT_PW)
    if (result.error) {
      setError(`${userEmail}: ${result.error}`)
      setLoadingUser(null)
    } else {
      router.push('/home')
    }
  }

  /* 수동 로그인 */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(email, password)
    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push('/home')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Branding */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            시나브로 ERP
          </h1>
          <p className="mt-2 text-gray-400 text-sm">
            Sinabro Vina Co., Ltd — Chọn vai trò để đăng nhập / 역할을 선택하세요
          </p>
        </div>

        {/* Quick Login Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {QUICK_USERS.map((u) => (
            <button
              key={u.email}
              onClick={() => quickLogin(u.email)}
              disabled={loadingUser !== null}
              className={`
                relative overflow-hidden rounded-xl p-4 text-left transition-all duration-200
                bg-gradient-to-br ${u.color}
                hover:scale-[1.03] hover:shadow-lg hover:shadow-black/30
                active:scale-[0.98]
                disabled:opacity-60 disabled:cursor-not-allowed
                ${loadingUser === u.email ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''}
              `}
            >
              {/* Loading spinner overlay */}
              {loadingUser === u.email && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-xl">
                  <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              )}

              <div className="text-2xl mb-2">{u.icon}</div>
              <div className="text-white font-bold text-sm leading-tight truncate">
                {u.name}
              </div>
              <div className="text-white/70 text-[11px] mt-1 font-medium">
                {u.label}
              </div>
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="text-red-400 text-sm bg-red-900/30 border border-red-800 rounded-lg px-4 py-2.5 mb-4 text-center">
            {error}
          </div>
        )}

        {/* Manual Login Toggle */}
        <div className="text-center">
          <button
            onClick={() => setShowManual(!showManual)}
            className="text-gray-500 hover:text-gray-300 text-xs transition"
          >
            {showManual ? '▲ 닫기' : '▼ 이메일/비밀번호로 직접 로그인'}
          </button>
        </div>

        {/* Manual Login Form */}
        {showManual && (
          <div className="mt-4 bg-gray-800 border border-gray-700 rounded-xl p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@sinabro.com"
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                  Mật khẩu / 비밀번호
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Đang đăng nhập...
                  </>
                ) : (
                  'Đăng nhập / 로그인'
                )}
              </button>
            </form>
          </div>
        )}

        {/* Version */}
        <p className="mt-6 text-center text-xs text-gray-600">
          v16.0 — Next.js React
        </p>
      </div>
    </div>
  )
}
