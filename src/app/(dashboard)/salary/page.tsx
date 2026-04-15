'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { ROLE_LABELS } from '@/lib/roles'
import { useSalary } from '@/hooks/useSalary'
import type { SalarySetting, SalaryRow } from '@/hooks/useSalary'
import toast from 'react-hot-toast'

/* ── Format helpers ── */

function fmtVND(n: number): string {
  if (!n && n !== 0) return '-'
  return n.toLocaleString('vi-VN')
}

/* ── Editable Setting Row (per user) ── */

interface SettingRowData {
  salary_type: 'daily' | 'monthly'
  base_amount: number
  overtime_rate: number
  probation_salary: number
  probation_rate: number
  meal_allowance: number
  responsibility_allowance: number
  female_allowance: number
  site_allowance: number
  insurance_base_amount: number
  bhxh_rate: number
  bhyt_rate: number
  bhtn_rate: number
}

function defaultSettingRow(s?: SalarySetting): SettingRowData {
  return {
    salary_type: s?.salary_type ?? 'daily',
    base_amount: s?.base_amount ?? 0,
    overtime_rate: s?.overtime_rate ?? 0,
    probation_salary: s?.probation_salary ?? 0,
    probation_rate: s?.probation_rate ?? 0.85,
    meal_allowance: s?.meal_allowance ?? 100000,
    responsibility_allowance: s?.responsibility_allowance ?? 0,
    female_allowance: s?.female_allowance ?? 0,
    site_allowance: s?.site_allowance ?? 0,
    insurance_base_amount: s?.insurance_base_amount ?? 0,
    bhxh_rate: s?.bhxh_rate ?? 8,
    bhyt_rate: s?.bhyt_rate ?? 1.5,
    bhtn_rate: s?.bhtn_rate ?? 1,
  }
}

/* ── Main Page ── */

export default function SalaryPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [tab, setTab] = useState<'settings' | 'monthly'>('settings')

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Quan ly luong / 급여 관리
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Cai dat va tinh luong hang thang / 급여 설정 및 월별 급여 계산
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="print:hidden inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
          title="In / 인쇄"
        >
          &#128424; In / 인쇄
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'settings'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setTab('settings')}
        >
          Cai dat luong / 급여 설정
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'monthly'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setTab('monthly')}
        >
          Bang luong thang / 월별 급여
        </button>
      </div>

      {tab === 'settings' && <SettingsTab />}
      {tab === 'monthly' && (
        <MonthlyTab userId={user?.id ?? ''} projectId={currentProject} />
      )}
    </div>
  )
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TAB 1: SALARY SETTINGS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function SettingsTab() {
  const { users, settings, loading, loadSettings, saveSetting } = useSalary()
  const [localData, setLocalData] = useState<Record<string, SettingRowData>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Sync local editable data when settings load
  useEffect(() => {
    const map: Record<string, SettingRowData> = {}
    users.forEach((u) => {
      map[u.id] = defaultSettingRow(settings[u.id])
    })
    setLocalData(map)
  }, [users, settings])

  const updateField = useCallback(
    (uid: string, field: keyof SettingRowData, value: string | number) => {
      setLocalData((prev) => {
        const row = { ...prev[uid] }
        if (field === 'salary_type') {
          row.salary_type = value as 'daily' | 'monthly'
        } else {
          ;(row as Record<string, unknown>)[field] = Number(value) || 0
        }
        // Auto-calc probation salary when base or rate changes
        if (field === 'base_amount' || field === 'probation_rate') {
          const base = field === 'base_amount' ? Number(value) || 0 : row.base_amount
          const rate = field === 'probation_rate' ? Number(value) || 0 : row.probation_rate
          row.probation_salary = Math.round(base * rate)
        }
        return { ...prev, [uid]: row }
      })
    },
    [],
  )

  const handleSave = useCallback(
    async (uid: string) => {
      const data = localData[uid]
      if (!data) return
      setSavingId(uid)
      try {
        await saveSetting(uid, data)
        toast.success('Da luu luong / 급여 기준 저장')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        toast.error('Loi / 오류: ' + msg)
      } finally {
        setSavingId(null)
      }
    },
    [localData, saveSetting],
  )

  if (loading && users.length === 0) {
    return <div className="text-sm text-gray-500 py-8 text-center">Dang tai... / 로딩중...</div>
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">NV / 직원</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">Chuc vu / 직위</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">Loai luong / 급여유형</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">Luong CB / 기본급</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">OT/h</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">Luong TV / 수습급 (%)</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">Tien an / 식대</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">PC Trach nhiem / 책임수당</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">PC Nu / 여성수당</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">PC Cong truong / 현장수당</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">Muc BH / 보험기준</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">BHXH%</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">BHYT%</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">BHTN%</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-700 whitespace-nowrap">Luu / 저장</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => {
              const d = localData[u.id] || defaultSettingRow()
              return (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-900 whitespace-nowrap">{u.name}</td>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{ROLE_LABELS[u.role] || u.role}</td>
                  <td className="px-3 py-2">
                    <select
                      value={d.salary_type}
                      onChange={(e) => updateField(u.id, 'salary_type', e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                    >
                      <option value="daily">Ngay / 일급</option>
                      <option value="monthly">Thang / 월급</option>
                    </select>
                  </td>
                  <NumCell uid={u.id} field="base_amount" value={d.base_amount} onChange={updateField} w="w-28" />
                  <NumCell uid={u.id} field="overtime_rate" value={d.overtime_rate} onChange={updateField} w="w-24" />
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number" step="10000"
                        value={d.probation_salary}
                        onChange={(e) => updateField(u.id, 'probation_salary', e.target.value)}
                        className="w-24 border border-gray-300 rounded px-2 py-1 text-xs text-right"
                      />
                      <input
                        type="number"
                        value={Math.round(d.probation_rate * 100)}
                        onChange={(e) => updateField(u.id, 'probation_rate', Number(e.target.value) / 100)}
                        className="w-14 border border-gray-300 rounded px-2 py-1 text-xs text-right"
                        step="0.5"
                        min="0"
                        max="100"
                        title="Ti le thu viec % / 수습 비율 %"
                      />
                      <span className="text-gray-400 text-[10px]">%</span>
                    </div>
                  </td>
                  <NumCell uid={u.id} field="meal_allowance" value={d.meal_allowance} onChange={updateField} w="w-24" />
                  <NumCell uid={u.id} field="responsibility_allowance" value={d.responsibility_allowance} onChange={updateField} w="w-24" />
                  <NumCell uid={u.id} field="female_allowance" value={d.female_allowance} onChange={updateField} w="w-20" />
                  <NumCell uid={u.id} field="site_allowance" value={d.site_allowance} onChange={updateField} w="w-24" />
                  <NumCell uid={u.id} field="insurance_base_amount" value={d.insurance_base_amount} onChange={updateField} w="w-24" />
                  <NumCell uid={u.id} field="bhxh_rate" value={d.bhxh_rate} onChange={updateField} w="w-16" step="0.5" />
                  <NumCell uid={u.id} field="bhyt_rate" value={d.bhyt_rate} onChange={updateField} w="w-16" step="0.5" />
                  <NumCell uid={u.id} field="bhtn_rate" value={d.bhtn_rate} onChange={updateField} w="w-16" step="0.5" />
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => handleSave(u.id)}
                      disabled={savingId === u.id}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                    >
                      {savingId === u.id ? '...' : 'Luu / 저장'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* Reusable numeric cell */
function NumCell({
  uid,
  field,
  value,
  onChange,
  w = 'w-24',
  step,
}: {
  uid: string
  field: keyof SettingRowData
  value: number
  onChange: (uid: string, field: keyof SettingRowData, value: string | number) => void
  w?: string
  step?: string
}) {
  return (
    <td className="px-3 py-2">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(uid, field, e.target.value)}
        className={`${w} border border-gray-300 rounded px-2 py-1 text-xs text-right`}
        min="0"
        step={step ?? "10000"}
      />
    </td>
  )
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TAB 2: MONTHLY SALARY
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function MonthlyTab({ userId, projectId }: { userId: string; projectId: string | null }) {
  const {
    salaryRows, setSalaryRows,
    grandTotal, setGrandTotal,
    totalCompanyInsurance, totalInsurance,
    loading, calcSalary, confirmSalary,
  } = useSalary()

  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [calculated, setCalculated] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const handleCalc = useCallback(async () => {
    if (!month) {
      toast.error('Vui long chon thang / 월을 선택하세요')
      return
    }
    try {
      await calcSalary(month)
      setCalculated(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast.error('Loi / 오류: ' + msg)
    }
  }, [month, calcSalary])

  const handleConfirm = useCallback(async () => {
    if (!calculated || salaryRows.length === 0) {
      toast.error('Chua tinh luong / 급여를 먼저 계산하세요')
      return
    }
    if (!confirm(`Xac nhan luong thang ${month}?\n${month} 급여를 확정하시겠습니까?`)) return
    setConfirming(true)
    try {
      const count = await confirmSalary(month, salaryRows, userId, projectId)
      toast.success(`Da xac nhan ${count} NV / ${count}명 급여 확정 완료`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast.error('Loi / 오류: ' + msg)
    } finally {
      setConfirming(false)
    }
  }, [calculated, salaryRows, month, userId, projectId, confirmSalary])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  // Inline edit support for bonus, tax, other_deduction
  const updateRow = useCallback(
    (idx: number, field: 'other_bonus' | 'tax' | 'other_deduction', value: number) => {
      setSalaryRows((prev) => {
        const next = [...prev]
        const row = { ...next[idx] }
        row[field] = value
        row.net_total = Math.round(
          row.probation_pay + row.regular_pay + row.meal_total + row.allowances + row.ot_pay + row.other_bonus
          - row.insurance_deduction - row.tax - row.exception_deduction - row.other_deduction,
        )
        next[idx] = row
        // Recalc grand total
        const gt = next.reduce((s, r) => s + r.net_total, 0)
        setGrandTotal(gt)
        return next
      })
    },
    [setSalaryRows, setGrandTotal],
  )

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-gray-700">
          Thang / 월:
        </label>
        <input
          type="month"
          value={month}
          onChange={(e) => { setMonth(e.target.value); setCalculated(false) }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={handleCalc}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Dang tinh... / 계산중...' : 'Tinh luong / 급여 계산'}
        </button>
      </div>

      {/* Results table */}
      {calculated && salaryRows.length > 0 && (
        <>
          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm print:bg-white">
            <span className="font-bold">{month}</span>
            {' — '}Tong luong / 총 급여:{' '}
            <span className="text-blue-700 font-bold text-base">{fmtVND(grandTotal)} VND</span>
            {' | '}BH DN / 회사보험:{' '}
            <span className="text-purple-700 font-bold">{fmtVND(totalCompanyInsurance)}</span>
            {' | '}Tong BH / 보험합계:{' '}
            <span className="text-red-600 font-bold">{fmtVND(totalInsurance)}</span>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden print:border-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 print:bg-gray-200">
                  <tr>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">NV / 직원</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">Chuc vu / 직위</th>
                    <th className="px-2 py-2 text-center font-semibold text-gray-700 whitespace-nowrap">Ngay TV / 수습일</th>
                    <th className="px-2 py-2 text-center font-semibold text-gray-700 whitespace-nowrap">Ngay CT / 정규일</th>
                    <th className="px-2 py-2 text-center font-semibold text-gray-700 whitespace-nowrap">OT(h)</th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">Luong TV / 수습급</th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">Luong CT / 정규급</th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">Tien an / 식대</th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">Phu cap / 수당</th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">OT</th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">Cong khac / 기타</th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">Muc BH / 보험기준</th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">BH NLD / 근로자보험</th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">BH DN / 회사보험</th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">Thue TNCN / 소득세</th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">Tru gio / 시간공제</th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">Tru khac / 기타공제</th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">Tong luong / 총급여</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {salaryRows.map((r, idx) => (
                    <tr key={r.user_id} className="hover:bg-gray-50">
                      <td className="px-2 py-2 font-semibold text-gray-900 whitespace-nowrap">{r.name}</td>
                      <td className="px-2 py-2 text-gray-500 whitespace-nowrap text-[11px]">{ROLE_LABELS[r.role] || r.role}</td>
                      <td className="px-2 py-2 text-center font-mono">{r.probation_days}</td>
                      <td className="px-2 py-2 text-center font-mono">{r.regular_days}</td>
                      <td className="px-2 py-2 text-center font-mono text-red-600">{r.ot_hours.toFixed(1)}h</td>
                      <td className="px-2 py-2 text-right font-mono">{fmtVND(r.probation_pay)}</td>
                      <td className="px-2 py-2 text-right font-mono">{fmtVND(r.regular_pay)}</td>
                      <td className="px-2 py-2 text-right font-mono">{fmtVND(r.meal_total)}</td>
                      <td className="px-2 py-2 text-right font-mono">{fmtVND(r.allowances)}</td>
                      <td className="px-2 py-2 text-right font-mono text-blue-600">{fmtVND(r.ot_pay)}</td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number" step="10000"
                          value={r.other_bonus}
                          onChange={(e) => updateRow(idx, 'other_bonus', Number(e.target.value) || 0)}
                          className="w-20 border border-gray-300 rounded px-1 py-0.5 text-xs text-right print:border-0"
                          min="0"
                        />
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-amber-600" title={`BHXH ${r.bhxh_rate}%+BHYT ${r.bhyt_rate}%+BHTN ${r.bhtn_rate}%`}>
                        {fmtVND(r.insurance_base)}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-red-600" title={`NLD: BHXH ${r.bhxh_rate}%+BHYT ${r.bhyt_rate}%+BHTN ${r.bhtn_rate}%`}>
                        {fmtVND(r.insurance_deduction)}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-purple-600" title="DN: BHXH 17.5%+BHYT 3%+BHTN 1%">
                        {fmtVND(r.company_insurance)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number" step="10000"
                          value={r.tax}
                          onChange={(e) => updateRow(idx, 'tax', Number(e.target.value) || 0)}
                          className="w-20 border border-gray-300 rounded px-1 py-0.5 text-xs text-right print:border-0"
                          min="0"
                        />
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-red-500">
                        {r.exception_deduction ? `-${fmtVND(r.exception_deduction)}` : '-'}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number" step="10000"
                          value={r.other_deduction}
                          onChange={(e) => updateRow(idx, 'other_deduction', Number(e.target.value) || 0)}
                          className="w-20 border border-gray-300 rounded px-1 py-0.5 text-xs text-right print:border-0"
                          min="0"
                        />
                      </td>
                      <td className="px-2 py-2 text-right font-mono font-bold text-gray-900">
                        {fmtVND(r.net_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Grand total row */}
                <tfoot className="bg-gray-50 font-semibold">
                  <tr>
                    <td className="px-2 py-2 font-bold" colSpan={5}>
                      Tong cong / 합계 ({salaryRows.length} NV)
                    </td>
                    <td className="px-2 py-2 text-right font-mono">{fmtVND(salaryRows.reduce((s, r) => s + r.probation_pay, 0))}</td>
                    <td className="px-2 py-2 text-right font-mono">{fmtVND(salaryRows.reduce((s, r) => s + r.regular_pay, 0))}</td>
                    <td className="px-2 py-2 text-right font-mono">{fmtVND(salaryRows.reduce((s, r) => s + r.meal_total, 0))}</td>
                    <td className="px-2 py-2 text-right font-mono">{fmtVND(salaryRows.reduce((s, r) => s + r.allowances, 0))}</td>
                    <td className="px-2 py-2 text-right font-mono text-blue-600">{fmtVND(salaryRows.reduce((s, r) => s + r.ot_pay, 0))}</td>
                    <td className="px-2 py-2 text-right font-mono">{fmtVND(salaryRows.reduce((s, r) => s + r.other_bonus, 0))}</td>
                    <td className="px-2 py-2 text-right font-mono text-amber-600">{fmtVND(salaryRows.reduce((s, r) => s + r.insurance_base, 0))}</td>
                    <td className="px-2 py-2 text-right font-mono text-red-600">{fmtVND(salaryRows.reduce((s, r) => s + r.insurance_deduction, 0))}</td>
                    <td className="px-2 py-2 text-right font-mono text-purple-600">{fmtVND(salaryRows.reduce((s, r) => s + r.company_insurance, 0))}</td>
                    <td className="px-2 py-2 text-right font-mono">{fmtVND(salaryRows.reduce((s, r) => s + r.tax, 0))}</td>
                    <td className="px-2 py-2 text-right font-mono text-red-500">{fmtVND(salaryRows.reduce((s, r) => s + r.exception_deduction, 0))}</td>
                    <td className="px-2 py-2 text-right font-mono">{fmtVND(salaryRows.reduce((s, r) => s + r.other_deduction, 0))}</td>
                    <td className="px-2 py-2 text-right font-mono font-bold text-blue-700 text-sm">
                      {fmtVND(grandTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 print:hidden">
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
            >
              {confirming ? 'Dang luu... / 저장중...' : 'Xac nhan luong / 급여 확정'}
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-gray-700 text-white rounded-lg text-sm font-semibold hover:bg-gray-800"
            >
              In phieu luong / 급여명세서 인쇄
            </button>
          </div>
        </>
      )}

      {calculated && salaryRows.length === 0 && !loading && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-400">
          Khong co du lieu / 데이터 없음
        </div>
      )}
    </div>
  )
}
