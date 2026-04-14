'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isFinance } from '@/lib/roles'
import { supabase } from '@/lib/supabase'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend)

/* ── Types ───────────────────────────────────────── */

interface MonthlyCost {
  month: string
  category: string
  total: number
}

interface BudgetItem {
  id: string
  project_id: string
  category: string
  budget_amount: number
  actual_amount: number
  month: string
}

function fmtVND(n: number) {
  return n.toLocaleString('vi-VN')
}

const MONTHS = [
  '01', '02', '03', '04', '05', '06',
  '07', '08', '09', '10', '11', '12',
]

const CATEGORY_COLORS: Record<string, string> = {
  'Vat tu / 자재': 'rgba(59, 130, 246, 0.7)',
  'Nhan cong / 인건비': 'rgba(16, 185, 129, 0.7)',
  'May moc / 장비': 'rgba(245, 158, 11, 0.7)',
  'Thau phu / 외주': 'rgba(139, 92, 246, 0.7)',
  'Khac / 기타': 'rgba(107, 114, 128, 0.7)',
}

/* ── Component ─────────────────────────────────────── */

export default function CostAnalysisPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [loading, setLoading] = useState(false)
  const [monthlyCosts, setMonthlyCosts] = useState<MonthlyCost[]>([])
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([])
  const [year, setYear] = useState(new Date().getFullYear())

  const canView = user ? isFinance(user.role) : false

  /* ── Load data ── */
  const loadData = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      // Load expense data grouped by month and category
      const { data: expenses } = await supabase
        .from('expenses')
        .select('expense_date, category, total_amount')
        .eq('project_id', currentProject)
        .eq('status', '승인')
        .gte('expense_date', `${year}-01-01`)
        .lte('expense_date', `${year}-12-31`)

      // Group by month and category
      const grouped: Record<string, Record<string, number>> = {}
      for (const exp of (expenses ?? []) as { expense_date: string; category: string; total_amount: number }[]) {
        const month = exp.expense_date?.slice(0, 7)
        if (!month) continue
        if (!grouped[month]) grouped[month] = {}
        grouped[month][exp.category] = (grouped[month][exp.category] || 0) + (exp.total_amount || 0)
      }

      const costs: MonthlyCost[] = []
      for (const [month, cats] of Object.entries(grouped)) {
        for (const [category, total] of Object.entries(cats)) {
          costs.push({ month, category, total })
        }
      }
      setMonthlyCosts(costs)

      // Load budget items
      const { data: budgets } = await supabase
        .from('budget_items')
        .select('*')
        .eq('project_id', currentProject)
        .like('month', `${year}%`)

      setBudgetItems((budgets as BudgetItem[]) ?? [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [currentProject, year])

  useEffect(() => {
    if (user && currentProject) loadData()
  }, [user, currentProject, loadData])

  /* ── Chart data ── */
  const monthLabels = MONTHS.map((m) => `${year}-${m}`)
  const categories = [...new Set(monthlyCosts.map((c) => c.category))]

  const chartData = {
    labels: monthLabels,
    datasets: categories.map((cat) => ({
      label: cat,
      data: monthLabels.map((m) => {
        const found = monthlyCosts.find((c) => c.month === m && c.category === cat)
        return found?.total ?? 0
      }),
      backgroundColor: CATEGORY_COLORS[cat] ?? 'rgba(107, 114, 128, 0.5)',
      borderRadius: 4,
    })),
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: false },
      tooltip: {
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) =>
            `${ctx.dataset?.label ?? ''}: ${fmtVND(ctx.parsed?.y ?? 0)} VND`,
        },
      },
    },
    scales: {
      x: { stacked: true },
      y: {
        stacked: true,
        ticks: {
          callback: (v: string | number) => fmtVND(Number(v)),
        },
      },
    },
  }

  /* ── Category totals ── */
  const categoryTotals = categories.map((cat) => ({
    category: cat,
    total: monthlyCosts.filter((c) => c.category === cat).reduce((s, c) => s + c.total, 0),
  }))
  const grandTotal = categoryTotals.reduce((s, c) => s + c.total, 0)

  /* ── Budget vs Actual ── */
  const budgetCategories = [...new Set(budgetItems.map((b) => b.category))]
  const budgetComparison = budgetCategories.map((cat) => {
    const items = budgetItems.filter((b) => b.category === cat)
    const budget = items.reduce((s, b) => s + (b.budget_amount || 0), 0)
    const actual = items.reduce((s, b) => s + (b.actual_amount || 0), 0)
    return { category: cat, budget, actual, diff: budget - actual }
  })

  if (!currentProject) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        Vui long chon cong trinh / 현장을 선택해주세요.
      </div>
    )
  }

  if (!canView) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
        Khong co quyen truy cap / 접근 권한이 없습니다.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dong tien / 자금현황
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Phan tich chi phi va ngan sach / 비용 분석 및 예산 비교
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-600">Nam / 연도:</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Tong chi phi / 총 지출</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{fmtVND(grandTotal)}</p>
              <p className="mt-1 text-xs text-gray-400">VND</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">So hang muc / 카테고리</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{categories.length}</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">TB thang / 월 평균</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {fmtVND(Math.round(grandTotal / 12))}
              </p>
              <p className="mt-1 text-xs text-gray-400">VND</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-green-500 shrink-0 mt-1" />
          </div>
        </div>
      </div>

      {/* ── Monthly Chart ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            Chi phi theo thang / 월별 지출
          </h3>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">
              Dang tai... / 로딩 중...
            </div>
          ) : monthlyCosts.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              Chua co du lieu / 데이터 없음
            </div>
          ) : (
            <Bar data={chartData} options={chartOptions} />
          )}
        </div>
      </div>

      {/* ── Category Breakdown ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            Chi tiet theo loai / 카테고리별 내역
          </h3>
        </div>
        {categoryTotals.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Chua co du lieu / 데이터 없음
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">Loai / 카테고리</th>
                  <th className="px-3 py-3 text-right">Tong chi / 지출액 (VND)</th>
                  <th className="px-3 py-3 text-right">Ty le / 비율</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categoryTotals
                  .sort((a, b) => b.total - a.total)
                  .map((c) => (
                    <tr key={c.category} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-xs font-medium text-gray-700">{c.category}</td>
                      <td className="px-3 py-3 text-xs text-right font-mono font-bold text-gray-900">
                        {fmtVND(c.total)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${grandTotal > 0 ? (c.total / grandTotal) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 font-mono">
                            {grandTotal > 0 ? ((c.total / grandTotal) * 100).toFixed(1) : '0.0'}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-900 text-white font-bold">
                  <td className="px-3 py-3 text-xs">Tong / 합계</td>
                  <td className="px-3 py-3 text-xs text-right font-mono">{fmtVND(grandTotal)}</td>
                  <td className="px-3 py-3 text-xs text-right font-mono">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Budget vs Actual ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            Ngan sach vs Thuc te / 예산 vs 실적
          </h3>
        </div>
        {budgetComparison.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Chua co du lieu ngan sach / 예산 데이터 없음
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">Loai / 항목</th>
                  <th className="px-3 py-3 text-right">Ngan sach / 예산</th>
                  <th className="px-3 py-3 text-right">Thuc te / 실적</th>
                  <th className="px-3 py-3 text-right">Chenh lech / 차이</th>
                  <th className="px-3 py-3 text-right">Ty le / 집행률</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {budgetComparison.map((b) => {
                  const rate = b.budget > 0 ? (b.actual / b.budget) * 100 : 0
                  return (
                    <tr key={b.category} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-xs font-medium text-gray-700">{b.category}</td>
                      <td className="px-3 py-3 text-xs text-right font-mono text-gray-600">
                        {fmtVND(b.budget)}
                      </td>
                      <td className="px-3 py-3 text-xs text-right font-mono font-bold text-gray-900">
                        {fmtVND(b.actual)}
                      </td>
                      <td className={`px-3 py-3 text-xs text-right font-mono font-bold ${b.diff >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {b.diff >= 0 ? '+' : ''}{fmtVND(b.diff)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${
                          rate > 100 ? 'bg-red-50 text-red-700' : rate > 80 ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'
                        }`}>
                          {rate.toFixed(1)}%
                        </span>
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
