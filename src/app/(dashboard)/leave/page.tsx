'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useLeave, LEAVE_TYPES } from '@/hooks/useLeave'

/* ── Helpers ── */

function todayStr(): string {
  const d = new Date()
  const offset = 7 * 60
  const local = new Date(d.getTime() + offset * 60000)
  return local.toISOString().slice(0, 10)
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  pending:  { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Cho duyet / 대기' },
  approved: { bg: 'bg-green-50',  text: 'text-green-700',  label: 'Da duyet / 승인' },
  rejected: { bg: 'bg-red-50',    text: 'text-red-700',    label: 'Tu choi / 반려' },
}

/* ── Component ── */

export default function LeavePage() {
  const user = useAuthStore((s) => s.user)

  const {
    balance,
    history,
    loading,
    error,
    loadBalance,
    loadHistory,
    submitLeave,
  } = useLeave()

  // Form state
  const [fType, setFType] = useState<string>('연차')
  const [fStart, setFStart] = useState(todayStr())
  const [fEnd, setFEnd] = useState(todayStr())
  const [fHalf, setFHalf] = useState<'full' | 'am' | 'pm'>('full')
  const [fReason, setFReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  /* ── Init ── */
  useEffect(() => {
    loadBalance()
    loadHistory()
  }, [loadBalance, loadHistory])

  /* ── Toast helper ── */
  const showToast = useCallback((msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      await submitLeave(fType, fStart, fEnd, fHalf, fReason)
      setFReason('')
      setFStart(todayStr())
      setFEnd(todayStr())
      setFHalf('full')
      showToast('Da gui yeu cau nghi phep / 휴가 신청 완료!', 'ok')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Submit failed'
      showToast(msg, 'err')
    } finally {
      setSubmitting(false)
    }
  }

  const totalDays = balance?.total ?? 12
  const usedDays = balance?.used ?? 0
  const remainDays = balance?.remaining ?? 12

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
        <h1 className="text-2xl font-bold text-gray-900">Nghi phep / 휴가</h1>
        <p className="mt-1 text-sm text-gray-500">
          Quan ly nghi phep ca nhan / 개인 휴가 관리
        </p>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-3 gap-3">
        <BalanceCard label="Tong cong / 총 연차" value={totalDays} color="bg-blue-500" />
        <BalanceCard label="Da su dung / 사용" value={usedDays} color="bg-orange-500" />
        <BalanceCard label="Con lai / 잔여" value={remainDays} color="bg-green-500" />
      </div>

      {/* Leave request form */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Yeu cau nghi phep / 휴가 신청
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Loai / 유형
            </label>
            <select
              value={fType}
              onChange={(e) => setFType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LEAVE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Half-day */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Nua ngay / 반차
            </label>
            <select
              value={fHalf}
              onChange={(e) => setFHalf(e.target.value as 'full' | 'am' | 'pm')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="full">Ca ngay / 종일</option>
              <option value="am">Sang / 오전 반차</option>
              <option value="pm">Chieu / 오후 반차</option>
            </select>
          </div>

          {/* Start date */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Ngay bat dau / 시작일
            </label>
            <input
              type="date"
              value={fStart}
              min={todayStr()}
              onChange={(e) => setFStart(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* End date */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Ngay ket thuc / 종료일
            </label>
            <input
              type="date"
              value={fEnd}
              min={fStart}
              onChange={(e) => setFEnd(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Reason */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Ly do / 사유 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={fReason}
              onChange={(e) => setFReason(e.target.value)}
              rows={2}
              placeholder="Nhap ly do nghi phep... / 휴가 사유를 입력하세요..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || !fReason.trim()}
          className="mt-4 w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
        >
          {submitting ? 'Dang gui... / 제출 중...' : 'Gui yeu cau / 신청하기'}
        </button>
      </div>

      {/* Leave history */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Lich su nghi phep / 휴가 이력
        </h2>

        {error && <p className="text-sm text-red-500 mb-2">{error}</p>}

        {loading && <p className="text-sm text-gray-400">Dang tai... / 로딩 중...</p>}

        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="px-5 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Loai / 유형</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Thoi gian / 기간</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Ngay / 일수</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Ly do / 사유</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Trang thai / 상태</th>
                <th className="px-5 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Nguoi duyet / 승인자</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-sm text-gray-400">
                    Khong co du lieu / 데이터 없음
                  </td>
                </tr>
              )}
              {history.map((rec) => {
                const st = STATUS_STYLE[rec.status] ?? STATUS_STYLE.pending
                return (
                  <tr key={rec.id} className="hover:bg-gray-50">
                    <td className="px-5 py-2 text-gray-900 whitespace-nowrap">{rec.leave_type}</td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                      {rec.start_date} ~ {rec.end_date}
                      {rec.half_day !== 'full' && (
                        <span className="ml-1 text-xs text-gray-400">
                          ({rec.half_day === 'am' ? 'AM' : 'PM'})
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{rec.days}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs max-w-[200px] truncate">{rec.reason ?? '-'}</td>
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

/* ── Balance Card ── */

function BalanceCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`w-3 h-3 rounded-full ${color} shrink-0 mt-1`} />
      </div>
    </div>
  )
}
