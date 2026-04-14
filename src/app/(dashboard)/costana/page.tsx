'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isAdmin } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

/* ── Types ────────────────────────────────────────── */

interface MonthlyData {
  month: string
  revenue: number
  expenses: number
  profit: number
}

/* ── Helpers ───────────────────────────────────────── */

function fmtVND(n: number) {
  return n.toLocaleString('vi-VN')
}

function getDefaultDateRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return {
    from: start.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  }
}

/* ── Component ─────────────────────────────────────── */

export default function CostAnalysisPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Data
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])

  // Date filter
  const defaultRange = getDefaultDateRange()
  const [dateFrom, setDateFrom] = useState(defaultRange.from)
  const [dateTo, setDateTo] = useState(defaultRange.to)

  /* ── Toast ─── */
  const toast = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  /* ── Load data ─── */
  const loadData = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      // Load billings (revenue)
      const { data: billings, error: bErr } = await supabase
        .from('billings')
        .select('amount, billing_date, status')
        .eq('project_id', currentProject)
        .gte('billing_date', dateFrom)
        .lte('billing_date', dateTo)
        .in('status', ['approved', 'invoiced', 'paid'])
      if (bErr) throw bErr

      // Load expenses
      const { data: expenses, error: eErr } = await supabase
        .from('expenses')
        .select('total_amount, expense_date, status')
        .eq('project_id', currentProject)
        .gte('expense_date', dateFrom)
        .lte('expense_date', dateTo)
      if (eErr) throw eErr

      // Calculate totals
      const revTotal = (billings || []).reduce((s, b) => s + (b.amount || 0), 0)
      const expTotal = (expenses || []).reduce((s, e) => s + (e.total_amount || 0), 0)
      setTotalRevenue(revTotal)
      setTotalExpenses(expTotal)

      // Build monthly breakdown
      const monthMap: Record<string, { revenue: number; expenses: number }> = {}

      for (const b of billings || []) {
        const month = b.billing_date?.slice(0, 7)
        if (!month) continue
        if (!monthMap[month]) monthMap[month] = { revenue: 0, expenses: 0 }
        monthMap[month].revenue += b.amount || 0
      }

      for (const e of expenses || []) {
        const month = e.expense_date?.slice(0, 7)
        if (!month) continue
        if (!monthMap[month]) monthMap[month] = { revenue: 0, expenses: 0 }
        monthMap[month].expenses += e.total_amount || 0
      }

      const monthly = Object.entries(monthMap)
        .map(([month, data]) => ({
          month,
          revenue: data.revenue,
          expenses: data.expenses,
          profit: data.revenue - data.expenses,
        }))
        .sort((a, b) => a.month.localeCompare(b.month))

      setMonthlyData(monthly)
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [currentProject, dateFrom, dateTo, toast])

  /* ── Initial load ─── */
  useEffect(() => {
    if (user && currentProject) {
      loadData()
    }
  }, [user, currentProject, loadData])

  /* ── Derived values ─── */
  const balance = totalRevenue - totalExpenses
  const profitMargin = totalRevenue > 0 ? ((balance / totalRevenue) * 100).toFixed(1) : '0.0'

  // Chart max value for bar scaling
  const chartMax = Math.max(
    ...monthlyData.map((d) => Math.max(d.revenue, d.expenses)),
    1,
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
            Phan tich chi phi / 자금현황 원가분석
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Tong hop doanh thu va chi phi / 수입 지출 현황 및 원가 분석
          </p>
        </div>
      </div>

      {/* ── Date Filter ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Tu ngay / 시작일
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Den ngay / 종료일
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Dang tai... / 로딩...' : 'Loc / 조회'}
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KpiCard
          title="Doanh thu / 기성수령"
          value={fmtVND(totalRevenue)}
          sub="VND"
          color="bg-blue-500"
        />
        <KpiCard
          title="Chi phi / 총지출"
          value={fmtVND(totalExpenses)}
          sub="VND"
          color="bg-red-500"
        />
        <KpiCard
          title="Con lai / 잔액"
          value={fmtVND(balance)}
          sub="VND"
          color={balance >= 0 ? 'bg-green-500' : 'bg-red-600'}
        />
        <KpiCard
          title="Ty le loi nhuan / 이익률"
          value={`${profitMargin}%`}
          sub={balance >= 0 ? 'Loi / 흑자' : 'Lo / 적자'}
          color={balance >= 0 ? 'bg-emerald-500' : 'bg-red-600'}
        />
      </div>

      {/* ── Bar Chart (CSS-based) ── */}
      {monthlyData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              Bieu do hang thang / 월별 수입 지출 그래프
            </h3>
          </div>
          <div className="p-4 sm:p-6">
            {/* Legend */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span className="text-xs text-gray-600">Doanh thu / 수입</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-red-400" />
                <span className="text-xs text-gray-600">Chi phi / 지출</span>
              </div>
            </div>

            {/* Bars */}
            <div className="space-y-3">
              {monthlyData.map((d) => (
                <div key={d.month} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-gray-600 w-20">
                      {d.month}
                    </span>
                    <span
                      className={`text-xs font-bold font-mono ${
                        d.profit >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {d.profit >= 0 ? '+' : ''}
                      {fmtVND(d.profit)}
                    </span>
                  </div>
                  {/* Revenue bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 w-8">Thu</span>
                    <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded transition-all duration-500"
                        style={{
                          width: `${Math.max((d.revenue / chartMax) * 100, 0.5)}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-gray-500 w-24 text-right">
                      {fmtVND(d.revenue)}
                    </span>
                  </div>
                  {/* Expense bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 w-8">Chi</span>
                    <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-red-400 rounded transition-all duration-500"
                        style={{
                          width: `${Math.max((d.expenses / chartMax) * 100, 0.5)}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-gray-500 w-24 text-right">
                      {fmtVND(d.expenses)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Monthly Breakdown Table ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Chi tiet hang thang / 월별 상세 내역
          </h3>
          <span className="text-xs text-gray-500">
            {monthlyData.length} thang / 개월
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Dang tai... / 로딩 중...
          </div>
        ) : monthlyData.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Khong co du lieu / 데이터 없음
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">Thang / 월</th>
                  <th className="px-3 py-3 text-right">Doanh thu / 수입</th>
                  <th className="px-3 py-3 text-right">Chi phi / 지출</th>
                  <th className="px-3 py-3 text-right">Loi nhuan / 이익</th>
                  <th className="px-3 py-3 text-right">Ty le / 이익률</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {monthlyData.map((d) => {
                  const margin =
                    d.revenue > 0
                      ? ((d.profit / d.revenue) * 100).toFixed(1)
                      : '0.0'
                  return (
                    <tr key={d.month} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-xs font-mono text-gray-600">
                        {d.month}
                      </td>
                      <td className="px-3 py-3 text-xs text-right font-mono font-bold text-blue-700 whitespace-nowrap">
                        {fmtVND(d.revenue)}
                      </td>
                      <td className="px-3 py-3 text-xs text-right font-mono font-bold text-red-600 whitespace-nowrap">
                        {fmtVND(d.expenses)}
                      </td>
                      <td
                        className={`px-3 py-3 text-xs text-right font-mono font-bold whitespace-nowrap ${
                          d.profit >= 0 ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {d.profit >= 0 ? '+' : ''}
                        {fmtVND(d.profit)}
                      </td>
                      <td
                        className={`px-3 py-3 text-xs text-right font-mono font-bold ${
                          d.profit >= 0 ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {margin}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-900 text-white font-bold">
                  <td className="px-3 py-3 text-xs">Tong / 합계</td>
                  <td className="px-3 py-3 text-right text-xs font-mono">
                    {fmtVND(totalRevenue)}
                  </td>
                  <td className="px-3 py-3 text-right text-xs font-mono">
                    {fmtVND(totalExpenses)}
                  </td>
                  <td className="px-3 py-3 text-right text-xs font-mono">
                    {balance >= 0 ? '+' : ''}
                    {fmtVND(balance)}
                  </td>
                  <td className="px-3 py-3 text-right text-xs font-mono">
                    {profitMargin}%
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
