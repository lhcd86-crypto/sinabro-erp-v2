'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isAdmin } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

/* -- Types ------------------------------------------------- */

interface ApprovedDevice {
  id: string
  user_id: string
  device_info: {
    browser?: string
    os?: string
    device_name?: string
    ip?: string
  }
  approved_at: string
  status: 'approved' | 'blocked'
  user_name?: string
  user_email?: string
}

/* -- Component --------------------------------------------- */

export default function DeviceMgmtPage() {
  const user = useAuthStore((s) => s.user)

  const [loading, setLoading] = useState(false)
  const [devices, setDevices] = useState<ApprovedDevice[]>([])
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const toast = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  const canAccess = user && isAdmin(user.role)

  /* -- Load data -- */
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('approved_devices')
        .select('*')
        .order('approved_at', { ascending: false })

      const mapped: ApprovedDevice[] = (data ?? []).map((d: Record<string, unknown>) => {
        const u = d.users as { name?: string; email?: string } | null
        return {
          id: d.id as string,
          user_id: d.user_id as string,
          device_info: (d.device_info ?? {}) as ApprovedDevice['device_info'],
          approved_at: d.approved_at as string,
          status: (d.status ?? 'approved') as 'approved' | 'blocked',
          user_name: u?.name ?? '-',
          user_email: u?.email ?? '-',
        }
      })
      setDevices(mapped)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (canAccess) loadData()
  }, [canAccess, loadData])

  /* -- Toggle status -- */
  async function toggleStatus(device: ApprovedDevice) {
    const newStatus = device.status === 'approved' ? 'blocked' : 'approved'
    try {
      const { error } = await supabase
        .from('approved_devices')
        .update({ status: newStatus })
        .eq('id', device.id)
      if (error) throw error
      toast('ok', newStatus === 'approved' ? 'Da duyet / 승인 완료' : 'Da chan / 차단 완료')
      loadData()
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Update failed')
    }
  }

  /* -- Delete device -- */
  async function deleteDevice(id: string) {
    if (!confirm('Xoa thiet bi nay? / 이 기기를 삭제하시겠습니까?')) return
    try {
      const { error } = await supabase
        .from('approved_devices')
        .delete()
        .eq('id', id)
      if (error) throw error
      toast('ok', 'Da xoa / 삭제 완료')
      loadData()
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Delete failed')
    }
  }

  /* -- Access guard -- */
  if (!user) return null
  if (!canAccess) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
        Khong co quyen truy cap / 접근 권한이 없습니다. (Admin / HR / CEO)
      </div>
    )
  }

  const approvedCount = devices.filter((d) => d.status === 'approved').length
  const blockedCount = devices.filter((d) => d.status === 'blocked').length

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
          Quan ly thiet bi / 기기관리
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Duyet va quan ly thiet bi dang nhap / 로그인 기기 승인 및 관리
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Tong thiet bi / 총 기기</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{devices.length}</p>
              <p className="mt-1 text-xs text-gray-400">thiet bi / 대</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Da duyet / 승인</p>
              <p className="mt-2 text-2xl font-bold text-green-700">{approvedCount}</p>
              <p className="mt-1 text-xs text-gray-400">thiet bi / 대</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-green-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Bi chan / 차단</p>
              <p className="mt-2 text-2xl font-bold text-red-700">{blockedCount}</p>
              <p className="mt-1 text-xs text-gray-400">thiet bi / 대</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-red-500 shrink-0 mt-1" />
          </div>
        </div>
      </div>

      {/* Device Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Danh sach thiet bi / 기기 목록
          </h3>
          <button
            onClick={loadData}
            disabled={loading}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Lam moi / 새로고침
          </button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Dang tai... / 로딩 중...
          </div>
        ) : devices.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Chua co du lieu / 데이터 없음
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">Nguoi dung / 사용자</th>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3">Thiet bi / 기기정보</th>
                  <th className="px-3 py-3">Ngay duyet / 승인일</th>
                  <th className="px-3 py-3">Trang thai / 상태</th>
                  <th className="px-3 py-3 text-right">Thao tac / 관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {devices.map((dev) => (
                  <tr key={dev.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-xs text-gray-700 font-medium">
                      {dev.user_name}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500">{dev.user_email}</td>
                    <td className="px-3 py-3 text-xs text-gray-600">
                      <div>{dev.device_info.device_name ?? dev.device_info.browser ?? '-'}</div>
                      <div className="text-gray-400">{dev.device_info.os ?? ''}</div>
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
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => toggleStatus(dev)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                            dev.status === 'approved'
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          {dev.status === 'approved' ? 'Chan / 차단' : 'Duyet / 승인'}
                        </button>
                        <button
                          onClick={() => deleteDevice(dev.id)}
                          className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                          Xoa / 삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
