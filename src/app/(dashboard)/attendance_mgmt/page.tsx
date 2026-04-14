'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { ROLE_LABELS } from '@/lib/roles'
import type { Role } from '@/types'

/* -- Types ------------------------------------------------ */

interface AttendanceRow {
  id: string
  user_id: string
  date: string
  check_in: string | null
  check_out: string | null
  status: string
  user_name: string
  user_role: Role
}

interface EditModal {
  row: AttendanceRow
  checkIn: string
  checkOut: string
  reason: string
}

/* -- Helpers ---------------------------------------------- */

const ALLOWED_ROLES: Role[] = ['hr', 'account', 'ceo', 'director_m']

function today() {
  return new Date().toISOString().slice(0, 10)
}

function calcHours(checkIn: string | null, checkOut: string | null): number {
  if (!checkIn || !checkOut) return 0
  const d1 = new Date(`2000-01-01T${checkIn}`)
  const d2 = new Date(`2000-01-01T${checkOut}`)
  const diff = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60)
  return Math.max(0, Math.round(diff * 10) / 10)
}

function calcOvertime(hours: number): number {
  return Math.max(0, Math.round((hours - 8) * 10) / 10)
}

function timeOnly(ts: string | null): string {
  if (!ts) return '-'
  // Handle both full ISO timestamps and time-only strings
  if (ts.includes('T')) return ts.slice(11, 16)
  return ts.slice(0, 5)
}

function statusBadge(status: string) {
  switch (status) {
    case 'present':
      return { bg: 'bg-green-50', text: 'text-green-700', label: 'Binh thuong / 정상' }
    case 'late':
      return { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Muon / 지각' }
    case 'absent':
      return { bg: 'bg-red-50', text: 'text-red-700', label: 'Vang / 결근' }
    case 'half_day':
      return { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Nua ngay / 반차' }
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700', label: status }
  }
}

/* -- Component -------------------------------------------- */

export default function AttendanceMgmtPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const [selectedDate, setSelectedDate] = useState(today())
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [editModal, setEditModal] = useState<EditModal | null>(null)

  const toast = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  /* -- Load data ------------------------------------------ */
  const loadData = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('employee_attendance')
        .select(`
          id,
          user_id,
          date,
          check_in,
          check_out,
          status,
          users!employee_attendance_user_id_fkey ( name, role )
        `)
        .eq('date', selectedDate)
        .eq('project_id', currentProject)
        .order('check_in', { ascending: true })

      if (error) throw error

      const mapped: AttendanceRow[] = (data ?? []).map((r: Record<string, unknown>) => {
        const u = r.users as Record<string, unknown> | null
        return {
          id: r.id as string,
          user_id: r.user_id as string,
          date: r.date as string,
          check_in: r.check_in as string | null,
          check_out: r.check_out as string | null,
          status: r.status as string,
          user_name: (u?.name as string) ?? '(unknown)',
          user_role: (u?.role as Role) ?? 'engineer',
        }
      })

      setRows(mapped)
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [currentProject, selectedDate, toast])

  useEffect(() => {
    if (user && currentProject) loadData()
  }, [user, currentProject, loadData])

  /* -- Edit attendance ------------------------------------- */
  function openEdit(row: AttendanceRow) {
    setEditModal({
      row,
      checkIn: timeOnly(row.check_in),
      checkOut: timeOnly(row.check_out),
      reason: '',
    })
  }

  async function saveEdit() {
    if (!editModal || !user) return
    setSaving(true)
    try {
      // Update attendance record
      const { error: updErr } = await supabase
        .from('employee_attendance')
        .update({
          check_in: editModal.checkIn || null,
          check_out: editModal.checkOut || null,
        })
        .eq('id', editModal.row.id)
      if (updErr) throw updErr

      // Insert exception record if reason given
      if (editModal.reason.trim()) {
        const { error: exErr } = await supabase.from('attendance_exceptions').insert({
          attendance_id: editModal.row.id,
          user_id: editModal.row.user_id,
          date: editModal.row.date,
          reason: editModal.reason.trim(),
          approved_by: user.id,
          project_id: currentProject,
        })
        if (exErr) throw exErr
      }

      setEditModal(null)
      toast('ok', 'Da cap nhat / 수정 완료')
      loadData()
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  /* -- Summary counts ------------------------------------- */
  const checkedIn = rows.filter((r) => r.check_in).length
  const checkedOut = rows.filter((r) => r.check_out).length
  const absent = rows.filter((r) => r.status === 'absent').length
  const late = rows.filter((r) => r.status === 'late').length

  /* -- Access guard ---------------------------------------- */
  if (!user) return null

  if (!ALLOWED_ROLES.includes(user.role)) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
        Khong co quyen truy cap / 접근 권한이 없습니다. (hr, account, ceo, director_m)
      </div>
    )
  }

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Quan ly cham cong / 근태관리
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Quan ly gio lam viec nhan vien / 직원 출퇴근 관리
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-600">Ngay / 날짜:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Da vao / 출근</p>
              <p className="mt-2 text-2xl font-bold text-green-700">{checkedIn}</p>
              <p className="mt-1 text-xs text-gray-400">nguoi / 명</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-green-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Da ra / 퇴근</p>
              <p className="mt-2 text-2xl font-bold text-blue-700">{checkedOut}</p>
              <p className="mt-1 text-xs text-gray-400">nguoi / 명</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Vang mat / 결근</p>
              <p className="mt-2 text-2xl font-bold text-red-700">{absent}</p>
              <p className="mt-1 text-xs text-gray-400">nguoi / 명</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-red-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Tre gio / 지각</p>
              <p className="mt-2 text-2xl font-bold text-amber-700">{late}</p>
              <p className="mt-1 text-xs text-gray-400">nguoi / 명</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0 mt-1" />
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Chi tiet cham cong / 출퇴근 상세 ({selectedDate})
          </h3>
          <span className="text-xs text-gray-500">
            Tong / 총 {rows.length}명
          </span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Dang tai... / 로딩 중...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Chua co du lieu / 데이터 없음
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">Ten / 이름</th>
                  <th className="px-3 py-3">Chuc vu / 직급</th>
                  <th className="px-3 py-3">Vao / 출근</th>
                  <th className="px-3 py-3">Ra / 퇴근</th>
                  <th className="px-3 py-3 text-right">Gio / 시간</th>
                  <th className="px-3 py-3 text-right">Tang ca / 초과</th>
                  <th className="px-3 py-3">Trang thai / 상태</th>
                  <th className="px-3 py-3 text-center">Sua / 수정</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => {
                  const hours = calcHours(row.check_in, row.check_out)
                  const overtime = calcOvertime(hours)
                  const badge = statusBadge(row.status)
                  return (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-xs text-gray-900 font-medium">
                        {row.user_name}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600">
                        {ROLE_LABELS[row.user_role] ?? row.user_role}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-700 font-mono">
                        {timeOnly(row.check_in)}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-700 font-mono">
                        {timeOnly(row.check_out)}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-700 text-right font-mono">
                        {hours > 0 ? `${hours}h` : '-'}
                      </td>
                      <td className="px-3 py-3 text-xs text-right font-mono">
                        {overtime > 0 ? (
                          <span className="text-amber-700 font-semibold">+{overtime}h</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <span className={`inline-block px-2 py-0.5 rounded font-semibold ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => openEdit(row)}
                          className="px-2 py-1 text-[10px] font-medium rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                          Sua / 수정
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-900">
              Sua cham cong / 출퇴근 수정 - {editModal.row.user_name}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Gio vao / 출근시간
                </label>
                <input
                  type="time"
                  value={editModal.checkIn}
                  onChange={(e) => setEditModal({ ...editModal, checkIn: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Gio ra / 퇴근시간
                </label>
                <input
                  type="time"
                  value={editModal.checkOut}
                  onChange={(e) => setEditModal({ ...editModal, checkOut: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Ly do dieu chinh / 수정 사유
              </label>
              <input
                type="text"
                value={editModal.reason}
                onChange={(e) => setEditModal({ ...editModal, reason: e.target.value })}
                placeholder="Nhap ly do / 사유 입력"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditModal(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Huy / 취소
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Dang luu... / 저장 중...' : 'Luu / 저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
