'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

/* -- Types ------------------------------------------------- */

interface CheckItem {
  key: string
  label: string
  done: number
  total: number
}

/* -- Helpers ----------------------------------------------- */

const ALLOWED_ROLES = ['account', 'ceo']

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthRange(ym: string): [string, string] {
  const [y, m] = ym.split('-').map(Number)
  const start = `${y}-${String(m).padStart(2, '0')}-01`
  const last = new Date(y, m, 0).getDate()
  const end = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  return [start, end]
}

/* -- Component --------------------------------------------- */

export default function MonthlyClosePage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [loading, setLoading] = useState(false)
  const [closing, setClosing] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth())
  const [checks, setChecks] = useState<CheckItem[]>([])
  const [isClosed, setIsClosed] = useState(false)

  const toast = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  /* -- Access check ---------------------------------------- */
  if (user && !ALLOWED_ROLES.includes(user.role)) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
        Khong co quyen truy cap / 접근 권한이 없습니다.
      </div>
    )
  }

  /* -- Load data ------------------------------------------- */
  const loadData = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const [start, end] = monthRange(selectedMonth)

      const [
        { data: reportsAll },
        { data: reportsConfirmed },
        { data: attAll },
        { data: attVerified },
        { data: expAll },
        { data: expApproved },
        { data: salaryData },
        { data: billingData },
        { data: closeData },
      ] = await Promise.all([
        // Daily reports total
        supabase
          .from('daily_reports')
          .select('id')
          .eq('project_id', currentProject)
          .gte('report_date', start)
          .lte('report_date', end),
        // Daily reports confirmed
        supabase
          .from('daily_reports')
          .select('id')
          .eq('project_id', currentProject)
          .eq('confirmed', true)
          .gte('report_date', start)
          .lte('report_date', end),
        // Attendance total
        supabase
          .from('employee_attendance')
          .select('id')
          .eq('project_id', currentProject)
          .gte('work_date', start)
          .lte('work_date', end),
        // Attendance verified
        supabase
          .from('employee_attendance')
          .select('id')
          .eq('project_id', currentProject)
          .gte('work_date', start)
          .lte('work_date', end),
        // Expenses total
        supabase
          .from('expenses')
          .select('id')
          .eq('project_id', currentProject)
          .gte('expense_date', start)
          .lte('expense_date', end),
        // Expenses approved+
        supabase
          .from('expenses')
          .select('id')
          .eq('project_id', currentProject)
          .in('status', ['approved', 'paid'])
          .gte('expense_date', start)
          .lte('expense_date', end),
        // Salary
        supabase
          .from('salary_monthly')
          .select('id')
          .eq('month', selectedMonth),
        // Billing
        supabase
          .from('billings')
          .select('id')
          .eq('project_id', currentProject)
          .gte('billing_date', start)
          .lte('billing_date', end),
        // Check if already closed
        supabase
          .from('monthly_closes')
          .select('id')
          .eq('project_id', currentProject)
          .eq('month', selectedMonth)
          .limit(1),
      ])

      const items: CheckItem[] = [
        {
          key: 'reports',
          label: 'Bao cao ngay xac nhan / 일보 확인',
          done: (reportsConfirmed ?? []).length,
          total: (reportsAll ?? []).length,
        },
        {
          key: 'attendance',
          label: 'Cham cong xac nhan / 출근부 검증',
          done: (attVerified ?? []).length,
          total: (attAll ?? []).length,
        },
        {
          key: 'expenses',
          label: 'Chi phi duyet / 경비 승인',
          done: (expApproved ?? []).length,
          total: (expAll ?? []).length,
        },
        {
          key: 'salary',
          label: 'Luong tinh xong / 급여 산출',
          done: (salaryData ?? []).length,
          total: Math.max((salaryData ?? []).length, 1),
        },
        {
          key: 'billing',
          label: 'Thanh toan gui / 기성 제출',
          done: (billingData ?? []).length,
          total: Math.max((billingData ?? []).length, 1),
        },
      ]

      setChecks(items)
      setIsClosed((closeData ?? []).length > 0)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [currentProject, selectedMonth])

  useEffect(() => {
    if (user && currentProject) loadData()
  }, [user, currentProject, loadData])

  /* -- Close month ----------------------------------------- */
  async function handleClose() {
    if (!currentProject || !user) return
    if (isClosed) {
      toast('err', 'Da dong thang nay / 이미 마감된 월입니다')
      return
    }

    setClosing(true)
    try {
      const { error } = await supabase.from('monthly_closes').insert({
        project_id: currentProject,
        month: selectedMonth,
        closed_by: user.id,
        closed_at: new Date().toISOString(),
        checklist: Object.fromEntries(checks.map((c) => [c.key, { done: c.done, total: c.total }])),
      })
      if (error) throw error

      setIsClosed(true)
      toast('ok', 'Da dong thang / 월마감 완료')
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Close failed')
    } finally {
      setClosing(false)
    }
  }

  /* -- Derived -------------------------------------------- */
  const allComplete = checks.length > 0 && checks.every((c) => c.total === 0 || c.done >= c.total)
  const overallDone = checks.reduce((s, c) => s + c.done, 0)
  const overallTotal = checks.reduce((s, c) => s + c.total, 0)
  const overallPct = overallTotal > 0 ? Math.round((overallDone / overallTotal) * 100) : 0

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
          Dong thang / 월마감
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Kiem tra truoc khi dong so / 월말 정산 체크리스트
        </p>
      </div>

      {/* Month picker */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Thang / 정산월
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {isClosed && (
            <div className="mt-5 inline-block px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-semibold border border-green-200">
              Da dong / 마감 완료
            </div>
          )}
        </div>
      </div>

      {/* Overall progress */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-900">
            Tien do tong the / 전체 진행률
          </span>
          <span className="text-sm font-bold text-gray-700">{overallPct}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              overallPct === 100 ? 'bg-green-500' : overallPct >= 70 ? 'bg-blue-500' : 'bg-amber-500'
            }`}
            style={{ width: `${overallPct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {overallDone}/{overallTotal} hang muc hoan thanh / 항목 완료
        </p>
      </div>

      {/* Checklist items */}
      {loading ? (
        <div className="p-8 text-center text-sm text-gray-400">
          Dang tai... / 로딩 중...
        </div>
      ) : (
        <div className="space-y-3">
          {checks.map((item) => {
            const pct = item.total > 0 ? Math.round((item.done / item.total) * 100) : 0
            const complete = item.total > 0 && item.done >= item.total
            return (
              <div
                key={item.key}
                className={`bg-white border rounded-xl p-4 transition-shadow hover:shadow-md ${
                  complete ? 'border-green-200' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        complete
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {complete ? '✓' : '-'}
                    </div>
                    <span className="text-sm font-medium text-gray-800">{item.label}</span>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    complete
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {item.done}/{item.total} ({pct}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      complete ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Close button */}
      <div className="flex justify-end">
        <button
          onClick={handleClose}
          disabled={closing || isClosed}
          className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-colors ${
            isClosed
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : allComplete
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-amber-600 text-white hover:bg-amber-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {closing
            ? 'Dang xu ly... / 처리 중...'
            : isClosed
            ? 'Da dong / 마감 완료'
            : allComplete
            ? 'Dong thang / 월마감 실행'
            : 'Dong thang (chua hoan tat) / 월마감 (미완료 항목 있음)'}
        </button>
      </div>
    </div>
  )
}
