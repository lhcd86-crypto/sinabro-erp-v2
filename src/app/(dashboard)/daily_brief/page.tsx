'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

/* -- Helpers ----------------------------------------------- */

function today() {
  return new Date().toISOString().slice(0, 10)
}

function dayOfWeek(dateStr: string): string {
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  const daysKr = ['일', '월', '화', '수', '목', '금', '토']
  const d = new Date(dateStr + 'T00:00:00')
  const idx = d.getDay()
  return `${days[idx]} / ${daysKr[idx]}`
}

/* -- Types ------------------------------------------------- */

interface BriefData {
  attendance: { present: number; absent: number; onLeave: number; total: number }
  dailyReports: number
  safetyInspections: number
  pendingAdvances: number
  pendingExpenses: number
  pendingLeaves: number
}

const EMPTY_BRIEF: BriefData = {
  attendance: { present: 0, absent: 0, onLeave: 0, total: 0 },
  dailyReports: 0,
  safetyInspections: 0,
  pendingAdvances: 0,
  pendingExpenses: 0,
  pendingLeaves: 0,
}

/* -- Component --------------------------------------------- */

export default function DailyBriefPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(today())
  const [brief, setBrief] = useState<BriefData>(EMPTY_BRIEF)

  /* -- Load data ------------------------------------------- */
  const loadData = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const dateStr = selectedDate

      const [
        { data: attData },
        { data: leaveData },
        { data: reportData },
        { data: inspData },
        { data: advData },
        { data: expData },
        { data: lvReqData },
      ] = await Promise.all([
        supabase
          .from('employee_attendance')
          .select('id, status')
          .eq('project_id', currentProject)
          .eq('attendance_date', dateStr),
        supabase
          .from('leave_requests')
          .select('id')
          .eq('project_id', currentProject)
          .eq('status', 'approved')
          .lte('start_date', dateStr)
          .gte('end_date', dateStr),
        supabase
          .from('daily_reports')
          .select('id')
          .eq('project_id', currentProject)
          .eq('report_date', dateStr),
        supabase
          .from('safety_inspections')
          .select('id')
          .eq('project_id', currentProject)
          .eq('inspection_date', dateStr),
        supabase
          .from('advance_requests')
          .select('id')
          .eq('project_id', currentProject)
          .in('status', ['pending', 'submitted']),
        supabase
          .from('expenses')
          .select('id')
          .eq('project_id', currentProject)
          .in('status', ['pending', 'submitted']),
        supabase
          .from('leave_requests')
          .select('id')
          .eq('project_id', currentProject)
          .eq('status', 'pending'),
      ])

      const attArr = attData ?? []
      const present = attArr.filter((a: { status: string }) => a.status === 'present' || a.status === 'checked_in').length
      const absent = attArr.filter((a: { status: string }) => a.status === 'absent').length
      const onLeave = (leaveData ?? []).length

      setBrief({
        attendance: { present, absent, onLeave, total: attArr.length },
        dailyReports: (reportData ?? []).length,
        safetyInspections: (inspData ?? []).length,
        pendingAdvances: (advData ?? []).length,
        pendingExpenses: (expData ?? []).length,
        pendingLeaves: (lvReqData ?? []).length,
      })
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [currentProject, selectedDate])

  useEffect(() => {
    if (user && currentProject) loadData()
  }, [user, currentProject, loadData])

  if (!currentProject) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        Vui long chon cong trinh / 현장을 선택해주세요.
      </div>
    )
  }

  const totalPending = brief.pendingAdvances + brief.pendingExpenses + brief.pendingLeaves

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bao cao ngay / 일일 브리핑
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Tom tat hoat dong hang ngay / 일일 현장 현황 요약
        </p>
      </div>

      {/* Date picker */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Ngay / 날짜
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="mt-5">
            <span className="inline-block px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
              {selectedDate} ({dayOfWeek(selectedDate)})
            </span>
          </div>
          <button
            onClick={() => setSelectedDate(today())}
            className="mt-5 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Hom nay / 오늘
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-gray-400">
          Dang tai... / 로딩 중...
        </div>
      ) : (
        <>
          {/* Attendance Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">Co mat / 출근</p>
                  <p className="mt-2 text-2xl font-bold text-green-600">{brief.attendance.present}</p>
                  <p className="mt-1 text-xs text-gray-400">nguoi / 명</p>
                </div>
                <div className="w-3 h-3 rounded-full bg-green-500 shrink-0 mt-1" />
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">Vang mat / 결근</p>
                  <p className="mt-2 text-2xl font-bold text-red-600">{brief.attendance.absent}</p>
                  <p className="mt-1 text-xs text-gray-400">nguoi / 명</p>
                </div>
                <div className="w-3 h-3 rounded-full bg-red-500 shrink-0 mt-1" />
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">Nghi phep / 휴가</p>
                  <p className="mt-2 text-2xl font-bold text-amber-600">{brief.attendance.onLeave}</p>
                  <p className="mt-1 text-xs text-gray-400">nguoi / 명</p>
                </div>
                <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0 mt-1" />
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">Tong cham cong / 총 출석</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{brief.attendance.total}</p>
                  <p className="mt-1 text-xs text-gray-400">ban ghi / 건</p>
                </div>
                <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0 mt-1" />
              </div>
            </div>
          </div>

          {/* Activity sections */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Daily Reports */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">
                  Bao cao ngay / 일보 제출
                </h3>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                    <span className="text-lg font-bold text-blue-600">{brief.dailyReports}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {brief.dailyReports} bao cao da nop / 일보 제출됨
                    </p>
                    <p className="text-xs text-gray-400">ngay {selectedDate}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Safety Inspections */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">
                  Kiem tra AT / 안전점검
                </h3>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                    <span className="text-lg font-bold text-green-600">{brief.safetyInspections}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {brief.safetyInspections} kiem tra hoan thanh / 점검 완료
                    </p>
                    <p className="text-xs text-gray-400">ngay {selectedDate}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pending approvals */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Cho duyet / 미결 승인 건
              </h3>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                totalPending > 0
                  ? 'bg-red-50 text-red-700'
                  : 'bg-green-50 text-green-700'
              }`}>
                {totalPending > 0 ? `${totalPending} cho xu ly / 미처리` : 'Khong co / 없음'}
              </span>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    brief.pendingAdvances > 0
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {brief.pendingAdvances}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700">Tam ung / 전도금 신청</p>
                    <p className="text-xs text-gray-400">{brief.pendingAdvances} cho duyet / 대기</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    brief.pendingExpenses > 0
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {brief.pendingExpenses}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700">Chi phi / 경비</p>
                    <p className="text-xs text-gray-400">{brief.pendingExpenses} cho duyet / 대기</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    brief.pendingLeaves > 0
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {brief.pendingLeaves}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700">Nghi phep / 휴가 신청</p>
                    <p className="text-xs text-gray-400">{brief.pendingLeaves} cho duyet / 대기</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Weather / Date info placeholder */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">
                Thoi tiet / 날씨 정보
              </h3>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-sky-50 flex items-center justify-center text-2xl">
                  {new Date(selectedDate + 'T00:00:00').getMonth() >= 4 &&
                   new Date(selectedDate + 'T00:00:00').getMonth() <= 9
                    ? '☀️'
                    : '☁️'}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {selectedDate} ({dayOfWeek(selectedDate)})
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Thong tin thoi tiet se duoc cap nhat tu API / 날씨 API 연동 예정
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
