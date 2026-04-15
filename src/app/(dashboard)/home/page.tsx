'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/stores/authStore'
import { ROLE_LABELS } from '@/lib/roles'
import { supabase } from '@/lib/supabase'
import type { Role } from '@/types'

/* ── Quick Action Definitions ── */

interface QuickAction {
  label: string
  href: string
  icon: string
  color: string
}

const ENGINEER_ACTIONS: QuickAction[] = [
  { label: 'Bao cao moi / 일보 작성', href: '/report', icon: '📝', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { label: 'Vao ca / 출근', href: '/attendance', icon: '✅', color: 'bg-green-50 text-green-700 border-green-200' },
  { label: 'Diem danh / 점호', href: '/roll_call', icon: '📋', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { label: 'An toan / 안전점검', href: '/safety', icon: '🛡️', color: 'bg-red-50 text-red-700 border-red-200' },
  { label: 'Nghi phep / 휴가 신청', href: '/leave', icon: '🏖️', color: 'bg-violet-50 text-violet-700 border-violet-200' },
]

const HR_ACTIONS: QuickAction[] = [
  { label: 'Cham cong / 근태 관리', href: '/attendance_mgmt', icon: '⏰', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { label: 'Luong / 급여', href: '/salary', icon: '💰', color: 'bg-green-50 text-green-700 border-green-200' },
  { label: 'Duyet phep / 휴가 승인', href: '/leave-mgmt', icon: '📑', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { label: 'Nhan vien / 직원 등록', href: '/staff', icon: '👤', color: 'bg-violet-50 text-violet-700 border-violet-200' },
]

const CEO_ACTIONS: QuickAction[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '📊', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { label: 'Da cong truong / 다현장', href: '/multi-site', icon: '🏗️', color: 'bg-green-50 text-green-700 border-green-200' },
  { label: 'Chi phi / 원가 분석', href: '/cost-analysis', icon: '📈', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { label: 'Duyet TT / 결재 승인', href: '/advance', icon: '💳', color: 'bg-red-50 text-red-700 border-red-200' },
]

function getQuickActions(role: Role): QuickAction[] {
  switch (role) {
    case 'ceo':
    case 'director_m':
      return CEO_ACTIONS
    case 'hr':
    case 'account':
      return HR_ACTIONS
    default:
      return ENGINEER_ACTIONS
  }
}

/* ── Pending / Summary counts ── */

interface DashboardCounts {
  pendingAdvances: number
  pendingLeaves: number
  pendingExpenses: number
  todayAttendance: number
  todayReports: number
  todaySafetyChecks: number
}

const emptyCounts: DashboardCounts = {
  pendingAdvances: 0,
  pendingLeaves: 0,
  pendingExpenses: 0,
  todayAttendance: 0,
  todayReports: 0,
  todaySafetyChecks: 0,
}

const KPI_CARDS = [
  {
    title: 'Cong nhan hom nay / 금일 출근',
    value: '—',
    sub: 'Dang tai...',
    color: 'bg-blue-500',
  },
  {
    title: 'Tien do / 공정률',
    value: '—%',
    sub: 'Chua co du lieu',
    color: 'bg-emerald-500',
  },
  {
    title: 'Nghiem thu / 기성',
    value: '—',
    sub: 'VND',
    color: 'bg-violet-500',
  },
  {
    title: 'Tam ung / 전도금',
    value: '—',
    sub: 'Cho duyet / 대기',
    color: 'bg-amber-500',
  },
]

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)
  const projects = useAuthStore((s) => s.projects)

  const project = projects.find((p) => p.id === currentProject)
  const roleLabel = user ? ROLE_LABELS[user.role] : ''
  const quickActions = user ? getQuickActions(user.role) : []

  const [counts, setCounts] = useState<DashboardCounts>(emptyCounts)
  const [countsLoading, setCountsLoading] = useState(false)

  const loadCounts = useCallback(async () => {
    if (!currentProject) return
    setCountsLoading(true)
    try {
      const today = new Date().toISOString().slice(0, 10)

      const [advRes, leaveRes, expRes, attRes, repRes, safeRes] = await Promise.all([
        // Pending advances
        supabase
          .from('advances')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', currentProject)
          .eq('status', 'pending'),
        // Pending leaves
        supabase
          .from('leave_requests')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', currentProject)
          .eq('status', 'pending'),
        // Pending expenses
        supabase
          .from('expenses')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', currentProject)
          .eq('status', 'pending'),
        // Today's attendance
        supabase
          .from('employee_attendance')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', currentProject)
          .eq('work_date', today),
        // Today's reports
        supabase
          .from('daily_reports')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', currentProject)
          .eq('date', today),
        // Today's safety checks
        supabase
          .from('safety_inspections')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', currentProject)
          .eq('inspection_date', today),
      ])

      setCounts({
        pendingAdvances: advRes.count ?? 0,
        pendingLeaves: leaveRes.count ?? 0,
        pendingExpenses: expRes.count ?? 0,
        todayAttendance: attRes.count ?? 0,
        todayReports: repRes.count ?? 0,
        todaySafetyChecks: safeRes.count ?? 0,
      })
    } catch {
      // fail silently — counts are supplementary
    } finally {
      setCountsLoading(false)
    }
  }, [currentProject])

  useEffect(() => {
    loadCounts()
  }, [loadCounts])

  const totalPending = counts.pendingAdvances + counts.pendingLeaves + counts.pendingExpenses

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Trang chu / 홈
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Xin chao, {user?.name} ({roleLabel}) — 환영합니다
        </p>
      </div>

      {/* Current project info */}
      {project && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {project.code} — {project.name}
              </p>
              <p className="text-xs text-gray-500">
                {project.end_date
                  ? `Han CT / 준공일: ${project.end_date}`
                  : 'Chua xac dinh / 미정'}
              </p>
            </div>
          </div>
        </div>
      )}

      {!currentProject && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          Vui long chon cong trinh / 현장을 선택해주세요.
        </div>
      )}

      {/* ── Quick Actions ── */}
      {user && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Thao tac nhanh / 빠른 실행
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all hover:shadow-md active:scale-95 ${action.color}`}
              >
                <span className="text-2xl">{action.icon}</span>
                <span className="text-xs font-semibold text-center leading-tight">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Pending Tasks ── */}
      {currentProject && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Cho xu ly / 미처리 건 {totalPending > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full">
                {totalPending}
              </span>
            )}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <PendingItem
              label="Tam ung / 전도금"
              count={counts.pendingAdvances}
              href="/advance"
              loading={countsLoading}
            />
            <PendingItem
              label="Nghi phep / 휴가"
              count={counts.pendingLeaves}
              href="/leave-mgmt"
              loading={countsLoading}
            />
            <PendingItem
              label="Chi phi / 경비"
              count={counts.pendingExpenses}
              href="/expense"
              loading={countsLoading}
            />
          </div>
        </div>
      )}

      {/* ── Today's Summary ── */}
      {currentProject && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Hom nay / 오늘 현황
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SummaryItem
              label="Cham cong / 출근"
              value={counts.todayAttendance}
              unit="nguoi / 명"
              loading={countsLoading}
            />
            <SummaryItem
              label="Bao cao / 일보"
              value={counts.todayReports}
              unit="bai / 건"
              loading={countsLoading}
            />
            <SummaryItem
              label="An toan / 안전점검"
              value={counts.todaySafetyChecks}
              unit="lan / 건"
              loading={countsLoading}
            />
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CARDS.map((card) => (
          <div
            key={card.title}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 truncate">
                  {card.title}
                </p>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {card.value}
                </p>
                <p className="mt-1 text-xs text-gray-400">{card.sub}</p>
              </div>
              <div
                className={`w-3 h-3 rounded-full ${card.color} shrink-0 mt-1`}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Placeholder sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 min-h-[200px]">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Nhat ky gan day / 최근 일보
          </h3>
          <p className="text-sm text-gray-400">
            Chua co du lieu / 데이터 없음
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 min-h-[200px]">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Thong bao / 알림
          </h3>
          <p className="text-sm text-gray-400">
            Khong co thong bao moi / 새 알림 없음
          </p>
        </div>
      </div>
    </div>
  )
}

/* ── Sub-components ── */

function PendingItem({
  label,
  count,
  href,
  loading,
}: {
  label: string
  count: number
  href: string
  loading: boolean
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
    >
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <span
        className={`text-sm font-bold ${
          loading ? 'text-gray-300' : count > 0 ? 'text-red-600' : 'text-gray-400'
        }`}
      >
        {loading ? '...' : count}
      </span>
    </Link>
  )
}

function SummaryItem({
  label,
  value,
  unit,
  loading,
}: {
  label: string
  value: number
  unit: string
  loading: boolean
}) {
  return (
    <div className="p-3 rounded-lg bg-gray-50">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">
        {loading ? '...' : value}
      </p>
      <p className="text-[10px] text-gray-400">{unit}</p>
    </div>
  )
}
