'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isTop } from '@/lib/roles'
import { supabase } from '@/lib/supabase'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js'
import { Bar, Pie, Doughnut } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title)

/* ── Types ── */

interface KPI {
  totalProjects: number
  activeWorkers: number
  monthlyExpense: number
  pendingApprovals: number
}

interface ProjectSummary {
  id: string
  code: string
  name: string
  status: string
  contract_amount: number | null
  workerCount: number
  expenseTotal: number
  progress: number
}

interface ActivityItem {
  id: string
  type: string
  description: string
  timestamp: string
  user_name: string
}

interface MonthlyAttendance {
  label: string
  count: number
}

interface ExpenseCategory {
  category: string
  total: number
}

/* ── Helpers ── */

function fmtVND(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`
  return n.toLocaleString('vi-VN')
}

function localDate(): string {
  const d = new Date()
  const offset = 7 * 60
  const local = new Date(d.getTime() + offset * 60000)
  return local.toISOString().slice(0, 10)
}

function thisMonthStart(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

/** Return last N months as { label, start, end } */
function lastNMonths(n: number): { label: string; start: string; end: string }[] {
  const months: { label: string; start: string; end: string }[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    const label = `${String(month).padStart(2, '0')}/${year}`
    months.push({ label, start, end })
  }
  return months
}

/* ── Chart colors ── */
const CHART_COLORS = [
  'rgba(59, 130, 246, 0.8)',
  'rgba(16, 185, 129, 0.8)',
  'rgba(249, 115, 22, 0.8)',
  'rgba(239, 68, 68, 0.8)',
  'rgba(139, 92, 246, 0.8)',
  'rgba(236, 72, 153, 0.8)',
  'rgba(14, 165, 233, 0.8)',
  'rgba(245, 158, 11, 0.8)',
]

/* ── Component ── */

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const projects = useAuthStore((s) => s.projects)

  const [kpi, setKpi] = useState<KPI>({ totalProjects: 0, activeWorkers: 0, monthlyExpense: 0, pendingApprovals: 0 })
  const [projectSummaries, setProjectSummaries] = useState<ProjectSummary[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [monthlyAttendance, setMonthlyAttendance] = useState<MonthlyAttendance[]>([])
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(false)

  const canAccess = user && isTop(user.role)

  /* ── Load KPI data ── */
  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const today = localDate()
      const monthStart = thisMonthStart()

      // Total active projects
      const { count: projCount } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')

      // Active workers today
      const { count: workerCount } = await supabase
        .from('employee_attendance')
        .select('id', { count: 'exact', head: true })
        .eq('work_date', today)

      // Monthly expense
      const { data: expenses } = await supabase
        .from('expenses')
        .select('total_amount')
        .gte('expense_date', monthStart)
        .lte('expense_date', today)

      const monthlyExpense = (expenses ?? []).reduce((sum, e) => sum + (e.total_amount ?? 0), 0)

      // Pending approvals (leave + advance + expense)
      const { count: pendLeave } = await supabase
        .from('leave_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')

      const { count: pendAdvance } = await supabase
        .from('advances')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')

      const pendingApprovals = (pendLeave ?? 0) + (pendAdvance ?? 0)

      setKpi({
        totalProjects: projCount ?? 0,
        activeWorkers: workerCount ?? 0,
        monthlyExpense,
        pendingApprovals,
      })

      // Project summaries
      const summaries: ProjectSummary[] = []
      for (const proj of projects) {
        const { count: wc } = await supabase
          .from('employee_attendance')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', proj.id)
          .eq('work_date', today)

        const { data: pExp } = await supabase
          .from('expenses')
          .select('total_amount')
          .eq('project_id', proj.id)
          .gte('expense_date', monthStart)

        const expTotal = (pExp ?? []).reduce((sum, e) => sum + (e.total_amount ?? 0), 0)

        // Simple progress estimate based on contract amount and expenses
        const progress = proj.contract_amount && proj.contract_amount > 0
          ? Math.min(100, Math.round((expTotal / proj.contract_amount) * 100))
          : 0

        summaries.push({
          id: proj.id,
          code: proj.code,
          name: proj.name,
          status: proj.status,
          contract_amount: proj.contract_amount,
          workerCount: wc ?? 0,
          expenseTotal: expTotal,
          progress,
        })
      }
      setProjectSummaries(summaries)

      // ── Chart data: Monthly attendance (last 6 months) ──
      const months = lastNMonths(6)
      const attByMonth: MonthlyAttendance[] = []
      for (const m of months) {
        const { count: mc } = await supabase
          .from('employee_attendance')
          .select('id', { count: 'exact', head: true })
          .gte('work_date', m.start)
          .lte('work_date', m.end)
        attByMonth.push({ label: m.label, count: mc ?? 0 })
      }
      setMonthlyAttendance(attByMonth)

      // ── Chart data: Expense by category ──
      const { data: catExpenses } = await supabase
        .from('expenses')
        .select('category, total_amount')
        .gte('expense_date', monthStart)
        .lte('expense_date', today)

      const catMap: Record<string, number> = {}
      for (const e of catExpenses ?? []) {
        const cat = e.category || 'other'
        catMap[cat] = (catMap[cat] ?? 0) + (e.total_amount ?? 0)
      }
      const catArr: ExpenseCategory[] = Object.entries(catMap).map(([category, total]) => ({ category, total }))
      catArr.sort((a, b) => b.total - a.total)
      setExpenseCategories(catArr)

      // Recent activity: last 10 attendance + leave events
      const { data: recentAtt } = await supabase
        .from('employee_attendance')
        .select('id, user_id, check_in, work_date, users:user_id(name)')
        .order('check_in', { ascending: false })
        .limit(5)

      const { data: recentLeave } = await supabase
        .from('leave_requests')
        .select('id, user_id, leave_type, created_at, status, users:user_id(name)')
        .order('created_at', { ascending: false })
        .limit(5)

      const acts: ActivityItem[] = []

      for (const a of (recentAtt ?? [])) {
        const uName = (a.users as unknown as { name: string } | null)?.name ?? '—'
        acts.push({
          id: `att-${a.id}`,
          type: 'attendance',
          description: `${uName} da cham cong / 출근 (${a.work_date})`,
          timestamp: a.check_in ?? '',
          user_name: uName,
        })
      }

      for (const l of (recentLeave ?? [])) {
        const uName = (l.users as unknown as { name: string } | null)?.name ?? '—'
        acts.push({
          id: `leave-${l.id}`,
          type: 'leave',
          description: `${uName} xin nghi ${l.leave_type} / 휴가 신청 (${l.status})`,
          timestamp: l.created_at,
          user_name: uName,
        })
      }

      acts.sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1))
      setActivities(acts.slice(0, 10))
    } catch {
      // Silent fail for dashboard
    } finally {
      setLoading(false)
    }
  }, [projects])

  useEffect(() => {
    if (canAccess) {
      loadDashboard()
    }
  }, [canAccess, loadDashboard])

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500 text-sm">Khong co quyen truy cap / 접근 권한이 없습니다</p>
      </div>
    )
  }

  /* ── Chart configs ── */

  const attendanceChartData = {
    labels: monthlyAttendance.map((m) => m.label),
    datasets: [
      {
        label: 'Cham cong / 출근',
        data: monthlyAttendance.map((m) => m.count),
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  }

  const attendanceChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0 },
      },
    },
  }

  const expenseChartData = {
    labels: expenseCategories.map((c) => c.category),
    datasets: [
      {
        data: expenseCategories.map((c) => c.total),
        backgroundColor: CHART_COLORS.slice(0, expenseCategories.length),
        borderWidth: 1,
        borderColor: '#fff',
      },
    ],
  }

  const expenseChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: { boxWidth: 12, font: { size: 11 } },
      },
    },
  }

  const progressChartData = {
    labels: projectSummaries.map((p) => p.code),
    datasets: [
      {
        data: projectSummaries.map((p) => p.progress),
        backgroundColor: CHART_COLORS.slice(0, projectSummaries.length),
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  }

  const progressChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '55%',
    plugins: {
      legend: {
        position: 'right' as const,
        labels: { boxWidth: 12, font: { size: 11 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx: { label?: string; parsed?: number }) => {
            return `${ctx.label ?? ''}: ${ctx.parsed ?? 0}%`
          },
        },
      },
    },
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tong quan / 대시보드</h1>
        <p className="mt-1 text-sm text-gray-500">
          Bao cao tong hop cho lanh dao / 경영진 종합 보고
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard label="Du an / 프로젝트" value={String(kpi.totalProjects)} color="bg-blue-500" />
        <KPICard label="CN hom nay / 금일 출근" value={String(kpi.activeWorkers)} color="bg-green-500" />
        <KPICard label="Chi phi thang / 월 지출" value={fmtVND(kpi.monthlyExpense)} sub="VND" color="bg-orange-500" />
        <KPICard label="Cho duyet / 대기 승인" value={String(kpi.pendingApprovals)} color="bg-red-500" />
      </div>

      {/* Project summary cards */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Du an / 프로젝트 현황
        </h2>
        {loading && <p className="text-sm text-gray-400">Dang tai... / 로딩 중...</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectSummaries.map((ps) => (
            <div key={ps.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-medium text-blue-600">{ps.code}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{ps.name}</p>
                </div>
                <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
                  {ps.status}
                </span>
              </div>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Tien do / 진행률</span>
                  <span>{ps.progress}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${ps.progress}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>CN / 근로자: {ps.workerCount}</span>
                <span>Chi phi / 비용: {fmtVND(ps.expenseTotal)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Hoat dong gan day / 최근 활동
        </h2>
        <div className="space-y-3">
          {activities.length === 0 && !loading && (
            <p className="text-sm text-gray-400">Khong co hoat dong / 활동 없음</p>
          )}
          {activities.map((act) => (
            <div key={act.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                act.type === 'attendance' ? 'bg-blue-500' : 'bg-orange-500'
              }`} />
              <div className="min-w-0">
                <p className="text-sm text-gray-900">{act.description}</p>
                {act.timestamp && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(act.timestamp).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Charts Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly attendance bar chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Cham cong theo thang / 월별 출근 현황
          </h2>
          <div className="h-64">
            {monthlyAttendance.length > 0 ? (
              <Bar data={attendanceChartData} options={attendanceChartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">
                {loading ? 'Dang tai... / 로딩 중...' : 'Khong co du lieu / 데이터 없음'}
              </div>
            )}
          </div>
        </div>

        {/* Expense by category pie chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Chi phi theo loai / 분류별 지출
          </h2>
          <div className="h-64">
            {expenseCategories.length > 0 ? (
              <Pie data={expenseChartData} options={expenseChartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">
                {loading ? 'Dang tai... / 로딩 중...' : 'Khong co du lieu / 데이터 없음'}
              </div>
            )}
          </div>
        </div>

        {/* Project progress doughnut chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 lg:col-span-2 max-w-lg mx-auto w-full">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Tien do du an / 프로젝트 진행률
          </h2>
          <div className="h-72">
            {projectSummaries.length > 0 ? (
              <Doughnut data={progressChartData} options={progressChartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">
                {loading ? 'Dang tai... / 로딩 중...' : 'Khong co du lieu / 데이터 없음'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── KPI Card ── */

function KPICard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
        <div className={`w-3 h-3 rounded-full ${color} shrink-0 mt-1`} />
      </div>
    </div>
  )
}
