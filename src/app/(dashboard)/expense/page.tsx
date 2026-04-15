'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isAdmin } from '@/lib/roles'
import { supabase } from '@/lib/supabase'
import {
  useExpense,
  EXPENSE_CATEGORIES,
  type ExpenseRecord,
} from '@/hooks/useExpense'

/* ── Helpers ───────────────────────────────────────── */

const STATUS_MAP: Record<string, { bg: string; text: string; label: string }> = {
  '대기': { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Cho duyet / 대기' },
  '임원승인대기': { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Dang cho / 임원승인대기' },
  '승인': { bg: 'bg-green-50', text: 'text-green-700', label: 'Da duyet / 승인' },
  '반려': { bg: 'bg-red-50', text: 'text-red-700', label: 'Tu choi / 반려' },
}

const VAT_OPTIONS = [
  { value: 10, label: '10% (VAT thong thuong / 일반)' },
  { value: 8, label: '8%' },
  { value: 5, label: '5%' },
  { value: 0, label: '0% (Mien thue / 비과세)' },
  { value: -1, label: 'Mien thue / 면세' },
  { value: -2, label: 'Chua nhan / 미수취' },
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

function fmtVND(n: number) {
  return n.toLocaleString('vi-VN')
}

function thisMonthStart() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

/* ── Component ─────────────────────────────────────── */

export default function ExpensePage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const {
    expenses,
    loading,
    loadExpenses,
    saveExpense,
    approveExpense,
    rejectExpense,
  } = useExpense()

  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Form state
  const [fDate, setFDate] = useState(today())
  const [fCat, setFCat] = useState('자재')
  const [fDesc, setFDesc] = useState('')
  const [fVendor, setFVendor] = useState('')
  const [fUnit, setFUnit] = useState('')
  const [fQty, setFQty] = useState('')
  const [fPrice, setFPrice] = useState('')
  const [fTotal, setFTotal] = useState('')
  const [fVatRate, setFVatRate] = useState(10)
  const [fVatAmt, setFVatAmt] = useState('')
  const [fGrand, setFGrand] = useState('')
  const [fNote, setFNote] = useState('')
  const [fFile, setFFile] = useState<File | null>(null)

  /* ── Load data ─── */
  useEffect(() => {
    if (user && currentProject) {
      loadExpenses()
    }
  }, [user, currentProject, loadExpenses])

  /* ── Auto-calc ─── */
  useEffect(() => {
    const qty = parseFloat(fQty) || 0
    const price = parseFloat(fPrice.replace(/[^0-9]/g, '')) || 0
    const total = qty * price
    if (qty && price) {
      setFTotal(String(total))
    }
    const base = parseFloat(fTotal.replace(/[^0-9]/g, '')) || total
    if (fVatRate > 0) {
      const vat = Math.round(base * fVatRate / 100)
      setFVatAmt(String(vat))
      setFGrand(String(base + vat))
    } else {
      setFVatAmt('0')
      setFGrand(String(base))
    }
  }, [fQty, fPrice, fTotal, fVatRate])

  /* ── Toast ─── */
  const toast = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  /* ── KPI calculations ─── */
  const monthStart = thisMonthStart()
  const thisMonthExpenses = expenses.filter(
    (e) => e.expense_date >= monthStart,
  )
  const totalThisMonth = thisMonthExpenses.reduce(
    (s, e) => s + (e.total_amount || 0),
    0,
  )
  const pendingApproval = expenses.filter(
    (e) => e.status === '대기' || e.status === '임원승인대기',
  ).length
  const approvedTotal = expenses
    .filter((e) => e.status === '승인')
    .reduce((s, e) => s + (e.total_amount || 0), 0)

  /* ── Upload ─── */
  async function uploadDoc(file: File): Promise<string | null> {
    if (!user || !currentProject) return null
    try {
      const path = `expense/${currentProject}/${today()}_${file.name}`
      const { error } = await supabase.storage
        .from('report-photos')
        .upload(path, file, { upsert: true })
      if (error) return null
      const { data } = supabase.storage
        .from('report-photos')
        .getPublicUrl(path)
      return data?.publicUrl || null
    } catch {
      return null
    }
  }

  /* ── Submit expense ─── */
  async function handleSubmit() {
    if (!currentProject) {
      toast('err', 'Chon cong trinh / 현장을 선택하세요')
      return
    }
    if (!fDesc.trim()) {
      toast('err', 'Nhap noi dung / 내용을 입력하세요')
      return
    }

    const qty = parseFloat(fQty) || 0
    const unitPrice = parseFloat(fPrice.replace(/[^0-9]/g, '')) || 0
    const totalAmt = parseFloat(fTotal.replace(/[^0-9]/g, '')) || qty * unitPrice
    const vatAmt = parseFloat(fVatAmt.replace(/[^0-9]/g, '')) || 0
    const grandTotal = parseFloat(fGrand.replace(/[^0-9]/g, '')) || totalAmt + vatAmt

    if (!totalAmt && !unitPrice) {
      toast('err', 'Nhap so tien / 금액을 입력하세요')
      return
    }

    setSaving(true)
    try {
      let docUrl: string | null = null
      if (fFile) {
        docUrl = await uploadDoc(fFile)
      }

      await saveExpense({
        expense_date: fDate,
        category: fCat,
        description: fDesc.trim(),
        vendor: fVendor.trim(),
        unit: fUnit.trim(),
        qty,
        unit_price: unitPrice,
        total_amount: totalAmt || unitPrice,
        vat_rate: fVatRate,
        vat_amount: vatAmt,
        grand_total: grandTotal,
        note: fNote,
        doc_url: docUrl,
      })

      // Reset form
      setFDesc('')
      setFVendor('')
      setFUnit('')
      setFQty('')
      setFPrice('')
      setFTotal('')
      setFVatAmt('')
      setFGrand('')
      setFNote('')
      setFFile(null)
      toast('ok', 'Da gui phieu chi / 지출결의서 제출 완료')
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const canApprove = user ? isAdmin(user.role) : false

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
          Chi phi / 지출결의
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Lap phieu chi va phe duyet / 지출결의서 작성 및 결재
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Thang nay / 이번달 지출"
          value={fmtVND(totalThisMonth)}
          sub={`${thisMonthExpenses.length} phieu / 건`}
          color="bg-amber-500"
        />
        <KpiCard
          title="Cho duyet / 진행 중"
          value={String(pendingApproval)}
          sub="phieu / 건"
          color="bg-blue-500"
        />
        <KpiCard
          title="Da duyet / 결재 합계"
          value={fmtVND(approvedTotal)}
          sub="VND"
          color="bg-green-500"
        />
      </div>

      {/* ── Submission Form ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            Tao phieu chi / 지출결의서 작성
          </h3>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date */}
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

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Phan loai / 분류
              </label>
              <select
                value={fCat}
                onChange={(e) => setFCat(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Noi dung / 내용
              </label>
              <input
                type="text"
                value={fDesc}
                onChange={(e) => setFDesc(e.target.value)}
                placeholder="Mo ta chi phi / 지출 내용"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Vendor */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Nha cung cap / 거래처
              </label>
              <input
                type="text"
                value={fVendor}
                onChange={(e) => setFVendor(e.target.value)}
                placeholder="Ten nha cung cap"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Unit */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Don vi / 단위
              </label>
              <input
                type="text"
                value={fUnit}
                onChange={(e) => setFUnit(e.target.value)}
                placeholder="kg, m, cai..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Qty */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                So luong / 수량
              </label>
              <input
                type="number"
                value={fQty}
                onChange={(e) => setFQty(e.target.value)}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Unit Price */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Don gia / 단가 (VND)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={fPrice}
                onChange={(e) => setFPrice(e.target.value)}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Total */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Thanh tien / 합계 (VND)
              </label>
              <input
                type="text"
                readOnly
                value={fTotal ? Number(fTotal).toLocaleString('vi-VN') : ''}
                placeholder="Tu dong / 자동 계산"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700 font-mono"
              />
            </div>

            {/* VAT Rate */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Thue GTGT / VAT
              </label>
              <select
                value={fVatRate}
                onChange={(e) => setFVatRate(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {VAT_OPTIONS.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            {/* VAT Amount */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Tien thue / 세액 (VND)
              </label>
              <input
                type="text"
                readOnly
                value={fVatAmt ? Number(fVatAmt).toLocaleString('vi-VN') : '0'}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700 font-mono"
              />
            </div>

            {/* Grand Total */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Tong cong / 총액 (VND)
              </label>
              <input
                type="text"
                readOnly
                value={fGrand ? Number(fGrand).toLocaleString('vi-VN') : '0'}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 font-bold font-mono text-blue-700"
              />
            </div>

            {/* Receipt photo */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Chung tu / 증빙 사진
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setFFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {/* Note */}
            <div className="sm:col-span-2">
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

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving
                ? 'Dang gui... / 제출 중...'
                : 'Gui phe duyet / 결재 요청'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Expense History Table ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Lich su chi phi / 지출 내역
          </h3>
          <span className="text-xs text-gray-500">
            Tong / 총 {expenses.length}건
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Dang tai... / 로딩 중...
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Chua co phieu chi / 지출 없음
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">Ngay / 날짜</th>
                  <th className="px-3 py-3">Loai / 분류</th>
                  <th className="px-3 py-3">Noi dung / 내용</th>
                  <th className="px-3 py-3">NCC / 거래처</th>
                  <th className="px-3 py-3 text-right">SL</th>
                  <th className="px-3 py-3 text-right">Don gia / 단가</th>
                  <th className="px-3 py-3 text-right">Thanh tien / 합계</th>
                  <th className="px-3 py-3">Trang thai / 상태</th>
                  {canApprove && (
                    <th className="px-3 py-3 text-center">
                      Thao tac / 처리
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expenses.map((e) => (
                  <ExpRow
                    key={e.id}
                    item={e}
                    canApprove={canApprove}
                    onApprove={() =>
                      approveExpense(e.id).catch((err) =>
                        toast('err', err.message),
                      )
                    }
                    onReject={() =>
                      rejectExpense(e.id).catch((err) =>
                        toast('err', err.message),
                      )
                    }
                  />
                ))}
              </tbody>
              {/* Total footer */}
              {expenses.some((e) => e.status === '승인') && (
                <tfoot>
                  <tr className="bg-gray-900 text-white font-bold">
                    <td colSpan={6} className="px-3 py-3 text-xs">
                      Tong da duyet / 결재완료 합계
                    </td>
                    <td className="px-3 py-3 text-right text-xs font-mono">
                      {fmtVND(approvedTotal)} VND
                    </td>
                    <td colSpan={canApprove ? 2 : 1} />
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

function ExpRow({
  item,
  canApprove,
  onApprove,
  onReject,
}: {
  item: ExpenseRecord
  canApprove: boolean
  onApprove: () => void
  onReject: () => void
}) {
  const st = STATUS_MAP[item.status] ?? STATUS_MAP['대기']
  const isPending = item.status === '대기' || item.status === '임원승인대기'
  const isApproved = item.status === '승인'
  const isRejected = item.status === '반려'

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap font-mono">
        {item.expense_date}
      </td>
      <td className="px-3 py-3">
        <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
          {item.category}
        </span>
      </td>
      <td className="px-3 py-3 text-xs text-gray-700 max-w-[200px] truncate font-medium">
        {item.description || '-'}
        {item.doc_url && (
          <a
            href={item.doc_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 text-blue-500 text-[10px]"
          >
            [file]
          </a>
        )}
      </td>
      <td className="px-3 py-3 text-xs text-gray-600">
        {item.vendor || '-'}
      </td>
      <td className="px-3 py-3 text-xs text-gray-600 text-right font-mono">
        {item.qty || ''} {item.unit || ''}
      </td>
      <td className="px-3 py-3 text-xs text-gray-600 text-right font-mono">
        {item.unit_price ? fmtVND(item.unit_price) : ''}
      </td>
      <td className="px-3 py-3 text-right font-bold text-gray-900 whitespace-nowrap font-mono text-xs">
        {fmtVND(item.total_amount)}
        {item.vat_rate === -1 && (
          <span className="ml-1 text-[9px] bg-gray-200 text-gray-600 px-1 rounded">
            mien thue
          </span>
        )}
        {item.vat_rate === -2 && (
          <span className="ml-1 text-[9px] bg-red-100 text-red-600 px-1 rounded">
            chua nhan
          </span>
        )}
      </td>
      <td className="px-3 py-3">
        <span
          className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${st.bg} ${st.text}`}
        >
          {st.label}
        </span>
      </td>
      {canApprove && (
        <td className="px-3 py-3 text-center whitespace-nowrap">
          {isPending ? (
            <div className="flex items-center justify-center gap-1">
              <button
                onClick={onApprove}
                className="px-2.5 py-1 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Duyet / 승인
              </button>
              <button
                onClick={onReject}
                className="px-2.5 py-1 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Tu choi / 반려
              </button>
            </div>
          ) : (
            <span className="text-gray-300">&mdash;</span>
          )}
        </td>
      )}
    </tr>
  )
}
