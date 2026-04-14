'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

/* ── Types ── */

interface AuditLog {
  id: string
  user_id: string | null
  action: string
  table_name: string | null
  record_id: string | null
  details: string | null
  created_at: string
  users?: { name: string } | null
}

const PAGE_SIZE = 50

const ACTION_COLORS: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  LOGIN: 'bg-purple-100 text-purple-800',
  APPROVE: 'bg-emerald-100 text-emerald-800',
  REJECT: 'bg-orange-100 text-orange-800',
}

function actionColor(action: string) {
  const key = action.toUpperCase()
  for (const [k, v] of Object.entries(ACTION_COLORS)) {
    if (key.includes(k)) return v
  }
  return 'bg-gray-100 text-gray-800'
}

/* ── Component ── */

export default function HistoryPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  // Filters
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterUser, setFilterUser] = useState('')

  // Users list for filter
  const [userOptions, setUserOptions] = useState<{ id: string; name: string }[]>([])

  const showToast = useCallback((msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  /* ── Load users for filter ── */
  useEffect(() => {
    supabase
      .from('users')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        if (data) setUserOptions(data as { id: string; name: string }[])
      })
  }, [])

  /* ── Load logs ── */
  const loadLogs = useCallback(async (append = false) => {
    if (!currentProject) return
    if (append) setLoadingMore(true)
    else setLoading(true)

    try {
      let query = supabase
        .from('audit_logs')
        .select('id, user_id, action, table_name, record_id, details, created_at, users(name)')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (append && logs.length > 0) {
        const lastDate = logs[logs.length - 1].created_at
        query = query.lt('created_at', lastDate)
      }

      if (filterDateFrom) query = query.gte('created_at', filterDateFrom + 'T00:00:00')
      if (filterDateTo) query = query.lte('created_at', filterDateTo + 'T23:59:59')
      if (filterAction) query = query.ilike('action', `%${filterAction}%`)
      if (filterUser) query = query.eq('user_id', filterUser)

      const { data, error } = await query
      if (error) throw error

      const rows = (data ?? []) as unknown as AuditLog[]
      setHasMore(rows.length === PAGE_SIZE)

      if (append) {
        setLogs((prev) => [...prev, ...rows])
      } else {
        setLogs(rows)
      }
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Load failed', 'err')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [currentProject, logs, filterDateFrom, filterDateTo, filterAction, filterUser, showToast])

  /* ── Initial load ── */
  useEffect(() => {
    if (currentProject) loadLogs(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject])

  /* ── Apply filters ── */
  const applyFilters = () => {
    loadLogs(false)
  }

  const resetFilters = () => {
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterAction('')
    setFilterUser('')
    // Will trigger reload via state update
    setTimeout(() => loadLogs(false), 0)
  }

  if (!currentProject) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        Vui long chon cong trinh / 현장을 선택해주세요.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>{toast.msg}</div>
      )}

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lich su hoat dong / 이력</h1>
        <p className="mt-1 text-sm text-gray-500">Theo doi lich su thao tac / 활동 이력 조회</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Bo loc / 필터</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tu ngay / 시작일</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Den ngay / 종료일</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Hanh dong / 작업유형</label>
            <input
              type="text"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              placeholder="INSERT, UPDATE..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nguoi dung / 사용자</label>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Tat ca / 전체</option>
              {userOptions.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ap dung / 적용
          </button>
          <button
            onClick={resetFilters}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Xoa bo loc / 초기화
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Lich su / 이력</h3>
          <span className="text-xs text-gray-500">Hien thi / 표시: {logs.length}</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Dang tai... / 로딩 중...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Khong co du lieu / 데이터 없음</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Thoi gian / 시간</th>
                  <th className="px-4 py-3">Nguoi / 사용자</th>
                  <th className="px-4 py-3">Hanh dong / 작업</th>
                  <th className="px-4 py-3">Bang / 테이블</th>
                  <th className="px-4 py-3">Chi tiet / 상세</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap font-mono">
                      {log.created_at ? new Date(log.created_at).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                      {log.users?.name ?? '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${actionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap font-mono">
                      {log.table_name ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[300px] truncate">
                      {log.details ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Load more */}
        {hasMore && logs.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 text-center">
            <button
              onClick={() => loadLogs(true)}
              disabled={loadingMore}
              className="px-6 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              {loadingMore ? 'Dang tai... / 로딩 중...' : 'Xem them / 더보기'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
