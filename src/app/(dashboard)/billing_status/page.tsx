'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

/* -- Types ------------------------------------------------ */

interface BillingRow {
  id: string
  project_id: string
  round: number | null
  period: string | null
  billed_amount: number
  approved_amount: number | null
  prepay_deduction: number | null
  paid_amount: number
  status: string
  payment_date: string | null
  note: string | null
  created_at: string
}

type BillingStatus = 'draft' | 'submitted' | 'approved' | 'paid'

/* -- Helpers ---------------------------------------------- */

function fmtVND(n: number): string {
  return n.toLocaleString('vi-VN') + ' VND'
}

function statusBadge(status: string) {
  switch (status as BillingStatus) {
    case 'draft':
      return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Nhap / 작성중' }
    case 'submitted':
      return { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Da nop / 제출' }
    case 'approved':
      return { bg: 'bg-green-50', text: 'text-green-700', label: 'Duyet / 승인' }
    case 'paid':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Da tra / 입금' }
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-600', label: status }
  }
}

/* -- Component -------------------------------------------- */

export default function BillingStatusPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [billings, setBillings] = useState<BillingRow[]>([])
  const [contractAmount, setContractAmount] = useState(0)

  const toast = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  /* -- Load data ------------------------------------------ */
  const loadData = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const [{ data: rows }, { data: project }] = await Promise.all([
        supabase
          .from('billings')
          .select('*')
          .eq('project_id', currentProject)
          .order('round', { ascending: true }),
        supabase
          .from('projects')
          .select('contract_amount')
          .eq('id', currentProject)
          .single(),
      ])

      setBillings((rows as BillingRow[]) ?? [])
      setContractAmount(project?.contract_amount ?? 0)
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [currentProject, toast])

  useEffect(() => {
    if (user && currentProject) loadData()
  }, [user, currentProject, loadData])

  /* -- Computed ------------------------------------------- */
  const totalBilled = billings.reduce((s, r) => s + (r.billed_amount ?? 0), 0)
  const totalPaid = billings.reduce((s, r) => s + (r.paid_amount ?? 0), 0)
  const remaining = contractAmount - totalBilled
  const billedPct = contractAmount > 0 ? Math.round((totalBilled / contractAmount) * 100) : 0

  /* -- Guard ---------------------------------------------- */
  if (!user) return null

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
          Tinh trang thanh toan / 기성현황
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Tien trinh nghiem thu / 기성서류 처리현황
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Hop dong / 계약금액</p>
              <p className="mt-2 text-lg font-bold text-gray-900">{fmtVND(contractAmount)}</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Da yeu cau / 기성청구</p>
              <p className="mt-2 text-lg font-bold text-indigo-700">{fmtVND(totalBilled)}</p>
              <p className="mt-1 text-xs text-gray-400">{billedPct}% hop dong / 계약대비</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-indigo-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Da thanh toan / 입금액</p>
              <p className="mt-2 text-lg font-bold text-green-700">{fmtVND(totalPaid)}</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-green-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Con lai / 잔여금액</p>
              <p className="mt-2 text-lg font-bold text-amber-700">{fmtVND(remaining)}</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0 mt-1" />
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">
            Tien do thanh toan / 기성 진행률
          </span>
          <span className="text-sm font-bold text-gray-900">{billedPct}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
            style={{ width: `${Math.min(billedPct, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-gray-400">0%</span>
          <span className="text-[10px] text-gray-400">
            {fmtVND(totalBilled)} / {fmtVND(contractAmount)}
          </span>
          <span className="text-[10px] text-gray-400">100%</span>
        </div>
      </div>

      {/* Billing Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Chi tiet cac lan / 기성 내역
          </h3>
          <button
            onClick={loadData}
            disabled={loading}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
          >
            {loading ? 'Dang tai... / 로딩 중...' : 'Lam moi / 새로고침'}
          </button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Dang tai... / 로딩 중...
          </div>
        ) : billings.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Chua co du lieu / 데이터 없음
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">Lan / 회차</th>
                  <th className="px-3 py-3">Ky / 기간</th>
                  <th className="px-3 py-3 text-right">So tien / 청구금액</th>
                  <th className="px-3 py-3 text-right">Cong tru / 선급공제</th>
                  <th className="px-3 py-3 text-right">Thuc nhan / 순금액</th>
                  <th className="px-3 py-3">Trang thai / 상태</th>
                  <th className="px-3 py-3">Ngay TT / 입금일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {billings.map((row) => {
                  const deduction = row.prepay_deduction ?? 0
                  const net = row.billed_amount - deduction
                  const badge = statusBadge(row.status)
                  return (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-xs text-gray-900 font-semibold">
                        {row.round ?? '-'}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-700 font-mono whitespace-nowrap">
                        {row.period ?? '-'}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-700 text-right font-mono">
                        {fmtVND(row.billed_amount)}
                      </td>
                      <td className="px-3 py-3 text-xs text-red-600 text-right font-mono">
                        {deduction > 0 ? `-${fmtVND(deduction)}` : '-'}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-900 text-right font-mono font-semibold">
                        {fmtVND(net)}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <span className={`inline-block px-2 py-0.5 rounded font-semibold ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 font-mono whitespace-nowrap">
                        {row.payment_date ?? '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-3 py-3 text-xs text-gray-700" colSpan={2}>
                    Tong / 합계
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-900 text-right font-mono">
                    {fmtVND(totalBilled)}
                  </td>
                  <td className="px-3 py-3 text-xs text-red-600 text-right font-mono">
                    {fmtVND(billings.reduce((s, r) => s + (r.prepay_deduction ?? 0), 0))}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-900 text-right font-mono">
                    {fmtVND(totalBilled - billings.reduce((s, r) => s + (r.prepay_deduction ?? 0), 0))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
