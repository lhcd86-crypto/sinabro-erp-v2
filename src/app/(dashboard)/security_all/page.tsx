'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isAdmin } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

/* -- Types ------------------------------------------------- */

type TabKey = 'gps' | 'photos' | 'audit' | 'devices'

interface AttendanceGPS {
  id: string
  user_id: string
  check_in: string
  latitude: number | null
  longitude: number | null
  user_name?: string
}

interface LoginPhoto {
  id: string
  user_id: string
  photo_url: string
  created_at: string
  user_name?: string
}

interface AuditLog {
  id: string
  user_id: string
  action: string
  details: string | null
  created_at: string
  user_name?: string
}

interface DeviceRecord {
  id: string
  user_id: string
  device_info: Record<string, string>
  approved_at: string
  status: 'approved' | 'blocked'
  user_name?: string
}

/* -- Component --------------------------------------------- */

export default function SecurityAllPage() {
  const user = useAuthStore((s) => s.user)

  const [tab, setTab] = useState<TabKey>('gps')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  /* -- Data states -- */
  const [gpsRecords, setGpsRecords] = useState<AttendanceGPS[]>([])
  const [loginPhotos, setLoginPhotos] = useState<LoginPhoto[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [devices, setDevices] = useState<DeviceRecord[]>([])

  /* -- Filters -- */
  const [auditDateFrom, setAuditDateFrom] = useState('')
  const [auditDateTo, setAuditDateTo] = useState('')
  const [auditUserFilter, setAuditUserFilter] = useState('')

  const toast = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  const isCeo = user?.role === 'ceo'

  /* -- Load GPS -- */
  const loadGPS = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('employee_attendance')
        .select('id, user_id, check_in, latitude, longitude, users:user_id(name)')
        .not('latitude', 'is', null)
        .order('check_in', { ascending: false })
        .limit(50)

      const mapped: AttendanceGPS[] = (data ?? []).map((r: Record<string, unknown>) => {
        const u = r.users as { name?: string } | null
        return {
          id: r.id as string,
          user_id: r.user_id as string,
          check_in: r.check_in as string,
          latitude: r.latitude as number | null,
          longitude: r.longitude as number | null,
          user_name: u?.name ?? '-',
        }
      })
      setGpsRecords(mapped)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  /* -- Load Login Photos -- */
  const loadPhotos = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('login_photos')
        .select('id, user_id, photo_url, created_at, users:user_id(name)')
        .order('created_at', { ascending: false })
        .limit(50)

      const mapped: LoginPhoto[] = (data ?? []).map((r: Record<string, unknown>) => {
        const u = r.users as { name?: string } | null
        return {
          id: r.id as string,
          user_id: r.user_id as string,
          photo_url: r.photo_url as string,
          created_at: r.created_at as string,
          user_name: u?.name ?? '-',
        }
      })
      setLoginPhotos(mapped)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  /* -- Load Audit Logs -- */
  const loadAudit = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('audit_logs')
        .select('id, user_id, action, details, created_at, users:user_id(name)')
        .order('created_at', { ascending: false })
        .limit(100)

      if (auditDateFrom) query = query.gte('created_at', auditDateFrom + 'T00:00:00')
      if (auditDateTo) query = query.lte('created_at', auditDateTo + 'T23:59:59')

      const { data } = await query

      let mapped: AuditLog[] = (data ?? []).map((r: Record<string, unknown>) => {
        const u = r.users as { name?: string } | null
        return {
          id: r.id as string,
          user_id: r.user_id as string,
          action: r.action as string,
          details: r.details as string | null,
          created_at: r.created_at as string,
          user_name: u?.name ?? '-',
        }
      })

      if (auditUserFilter.trim()) {
        const kw = auditUserFilter.trim().toLowerCase()
        mapped = mapped.filter((l) => l.user_name?.toLowerCase().includes(kw))
      }
      setAuditLogs(mapped)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [auditDateFrom, auditDateTo, auditUserFilter])

  /* -- Load Devices -- */
  const loadDevices = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('approved_devices')
        .select('*, users:user_id(name)')
        .order('approved_at', { ascending: false })

      const mapped: DeviceRecord[] = (data ?? []).map((d: Record<string, unknown>) => {
        const u = d.users as { name?: string } | null
        return {
          id: d.id as string,
          user_id: d.user_id as string,
          device_info: (d.device_info ?? {}) as Record<string, string>,
          approved_at: d.approved_at as string,
          status: (d.status ?? 'approved') as 'approved' | 'blocked',
          user_name: u?.name ?? '-',
        }
      })
      setDevices(mapped)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  /* -- Tab change triggers load -- */
  useEffect(() => {
    if (!isCeo) return
    if (tab === 'gps') loadGPS()
    else if (tab === 'photos') loadPhotos()
    else if (tab === 'audit') loadAudit()
    else if (tab === 'devices') loadDevices()
  }, [tab, isCeo, loadGPS, loadPhotos, loadAudit, loadDevices])

  /* -- Toggle device status -- */
  async function toggleDevice(dev: DeviceRecord) {
    const newStatus = dev.status === 'approved' ? 'blocked' : 'approved'
    try {
      const { error } = await supabase
        .from('approved_devices')
        .update({ status: newStatus })
        .eq('id', dev.id)
      if (error) throw error
      toast('ok', newStatus === 'approved' ? 'Da duyet / 승인 완료' : 'Da chan / 차단 완료')
      loadDevices()
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Update failed')
    }
  }

  /* -- Access guard -- */
  if (!user) return null
  if (!isCeo) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
        Chi danh cho CEO / CEO 전용 페이지입니다.
      </div>
    )
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'gps', label: 'GPS Verify / GPS 확인' },
    { key: 'photos', label: 'Login Photos / 로그인 사진' },
    { key: 'audit', label: 'Audit Logs / 감사 로그' },
    { key: 'devices', label: 'Devices / 기기관리' },
  ]

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
          Quan ly bao mat / 보안관리
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Giam sat bao mat toan he thong / 시스템 보안 모니터링 (CEO 전용)
        </p>
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === t.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* GPS Tab */}
      {tab === 'gps' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              GPS cham cong gan day / 최근 GPS 출근 기록
            </h3>
            <span className="text-xs text-gray-500">{gpsRecords.length}건</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Dang tai... / 로딩 중...</div>
          ) : gpsRecords.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">Chua co du lieu / 데이터 없음</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-3 py-3">Nguoi / 이름</th>
                    <th className="px-3 py-3">Thoi gian / 시간</th>
                    <th className="px-3 py-3">Lat</th>
                    <th className="px-3 py-3">Lng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {gpsRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-xs text-gray-700 font-medium">{r.user_name}</td>
                      <td className="px-3 py-3 text-xs text-gray-600 font-mono whitespace-nowrap">
                        {new Date(r.check_in).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500 font-mono">{r.latitude?.toFixed(6) ?? '-'}</td>
                      <td className="px-3 py-3 text-xs text-gray-500 font-mono">{r.longitude?.toFixed(6) ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Login Photos Tab */}
      {tab === 'photos' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Anh dang nhap / 로그인 사진
            </h3>
            <span className="text-xs text-gray-500">{loginPhotos.length}건</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Dang tai... / 로딩 중...</div>
          ) : loginPhotos.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">Chua co du lieu / 데이터 없음</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
              {loginPhotos.map((p) => (
                <div key={p.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-gray-100 relative">
                    <img
                      src={p.photo_url}
                      alt="login"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).src = ''
                        ;(e.target as HTMLImageElement).alt = 'No image'
                      }}
                    />
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium text-gray-700">{p.user_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(p.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Audit Logs Tab */}
      {tab === 'audit' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tu ngay / 시작일</label>
                <input
                  type="date"
                  value={auditDateFrom}
                  onChange={(e) => setAuditDateFrom(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Den ngay / 종료일</label>
                <input
                  type="date"
                  value={auditDateTo}
                  onChange={(e) => setAuditDateTo(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nguoi dung / 사용자</label>
                <input
                  type="text"
                  value={auditUserFilter}
                  onChange={(e) => setAuditUserFilter(e.target.value)}
                  placeholder="Tim theo ten / 이름 검색"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end mt-3">
              <button
                onClick={loadAudit}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Tim kiem / 검색
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Nhat ky he thong / 감사 로그
              </h3>
              <span className="text-xs text-gray-500">{auditLogs.length}건</span>
            </div>
            {loading ? (
              <div className="p-8 text-center text-sm text-gray-400">Dang tai... / 로딩 중...</div>
            ) : auditLogs.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">Chua co du lieu / 데이터 없음</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="px-3 py-3">Thoi gian / 시간</th>
                      <th className="px-3 py-3">Nguoi / 사용자</th>
                      <th className="px-3 py-3">Hanh dong / 행동</th>
                      <th className="px-3 py-3">Chi tiet / 상세</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 text-xs text-gray-600 font-mono whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-700 font-medium">{log.user_name}</td>
                        <td className="px-3 py-3 text-xs">
                          <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500 max-w-[300px] truncate">
                          {log.details ?? '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Devices Tab */}
      {tab === 'devices' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Thiet bi da dang ky / 등록된 기기
            </h3>
            <span className="text-xs text-gray-500">{devices.length}건</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Dang tai... / 로딩 중...</div>
          ) : devices.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">Chua co du lieu / 데이터 없음</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-3 py-3">Nguoi dung / 사용자</th>
                    <th className="px-3 py-3">Thiet bi / 기기</th>
                    <th className="px-3 py-3">Ngay duyet / 승인일</th>
                    <th className="px-3 py-3">Trang thai / 상태</th>
                    <th className="px-3 py-3 text-right">Thao tac / 관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {devices.map((dev) => (
                    <tr key={dev.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-xs text-gray-700 font-medium">{dev.user_name}</td>
                      <td className="px-3 py-3 text-xs text-gray-600">
                        {dev.device_info.device_name ?? dev.device_info.browser ?? '-'}
                        {dev.device_info.os ? ` (${dev.device_info.os})` : ''}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 font-mono whitespace-nowrap">
                        {dev.approved_at ? new Date(dev.approved_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-semibold ${
                            dev.status === 'approved'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {dev.status === 'approved' ? 'Da duyet / 승인' : 'Bi chan / 차단'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-right">
                        <button
                          onClick={() => toggleDevice(dev)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                            dev.status === 'approved'
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          {dev.status === 'approved' ? 'Chan / 차단' : 'Duyet / 승인'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
