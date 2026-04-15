'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import {
  useAttendance,
  getCurrentPosition,
  isGPSRequired,
  ROLE_LABELS_BI,
  type GPSCoords,
  type WorkerStatus,
} from '@/hooks/useAttendance'
import { isAdmin } from '@/lib/roles'
import { exportToExcel, formatAttendanceForExport } from '@/lib/excel'
import { supabase } from '@/lib/supabase'

/* ── Helpers ── */

function todayYearMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function googleMapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`
}

/* ── Component ── */

export default function AttendancePage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const {
    todayStatuses,
    myTodayRecord,
    history,
    loading,
    error,
    loadTodayStatus,
    loadHistory,
    checkIn,
    checkOut,
    localHM,
  } = useAttendance()

  const [memo, setMemo] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(todayYearMonth())
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [heatmapData, setHeatmapData] = useState<Record<string, 'green' | 'yellow' | 'red' | 'blue'>>({})
  const [heatmapLoading, setHeatmapLoading] = useState(false)

  /* ── Init ── */
  useEffect(() => {
    loadTodayStatus()
  }, [loadTodayStatus])

  useEffect(() => {
    loadHistory(selectedMonth)
  }, [selectedMonth, loadHistory])

  /* ── Toast helper ── */
  const showToast = useCallback((msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  /* ── Heatmap loader ── */
  const loadHeatmap = useCallback(async () => {
    if (!user || !currentProject) return
    setHeatmapLoading(true)
    try {
      const [year, month] = selectedMonth.split('-').map(Number)
      const startDate = `${selectedMonth}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const endDate = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`

      // Load attendance records for the month
      const { data: attData } = await supabase
        .from('employee_attendance')
        .select('work_date, check_in, check_out, work_hours')
        .eq('user_id', user.id)
        .gte('work_date', startDate)
        .lte('work_date', endDate)

      // Load approved leave requests for the month
      const { data: leaveData } = await supabase
        .from('leave_requests')
        .select('start_date, end_date')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .lte('start_date', endDate)
        .gte('end_date', startDate)

      const map: Record<string, 'green' | 'yellow' | 'red' | 'blue'> = {}

      // Build leave date set
      const leaveDates = new Set<string>()
      ;(leaveData ?? []).forEach((lv: { start_date: string; end_date: string }) => {
        const s = new Date(lv.start_date)
        const e = new Date(lv.end_date)
        for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
          leaveDates.add(d.toISOString().slice(0, 10))
        }
      })

      // Build attendance map
      const attMap = new Map<string, { work_hours: number | null }>()
      ;(attData ?? []).forEach((rec: { work_date: string | null; work_hours: number | null }) => {
        if (rec.work_date) attMap.set(rec.work_date, rec)
      })

      // Fill calendar
      for (let day = 1; day <= lastDay; day++) {
        const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`
        const dow = new Date(dateStr).getDay()
        if (dow === 0 || dow === 6) continue // weekends handled in render as gray

        if (leaveDates.has(dateStr)) {
          map[dateStr] = 'blue'
        } else if (attMap.has(dateStr)) {
          const hrs = attMap.get(dateStr)!.work_hours ?? 0
          map[dateStr] = hrs >= 8 ? 'green' : 'yellow'
        } else {
          // Only mark as red if the date is in the past
          const dateObj = new Date(dateStr)
          if (dateObj < new Date(new Date().toISOString().slice(0, 10))) {
            map[dateStr] = 'red'
          }
        }
      }

      setHeatmapData(map)
    } catch {
      // silent
    } finally {
      setHeatmapLoading(false)
    }
  }, [user, currentProject, selectedMonth])

  useEffect(() => {
    if (showHeatmap) loadHeatmap()
  }, [showHeatmap, loadHeatmap])

  /* ── GPS acquire ── */
  const acquireGPS = async (): Promise<GPSCoords | null> => {
    const needGPS = user && isGPSRequired(user.role)

    // 현장 직원은 GPS 필수 — 먼저 권한 확인
    if (needGPS && navigator.permissions) {
      try {
        const perm = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
        if (perm.state === 'denied') {
          throw new Error(
            'Vui long cho phep vi tri trong cai dat trinh duyet / ' +
            '브라우저 설정에서 위치 권한을 허용해주세요'
          )
        }
      } catch (e) {
        if (e instanceof Error && e.message.includes('cho phep')) throw e
      }
    }

    try {
      const pos = await getCurrentPosition()
      return pos
    } catch {
      if (needGPS) {
        throw new Error(
          'Bat vi tri (GPS) de cham cong. Vao ca khong duoc neu khong co GPS / ' +
          'GPS를 켜야 출근할 수 있습니다. 위치 정보 없이 출근 불가'
        )
      }
      return null
    }
  }

  /* ── Check In handler ── */
  const handleCheckIn = async () => {
    if (actionLoading) return
    if (!currentProject) {
      showToast('Vui long chon cong truong truoc / 현장을 먼저 선택하세요', 'err')
      return
    }
    setActionLoading(true)
    try {
      const gps = await acquireGPS()
      await checkIn(memo, gps)
      setMemo('')
      const gpsMsg = gps ? ` (${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)})` : ''
      showToast(`Da ghi nhan vao ca / 출근 기록 완료!${gpsMsg}`, 'ok')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Check-in failed'
      showToast(msg, 'err')
    } finally {
      setActionLoading(false)
    }
  }

  /* ── Check Out handler ── */
  const handleCheckOut = async () => {
    if (actionLoading) return
    if (!myTodayRecord?.id) {
      showToast('Khong tim thay ban ghi / 출근 기록을 찾을 수 없습니다', 'err')
      return
    }
    setActionLoading(true)
    try {
      const gps = await acquireGPS()
      await checkOut(myTodayRecord.id, memo, gps)
      setMemo('')
      showToast('Da ghi tan ca / 퇴근 기록 완료!', 'ok')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Check-out failed'
      showToast(msg, 'err')
    } finally {
      setActionLoading(false)
    }
  }

  /* ── Summary counts ── */
  const workingCount = todayStatuses.filter((s) => s.record && !s.record.check_out).length
  const doneCount = todayStatuses.filter((s) => s.record?.check_out).length
  const absentCount = todayStatuses.filter((s) => !s.record).length
  const totalCount = todayStatuses.length

  /* ── Status helpers ── */
  function statusBadge(ws: WorkerStatus) {
    if (!ws.record) {
      return { bg: 'bg-red-50', border: 'border-red-200', text: 'Chua vao ca / 미출근', dot: 'bg-gray-300' }
    }
    if (ws.record.check_out) {
      return { bg: 'bg-green-50', border: 'border-green-200', text: 'Da tan ca / 퇴근', dot: 'bg-green-500' }
    }
    return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'Dang lam viec / 근무중', dot: 'bg-blue-500' }
  }

  function timeRange(ws: WorkerStatus): string {
    if (!ws.record?.check_in) return ''
    const cin = localHM(ws.record.check_in)
    if (ws.record.check_out) {
      const cout = localHM(ws.record.check_out)
      const hrs = ws.record.work_hours ?? 0
      return `${cin} ~ ${cout} (${hrs}h)`
    }
    return `${cin} ~`
  }

  /* ── My status display ── */
  const myCheckedIn = myTodayRecord && !myTodayRecord.check_out
  const myDone = myTodayRecord?.check_out

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
            toast.type === 'ok'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Page title */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Cham cong / 출퇴근
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Quan ly cham cong hang ngay / 일일 출퇴근 관리
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

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          label="Dang lam / 출근 중"
          value={workingCount}
          color="bg-blue-500"
        />
        <SummaryCard
          label="Hoan thanh / 완료"
          value={doneCount}
          color="bg-green-500"
        />
        <SummaryCard
          label="Chua den / 미출근"
          value={absentCount}
          color="bg-red-500"
        />
        <SummaryCard
          label="Tong so / 전체"
          value={totalCount}
          color="bg-gray-500"
        />
      </div>

      {/* ── My Check-in / Check-out Section ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Cham cong cua toi / 내 출퇴근
        </h2>

        {/* Current status */}
        {myDone && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
            Da hoan thanh ca lam viec hom nay / 오늘 근무 완료
            <span className="block text-xs text-green-600 mt-1">
              {localHM(myTodayRecord!.check_in!)} ~ {localHM(myTodayRecord!.check_out!)}
              {myTodayRecord!.work_hours ? ` (${myTodayRecord!.work_hours}h)` : ''}
            </span>
          </div>
        )}

        {myCheckedIn && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            Dang trong ca lam viec / 근무 중
            <span className="block text-xs text-blue-600 mt-1">
              Vao ca luc / 출근 시간: {localHM(myTodayRecord!.check_in!)}
            </span>
          </div>
        )}

        {/* Memo input */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Ghi chu / 메모
          </label>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="Noi dung ghi chu... / 메모 내용..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* GPS requirement notice for field workers */}
        {user && isGPSRequired(user.role) && (
          <p className="text-xs text-amber-600 mb-3">
            * Yeu cau vi tri GPS / GPS 위치 정보 필수
          </p>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          {!myCheckedIn && !myDone && (
            <button
              onClick={handleCheckIn}
              disabled={actionLoading}
              className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {actionLoading ? 'Dang xu ly...' : 'Vao ca / 출근'}
            </button>
          )}

          {myCheckedIn && (
            <button
              onClick={handleCheckOut}
              disabled={actionLoading}
              className="flex-1 px-4 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {actionLoading ? 'Dang xu ly...' : 'Ra ca / 퇴근'}
            </button>
          )}

          {myDone && (
            <button
              onClick={handleCheckIn}
              disabled={actionLoading}
              className="flex-1 px-4 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {actionLoading ? 'Dang xu ly...' : 'Vao ca lai / 재출근'}
            </button>
          )}
        </div>
      </div>

      {/* ── Worker Status List (admin/HR can see all) ── */}
      {user && isAdmin(user.role) && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Trang thai nhan vien / 직원 현황
          </h2>

          {loading && (
            <p className="text-sm text-gray-400">Dang tai... / 로딩 중...</p>
          )}

          <div className="space-y-2">
            {todayStatuses.map((ws) => {
              const badge = statusBadge(ws)
              const time = timeRange(ws)
              const hasGPS = ws.record?.checkin_lat != null

              return (
                <div
                  key={ws.userId}
                  className={`p-3 rounded-lg border ${badge.bg} ${badge.border}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${badge.dot}`} />
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {ws.userName}
                      </span>
                      <span className="text-[10px] text-gray-500 shrink-0">
                        {ROLE_LABELS_BI[ws.userRole] ?? ws.userRole}
                      </span>
                    </div>
                    <span className="text-xs text-gray-600 shrink-0">
                      {badge.text}
                    </span>
                  </div>
                  {time && (
                    <div className="mt-1 text-xs text-gray-500">
                      {hasGPS && <span className="mr-1">GPS</span>}
                      {time}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Monthly History ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Lich su cham cong / 출퇴근 이력
          </h2>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => {
              if (history.length === 0) return
              const data = formatAttendanceForExport(
                history.map((h) => ({
                  date: h.work_date,
                  user_name: user?.name,
                  check_in: h.check_in ? localHM(h.check_in) : '',
                  check_out: h.check_out ? localHM(h.check_out) : '',
                  work_hours: h.work_hours ?? 0,
                  overtime_hours: h.overtime_hours ?? 0,
                }))
              )
              exportToExcel(data, { filename: `attendance_${selectedMonth}`, sheetName: '출퇴근' })
            }}
            className="px-3 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition"
          >
            Excel
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-500 mb-2">{error}</p>
        )}

        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="px-5 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">
                  Ngay / 날짜
                </th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">
                  Vao / 출근
                </th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">
                  Ra / 퇴근
                </th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">
                  Gio / 시간
                </th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">
                  OT
                </th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">
                  GPS (IN)
                </th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">
                  GPS (OUT)
                </th>
                <th className="px-5 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">
                  Ghi chu / 메모
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-6 text-center text-sm text-gray-400">
                    Khong co du lieu / 데이터 없음
                  </td>
                </tr>
              )}
              {history.map((rec) => (
                <tr key={rec.id} className="hover:bg-gray-50">
                  <td className="px-5 py-2 text-gray-900 whitespace-nowrap">
                    {rec.work_date}
                  </td>
                  <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                    {rec.check_in ? localHM(rec.check_in) : '-'}
                  </td>
                  <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                    {rec.check_out ? localHM(rec.check_out) : '-'}
                  </td>
                  <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                    {rec.work_hours != null ? `${rec.work_hours}h` : '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {rec.overtime_hours != null && rec.overtime_hours > 0 ? (
                      <span className="text-orange-600 font-medium">
                        {rec.overtime_hours}h
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {rec.checkin_lat != null && rec.checkin_lng != null ? (
                      <a
                        href={googleMapsLink(rec.checkin_lat, rec.checkin_lng)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Map
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {rec.checkout_lat != null && rec.checkout_lng != null ? (
                      <a
                        href={googleMapsLink(rec.checkout_lat, rec.checkout_lng)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Map
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-5 py-2 text-gray-600 text-xs max-w-[200px] truncate">
                    {rec.memo || rec.checkout_memo || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Heatmap Toggle & Calendar ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Lich nhiet do / 근태 히트맵
          </h2>
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              showHeatmap
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
            }`}
          >
            {showHeatmap ? 'An Heatmap / 숨기기' : 'Hien Heatmap / 보기'}
          </button>
        </div>

        {showHeatmap && (
          <>
            {heatmapLoading ? (
              <p className="text-sm text-gray-400">Dang tai... / 로딩 중...</p>
            ) : (() => {
              const [year, month] = selectedMonth.split('-').map(Number)
              const lastDay = new Date(year, month, 0).getDate()
              const firstDow = new Date(year, month - 1, 1).getDay()
              const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
              const cells: { day: number | null; dateStr: string }[] = []
              for (let i = 0; i < firstDow; i++) cells.push({ day: null, dateStr: '' })
              for (let d = 1; d <= lastDay; d++) {
                cells.push({ day: d, dateStr: `${selectedMonth}-${String(d).padStart(2, '0')}` })
              }
              return (
                <div>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-3 mb-3 text-[10px] text-gray-600">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400 inline-block" /> Binh thuong 8h+ / 정상</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400 inline-block" /> {'<'}8h / 지각/조퇴</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block" /> Vang / 결근</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-400 inline-block" /> Nghi phep / 휴가</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-200 inline-block" /> Cuoi tuan / 주말</span>
                  </div>
                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {dayLabels.map((dl) => (
                      <div key={dl} className="text-center text-[10px] font-medium text-gray-400">{dl}</div>
                    ))}
                  </div>
                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {cells.map((cell, idx) => {
                      if (cell.day === null) return <div key={`e-${idx}`} className="h-8" />
                      const dow = new Date(cell.dateStr).getDay()
                      const isWeekend = dow === 0 || dow === 6
                      const status = heatmapData[cell.dateStr]
                      let bg = 'bg-gray-50'
                      if (isWeekend) bg = 'bg-gray-200'
                      else if (status === 'green') bg = 'bg-green-400'
                      else if (status === 'yellow') bg = 'bg-yellow-400'
                      else if (status === 'red') bg = 'bg-red-400'
                      else if (status === 'blue') bg = 'bg-blue-400'
                      return (
                        <div
                          key={cell.dateStr}
                          className={`h-8 rounded flex items-center justify-center text-[11px] font-medium ${bg} ${
                            isWeekend ? 'text-gray-500' : status ? 'text-white' : 'text-gray-400'
                          }`}
                          title={cell.dateStr}
                        >
                          {cell.day}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </>
        )}
      </div>
    </div>
  )
}

/* ── Summary Card Sub-component ── */

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`w-3 h-3 rounded-full ${color} shrink-0 mt-1`} />
      </div>
    </div>
  )
}
