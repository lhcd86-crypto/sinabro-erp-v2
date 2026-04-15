'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isFinance } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

/* -- Types ------------------------------------------------ */

interface MonthRow {
  month: number
  revenue: number
  expenses: number
  profit: number
  workers: number
}

/* -- Helpers ---------------------------------------------- */

function fmtVND(n: number): string {
  return n.toLocaleString('vi-VN') + ' VND'
}

const MONTH_NAMES_KO = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
]

/* -- Component -------------------------------------------- */

export default function AnnualReportPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)

  const [totalProjects, setTotalProjects] = useState(0)
  const [totalWorkers, setTotalWorkers] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [monthlyData, setMonthlyData] = useState<MonthRow[]>([])

  const toast = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  /* -- Load data ------------------------------------------ */
  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const yearStart = `${year}-01-01`
      const yearEnd = `${year}-12-31`

      const [{ data: billings }, { data: expenses }, { data: projects }, { data: attendance }] =
        await Promise.all([
          supabase
            .from('billings')
            .select('received_amount, received_date, billing_date')
            .gte('billing_date', `${year}-01-01`)
            .lte('billing_date', `${year}-12-31`),
          supabase
            .from('expenses')
            .select('total_amount, expense_date')
            .gte('expense_date', yearStart)
            .lte('expense_date', yearEnd),
          supabase
            .from('projects')
            .select('id')
            .eq('status', 'active'),
          supabase
            .from('employee_attendance')
            .select('user_id, work_date')
            .gte('work_date', yearStart)
            .lte('work_date', yearEnd),
        ])

      const billRows = billings ?? []
      const expRows = expenses ?? []
      const attRows = attendance ?? []

      setTotalProjects((projects ?? []).length)

      // Unique workers
      const uniqueWorkers = new Set(attRows.map((a) => a.user_id))
      setTotalWorkers(uniqueWorkers.size)

      // Build monthly data
      const rows: MonthRow[] = []
      for (let m = 1; m <= 12; m++) {
        const prefix = `${year}-${String(m).padStart(2, '0')}`

        const rev = billRows
          .filter((b) => (b.billing_date ?? '').startsWith(prefix))
          .reduce((s, b) => s + (b.received_amount ?? 0), 0)

        const exp = expRows
          .filter((e) => (e.expense_date ?? '').startsWith(prefix))
          .reduce((s, e) => s + (e.total_amount ?? 0), 0)

        const wkrs = new Set(
          attRows.filter((a) => (a.work_date ?? '').startsWith(prefix)).map((a) => a.user_id),
        )

        rows.push({ month: m, revenue: rev, expenses: exp, profit: rev - exp, workers: wkrs.size })
      }

      setMonthlyData(rows)
      setTotalRevenue(rows.reduce((s, r) => s + r.revenue, 0))
      setTotalExpenses(rows.reduce((s, r) => s + r.expenses, 0))
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [user, year, toast])

  useEffect(() => {
    if (user) loadData()
  }, [user, loadData])

  /* -- Access guard ---------------------------------------- */
  if (!user) return null

  if (!isFinance(user.role)) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
        Khong co quyen truy cap / 접근 권한이 없습니다. (ceo, director_m, account)
      </div>
    )
  }

  const netProfit = totalRevenue - totalExpenses
  const yearOptions: number[] = []
  for (let y = currentYear; y >= currentYear - 5; y--) yearOptions.push(y)

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

      {/* Page title + year selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bao cao nam / 연간보고서
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Tong hop hang nam / 연간 종합 리포트
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-600">Nam / 연도:</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Du an / 프로젝트</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{totalProjects}</p>
              <p className="mt-1 text-xs text-gray-400">cong trinh / 현장</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Nhan vien / 근로자</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{totalWorkers}</p>
              <p className="mt-1 text-xs text-gray-400">nguoi / 명</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-indigo-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Doanh thu / 매출</p>
              <p className="mt-2 text-lg font-bold text-green-700">{fmtVND(totalRevenue)}</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-green-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Chi phi / 비용</p>
              <p className="mt-2 text-lg font-bold text-red-700">{fmtVND(totalExpenses)}</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-red-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Loi nhuan / 순이익</p>
              <p className={`mt-2 text-lg font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {fmtVND(netProfit)}
              </p>
            </div>
            <div className={`w-3 h-3 rounded-full ${netProfit >= 0 ? 'bg-emerald-500' : 'bg-red-500'} shrink-0 mt-1`} />
          </div>
        </div>
      </div>

      {/* Monthly Summary Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Tong hop thang / 월별 요약 ({year})
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
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">Thang / 월</th>
                  <th className="px-3 py-3 text-right">Doanh thu / 매출</th>
                  <th className="px-3 py-3 text-right">Chi phi / 비용</th>
                  <th className="px-3 py-3 text-right">Loi nhuan / 이익</th>
                  <th className="px-3 py-3 text-right">Nhan su / 근로자</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {monthlyData.map((row) => (
                  <tr key={row.month} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-xs text-gray-700 font-medium">
                      {MONTH_NAMES_KO[row.month - 1]}
                    </td>
                    <td className="px-3 py-3 text-xs text-green-700 text-right font-mono">
                      {fmtVND(row.revenue)}
                    </td>
                    <td className="px-3 py-3 text-xs text-red-700 text-right font-mono">
                      {fmtVND(row.expenses)}
                    </td>
                    <td className={`px-3 py-3 text-xs text-right font-mono font-semibold ${
                      row.profit >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {fmtVND(row.profit)}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600 text-right font-mono">
                      {row.workers}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-3 py-3 text-xs text-gray-700">Tong / 합계</td>
                  <td className="px-3 py-3 text-xs text-green-700 text-right font-mono">
                    {fmtVND(totalRevenue)}
                  </td>
                  <td className="px-3 py-3 text-xs text-red-700 text-right font-mono">
                    {fmtVND(totalExpenses)}
                  </td>
                  <td className={`px-3 py-3 text-xs text-right font-mono ${
                    netProfit >= 0 ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {fmtVND(netProfit)}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-600 text-right font-mono">
                    {totalWorkers}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
