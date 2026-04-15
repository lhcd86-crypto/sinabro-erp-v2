'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isAdmin } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

/* ── Types ────────────────────────────────────────── */

interface AdvanceRequest {
  id: string
  requester_name: string | null
  amount: number
  detail: string | null
  request_date: string
  status: string | null
  created_at: string | null
  category: string | null
  actual_amount: number | null
  admin_note: string | null
  project_id: string
  user_id: string | null
}

interface AdvanceDeposit {
  id: string
  project_id: string | null
  amount: number
  deposit_date: string | null
  note: string | null
  created_by: string | null
  created_at: string | null
}

/* ── Helpers ───────────────────────────────────────── */

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Cho duyet / 대기' },
  approved: { bg: 'bg-green-50', text: 'text-green-700', label: 'Da duyet / 승인' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', label: 'Tu choi / 반려' },
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function fmtVND(n: number) {
  return n.toLocaleString('vi-VN')
}

/* ── Component ─────────────────────────────────────── */

export default function ChongmuPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [advances, setAdvances] = useState<AdvanceRequest[]>([])
  const [deposits, setDeposits] = useState<AdvanceDeposit[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Deposit form state
  const [showDepositForm, setShowDepositForm] = useState(false)
  const [dAmount, setDAmount] = useState('')
  const [dDate, setDDate] = useState(today())
  const [dMemo, setDMemo] = useState('')

  /* ── Toast ─── */
  const toast = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  /* ── Load advances ─── */
  const loadAdvances = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('advances')
        .select('*')
        .eq('project_id', currentProject)
        .order('created_at', { ascending: false })
      if (error) throw error
      setAdvances(data || [])
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [currentProject, toast])

  /* ── Load deposits ─── */
  const loadDeposits = useCallback(async () => {
    if (!currentProject) return
    try {
      const { data, error } = await supabase
        .from('advance_deposits')
        .select('*')
        .eq('project_id', currentProject)
        .order('deposit_date', { ascending: false })
      if (error) throw error
      setDeposits(data || [])
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Load failed')
    }
  }, [currentProject, toast])

  /* ── Initial load ─── */
  useEffect(() => {
    if (user && currentProject) {
      loadAdvances()
      loadDeposits()
    }
  }, [user, currentProject, loadAdvances, loadDeposits])

  /* ── Approve / Reject ─── */
  async function handleStatusChange(id: string, status: 'approved' | 'rejected') {
    try {
      const { error } = await supabase
        .from('advances')
        .update({ status, approved_by: user?.id, approved_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      toast('ok', status === 'approved' ? 'Da duyet / 승인 완료' : 'Da tu choi / 반려 완료')
      loadAdvances()
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Update failed')
    }
  }

  /* ── Submit deposit ─── */
  async function handleDepositSubmit() {
    if (!currentProject || !user) {
      toast('err', 'Chon cong trinh / 현장을 선택하세요')
      return
    }
    const amount = parseFloat(dAmount.replace(/[^0-9]/g, '')) || 0
    if (!amount) {
      toast('err', 'Nhap so tien / 금액을 입력하세요')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.from('advance_deposits').insert({
        project_id: currentProject!,
        amount,
        deposit_date: dDate,
        note: dMemo.trim() || null,
        created_by: user.id,
      })
      if (error) throw error

      setDAmount('')
      setDDate(today())
      setDMemo('')
      setShowDepositForm(false)
      toast('ok', 'Da nhap tien / 입금 등록 완료')
      loadDeposits()
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const canManage = user ? isAdmin(user.role) : false

  /* ── KPI calculations ─── */
  const totalRequested = advances.reduce((s, a) => s + (a.amount || 0), 0)
  const totalApproved = advances
    .filter((a) => a.status === 'approved')
    .reduce((s, a) => s + (a.amount || 0), 0)
  const totalDeposited = deposits.reduce((s, d) => s + (d.amount || 0), 0)
  const balance = totalApproved - totalDeposited
  const pendingAdvances = advances.filter((a) => a.status === 'pending')

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
            Phe duyet tam ung / 전도금 승인
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Quan ly tam ung va nhap tien / 전도금 관리 및 입금 처리
          </p>
        </div>
        <button
          onClick={() => setShowDepositForm(!showDepositForm)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showDepositForm ? 'Dong / 닫기' : 'Nhap tien / 입금 등록'}
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KpiCard
          title="Tong yeu cau / 요청 총액"
          value={fmtVND(totalRequested)}
          sub="VND"
          color="bg-blue-500"
        />
        <KpiCard
          title="Da duyet / 승인 총액"
          value={fmtVND(totalApproved)}
          sub="VND"
          color="bg-green-500"
        />
        <KpiCard
          title="Da nhap tien / 입금 총액"
          value={fmtVND(totalDeposited)}
          sub="VND"
          color="bg-emerald-500"
        />
        <KpiCard
          title="Con lai / 잔액"
          value={fmtVND(balance)}
          sub="VND"
          color={balance > 0 ? 'bg-amber-500' : 'bg-gray-400'}
        />
      </div>

      {/* ── Deposit Form ── */}
      {showDepositForm && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              Nhap tien tam ung / 전도금 입금 등록
            </h3>
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  So tien / 금액 (VND)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={dAmount}
                  onChange={(e) => setDAmount(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Ngay nhap / 입금일
                </label>
                <input
                  type="date"
                  value={dDate}
                  onChange={(e) => setDDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Ghi chu / 메모
                </label>
                <input
                  type="text"
                  value={dMemo}
                  onChange={(e) => setDMemo(e.target.value)}
                  placeholder="Ghi chu them / 추가 메모"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Preview */}
            {dAmount && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-blue-700">So tien nhap / 입금액 (VND):</span>
                  <span className="text-blue-900 font-bold font-mono text-sm">
                    {fmtVND(parseFloat(dAmount.replace(/[^0-9]/g, '')) || 0)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={handleDepositSubmit}
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Dang luu... / 저장 중...' : 'Luu nhap tien / 입금 등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pending Advances ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Yeu cau tam ung cho duyet / 대기 중 전도금 요청
          </h3>
          <span className="text-xs text-gray-500">
            {pendingAdvances.length}건 대기
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Dang tai... / 로딩 중...
          </div>
        ) : pendingAdvances.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Khong co yeu cau cho duyet / 대기 중인 요청 없음
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">Ngay / 날짜</th>
                  <th className="px-3 py-3">Nguoi yeu cau / 요청자</th>
                  <th className="px-3 py-3">Muc dich / 목적</th>
                  <th className="px-3 py-3 text-right">So tien / 금액</th>
                  {canManage && (
                    <th className="px-3 py-3 text-center">Thao tac / 처리</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingAdvances.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-xs text-gray-600 font-mono whitespace-nowrap">
                      {a.request_date}
                    </td>
                    <td className="px-3 py-3 text-xs font-medium text-gray-900">
                      {a.requester_name}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-700 max-w-[250px] truncate">
                      {a.detail}
                    </td>
                    <td className="px-3 py-3 text-xs text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                      {fmtVND(a.amount)}
                    </td>
                    {canManage && (
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleStatusChange(a.id, 'approved')}
                            className="px-2.5 py-1 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Duyet / 승인
                          </button>
                          <button
                            onClick={() => handleStatusChange(a.id, 'rejected')}
                            className="px-2.5 py-1 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Tu choi / 반려
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── All Advances History ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Lich su tam ung / 전도금 내역
          </h3>
          <span className="text-xs text-gray-500">
            Tong / 총 {advances.length}건
          </span>
        </div>

        {advances.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Chua co yeu cau / 전도금 내역 없음
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">Ngay / 날짜</th>
                  <th className="px-3 py-3">Nguoi yeu cau / 요청자</th>
                  <th className="px-3 py-3">Muc dich / 목적</th>
                  <th className="px-3 py-3 text-right">So tien / 금액</th>
                  <th className="px-3 py-3">Trang thai / 상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {advances.map((a) => {
                  const st = STATUS_BADGE[a.status ?? 'pending'] || STATUS_BADGE.pending
                  return (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-xs text-gray-600 font-mono whitespace-nowrap">
                        {a.request_date}
                      </td>
                      <td className="px-3 py-3 text-xs font-medium text-gray-900">
                        {a.requester_name}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-700 max-w-[250px] truncate">
                        {a.detail}
                      </td>
                      <td className="px-3 py-3 text-xs text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                        {fmtVND(a.amount)}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${st.bg} ${st.text}`}
                        >
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-900 text-white font-bold">
                  <td colSpan={3} className="px-3 py-3 text-xs">
                    Tong cong / 합계
                  </td>
                  <td className="px-3 py-3 text-right text-xs font-mono">
                    {fmtVND(totalRequested)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Deposit History ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Lich su nhap tien / 입금 내역
          </h3>
          <span className="text-xs text-gray-500">
            Tong / 총 {deposits.length}건
          </span>
        </div>

        {deposits.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Chua co nhap tien / 입금 내역 없음
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">Ngay nhap / 입금일</th>
                  <th className="px-3 py-3 text-right">So tien / 금액</th>
                  <th className="px-3 py-3">Ghi chu / 메모</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deposits.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-xs text-gray-600 font-mono whitespace-nowrap">
                      {d.deposit_date}
                    </td>
                    <td className="px-3 py-3 text-xs text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                      {fmtVND(d.amount)}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500">
                      {d.note || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-50 font-bold">
                  <td className="px-3 py-3 text-xs text-emerald-800">
                    Tong / 합계
                  </td>
                  <td className="px-3 py-3 text-xs text-right font-mono text-emerald-800">
                    {fmtVND(totalDeposited)}
                  </td>
                  <td />
                </tr>
              </tfoot>
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
