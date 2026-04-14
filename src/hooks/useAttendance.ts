import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { Role } from '@/types'

/* ── Types ── */

export interface AttendanceRecord {
  id: string
  user_id: string
  project_id: string | null
  work_date: string
  check_in: string | null
  check_out: string | null
  work_hours: number | null
  overtime_hours: number | null
  is_night: boolean | null
  is_weekend: boolean | null
  memo: string | null
  checkout_memo: string | null
  checkin_lat: number | null
  checkin_lng: number | null
  checkout_lat: number | null
  checkout_lng: number | null
}

export interface WorkerStatus {
  userId: string
  userName: string
  userRole: Role
  record: AttendanceRecord | null
}

export interface GPSCoords {
  lat: number
  lng: number
}

/* ── Role helpers ── */

const FIELD_ROLES: Role[] = ['engineer', 'foreman', 'driver']
const OFFICE_ROLES: Role[] = ['ceo', 'hr', 'director_m', 'director_f', 'account']

export function isGPSRequired(role: Role): boolean {
  return FIELD_ROLES.includes(role)
}

export function isOfficeRole(role: Role): boolean {
  return OFFICE_ROLES.includes(role)
}

export const ROLE_LABELS_BI: Record<Role, string> = {
  engineer: 'KS CT / 소장',
  foreman: 'Doc cong / 반장',
  driver: 'Lai xe / 기사',
  qs: 'QS / 공무',
  hr: 'HC / 인사총무',
  account: 'KT / 회계',
  director_f: 'GD CT / 현장임원',
  director_m: 'GD QL / 관리임원',
  ceo: 'GD / 대표',
}

/* ── GPS helpers ── */

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function getCurrentPosition(): Promise<GPSCoords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GPS khong ho tro / GPS 미지원'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      (err) => {
        reject(new Error(err.message || 'Khong the lay vi tri / 위치 정보 획득 실패'))
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  })
}

/* ── Local date helper (Vietnam timezone) ── */

function localDate(): string {
  const d = new Date()
  const offset = 7 * 60 // UTC+7
  const local = new Date(d.getTime() + offset * 60000)
  return local.toISOString().slice(0, 10)
}

function localHM(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
}

/* ── Hook ── */

export function useAttendance() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [todayStatuses, setTodayStatuses] = useState<WorkerStatus[]>([])
  const [myTodayRecord, setMyTodayRecord] = useState<AttendanceRecord | null>(null)
  const [history, setHistory] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* ── Load all workers' today status ── */
  const loadTodayStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const today = localDate()

      // Load all users
      const { data: users, error: usersErr } = await supabase
        .from('users')
        .select('id, name, role')
        .order('name')

      if (usersErr) throw usersErr

      // Load today's attendance records
      const { data: records, error: recErr } = await supabase
        .from('employee_attendance')
        .select('*')
        .eq('work_date', today)

      if (recErr) throw recErr

      const recMap = new Map<string, AttendanceRecord>()
      for (const r of (records ?? [])) {
        recMap.set(r.user_id, r as AttendanceRecord)
      }

      const statuses: WorkerStatus[] = (users ?? []).map((u: { id: string; name: string; role: string }) => ({
        userId: u.id,
        userName: u.name,
        userRole: u.role as Role,
        record: recMap.get(u.id) ?? null,
      }))

      setTodayStatuses(statuses)

      // Set my own record
      if (user?.id) {
        setMyTodayRecord(recMap.get(user.id) ?? null)
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Load failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  /* ── Load monthly history ── */
  const loadHistory = useCallback(
    async (yearMonth: string) => {
      if (!user?.id) return
      setLoading(true)
      setError(null)
      try {
        const startDate = `${yearMonth}-01`
        const [y, m] = yearMonth.split('-').map(Number)
        const lastDay = new Date(y, m, 0).getDate()
        const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`

        const { data, error: histErr } = await supabase
          .from('employee_attendance')
          .select('*')
          .eq('user_id', user.id)
          .gte('work_date', startDate)
          .lte('work_date', endDate)
          .order('work_date', { ascending: false })

        if (histErr) throw histErr
        setHistory((data ?? []) as AttendanceRecord[])
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Load failed'
        setError(msg)
      } finally {
        setLoading(false)
      }
    },
    [user?.id],
  )

  /* ── Check In ── */
  const checkIn = useCallback(
    async (memo: string, gps: GPSCoords | null) => {
      if (!user?.id) throw new Error('Chua dang nhap / 로그인 필요')
      if (!currentProject) throw new Error('Vui long chon cong truong / 현장을 선택하세요')

      // GPS required for field roles
      if (isGPSRequired(user.role) && !gps) {
        throw new Error('Vui long bat vi tri (GPS) de cham cong / 위치 정보를 켜주세요')
      }

      // GPS radius validation: check if within project site (500m default)
      if (gps && currentProject) {
        try {
          const { data: proj } = await supabase
            .from('projects')
            .select('site_lat, site_lng, site_radius')
            .eq('id', currentProject)
            .single()
          if (proj?.site_lat && proj?.site_lng) {
            const radius = proj.site_radius ?? 500
            const dist = haversineDistance(gps.lat, gps.lng, proj.site_lat, proj.site_lng)
            if (dist > radius) {
              throw new Error(
                `Vi tri hien tai cach cong truong ${Math.round(dist)}m (gioi han ${radius}m) / ` +
                `현재 위치가 현장에서 ${Math.round(dist)}m 떨어져 있습니다 (허용 ${radius}m)`
              )
            }
          }
        } catch (e) {
          // If it's our own distance error, re-throw; otherwise ignore (table may not have columns)
          if (e instanceof Error && e.message.includes('cach cong truong')) throw e
        }
      }

      const today = localDate()

      // Duplicate check: block if already checked in without checking out
      const { data: existing } = await supabase
        .from('employee_attendance')
        .select('id, check_out')
        .eq('user_id', user.id)
        .eq('work_date', today)
        .is('check_out', null)
        .limit(1)

      if (existing && existing.length > 0) {
        throw new Error('Dang trong ca lam viec. Hay tan ca truoc / 현재 근무 중입니다. 먼저 퇴근하세요')
      }

      const insertData: Record<string, unknown> = {
        user_id: user.id,
        project_id: currentProject,
        work_date: today,
        check_in: new Date().toISOString(),
        memo: memo || null,
      }

      if (gps) {
        insertData.checkin_lat = gps.lat
        insertData.checkin_lng = gps.lng
      }

      const { error: insErr } = await supabase
        .from('employee_attendance')
        .insert(insertData)

      if (insErr) {
        // Fallback: try without GPS columns
        if (insErr.message?.includes('column') || insErr.message?.includes('does not exist')) {
          const fallback = {
            user_id: user.id,
            project_id: currentProject,
            work_date: today,
            check_in: new Date().toISOString(),
            memo: memo || null,
          }
          const { error: fb } = await supabase
            .from('employee_attendance')
            .insert(fallback)
          if (fb) throw fb
        } else {
          throw insErr
        }
      }

      await loadTodayStatus()
    },
    [user?.id, user?.role, currentProject, loadTodayStatus],
  )

  /* ── Check Out ── */
  const checkOut = useCallback(
    async (attId: string, memo: string, gps: GPSCoords | null) => {
      if (!user?.id) throw new Error('Chua dang nhap / 로그인 필요')

      if (isGPSRequired(user.role) && !gps) {
        throw new Error('Vui long bat vi tri (GPS) de cham cong / 위치 정보를 켜주세요')
      }

      const checkoutTime = new Date().toISOString()

      // Get the check_in time to calculate hours
      const { data: attRec } = await supabase
        .from('employee_attendance')
        .select('check_in, work_date')
        .eq('id', attId)
        .single()

      const updateData: Record<string, unknown> = {
        check_out: checkoutTime,
      }

      if (memo) updateData.checkout_memo = memo
      if (gps) {
        updateData.checkout_lat = gps.lat
        updateData.checkout_lng = gps.lng
      }

      // Auto-calculate work hours and overtime
      if (attRec?.check_in) {
        const diffMs = new Date(checkoutTime).getTime() - new Date(attRec.check_in).getTime()
        const hours = Math.round((diffMs / 3600000) * 10) / 10

        if (hours > 0 && hours <= 48) {
          updateData.work_hours = hours
        }

        updateData.overtime_hours = Math.max(0, Math.round((hours - 8) * 10) / 10)

        const ciHour = new Date(attRec.check_in).getHours()
        updateData.is_night = ciHour >= 22 || ciHour < 6

        if (attRec.work_date) {
          const dow = new Date(attRec.work_date).getDay()
          updateData.is_weekend = dow === 0 || dow === 6
        }
      }

      let { error: updErr } = await supabase
        .from('employee_attendance')
        .update(updateData)
        .eq('id', attId)

      // Fallback: try without optional columns
      if (updErr) {
        const fb1: Record<string, unknown> = { check_out: checkoutTime }
        if (updateData.work_hours) fb1.work_hours = updateData.work_hours
        if (updateData.overtime_hours !== undefined) fb1.overtime_hours = updateData.overtime_hours

        const res = await supabase
          .from('employee_attendance')
          .update(fb1)
          .eq('id', attId)
        updErr = res.error

        if (updErr) {
          // Final fallback: check_out only
          const res2 = await supabase
            .from('employee_attendance')
            .update({ check_out: checkoutTime })
            .eq('id', attId)
          if (res2.error) throw res2.error
        }
      }

      await loadTodayStatus()
    },
    [user?.id, user?.role, loadTodayStatus],
  )

  return {
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
  }
}
