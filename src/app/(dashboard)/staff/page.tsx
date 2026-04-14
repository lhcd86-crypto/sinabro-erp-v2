'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isAdmin, isHR, ROLE_LABELS } from '@/lib/roles'
import { supabase } from '@/lib/supabase'
import type { Role } from '@/types'

/* ── Types ── */

interface StaffMember {
  id: string
  name: string
  email: string
  role: Role
  hire_date: string
  probation_end_date: string | null
  status?: string
}

const ALL_ROLES: { value: Role; label: string }[] = [
  { value: 'ceo', label: 'GD / 대표' },
  { value: 'director_m', label: 'GD QL / 관리임원' },
  { value: 'director_f', label: 'GD CT / 현장임원' },
  { value: 'hr', label: 'HC / 인사총무' },
  { value: 'account', label: 'KT / 회계' },
  { value: 'qs', label: 'QS / 공무' },
  { value: 'engineer', label: 'KS CT / 소장' },
  { value: 'foreman', label: 'Doc cong / 반장' },
  { value: 'driver', label: 'Lai xe / 기사' },
]

/* ── Component ── */

export default function StaffPage() {
  const user = useAuthStore((s) => s.user)

  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [mName, setMName] = useState('')
  const [mEmail, setMEmail] = useState('')
  const [mRole, setMRole] = useState<Role>('engineer')
  const [mHireDate, setMHireDate] = useState('')
  const [saving, setSaving] = useState(false)

  const canManage = user && isAdmin(user.role)

  /* ── Load staff ── */
  const loadStaff = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, hire_date, probation_end_date')
        .order('name')

      if (error) throw error
      setStaff((data ?? []) as StaffMember[])
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Load failed', 'err')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStaff()
  }, [loadStaff])

  /* ── Toast ── */
  const showToast = useCallback((msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  /* ── Open modal for add ── */
  const openAdd = () => {
    setEditingStaff(null)
    setMName('')
    setMEmail('')
    setMRole('engineer')
    setMHireDate(new Date().toISOString().slice(0, 10))
    setShowModal(true)
  }

  /* ── Open modal for edit ── */
  const openEdit = (s: StaffMember) => {
    setEditingStaff(s)
    setMName(s.name)
    setMEmail(s.email)
    setMRole(s.role)
    setMHireDate(s.hire_date ?? '')
    setShowModal(true)
  }

  /* ── Save (add / edit) ── */
  const handleSave = async () => {
    if (!mName.trim() || !mEmail.trim()) {
      showToast('Vui long nhap du thong tin / 필수 정보를 입력하세요', 'err')
      return
    }
    setSaving(true)
    try {
      if (editingStaff) {
        // Update
        const { error } = await supabase
          .from('users')
          .update({
            name: mName.trim(),
            email: mEmail.trim(),
            role: mRole,
            hire_date: mHireDate || null,
          })
          .eq('id', editingStaff.id)

        if (error) throw error
        showToast('Da cap nhat nhan vien / 직원 정보 수정 완료', 'ok')
      } else {
        // Insert
        const { error } = await supabase
          .from('users')
          .insert({
            name: mName.trim(),
            email: mEmail.trim(),
            role: mRole,
            hire_date: mHireDate || null,
          })

        if (error) throw error
        showToast('Da them nhan vien moi / 직원 추가 완료', 'ok')
      }

      setShowModal(false)
      await loadStaff()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Save failed', 'err')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Title + Add button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nhan su / 인력관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            Quan ly nhan su cong ty / 인력 현황 관리
          </p>
        </div>
        {canManage && (
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Them NV / 직원 추가
          </button>
        )}
      </div>

      {/* Staff table */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        {loading && <p className="text-sm text-gray-400 mb-2">Dang tai... / 로딩 중...</p>}

        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="px-5 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Ten / 이름</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Chuc vu / 직급</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Email</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Ngay vao / 입사일</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Trang thai / 상태</th>
                {canManage && (
                  <th className="px-5 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Thao tac / 작업</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staff.length === 0 && !loading && (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="px-5 py-6 text-center text-sm text-gray-400">
                    Khong co du lieu / 데이터 없음
                  </td>
                </tr>
              )}
              {staff.map((s) => {
                const isActive = !s.probation_end_date || new Date(s.probation_end_date) > new Date()
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-5 py-2 text-gray-900 font-medium whitespace-nowrap">{s.name}</td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap text-xs">
                      {ROLE_LABELS[s.role] ?? s.role}
                    </td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap text-xs">{s.email}</td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{s.hire_date ?? '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          isActive
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {isActive ? 'Dang lam / 재직' : 'Nghi viec / 퇴직'}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-5 py-2 whitespace-nowrap">
                        <button
                          onClick={() => openEdit(s)}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors"
                        >
                          Sua / 수정
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Edit/Add Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingStaff ? 'Sua nhan vien / 직원 수정' : 'Them nhan vien / 직원 추가'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ten / 이름 *</label>
                <input
                  type="text"
                  value={mName}
                  onChange={(e) => setMName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                <input
                  type="email"
                  value={mEmail}
                  onChange={(e) => setMEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Chuc vu / 직급</label>
                <select
                  value={mRole}
                  onChange={(e) => setMRole(e.target.value as Role)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ngay vao / 입사일</label>
                <input
                  type="date"
                  value={mHireDate}
                  onChange={(e) => setMHireDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Huy / 취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Dang luu...' : 'Luu / 저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
