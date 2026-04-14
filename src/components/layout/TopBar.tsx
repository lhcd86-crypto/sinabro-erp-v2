'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/stores/authStore'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/roles'
import { useNotifications } from '@/hooks/useNotifications'

interface TopBarProps {
  onMenuToggle: () => void
}

export default function TopBar({ onMenuToggle }: TopBarProps) {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const projects = useAuthStore((s) => s.projects)
  const currentProject = useAuthStore((s) => s.currentProject)
  const setCurrentProject = useAuthStore((s) => s.setCurrentProject)
  const logout = useAuthStore((s) => s.logout)

  const [lang, setLang] = useState<'KO' | 'VI'>('KO')
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications()

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const roleLabel = user ? ROLE_LABELS[user.role] : ''
  const roleColor = user ? ROLE_COLORS[user.role] : '#6B7280'

  return (
    <header className="sticky top-0 z-20 h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 shrink-0">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden text-gray-600 hover:text-gray-900"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Brand */}
      <div className="hidden sm:flex items-center gap-2 mr-4">
        <span className="font-bold text-sm text-gray-900 tracking-tight">
          시나브로 ERP
        </span>
        <span className="text-[10px] text-gray-400 font-mono">v16.0</span>
      </div>

      {/* Project selector */}
      <div className="flex-1 min-w-0">
        <select
          value={currentProject ?? ''}
          onChange={(e) => setCurrentProject(e.target.value || null)}
          className="w-full max-w-xs px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">-- Chọn CT / 현장 선택 --</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} — {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Notification bell */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={() => setNotifOpen((v) => !v)}
          className="relative p-1.5 text-gray-500 hover:text-gray-700 transition"
          title="Thông báo / 알림"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-[9px] font-bold text-white bg-red-500 rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-full mt-1 w-80 max-h-96 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg z-50">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-700">Thông báo / 알림</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[10px] text-blue-600 hover:underline">
                  Đọc tất cả / 모두 읽음
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400">
                Không có thông báo / 알림 없음
              </div>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <div
                  key={n.id}
                  onClick={() => { markAsRead(n.id); setNotifOpen(false) }}
                  className={`px-3 py-2 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition ${
                    n.is_read ? 'opacity-60' : ''
                  }`}
                >
                  {n.link ? (
                    <Link href={n.link} className="block">
                      <div className="text-xs font-semibold text-gray-800">{n.title}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{n.message}</div>
                      <div className="text-[10px] text-gray-400 mt-1">
                        {new Date(n.created_at).toLocaleString('ko-KR')}
                      </div>
                    </Link>
                  ) : (
                    <>
                      <div className="text-xs font-semibold text-gray-800">{n.title}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{n.message}</div>
                      <div className="text-[10px] text-gray-400 mt-1">
                        {new Date(n.created_at).toLocaleString('ko-KR')}
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Language toggle */}
      <button
        onClick={() => setLang((l) => (l === 'KO' ? 'VI' : 'KO'))}
        className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md transition"
      >
        {lang === 'KO' ? '한' : 'VI'}
      </button>

      {/* User info */}
      {user && (
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 truncate max-w-[120px]">
            {user.name}
          </span>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: roleColor }}
          >
            {roleLabel}
          </span>
        </div>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
        title="Đăng xuất / 로그아웃"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        <span className="hidden sm:inline">Logout</span>
      </button>
    </header>
  )
}
