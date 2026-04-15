'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isAdmin } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

/* ── Types ────────────────────────────────────────── */

interface LaborRate {
  id: string
  project_id: string
  worker_type: string
  daily_rate: number
  ot_hourly: number | null
  effective_from: string
  note: string | null
  created_at: string | null
}

/* ── Helpers ───────────────────────────────────────── */

const CATEGORIES = [
  { value: '직접인부', label: 'Tho TT / 직접인부' },
  { value: '간접인부', label: 'Tho GT / 간접인부' },
  { value: 'VN기술자', label: 'KTV VN / VN기술자' },
  { value: '한국기술자', label: 'KTV HQ / 한국기술자' },
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

function fmtVND(n: number) {
  return n.toLocaleString('vi-VN')
}

function getMonthOptions() {
  const options: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${d.getFullYear()}년 ${d.getMonth() + 1}월`
    options.push({ value: val, label })
  }
  return options
}

/* ── Component ─────────────────────────────────────── */

export default function LaborPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [rates, setRates] = useState<LaborRate[]>([])
  const [history, setHistory] = useState<LaborRate[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Edit state: keyed by category
  const [editRates, setEditRates] = useState<
    Record<string, { daily_rate: string; ot_hourly: string; note: string }>
  >({})

  // Month filter
  const monthOptions = getMonthOptions()
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value)

  /* ── Toast ─── */
  const toast = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  /* ── Load current rates ─── */
  const loadRates = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('labor_rates')
        .select('*')
        .eq('project_id', currentProject)
        .order('effective_from', { ascending: false })
      if (error) throw error

      // Get latest rate per category
      const latestMap: Record<string, LaborRate> = {}
      for (const r of data || []) {
        if (!latestMap[r.worker_type]) {
          latestMap[r.worker_type] = r
        }
      }

      const latestRates = CATEGORIES.map((c) => latestMap[c.value]).filter(Boolean) as LaborRate[]
      setRates(latestRates)
      setHistory(data || [])

      // Initialize edit state
      const editInit: Record<string, { daily_rate: string; ot_hourly: string; note: string }> = {}
      for (const c of CATEGORIES) {
        const r = latestMap[c.value]
        editInit[c.value] = {
          daily_rate: r ? String(r.daily_rate) : '0',
          ot_hourly: r ? String(r.ot_hourly) : '0',
          note: r ? String(r.note) : '0',
        }
      }
      setEditRates(editInit)
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [currentProject, toast])

  /* ── Initial load ─── */
  useEffect(() => {
    if (user && currentProject) {
      loadRates()
    }
  }, [user, currentProject, loadRates])

  /* ── Save rate ─── */
  async function handleSaveRate(category: string) {
    if (!currentProject || !user) {
      toast('err', 'Chon cong trinh / 현장을 선택하세요')
      return
    }

    const edit = editRates[category]
    if (!edit) return

    const dailyRate = parseFloat(edit.daily_rate.replace(/[^0-9]/g, '')) || 0
    const otRate = parseFloat(edit.ot_hourly.replace(/[^0-9]/g, '')) || 0
    const nightBonus = parseFloat(edit.note.replace(/[^0-9]/g, '')) || 0

    if (!dailyRate) {
      toast('err', 'Nhap ildan / 일당을 입력하세요')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.from('labor_rates').insert({
        project_id: currentProject,
        worker_type: category,
        daily_rate: dailyRate,
        ot_hourly: otRate,
        effective_from: today(),
        note: String(nightBonus),
      })
      if (error) throw error
      toast('ok', 'Da luu don gia / 단가 저장 완료')
      loadRates()
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function updateEditField(category: string, field: string, value: string) {
    setEditRates((prev) => ({
      ...prev,
      [category]: { ...prev[category], [field]: value },
    }))
  }

  const canManage = user ? isAdmin(user.role) : false

  // Filter history by month
  const filteredHistory = history.filter((r) => r.effective_from.startsWith(selectedMonth))

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
          Don gia nhan cong / 인건비 단가
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Quan ly don gia nhan cong theo loai / 직종별 인건비 단가 관리
        </p>
      </div>

      {/* ── Current Rates Table ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            Don gia hien tai / 현재 적용 단가
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Dang tai... / 로딩 중...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">Loai / 직종</th>
                  <th className="px-3 py-3 text-right">Ildan / 일당 (VND)</th>
                  <th className="px-3 py-3 text-right">OT / 시간외 (VND/h)</th>
                  <th className="px-3 py-3 text-right">Ca dem / 야간수당 (VND)</th>
                  {canManage && (
                    <th className="px-3 py-3 text-center">Thao tac / 처리</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {CATEGORIES.map((cat) => {
                  const edit = editRates[cat.value] || {
                    daily_rate: '0',
                    ot_hourly: '0',
                    note: '0',
                  }
                  return (
                    <tr key={cat.value} className="hover:bg-gray-50">
                      <td className="px-3 py-3">
                        <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                          {cat.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {canManage ? (
                          <input
                            type="text"
                            inputMode="numeric"
                            value={edit.daily_rate}
                            onChange={(e) =>
                              updateEditField(cat.value, 'daily_rate', e.target.value)
                            }
                            className="w-32 border border-gray-300 rounded-lg px-2 py-1 text-xs text-right font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <span className="text-xs font-mono font-bold text-gray-900">
                            {fmtVND(parseFloat(edit.daily_rate) || 0)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {canManage ? (
                          <input
                            type="text"
                            inputMode="numeric"
                            value={edit.ot_hourly}
                            onChange={(e) =>
                              updateEditField(cat.value, 'ot_hourly', e.target.value)
                            }
                            className="w-32 border border-gray-300 rounded-lg px-2 py-1 text-xs text-right font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <span className="text-xs font-mono font-bold text-gray-900">
                            {fmtVND(parseFloat(edit.ot_hourly) || 0)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {canManage ? (
                          <input
                            type="text"
                            inputMode="numeric"
                            value={edit.note}
                            onChange={(e) =>
                              updateEditField(cat.value, 'note', e.target.value)
                            }
                            className="w-32 border border-gray-300 rounded-lg px-2 py-1 text-xs text-right font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <span className="text-xs font-mono font-bold text-gray-900">
                            {fmtVND(parseFloat(edit.note) || 0)}
                          </span>
                        )}
                      </td>
                      {canManage && (
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={() => handleSaveRate(cat.value)}
                            disabled={saving}
                            className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            Luu / 저장
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Rate Change History ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Lich su thay doi / 단가 변경 이력
          </h3>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Khong co lich su / 변경 이력 없음
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">Ngay / 적용일</th>
                  <th className="px-3 py-3">Loai / 직종</th>
                  <th className="px-3 py-3 text-right">Ildan / 일당</th>
                  <th className="px-3 py-3 text-right">OT / 시간외</th>
                  <th className="px-3 py-3 text-right">Ca dem / 야간</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredHistory.map((r) => {
                  const catLabel =
                    CATEGORIES.find((c) => c.value === r.worker_type)?.label || r.worker_type
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-xs text-gray-600 font-mono whitespace-nowrap">
                        {r.effective_from}
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                          {catLabel}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-right font-mono font-bold text-gray-900">
                        {fmtVND(r.daily_rate)}
                      </td>
                      <td className="px-3 py-3 text-xs text-right font-mono text-gray-700">
                        {fmtVND(r.ot_hourly ?? 0)}
                      </td>
                      <td className="px-3 py-3 text-xs text-right font-mono text-gray-700">
                        {r.note ?? '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
