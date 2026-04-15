'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

/* -- Types ------------------------------------------------- */

interface AttendanceGPS {
  id: string
  user_id: string | null
  work_date: string | null
  check_in: string | null
  check_out: string | null
  checkin_lat: number | null
  checkin_lng: number | null
  checkout_lat: number | null
  checkout_lng: number | null
}

interface ProjectSite {
  site_lat: number | null
  site_lng: number | null
}

/* -- Helpers ----------------------------------------------- */

const ALLOWED_ROLES = ['hr', 'ceo', 'director_m', 'director_f']

function today() {
  return new Date().toISOString().slice(0, 10)
}

/** Haversine distance in meters */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function distanceColor(meters: number): string {
  if (meters <= 500) return 'bg-green-50 text-green-700'
  if (meters <= 1000) return 'bg-yellow-50 text-yellow-700'
  return 'bg-red-50 text-red-700'
}

function distanceLabel(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(1)}km`
}

function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`
}

/* -- Component --------------------------------------------- */

export default function GpsVerifyPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(today())
  const [records, setRecords] = useState<AttendanceGPS[]>([])
  const [siteLat, setSiteLat] = useState<number | null>(null)
  const [siteLng, setSiteLng] = useState<number | null>(null)

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
      const [{ data: attData }, { data: projData }] = await Promise.all([
        supabase
          .from('employee_attendance')
          .select('id, user_id, work_date, check_in, check_out, checkin_lat, checkin_lng, checkout_lat, checkout_lng')
          .eq('project_id', currentProject)
          .eq('work_date', selectedDate)
          .order('check_in', { ascending: true }),
        supabase
          .from('projects')
          .select('site_lat, site_lng')
          .eq('id', currentProject)
          .single(),
      ])

      setRecords((attData as unknown as AttendanceGPS[]) ?? [])

      const proj = projData as ProjectSite | null
      setSiteLat(proj?.site_lat ?? null)
      setSiteLng(proj?.site_lng ?? null)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [currentProject, selectedDate])

  useEffect(() => {
    if (user && currentProject) loadData()
  }, [user, currentProject, loadData])

  /* -- Filter records with GPS ------------------------------ */
  const gpsRecords = records.filter(
    (r) => r.checkin_lat != null && r.checkin_lng != null
  )

  const hasSite = siteLat != null && siteLng != null

  /* -- Stats ------------------------------------------------ */
  const withinRange = gpsRecords.filter((r) => {
    if (!hasSite || r.checkin_lat == null || r.checkin_lng == null) return false
    return haversine(r.checkin_lat, r.checkin_lng, siteLat!, siteLng!) <= 500
  }).length

  const outOfRange = gpsRecords.length - withinRange

  if (!currentProject) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        Vui long chon cong trinh / 현장을 선택해주세요.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Xac minh GPS / GPS 검증
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Kiem tra vi tri cham cong / 출퇴근 GPS 위치 검증
        </p>
      </div>

      {/* Date picker + site info */}
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
          <button
            onClick={() => setSelectedDate(today())}
            className="mt-5 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Hom nay / 오늘
          </button>
          {hasSite && (
            <div className="mt-5 text-xs text-gray-500">
              Toa do cong trinh / 현장 좌표: {siteLat!.toFixed(5)}, {siteLng!.toFixed(5)}
            </div>
          )}
          {!hasSite && (
            <div className="mt-5 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
              Chua co toa do cong trinh / 현장 좌표 미설정
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Co GPS / GPS 기록</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{gpsRecords.length}</p>
              <p className="mt-1 text-xs text-gray-400">ban ghi / 건</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Trong pham vi / 정상 (500m)</p>
              <p className="mt-2 text-2xl font-bold text-green-600">{withinRange}</p>
              <p className="mt-1 text-xs text-gray-400">nguoi / 명</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-green-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Ngoai pham vi / 범위 밖</p>
              <p className="mt-2 text-2xl font-bold text-red-600">{outOfRange}</p>
              <p className="mt-1 text-xs text-gray-400">nguoi / 명</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-red-500 shrink-0 mt-1" />
          </div>
        </div>
      </div>

      {/* GPS Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Chi tiet GPS / GPS 상세 기록
          </h3>
          <span className="text-xs text-gray-500">
            Tong / 총 {gpsRecords.length}건
          </span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Dang tai... / 로딩 중...
          </div>
        ) : gpsRecords.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Khong co du lieu GPS / GPS 데이터 없음
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">Ten / 이름</th>
                  <th className="px-3 py-3">Vao / 출근</th>
                  <th className="px-3 py-3">GPS vao / 출근 GPS</th>
                  <th className="px-3 py-3">GPS ra / 퇴근 GPS</th>
                  <th className="px-3 py-3">KC / 거리</th>
                  <th className="px-3 py-3">Ban do / 지도</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {gpsRecords.map((r) => {
                  const dist =
                    hasSite && r.checkin_lat != null && r.checkin_lng != null
                      ? haversine(r.checkin_lat, r.checkin_lng, siteLat!, siteLng!)
                      : null

                  const userName = r.user_id ?? '-'

                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-xs text-gray-700 font-medium">
                        {userName}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 font-mono whitespace-nowrap">
                        {r.check_in ? r.check_in.slice(0, 5) : '-'}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 font-mono">
                        {r.checkin_lat != null
                          ? `${r.checkin_lat.toFixed(5)}, ${r.checkin_lng!.toFixed(5)}`
                          : '-'}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 font-mono">
                        {r.checkout_lat != null
                          ? `${r.checkout_lat.toFixed(5)}, ${r.checkout_lng!.toFixed(5)}`
                          : '-'}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {dist != null ? (
                          <span className={`inline-block px-2 py-0.5 rounded font-semibold ${distanceColor(dist)}`}>
                            {distanceLabel(dist)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {r.checkin_lat != null ? (
                          <a
                            href={googleMapsUrl(r.checkin_lat, r.checkin_lng!)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline font-medium"
                          >
                            Xem / 보기
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h4 className="text-xs font-semibold text-gray-600 mb-2">
          Chu thich / 범례
        </h4>
        <div className="flex gap-4 flex-wrap text-xs">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-green-500" />
            0 - 500m (Binh thuong / 정상)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-yellow-500" />
            500m - 1km (Canh bao / 주의)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-red-500" />
            &gt; 1km (Ngoai pham vi / 범위 초과)
          </span>
        </div>
      </div>
    </div>
  )
}
