'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

/* -- Types ------------------------------------------------ */

interface Notification {
  id: string
  user_id: string
  title: string
  message: string | null
  type: 'info' | 'warning' | 'success' | 'error'
  is_read: boolean
  created_at: string
}

type FilterTab = 'all' | 'unread' | 'read'
type TypeFilter = 'all' | 'info' | 'warning' | 'success' | 'error'

/* -- Constants -------------------------------------------- */

const TYPE_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  info:    { bg: 'bg-blue-50',   text: 'text-blue-700',   label: 'Thong tin / 정보' },
  warning: { bg: 'bg-amber-50',  text: 'text-amber-700',  label: 'Canh bao / 경고' },
  success: { bg: 'bg-green-50',  text: 'text-green-700',  label: 'Thanh cong / 성공' },
  error:   { bg: 'bg-red-50',    text: 'text-red-700',    label: 'Loi / 오류' },
}

/* -- Component -------------------------------------------- */

export default function AlertCenterPage() {
  const user = useAuthStore((s) => s.user)

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  const toast = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  /* -- Load notifications --------------------------------- */
  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      setNotifications((data as Notification[]) ?? [])
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  useEffect(() => {
    if (user) loadData()
  }, [user, loadData])

  /* -- Actions -------------------------------------------- */
  async function markAsRead(id: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
    if (error) {
      toast('err', error.message)
      return
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    )
  }

  async function markAllAsRead() {
    if (!user) return
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    if (error) {
      toast('err', error.message)
      return
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    toast('ok', 'Tat ca da doc / 모두 읽음 처리 완료')
  }

  async function deleteOld() {
    if (!user) return
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
      .eq('is_read', true)
      .lt('created_at', cutoff.toISOString())
    if (error) {
      toast('err', error.message)
      return
    }
    toast('ok', 'Da xoa thong bao cu / 오래된 알림 삭제 완료')
    loadData()
  }

  /* -- Filtering ------------------------------------------ */
  const filtered = notifications.filter((n) => {
    if (filterTab === 'unread' && n.is_read) return false
    if (filterTab === 'read' && !n.is_read) return false
    if (typeFilter !== 'all' && n.type !== typeFilter) return false
    return true
  })

  const unreadCount = notifications.filter((n) => !n.is_read).length

  if (!user) return null

  return (
    <div className="space-y-6">
      {/* Toast */}
      {msg && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            msg.type === 'ok'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Page title */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Trung tam thong bao / 알림 센터
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Quan ly thong bao / 알림 관리 ({unreadCount} chua doc / 미읽음)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={markAllAsRead}
            className="px-3 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Doc tat ca / 모두 읽음
          </button>
          <button
            onClick={deleteOld}
            className="px-3 py-2 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Xoa cu (30d) / 오래된 삭제
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'unread', 'read'] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filterTab === tab
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab === 'all' ? 'Tat ca / 전체' : tab === 'unread' ? 'Chua doc / 미읽음' : 'Da doc / 읽음'}
          </button>
        ))}
        <div className="w-px bg-gray-200 mx-1" />
        {(['all', 'info', 'warning', 'success', 'error'] as TypeFilter[]).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
              typeFilter === t
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t === 'all' ? 'Tat ca / 전체' : TYPE_BADGES[t]?.label ?? t}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Danh sach thong bao / 알림 목록
          </h3>
          <span className="text-xs text-gray-500">
            {filtered.length} / {notifications.length} ket qua / 건
          </span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Dang tai... / 로딩 중...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Khong co thong bao / 알림이 없습니다
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((n) => {
              const badge = TYPE_BADGES[n.type] ?? TYPE_BADGES.info
              return (
                <div
                  key={n.id}
                  className={`px-4 py-3 flex items-start gap-3 transition-colors ${
                    n.is_read ? 'bg-white' : 'bg-blue-50/40'
                  } hover:bg-gray-50`}
                >
                  {/* Unread dot */}
                  <div className="pt-1.5 shrink-0">
                    {!n.is_read && (
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                    {n.is_read && <div className="w-2 h-2" />}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {n.title}
                      </span>
                    </div>
                    {n.message && (
                      <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                        {n.message}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-gray-400 font-mono">
                      {new Date(n.created_at).toLocaleString('ko-KR')}
                    </p>
                  </div>
                  {/* Mark as read */}
                  {!n.is_read && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="shrink-0 px-2 py-1 text-[10px] font-medium rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                      Doc / 읽음
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
