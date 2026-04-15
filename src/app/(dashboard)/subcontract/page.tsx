'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isAdmin } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

/* ── Types ────────────────────────────────────────── */

interface SubcontractPayment {
  id: string
  project_id: string | null
  vendor_id: string | null
  amount: number | null
  paid_date: string | null
  due_date: string | null
  billing_id: string | null
  status: string | null
  created_at: string | null
}

/* ── Helpers ───────────────────────────────────────── */

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Cho xu ly / 대기' },
  partial: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Mot phan / 일부지급' },
  completed: { bg: 'bg-green-50', text: 'text-green-700', label: 'Hoan thanh / 완료' },
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function fmtVND(n: number) {
  return n.toLocaleString('vi-VN')
}

/* ── Component ─────────────────────────────────────── */

export default function SubcontractPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [payments, setPayments] = useState<SubcontractPayment[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [fName, setFName] = useState('')
  const [fWorkType, setFWorkType] = useState('')
  const [fContract, setFContract] = useState('')
  const [fPaid, setFPaid] = useState('')
  const [fDate, setFDate] = useState(today())
  const [fInvoice, setFInvoice] = useState('')
  const [fNotes, setFNotes] = useState('')
  const [fStatus, setFStatus] = useState<'pending' | 'partial' | 'completed'>('pending')

  /* ── Toast ─── */
  const toast = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  /* ── Load data ─── */
  const loadPayments = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('subcontract_payments')
        .select('*')
        .eq('project_id', currentProject)
        .order('paid_date', { ascending: false })
      if (error) throw error
      setPayments(data || [])
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [currentProject, toast])

  /* ── Initial load ─── */
  useEffect(() => {
    if (user && currentProject) {
      loadPayments()
    }
  }, [user, currentProject, loadPayments])

  /* ── Submit ─── */
  async function handleSubmit() {
    if (!currentProject || !user) {
      toast('err', 'Chon cong trinh / 현장을 선택하세요')
      return
    }
    if (!fName.trim()) {
      toast('err', 'Nhap ten nha thau / 업체명을 입력하세요')
      return
    }
    if (!fWorkType.trim()) {
      toast('err', 'Nhap loai cong viec / 공종을 입력하세요')
      return
    }

    const contractAmt = parseFloat(fContract.replace(/[^0-9]/g, '')) || 0
    const paidAmt = parseFloat(fPaid.replace(/[^0-9]/g, '')) || 0

    if (!contractAmt) {
      toast('err', 'Nhap so tien hop dong / 계약금액을 입력하세요')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.from('subcontract_payments').insert({
        project_id: currentProject,
        vendor_id: fName.trim(),
        amount: paidAmt,
        paid_date: fDate,
        status: fStatus,
      })
      if (error) throw error

      // Reset form
      setFName('')
      setFWorkType('')
      setFContract('')
      setFPaid('')
      setFDate(today())
      setFInvoice('')
      setFNotes('')
      setFStatus('pending')
      setShowForm(false)
      toast('ok', 'Da luu thanh toan / 정산 등록 완료')
      loadPayments()
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const canManage = user ? isAdmin(user.role) : false

  /* ── KPI calculations ─── */
  const totalContract = payments.reduce((s, p) => s + (p.amount || 0), 0)
  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0)
  const totalRemaining = totalContract - totalPaid

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
            Thanh toan thau phu / 하도급 정산
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Quan ly hop dong va thanh toan thau phu / 하도급 계약 및 정산 관리
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showForm ? 'Dong / 닫기' : 'Them moi / 정산 등록'}
          </button>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Tong hop dong / 계약 총액"
          value={fmtVND(totalContract)}
          sub="VND"
          color="bg-blue-500"
        />
        <KpiCard
          title="Da thanh toan / 지급 총액"
          value={fmtVND(totalPaid)}
          sub="VND"
          color="bg-green-500"
        />
        <KpiCard
          title="Con lai / 잔액"
          value={fmtVND(totalRemaining)}
          sub="VND"
          color={totalRemaining > 0 ? 'bg-amber-500' : 'bg-gray-400'}
        />
      </div>

      {/* ── Entry Form ── */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              Them thanh toan thau phu / 하도급 정산 등록
            </h3>
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Ten nha thau / 업체명
                </label>
                <input
                  type="text"
                  value={fName}
                  onChange={(e) => setFName(e.target.value)}
                  placeholder="Ten cong ty / 업체명 입력"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Loai cong viec / 공종
                </label>
                <input
                  type="text"
                  value={fWorkType}
                  onChange={(e) => setFWorkType(e.target.value)}
                  placeholder="VD: Co khi, Dien..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  So tien hop dong / 계약금액 (VND)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={fContract}
                  onChange={(e) => setFContract(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  So tien da tra / 지급금액 (VND)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={fPaid}
                  onChange={(e) => setFPaid(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Ngay thanh toan / 지급일
                </label>
                <input
                  type="date"
                  value={fDate}
                  onChange={(e) => setFDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  So hoa don / 세금계산서 번호
                </label>
                <input
                  type="text"
                  value={fInvoice}
                  onChange={(e) => setFInvoice(e.target.value)}
                  placeholder="INV-001"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Trang thai / 상태
                </label>
                <select
                  value={fStatus}
                  onChange={(e) => setFStatus(e.target.value as 'pending' | 'partial' | 'completed')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="pending">Cho xu ly / 대기</option>
                  <option value="partial">Mot phan / 일부지급</option>
                  <option value="completed">Hoan thanh / 완료</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Ghi chu / 비고
                </label>
                <input
                  type="text"
                  value={fNotes}
                  onChange={(e) => setFNotes(e.target.value)}
                  placeholder="Ghi chu them / 추가 메모"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Preview */}
            {(fContract || fPaid) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-blue-700">Con lai / 잔액 (VND):</span>
                  <span className="text-blue-900 font-bold font-mono text-sm">
                    {fmtVND(
                      (parseFloat(fContract.replace(/[^0-9]/g, '')) || 0) -
                        (parseFloat(fPaid.replace(/[^0-9]/g, '')) || 0),
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
                {saving ? 'Dang luu... / 저장 중...' : 'Luu / 정산 등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Payments Table ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Danh sach thanh toan / 하도급 정산 내역
          </h3>
          <span className="text-xs text-gray-500">
            Tong / 총 {payments.length}건
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Dang tai... / 로딩 중...
          </div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Chua co thanh toan / 정산 내역 없음
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">Ngay / 날짜</th>
                  <th className="px-3 py-3">Nha thau / 업체명</th>
                  <th className="px-3 py-3">Cong viec / 공종</th>
                  <th className="px-3 py-3 text-right">Hop dong / 계약금액</th>
                  <th className="px-3 py-3 text-right">Da tra / 지급액</th>
                  <th className="px-3 py-3 text-right">Con lai / 잔액</th>
                  <th className="px-3 py-3">Hoa don / 세금계산서</th>
                  <th className="px-3 py-3">Trang thai / 상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => {
                  const st = STATUS_BADGE[p.status ?? 'pending'] || STATUS_BADGE.pending
                  const remaining = 0
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-xs text-gray-600 font-mono whitespace-nowrap">
                        {p.paid_date}
                      </td>
                      <td className="px-3 py-3 text-xs font-medium text-gray-900">
                        {p.vendor_id}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-700">
                        {p.vendor_id ?? '-'}
                      </td>
                      <td className="px-3 py-3 text-xs text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                        {fmtVND(p.amount ?? 0)}
                      </td>
                      <td className="px-3 py-3 text-xs text-right font-mono font-bold text-green-700 whitespace-nowrap">
                        {fmtVND(p.amount ?? 0)}
                      </td>
                      <td className="px-3 py-3 text-xs text-right font-mono font-bold text-amber-700 whitespace-nowrap">
                        {fmtVND(remaining)}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600">
                        {p.status || '-'}
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
                    {fmtVND(totalContract)}
                  </td>
                  <td className="px-3 py-3 text-right text-xs font-mono">
                    {fmtVND(totalPaid)}
                  </td>
                  <td className="px-3 py-3 text-right text-xs font-mono">
                    {fmtVND(totalRemaining)}
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
