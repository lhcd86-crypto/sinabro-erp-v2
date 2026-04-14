'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isAdmin, isFinance } from '@/lib/roles'
import { supabase } from '@/lib/supabase'
import {
  useAdvance,
  type AdvanceRecord,
  type AdvanceRequest,
} from '@/hooks/useAdvance'

/* ── Category helpers ──────────────────────────────── */

const ADV_CATEGORIES = [
  { value: '\uC790\uC7AC', label: 'Vat tu / \uC790\uC7AC' },
  { value: '\uC7A5\uBE44', label: 'Thiet bi / \uC7A5\uBE44' },
  { value: '\uC778\uAC74\uBE44', label: 'Nhan cong / \uC778\uAC74\uBE44' },
  { value: '\uAD50\uD1B5', label: 'Giao thong / \uAD50\uD1B5' },
  { value: '\uC2DD\uBE44', label: 'An uong / \uC2DD\uBE44' },
  { value: '\uAE30\uD0C0', label: 'Khac / \uAE30\uD0C0' },
]

const RECEIPT_TYPES = [
  { value: '\uC5C6\uC74C', label: 'Khong co / \uC5C6\uC74C' },
  { value: '\uC138\uAE08\uC601\uC218\uC99D', label: 'Hoa don thue / \uC138\uAE08\uC601\uC218\uC99D' },
  { value: '\uAC04\uC774\uC601\uC218\uC99D', label: 'Bien lai don gian / \uAC04\uC774\uC601\uC218\uC99D' },
]

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  '\uB300\uAE30\uC911': { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Cho / \uB300\uAE30\uC911' },
  '\uC815\uC0B0\uC644\uB8CC': { bg: 'bg-green-50', text: 'text-green-700', label: 'Xong / \uC815\uC0B0\uC644\uB8CC' },
  '\uBC18\uB824': { bg: 'bg-red-50', text: 'text-red-700', label: 'Tu choi / \uBC18\uB824' },
}

const REQ_STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  '\uB300\uAE30': { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Cho duyet / \uB300\uAE30' },
  '\uC2B9\uC778': { bg: 'bg-green-50', text: 'text-green-700', label: 'Da duyet / \uC2B9\uC778' },
  '\uAC70\uC808': { bg: 'bg-red-50', text: 'text-red-700', label: 'Tu choi / \uAC70\uC808' },
  '\uC785\uAE08\uC644\uB8CC': { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Da nap / \uC785\uAE08\uC644\uB8CC' },
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function fmtVND(n: number) {
  return n.toLocaleString('vi-VN')
}

/* ── Component ─────────────────────────────────────── */

export default function AdvancePage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const {
    advances,
    requests,
    deposits,
    loading,
    loadAdvances,
    loadDeposits,
    loadRequests,
    saveAdvance,
    saveAdvRequest,
    approveAdvance,
    approveRequest,
    rejectRequest,
  } = useAdvance()

  const [tab, setTab] = useState<'usage' | 'request'>('usage')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Usage form state
  const [uDate, setUDate] = useState(today())
  const [uCat, setUCat] = useState('\uAE30\uD0C0')
  const [uAmount, setUAmount] = useState('')
  const [uDetail, setUDetail] = useState('')
  const [uReceipt, setUReceipt] = useState('\uC5C6\uC74C')
  const [uFile, setUFile] = useState<File | null>(null)

  // Request form state
  const [rAmount, setRAmount] = useState('')
  const [rDate, setRDate] = useState(today())
  const [rPurpose, setRPurpose] = useState('\uAE30\uD0C0')
  const [rReason, setRReason] = useState('')

  /* ── Load data ─── */
  useEffect(() => {
    if (user && currentProject) {
      loadAdvances()
      loadDeposits()
      loadRequests()
    }
  }, [user, currentProject, loadAdvances, loadDeposits, loadRequests])

  /* ── Toast ─── */
  const toast = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  /* ── KPI calculations ─── */
  const totalDeposited = deposits.reduce((s, d) => s + (d.amount || 0), 0)
  const totalUsed = advances.reduce((s, a) => s + (a.amount || 0), 0)
  const remaining = totalDeposited - totalUsed
  const pendingCount = requests.filter((r) => r.status === '\uB300\uAE30').length

  /* ── Upload receipt photo ─── */
  async function uploadPhoto(file: File): Promise<string | null> {
    if (!user) return null
    try {
      const path = `receipts/${user.id}/${Date.now()}_${file.name}`
      const { error } = await supabase.storage
        .from('report-photos')
        .upload(path, file, { cacheControl: '3600', upsert: false })
      if (error) {
        console.warn('Photo upload failed:', error.message)
        return null
      }
      return path
    } catch {
      return null
    }
  }

  /* ── Save usage ─── */
  async function handleSaveUsage() {
    const amount = parseFloat(uAmount.replace(/[^0-9]/g, '')) || 0
    if (!amount || amount <= 0) {
      toast('err', 'Nhap so tien / \uAE08\uC561\uC744 \uC785\uB825\uD558\uC138\uC694')
      return
    }
    if (!currentProject) {
      toast('err', 'Chon cong trinh / \uD604\uC7A5\uC744 \uC120\uD0DD\uD558\uC138\uC694')
      return
    }

    setSaving(true)
    try {
      let receiptUrl: string | null = null
      if (uFile) {
        receiptUrl = await uploadPhoto(uFile)
      }

      await saveAdvance({
        request_date: uDate,
        category: uCat,
        amount,
        detail: uDetail,
        receipt_type: uReceipt,
        receipt_url: receiptUrl,
      })

      // Reset form
      setUAmount('')
      setUDetail('')
      setUFile(null)
      toast('ok', 'Da ghi nhan / \uAE30\uB85D \uC644\uB8CC')
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  /* ── Save request ─── */
  async function handleSaveRequest() {
    const amount = parseFloat(rAmount.replace(/[^0-9]/g, '')) || 0
    if (!amount) {
      toast('err', 'Nhap so tien / \uAE08\uC561\uC744 \uC785\uB825\uD558\uC138\uC694')
      return
    }
    if (!rDate) {
      toast('err', 'Chon ngay can / \uD544\uC694\uC77C\uC790\uB97C \uC120\uD0DD\uD558\uC138\uC694')
      return
    }
    if (!rReason.trim()) {
      toast('err', 'Nhap ly do / \uC0AC\uC720\uB97C \uC785\uB825\uD558\uC138\uC694')
      return
    }

    setSaving(true)
    try {
      await saveAdvRequest({
        amount,
        needed_date: rDate,
        purpose: rPurpose,
        reason: rReason,
      })
      setRAmount('')
      setRReason('')
      toast('ok', 'Da gui yeu cau / \uC2E0\uCCAD \uC644\uB8CC')
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Request failed')
    } finally {
      setSaving(false)
    }
  }

  /* ── Admin check ─── */
  const canApprove = user ? isAdmin(user.role) : false

  if (!currentProject) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        Vui long chon cong trinh / \uD604\uC7A5\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.
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
          Tam ung / \uC804\uB3C4\uAE08
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Quan ly tam ung va yeu cau / \uC804\uB3C4\uAE08 \uC0AC\uC6A9 \uBC0F \uC2E0\uCCAD \uAD00\uB9AC
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Tong nap / \uCD1D \uC785\uAE08"
          value={fmtVND(totalDeposited)}
          sub="VND"
          color="bg-green-500"
        />
        <KpiCard
          title="Da chi / \uCD1D \uC9C0\uCD9C"
          value={fmtVND(totalUsed)}
          sub="VND"
          color="bg-red-500"
        />
        <KpiCard
          title="So du / \uC794\uC561"
          value={fmtVND(remaining)}
          sub="VND"
          color={remaining >= 0 ? 'bg-blue-500' : 'bg-red-500'}
        />
        <KpiCard
          title="Cho duyet / \uB300\uAE30"
          value={String(pendingCount)}
          sub="yeu cau / \uAC74"
          color="bg-amber-500"
        />
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setTab('usage')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              tab === 'usage'
                ? 'text-blue-700 bg-blue-50 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Tam ung CDT / \uC804\uB3C4\uAE08 \uC0AC\uC6A9
          </button>
          <button
            onClick={() => setTab('request')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              tab === 'request'
                ? 'text-blue-700 bg-blue-50 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Yeu cau TU / \uC804\uB3C4\uAE08 \uC2E0\uCCAD
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {tab === 'usage' ? (
            /* ── Usage Form ── */
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Ghi nhan chi phi / \uC0AC\uC6A9 \uAE30\uB85D
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Ngay / \uB0A0\uC9DC
                  </label>
                  <input
                    type="date"
                    value={uDate}
                    onChange={(e) => setUDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Phan loai / \uBD84\uB958
                  </label>
                  <select
                    value={uCat}
                    onChange={(e) => setUCat(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {ADV_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    So tien / \uAE08\uC561 (VND)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={uAmount}
                    onChange={(e) => setUAmount(e.target.value)}
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Chi tiet / \uC0C1\uC138
                  </label>
                  <input
                    type="text"
                    value={uDetail}
                    onChange={(e) => setUDetail(e.target.value)}
                    placeholder="Noi dung chi tiet / \uC0C1\uC138 \uB0B4\uC6A9"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Chung tu / \uC601\uC218\uC99D
                  </label>
                  <select
                    value={uReceipt}
                    onChange={(e) => setUReceipt(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {RECEIPT_TYPES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Anh chung tu / \uC601\uC218\uC99D \uC0AC\uC9C4
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setUFile(e.target.files?.[0] ?? null)}
                    className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveUsage}
                  disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Dang luu... / \uC800\uC7A5 \uC911...' : 'Ghi nhan / \uAE30\uB85D'}
                </button>
              </div>
            </div>
          ) : (
            /* ── Request Form ── */
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Gui yeu cau tam ung / \uC804\uB3C4\uAE08 \uC2E0\uCCAD
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    So tien / \uAE08\uC561 (VND)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={rAmount}
                    onChange={(e) => setRAmount(e.target.value)}
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Ngay can / \uD544\uC694\uC77C
                  </label>
                  <input
                    type="date"
                    value={rDate}
                    onChange={(e) => setRDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Muc dich / \uC6A9\uB3C4
                  </label>
                  <select
                    value={rPurpose}
                    onChange={(e) => setRPurpose(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {ADV_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Ly do / \uC0AC\uC720
                  </label>
                  <textarea
                    value={rReason}
                    onChange={(e) => setRReason(e.target.value)}
                    rows={3}
                    placeholder="Ly do yeu cau / \uC2E0\uCCAD \uC0AC\uC720"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveRequest}
                  disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving
                    ? 'Dang gui... / \uC2E0\uCCAD \uC911...'
                    : 'Gui yeu cau / \uC2E0\uCCAD'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Usage History Table ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Lich su su dung / \uC0AC\uC6A9 \uB0B4\uC5ED
          </h3>
          <span className="text-xs text-gray-500">
            Tong / \uCD1D {advances.length}\uAC74
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Dang tai... / \uB85C\uB529 \uC911...
          </div>
        ) : advances.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Chua co du lieu / \uAE30\uB85D \uC5C6\uC74C
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Ngay / \uB0A0\uC9DC</th>
                  <th className="px-4 py-3">Loai / \uBD84\uB958</th>
                  <th className="px-4 py-3">So tien / \uAE08\uC561</th>
                  <th className="px-4 py-3">Chi tiet / \uC0C1\uC138</th>
                  <th className="px-4 py-3">Trang thai / \uC0C1\uD0DC</th>
                  <th className="px-4 py-3">Nguoi / \uC791\uC131\uC790</th>
                  {canApprove && (
                    <th className="px-4 py-3 text-center">
                      Thao tac / \uCC98\uB9AC
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {advances.map((a) => (
                  <AdvRow
                    key={a.id}
                    item={a}
                    canApprove={canApprove}
                    onApprove={() =>
                      approveAdvance(a.id).catch((e) =>
                        toast('err', e.message),
                      )
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pending Requests (for admin) ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            Yeu cau tam ung / \uC804\uB3C4\uAE08 \uC2E0\uCCAD \uBAA9\uB85D
          </h3>
        </div>

        {requests.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Chua co yeu cau / \uC2E0\uCCAD \uB0B4\uC5ED \uC5C6\uC74C
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Ngay gui / \uC2E0\uCCAD\uC77C</th>
                  <th className="px-4 py-3">Ngay can / \uD544\uC694\uC77C</th>
                  <th className="px-4 py-3">Muc dich / \uC6A9\uB3C4</th>
                  <th className="px-4 py-3">So tien / \uAE08\uC561</th>
                  <th className="px-4 py-3">Ly do / \uC0AC\uC720</th>
                  <th className="px-4 py-3">Trang thai / \uC0C1\uD0DC</th>
                  {canApprove && (
                    <th className="px-4 py-3 text-center">
                      Thao tac / \uCC98\uB9AC
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((r) => (
                  <ReqRow
                    key={r.id}
                    item={r}
                    canApprove={canApprove}
                    onApprove={() =>
                      approveRequest(r.id).catch((e) =>
                        toast('err', e.message),
                      )
                    }
                    onReject={() =>
                      rejectRequest(r.id).catch((e) =>
                        toast('err', e.message),
                      )
                    }
                  />
                ))}
              </tbody>
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

function AdvRow({
  item,
  canApprove,
  onApprove,
}: {
  item: AdvanceRecord
  canApprove: boolean
  onApprove: () => void
}) {
  const st = STATUS_STYLES[item.status] ?? STATUS_STYLES['\uB300\uAE30\uC911']
  const isSettled = item.status === '\uC815\uC0B0\uC644\uB8CC' || item.current_step === 'settled'

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap font-mono">
        {item.request_date}
      </td>
      <td className="px-4 py-3">
        <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
          {item.category}
        </span>
      </td>
      <td className="px-4 py-3 text-right font-bold text-red-600 whitespace-nowrap font-mono">
        {fmtVND(item.amount)}
      </td>
      <td className="px-4 py-3 text-xs text-gray-600 max-w-[200px] truncate">
        {item.detail || '-'}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${st.bg} ${st.text}`}
        >
          {st.label}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-gray-600">
        {item.users?.name || item.requester_name || '-'}
      </td>
      {canApprove && (
        <td className="px-4 py-3 text-center">
          {!isSettled && item.status !== '\uBC18\uB824' ? (
            <button
              onClick={onApprove}
              className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Duyet / \uC2B9\uC778
            </button>
          ) : (
            <span className="text-gray-300">&mdash;</span>
          )}
        </td>
      )}
    </tr>
  )
}

function ReqRow({
  item,
  canApprove,
  onApprove,
  onReject,
}: {
  item: AdvanceRequest
  canApprove: boolean
  onApprove: () => void
  onReject: () => void
}) {
  const st = REQ_STATUS_STYLES[item.status] ?? REQ_STATUS_STYLES['\uB300\uAE30']
  const isPending = item.status === '\uB300\uAE30'

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap font-mono">
        {item.created_at?.slice(0, 10)}
      </td>
      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap font-mono">
        {item.needed_date}
      </td>
      <td className="px-4 py-3">
        <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
          {item.purpose || '-'}
        </span>
      </td>
      <td className="px-4 py-3 text-right font-bold text-gray-900 whitespace-nowrap font-mono">
        {fmtVND(item.amount)}
      </td>
      <td className="px-4 py-3 text-xs text-gray-600 max-w-[200px] truncate">
        {item.reason || '-'}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${st.bg} ${st.text}`}
        >
          {st.label}
        </span>
      </td>
      {canApprove && (
        <td className="px-4 py-3 text-center whitespace-nowrap">
          {isPending ? (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={onApprove}
                className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Duyet / \uC2B9\uC778
              </button>
              <button
                onClick={onReject}
                className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Tu choi / \uAC70\uC808
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
