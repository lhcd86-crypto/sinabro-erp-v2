'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

/* -- Types ------------------------------------------------- */

interface ExpenseRecord {
  id: string
  project_id: string | null
  expense_date: string | null
  vendor: string | null
  description: string | null
  total_amount: number | null
  category: string
  status: string | null
  approved_at: string | null
  approved_by: string | null
  created_at: string | null
  item_name: string
}

/* -- Helpers ----------------------------------------------- */

function today() {
  return new Date().toISOString().slice(0, 10)
}

function thisMonthRange(): [string, string] {
  const d = new Date()
  const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  const end = today()
  return [start, end]
}

function formatMoney(n: number): string {
  return n.toLocaleString('vi-VN')
}

/* -- Component --------------------------------------------- */

export default function CeoPaidPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const [pending, setPending] = useState<ExpenseRecord[]>([])
  const [paidThisMonth, setPaidThisMonth] = useState(0)

  const toast = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  /* -- Access check ---------------------------------------- */
  if (user && user.role !== 'ceo') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
        Khong co quyen truy cap / 접근 권한이 없습니다. (CEO only)
      </div>
    )
  }

  /* -- Load data ------------------------------------------- */
  const loadData = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const [mStart, mEnd] = thisMonthRange()

      const [{ data: pendingData }, { data: paidData }] = await Promise.all([
        supabase
          .from('expenses')
          .select('*')
          .eq('project_id', currentProject)
          .eq('status', 'approved')
          .order('expense_date', { ascending: false }),
        supabase
          .from('expenses')
          .select('total_amount')
          .eq('project_id', currentProject)
          .eq('status', 'paid')
          .gte('approved_at', mStart)
          .lte('approved_at', mEnd),
      ])

      setPending((pendingData as ExpenseRecord[]) ?? [])
      const paidSum = (paidData ?? []).reduce((s: number, r: { total_amount: number | null }) => s + (r.total_amount || 0), 0)
      setPaidThisMonth(paidSum)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [currentProject])

  useEffect(() => {
    if (user && currentProject) loadData()
  }, [user, currentProject, loadData])

  /* -- Actions --------------------------------------------- */
  async function handleApprove(id: string) {
    if (!user) return
    setActionLoading(id)
    try {
      const { error } = await supabase
        .from('expenses')
        .update({ status: 'paid', approved_at: today(), approved_by: user.id })
        .eq('id', id)
      if (error) throw error
      toast('ok', 'Da duyet chi / 지급 승인 완료')
      loadData()
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Approve failed')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReject(id: string) {
    setActionLoading(id)
    try {
      const { error } = await supabase
        .from('expenses')
        .update({ status: 'reviewed' })
        .eq('id', id)
      if (error) throw error
      toast('ok', 'Da tra lai / 반려 완료')
      loadData()
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Reject failed')
    } finally {
      setActionLoading(null)
    }
  }

  /* -- Derived -------------------------------------------- */
  const pendingTotal = pending.reduce((s, r) => s + (r.total_amount || 0), 0)

  if (!currentProject) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        Vui long chon cong trinh / 현장을 선택해주세요.
      </div>
    )
  }

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Duyet chi CEO / 대표 지급결의
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Duyet thanh toan cuoi cung / 최종 지급 승인
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Cho duyet / 대기 건수</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{pending.length}</p>
              <p className="mt-1 text-xs text-gray-400">kien / 건</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Tong cho duyet / 대기 금액</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{formatMoney(pendingTotal)}</p>
              <p className="mt-1 text-xs text-gray-400">VND</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-red-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Da chi thang nay / 이번달 지급</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{formatMoney(paidThisMonth)}</p>
              <p className="mt-1 text-xs text-gray-400">VND</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-green-500 shrink-0 mt-1" />
          </div>
        </div>
      </div>

      {/* Pending table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Danh sach cho duyet / 지급 대기 목록
          </h3>
          <span className="text-xs text-gray-500">
            Tong / 총 {pending.length}건
          </span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Dang tai... / 로딩 중...
          </div>
        ) : pending.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Khong co muc cho duyet / 대기 항목 없음
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">Ngay / 날짜</th>
                  <th className="px-3 py-3">Nha CC / 업체</th>
                  <th className="px-3 py-3">Noi dung / 내용</th>
                  <th className="px-3 py-3">Loai / 분류</th>
                  <th className="px-3 py-3 text-right">So tien / 금액</th>
                  <th className="px-3 py-3 text-center">Thao tac / 처리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pending.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-xs text-gray-600 font-mono whitespace-nowrap">
                      {row.expense_date}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-700 font-medium">
                      {row.vendor || '-'}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-700 max-w-[200px] truncate">
                      {row.description || '-'}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold">
                        {row.category || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-right font-mono font-semibold text-gray-900">
                      {formatMoney(row.total_amount ?? 0)}
                    </td>
                    <td className="px-3 py-3 text-xs text-center whitespace-nowrap">
                      <button
                        onClick={() => handleApprove(row.id)}
                        disabled={actionLoading === row.id}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-medium mr-1"
                      >
                        {actionLoading === row.id ? '...' : 'Duyet / 승인'}
                      </button>
                      <button
                        onClick={() => handleReject(row.id)}
                        disabled={actionLoading === row.id}
                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                      >
                        Tra lai / 반려
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
