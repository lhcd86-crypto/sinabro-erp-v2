'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isAdmin, isFinance } from '@/lib/roles'
import {
  useBilling,
  BILLING_STATUSES,
  type BillingStatus,
} from '@/hooks/useBilling'

/* ── Helpers ───────────────────────────────────────── */

const STATUS_BADGE: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Nhap / 초안' },
  submitted: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Da gui / 제출' },
  reviewed: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    label: 'Da kiem tra / 검토완료',
  },
  approved: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    label: 'Da duyet / 승인',
  },
  invoiced: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    label: 'Da xuat HD / 청구',
  },
  paid: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    label: 'Da thanh toan / 수금완료',
  },
  rejected: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    label: 'Tu choi / 반려',
  },
}

const STAGE_ORDER: BillingStatus[] = [
  'draft',
  'submitted',
  'reviewed',
  'approved',
  'invoiced',
  'paid',
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

function fmtVND(n: number) {
  return n.toLocaleString('vi-VN')
}

/* ── Component ─────────────────────────────────────── */

export default function BillingPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const {
    billings,
    prepayments,
    loading,
    loadBillings,
    saveBilling,
    updateBillingStatus,
    loadPrepayments,
  } = useBilling()

  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [fDate, setFDate] = useState(today())
  const [fDesc, setFDesc] = useState('')
  const [fAmount, setFAmount] = useState('')
  const [fContract, setFContract] = useState('')
  const [fDeduction, setFDeduction] = useState('')
  const [fNote, setFNote] = useState('')

  /* ── Load data ─── */
  useEffect(() => {
    if (user && currentProject) {
      loadBillings()
      loadPrepayments()
    }
  }, [user, currentProject, loadBillings, loadPrepayments])

  /* ── Toast ─── */
  const toast = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  /* ── Submit billing ─── */
  async function handleSubmit() {
    if (!currentProject) {
      toast('err', 'Chon cong trinh / 현장을 선택하세요')
      return
    }
    if (!fDesc.trim()) {
      toast('err', 'Nhap noi dung / 내용을 입력하세요')
      return
    }
    const amount = parseFloat(fAmount.replace(/[^0-9]/g, '')) || 0
    if (!amount) {
      toast('err', 'Nhap so tien / 금액을 입력하세요')
      return
    }

    setSaving(true)
    try {
      await saveBilling({
        billing_date: fDate,
        description: fDesc.trim(),
        amount,
        contract_item: fContract.trim() || undefined,
        prepayment_deduction:
          parseFloat(fDeduction.replace(/[^0-9]/g, '')) || undefined,
        note: fNote.trim() || undefined,
      })
      setFDesc('')
      setFAmount('')
      setFContract('')
      setFDeduction('')
      setFNote('')
      setShowForm(false)
      toast('ok', 'Da tao phieu nghiem thu / 기성 등록 완료')
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  /* ── Advance status ─── */
  async function handleStatusChange(id: string, status: BillingStatus) {
    try {
      await updateBillingStatus(id, status)
      toast('ok', 'Da cap nhat trang thai / 상태 변경 완료')
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Update failed')
    }
  }

  const canManage = user ? isAdmin(user.role) || isFinance(user.role) : false

  // KPI
  const totalBilled = billings.reduce((s, b) => s + (b.amount || 0), 0)
  const totalPaid = billings
    .filter((b) => b.status === 'paid')
    .reduce((s, b) => s + (b.amount || 0), 0)
  const totalPending = billings
    .filter((b) => !['paid', 'rejected'].includes(b.status))
    .reduce((s, b) => s + (b.amount || 0), 0)
  const totalPrepayment = prepayments.reduce(
    (s, p) => s + (p.remaining || 0),
    0,
  )

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Nghiem thu / 기성관리
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Quan ly nghiem thu va thanh toan / 기성 및 수금 관리
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? 'Dong / 닫기' : 'Tao moi / 기성 등록'}
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KpiCard
          title="Tong nghiem thu / 기성 총액"
          value={fmtVND(totalBilled)}
          sub="VND"
          color="bg-blue-500"
        />
        <KpiCard
          title="Da thu / 수금 완료"
          value={fmtVND(totalPaid)}
          sub="VND"
          color="bg-green-500"
        />
        <KpiCard
          title="Dang xu ly / 진행 중"
          value={fmtVND(totalPending)}
          sub="VND"
          color="bg-amber-500"
        />
        <KpiCard
          title="Tam ung con lai / 선급금 잔액"
          value={fmtVND(totalPrepayment)}
          sub="VND"
          color="bg-purple-500"
        />
      </div>

      {/* ── Billing Entry Form ── */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              Tao phieu nghiem thu / 기성 신청서 작성
            </h3>
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Ngay / 날짜
                </label>
                <input
                  type="date"
                  value={fDate}
                  onChange={(e) => setFDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Noi dung / 기성 내용
                </label>
                <input
                  type="text"
                  value={fDesc}
                  onChange={(e) => setFDesc(e.target.value)}
                  placeholder="Mo ta cong viec nghiem thu / 기성 설명"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  So tien / 금액 (VND)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={fAmount}
                  onChange={(e) => setFAmount(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Hang muc HĐ / 계약 항목
                </label>
                <input
                  type="text"
                  value={fContract}
                  onChange={(e) => setFContract(e.target.value)}
                  placeholder="VD: A01-콘크리트 타설"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Khau tru tam ung / 선급금 공제 (VND)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={fDeduction}
                  onChange={(e) => setFDeduction(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Ghi chu / 비고
                </label>
                <input
                  type="text"
                  value={fNote}
                  onChange={(e) => setFNote(e.target.value)}
                  placeholder="Ghi chu them / 추가 메모"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Net amount preview */}
            {fAmount && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-blue-700">
                    Thanh tien thuc nhan / 실수령액 (VND):
                  </span>
                  <span className="text-blue-900 font-bold font-mono text-sm">
                    {fmtVND(
                      (parseFloat(fAmount.replace(/[^0-9]/g, '')) || 0) -
                        (parseFloat(fDeduction.replace(/[^0-9]/g, '')) || 0),
                    )}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving
                  ? 'Dang luu... / 저장 중...'
                  : 'Luu nghiem thu / 기성 등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Prepayment Section ── */}
      {prepayments.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              Tam ung / 선급금 현황
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">Ngay nhan / 수령일</th>
                  <th className="px-3 py-3 text-right">So tien / 금액</th>
                  <th className="px-3 py-3 text-right">Con lai / 잔액</th>
                  <th className="px-3 py-3">Ghi chu / 비고</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {prepayments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-xs text-gray-600 font-mono">
                      {p.received_date}
                    </td>
                    <td className="px-3 py-3 text-xs text-right font-mono font-bold text-gray-900">
                      {fmtVND(p.amount)}
                    </td>
                    <td className="px-3 py-3 text-xs text-right font-mono font-bold text-purple-700">
                      {fmtVND(p.remaining)}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500">
                      {p.note || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-purple-50 font-bold">
                  <td className="px-3 py-3 text-xs text-purple-800">
                    Tong / 합계
                  </td>
                  <td className="px-3 py-3 text-xs text-right font-mono text-purple-800">
                    {fmtVND(
                      prepayments.reduce((s, p) => s + (p.amount || 0), 0),
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs text-right font-mono text-purple-800">
                    {fmtVND(totalPrepayment)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Billing Status Tracker ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Lich su nghiem thu / 기성 내역
          </h3>
          <span className="text-xs text-gray-500">
            Tong / 총 {billings.length}건
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Dang tai... / 로딩 중...
          </div>
        ) : billings.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Chua co phieu nghiem thu / 기성 내역 없음
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">Ngay / 날짜</th>
                  <th className="px-3 py-3">Noi dung / 내용</th>
                  <th className="px-3 py-3">HM HD / 계약항목</th>
                  <th className="px-3 py-3 text-right">So tien / 금액</th>
                  <th className="px-3 py-3 text-right">Khau tru / 공제</th>
                  <th className="px-3 py-3 text-right">Thuc nhan / 실수령</th>
                  <th className="px-3 py-3">Trang thai / 상태</th>
                  {canManage && (
                    <th className="px-3 py-3 text-center">
                      Thao tac / 처리
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {billings.map((b) => {
                  const st =
                    STATUS_BADGE[b.status] || STATUS_BADGE.draft
                  const netAmount =
                    b.net_amount ?? b.amount - (b.prepayment_deduction || 0)

                  // Determine next status
                  const currentIdx = STAGE_ORDER.indexOf(
                    b.status as BillingStatus,
                  )
                  const nextStatus =
                    currentIdx >= 0 && currentIdx < STAGE_ORDER.length - 1
                      ? STAGE_ORDER[currentIdx + 1]
                      : null

                  return (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-xs text-gray-600 font-mono whitespace-nowrap">
                        {b.billing_date}
                      </td>
                      <td className="px-3 py-3 text-xs font-medium text-gray-900 max-w-[200px] truncate">
                        {b.description}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600">
                        {b.contract_item || '-'}
                      </td>
                      <td className="px-3 py-3 text-xs text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                        {fmtVND(b.amount)}
                      </td>
                      <td className="px-3 py-3 text-xs text-right font-mono text-red-600 whitespace-nowrap">
                        {b.prepayment_deduction
                          ? `-${fmtVND(b.prepayment_deduction)}`
                          : '-'}
                      </td>
                      <td className="px-3 py-3 text-xs text-right font-mono font-bold text-blue-700 whitespace-nowrap">
                        {fmtVND(netAmount)}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${st.bg} ${st.text}`}
                        >
                          {st.label}
                        </span>
                        {/* Stage progress bar */}
                        <div className="flex gap-0.5 mt-1">
                          {STAGE_ORDER.map((stage, idx) => {
                            const isCurrent = stage === b.status
                            const isPast = idx <= currentIdx
                            return (
                              <div
                                key={stage}
                                className={`h-1 flex-1 rounded-full ${
                                  isCurrent
                                    ? 'bg-blue-500'
                                    : isPast
                                      ? 'bg-green-400'
                                      : 'bg-gray-200'
                                }`}
                                title={
                                  STATUS_BADGE[stage]?.label || stage
                                }
                              />
                            )
                          })}
                        </div>
                      </td>
                      {canManage && (
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {nextStatus && b.status !== 'rejected' && (
                              <button
                                onClick={() =>
                                  handleStatusChange(b.id, nextStatus)
                                }
                                className="px-2.5 py-1 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                {STATUS_BADGE[nextStatus]?.label ||
                                  nextStatus}
                              </button>
                            )}
                            {b.status !== 'rejected' &&
                              b.status !== 'paid' && (
                                <button
                                  onClick={() =>
                                    handleStatusChange(b.id, 'rejected')
                                  }
                                  className="px-2.5 py-1 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                  Tu choi / 반려
                                </button>
                              )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
              {billings.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-900 text-white font-bold">
                    <td colSpan={3} className="px-3 py-3 text-xs">
                      Tong cong / 합계
                    </td>
                    <td className="px-3 py-3 text-right text-xs font-mono">
                      {fmtVND(totalBilled)}
                    </td>
                    <td className="px-3 py-3 text-right text-xs font-mono">
                      -{fmtVND(
                        billings.reduce(
                          (s, b) => s + (b.prepayment_deduction || 0),
                          0,
                        ),
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-xs font-mono">
                      {fmtVND(
                        billings.reduce(
                          (s, b) =>
                            s +
                            (b.net_amount ??
                              b.amount - (b.prepayment_deduction || 0)),
                          0,
                        ),
                      )}
                    </td>
                    <td colSpan={canManage ? 2 : 1} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Sub-components ────────────────────────────────── */

function KpiCard({
  title,
  value,
  sub,
  color,
}: {
  title: string
  value: string
  sub: string
  color: string
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 truncate">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
          <p className="mt-1 text-xs text-gray-400">{sub}</p>
        </div>
        <div className={`w-3 h-3 rounded-full ${color} shrink-0 mt-1`} />
      </div>
    </div>
  )
}
