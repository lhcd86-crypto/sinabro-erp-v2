'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isHR } from '@/lib/roles'
import { useLeave, LEAVE_TYPES, type LeaveRecord } from '@/hooks/useLeave'
import { ROLE_LABELS } from '@/lib/roles'

/* ── Helpers ── */

function thisYearMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  '대기':  { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Cho duyet / 대기' },
  pending:  { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Cho duyet / 대기' },
  '승인': { bg: 'bg-green-50',  text: 'text-green-700',  label: 'Da duyet / 승인' },
  approved: { bg: 'bg-green-50',  text: 'text-green-700',  label: 'Da duyet / 승인' },
  '반려':  { bg: 'bg-red-50',    text: 'text-red-700',    label: 'Tu choi / 반려' },
  rejected: { bg: 'bg-red-50',    text: 'text-red-700',    label: 'Tu choi / 반려' },
  '취소':  { bg: 'bg-gray-50',   text: 'text-gray-500',   label: 'Da huy / 취소' },
}

function calcTenure(hireDate: string): string {
  const hire = new Date(hireDate)
  const now = new Date()
  const years = Math.floor((now.getTime() - hire.getTime()) / (365.25 * 86400000))
  const months = Math.floor(((now.getTime() - hire.getTime()) / (30.44 * 86400000)) % 12)
  if (years > 0) return `${years}y ${months}m`
  return `${months}m`
}

/* ── Component ── */

export default function LeaveMgmtPage() {
  const user = useAuthStore((s) => s.user)

  const {
    allLeaves,
    allBalances,
    loading,
    error,
    loadAllLeaves,
    loadAllBalances,
    approveLeave,
    rejectLeave,
    updateBalance,
  } = useLeave()

  const [statusFilter, setStatusFilter] = useState('대기')
  const [monthFilter, setMonthFilter] = useState(thisYearMonth())
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [adjustMap, setAdjustMap] = useState<Record<string, string>>({})

  /* ── Access control ── */
  const canAccess = user && isHR(user.role)

  /* ── Init ── */
  useEffect(() => {
    if (canAccess) {
      loadAllLeaves(statusFilter, monthFilter)
      loadAllBalances()
    }
  }, [canAccess, statusFilter, monthFilter, loadAllLeaves, loadAllBalances])

  /* ── Toast ── */
  const showToast = useCallback((msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  /* ── Approve ── */
  const handleApprove = async (id: string) => {
    setActionLoading(id)
    try {
      await approveLeave(id)
      await loadAllLeaves(statusFilter, monthFilter)
      await loadAllBalances()
      showToast('Da duyet nghi phep / 승인 완료', 'ok')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed', 'err')
    } finally {
      setActionLoading(null)
    }
  }

  /* ── Reject ── */
  const handleReject = async (id: string) => {
    setActionLoading(id)
    try {
      await rejectLeave(id)
      await loadAllLeaves(statusFilter, monthFilter)
      showToast('Da tu choi nghi phep / 반려 완료', 'ok')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed', 'err')
    } finally {
      setActionLoading(null)
    }
  }

  /* ── Adjust balance ── */
  const handleAdjust = async (balId: string) => {
    const val = parseInt(adjustMap[balId] ?? '', 10)
    if (isNaN(val) || val < 0) {
      showToast('So ngay khong hop le / 유효하지 않은 일수', 'err')
      return
    }
    setActionLoading(balId)
    try {
      await updateBalance(balId, val)
      await loadAllBalances()
      setAdjustMap((prev) => ({ ...prev, [balId]: '' }))
      showToast('Da cap nhat / 수정 완료', 'ok')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed', 'err')
    } finally {
      setActionLoading(null)
    }
  }

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500 text-sm">Khong co quyen truy cap / 접근 권한이 없습니다</p>
      </div>
    )
  }

  const pendingLeaves = allLeaves.filter((l) => l.status === 'pending')

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quan ly nghi phep / 휴가 관리</h1>
        <p className="mt-1 text-sm text-gray-500">
          Duyet va quan ly nghi phep nhan vien / 직원 휴가 관리 및 승인
        </p>
      </div>

      {/* ── Pending approvals ── */}
      {pendingLeaves.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Cho duyet / 승인 대기
            <span className="ml-2 text-sm font-normal text-yellow-600">({pendingLeaves.length})</span>
          </h2>

          <div className="space-y-3">
            {pendingLeaves.map((rec) => (
              <div key={rec.id} className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {rec.users?.name ?? '—'}
                      <span className="ml-2 text-xs text-gray-500">
                        {rec.users?.role ? ROLE_LABELS[rec.users.role as keyof typeof ROLE_LABELS] : ''}
                      </span>
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {rec.leave_type} | {rec.start_date} ~ {rec.end_date} ({rec.days} ngay/일)
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{rec.reason}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(rec.id)}
                      disabled={actionLoading === rec.id}
                      className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      Duyet / 승인
                    </button>
                    <button
                      onClick={() => handleReject(rec.id)}
                      disabled={actionLoading === rec.id}
                      className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      Tu choi / 반려
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Employee leave balances ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          So du nghi phep / 휴가 잔여 현황
        </h2>

        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="px-5 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Ten / 이름</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Chuc vu / 직급</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Ngay vao / 입사일</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Tham nien / 근속</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Tong / 총</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Da dung / 사용</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Con lai / 잔여</th>
                <th className="px-5 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Dieu chinh / 조정</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allBalances.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-5 py-6 text-center text-sm text-gray-400">
                    Khong co du lieu / 데이터 없음
                  </td>
                </tr>
              )}
              {allBalances.map((bal) => (
                <tr key={bal.id} className="hover:bg-gray-50">
                  <td className="px-5 py-2 text-gray-900 whitespace-nowrap">{bal.users?.name ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-700 whitespace-nowrap text-xs">
                    {bal.users?.role ? ROLE_LABELS[bal.users.role as keyof typeof ROLE_LABELS] : '-'}
                  </td>
                  <td className="px-3 py-2 text-gray-700 whitespace-nowrap text-xs">{bal.users?.hire_date ?? '-'}</td>
                  <td className="px-3 py-2 text-gray-700 whitespace-nowrap text-xs">
                    {bal.users?.hire_date ? calcTenure(bal.users.hire_date) : '-'}
                  </td>
                  <td className="px-3 py-2 text-gray-900 font-medium whitespace-nowrap">{bal.total}</td>
                  <td className="px-3 py-2 text-orange-600 whitespace-nowrap">{bal.used}</td>
                  <td className="px-3 py-2 text-green-600 font-medium whitespace-nowrap">{bal.remaining}</td>
                  <td className="px-5 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        value={adjustMap[bal.id] ?? ''}
                        onChange={(e) => setAdjustMap((prev) => ({ ...prev, [bal.id]: e.target.value }))}
                        placeholder={String(bal.total)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => handleAdjust(bal.id)}
                        disabled={!adjustMap[bal.id] || actionLoading === bal.id}
                        className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        OK
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── All leave history ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Lich su nghi phep / 휴가 이력 (tat ca / 전체)
          </h2>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tat ca / 전체</option>
              <option value="대기">Cho duyet / 대기</option>
              <option value="승인">Da duyet / 승인</option>
              <option value="반려">Tu choi / 반려</option>
            </select>
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
        {loading && <p className="text-sm text-gray-400">Dang tai... / 로딩 중...</p>}

        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="px-5 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Ten / 이름</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Chuc vu / 직급</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Loai / 유형</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Bat dau / 시작</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Ket thuc / 종료</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Ngay / 일수</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Ly do / 사유</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Trang thai / 상태</th>
                <th className="px-5 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Nguoi duyet / 승인자</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allLeaves.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="px-5 py-6 text-center text-sm text-gray-400">
                    Khong co du lieu / 데이터 없음
                  </td>
                </tr>
              )}
              {allLeaves.map((rec) => {
                const st = STATUS_STYLE[rec.status] ?? STATUS_STYLE.pending
                return (
                  <tr key={rec.id} className="hover:bg-gray-50">
                    <td className="px-5 py-2 text-gray-900 whitespace-nowrap">{rec.users?.name ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap text-xs">
                      {rec.users?.role ? ROLE_LABELS[rec.users.role as keyof typeof ROLE_LABELS] : '-'}
                    </td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{rec.leave_type}</td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{rec.start_date}</td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{rec.end_date}</td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{rec.days}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs max-w-[150px] truncate">{rec.reason ?? '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${st.bg} ${st.text}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-5 py-2 text-gray-600 text-xs whitespace-nowrap">
                      {rec.approver?.name ?? '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
