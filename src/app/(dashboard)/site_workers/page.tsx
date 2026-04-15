'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isAdmin } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

/* ── Types ── */

interface Worker {
  id: string
  worker_name: string
  worker_type: string
  phone: string | null
  trade: string | null
  daily_rate: number | null
  memo: string | null
  is_active: boolean
}

interface ProjectWorker {
  id: string
  project_id: string
  worker_id: string
  created_at: string
}

const WORKER_TYPES = [
  { value: 'direct', label: 'Truc tiep / 직영' },
  { value: 'indirect', label: 'Gian tiep / 간접' },
  { value: 'vn_tech', label: 'KTV VN / 베트남기술자' },
]

const typeLabel = (v: string) => WORKER_TYPES.find((t) => t.value === v)?.label ?? v

/* ── Component ── */

export default function SiteWorkersPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [allWorkers, setAllWorkers] = useState<Worker[]>([])
  const [projectWorkerLinks, setProjectWorkerLinks] = useState<ProjectWorker[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [filterType, setFilterType] = useState('all')

  // Assign modal
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignSearch, setAssignSearch] = useState('')

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editing, setEditing] = useState<Worker | null>(null)
  const [mName, setMName] = useState('')
  const [mType, setMType] = useState('direct')
  const [mPhone, setMPhone] = useState('')
  const [mTrade, setMTrade] = useState('')
  const [mRate, setMRate] = useState('')
  const [mMemo, setMMemo] = useState('')
  const [mActive, setMActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const canManage = user && isAdmin(user.role)

  /* ── Toast ── */
  const showToast = useCallback((msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  /* ── Load project workers (links) ── */
  const loadProjectWorkers = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('project_workers')
        .select('*')
        .eq('project_id', currentProject)
      if (error) throw error
      setProjectWorkerLinks((data ?? []) as ProjectWorker[])
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Load failed', 'err')
    } finally {
      setLoading(false)
    }
  }, [currentProject, showToast])

  /* ── Load all master workers ── */
  const loadAllWorkers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .order('worker_name')
      if (error) throw error
      setAllWorkers((data ?? []) as Worker[])
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Load workers failed', 'err')
    }
  }, [showToast])

  useEffect(() => {
    loadProjectWorkers()
    loadAllWorkers()
  }, [loadProjectWorkers, loadAllWorkers])

  /* ── Derived: project workers with details ── */
  const assignedWorkerIds = new Set(projectWorkerLinks.map((pw) => pw.worker_id))
  const projectWorkers = allWorkers.filter((w) => assignedWorkerIds.has(w.id))

  /* ── Assign/Remove worker ── */
  const toggleAssignment = async (workerId: string) => {
    if (!currentProject) return
    const isAssigned = assignedWorkerIds.has(workerId)
    try {
      if (isAssigned) {
        const { error } = await supabase
          .from('project_workers')
          .delete()
          .eq('project_id', currentProject)
          .eq('worker_id', workerId)
        if (error) throw error
        showToast('Da huy / 배정 해제', 'ok')
      } else {
        const { error } = await supabase
          .from('project_workers')
          .insert({ project_id: currentProject, worker_id: workerId })
        if (error) throw error
        showToast('Da them / 배정 완료', 'ok')
      }
      await loadProjectWorkers()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Assignment failed', 'err')
    }
  }

  /* ── Edit worker ── */
  const openEdit = (w: Worker) => {
    setEditing(w)
    setMName(w.worker_name); setMType(w.worker_type); setMPhone(w.phone ?? '')
    setMTrade(w.trade ?? ''); setMRate(w.daily_rate ? String(w.daily_rate) : '')
    setMMemo(w.memo ?? ''); setMActive(w.is_active)
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editing) return
    if (!mName.trim()) { showToast('Nhap ten / 이름을 입력하세요', 'err'); return }
    setSaving(true)
    try {
      const payload = {
        worker_name: mName.trim(),
        worker_type: mType,
        phone: mPhone.trim() || null,
        trade: mTrade.trim() || null,
        daily_rate: parseFloat(mRate) || null,
        memo: mMemo.trim() || null,
        is_active: mActive,
      }
      const { error } = await supabase.from('workers').update(payload).eq('id', editing.id)
      if (error) throw error
      showToast('Da cap nhat / 수정 완료', 'ok')
      setShowEditModal(false)
      await loadAllWorkers()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Save failed', 'err')
    } finally {
      setSaving(false)
    }
  }

  /* ── Filtered list ── */
  const filtered = filterType === 'all' ? projectWorkers : projectWorkers.filter((w) => w.worker_type === filterType)
  const activeCount = projectWorkers.filter((w) => w.is_active).length
  const byCounts = WORKER_TYPES.map((t) => ({
    label: t.label,
    count: projectWorkers.filter((w) => w.worker_type === t.value).length,
  }))

  // For assign modal: filter unassigned active workers
  const unassignedForModal = allWorkers
    .filter((w) => w.is_active)
    .filter((w) => !assignSearch || w.worker_name.toLowerCase().includes(assignSearch.toLowerCase()))

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
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dang ky cong nhan / 작업자 등록</h1>
          <p className="mt-1 text-sm text-gray-500">Quan ly danh sach cong nhan / 작업자 현황 관리</p>
        </div>
        {canManage && (
          <button onClick={() => { setAssignSearch(''); setShowAssignModal(true) }} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            + Them / 추가
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500">Tong / 전체</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{projectWorkers.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500">Dang lam / 활동중</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        {byCounts.map((b) => (
          <div key={b.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500">{b.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{b.count}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <button onClick={() => setFilterType('all')} className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${filterType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Tat ca / 전체
        </button>
        {WORKER_TYPES.map((t) => (
          <button key={t.value} onClick={() => setFilterType(t.value)} className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${filterType === t.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        {loading && <p className="text-sm text-gray-400 mb-2">Dang tai... / 로딩 중...</p>}
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="px-5 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Ten / 이름</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Loai / 유형</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">SDT / 전화</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Nghe / 직종</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Luong ngay / 일당</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Trang thai / 상태</th>
                {canManage && <th className="px-5 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Thao tac / 작업</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && !loading && (
                <tr><td colSpan={canManage ? 7 : 6} className="px-5 py-6 text-center text-sm text-gray-400">Khong co du lieu / 데이터 없음</td></tr>
              )}
              {filtered.map((w) => (
                <tr key={w.id} className="hover:bg-gray-50">
                  <td className="px-5 py-2 text-gray-900 font-medium whitespace-nowrap">{w.worker_name}</td>
                  <td className="px-3 py-2 text-gray-700 text-xs whitespace-nowrap">{typeLabel(w.worker_type)}</td>
                  <td className="px-3 py-2 text-gray-600 text-xs whitespace-nowrap">{w.phone ?? '-'}</td>
                  <td className="px-3 py-2 text-gray-600 text-xs whitespace-nowrap">{w.trade ?? '-'}</td>
                  <td className="px-3 py-2 text-gray-700 whitespace-nowrap font-mono">{w.daily_rate ? w.daily_rate.toLocaleString('vi-VN') : '-'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${w.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {w.is_active ? 'Hoat dong / 활동' : 'Ngung / 비활동'}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-5 py-2 whitespace-nowrap flex gap-1">
                      <button onClick={() => openEdit(w)} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors">Sua / 수정</button>
                      <button onClick={() => toggleAssignment(w.id)} className="px-2 py-1 bg-red-50 text-red-600 text-xs rounded hover:bg-red-100 transition-colors">
                        Xoa / 제거
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Assign Modal: pick workers from master list ── */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[80vh] flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Chon cong nhan / 작업자 배정
            </h3>
            <input
              type="text"
              placeholder="Tim kiem ten / 이름 검색..."
              value={assignSearch}
              onChange={(e) => setAssignSearch(e.target.value)}
              className="w-full px-3 py-2 mb-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
              {unassignedForModal.length === 0 && (
                <p className="px-4 py-3 text-sm text-gray-400 text-center">Khong co / 없음</p>
              )}
              {unassignedForModal.map((w) => (
                <label key={w.id} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assignedWorkerIds.has(w.id)}
                    onChange={() => toggleAssignment(w.id)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-900 font-medium">{w.worker_name}</span>
                  <span className="text-xs text-gray-500">{typeLabel(w.worker_type)}</span>
                  {w.trade && <span className="text-xs text-gray-400">({w.trade})</span>}
                  {assignedWorkerIds.has(w.id) && (
                    <span className="ml-auto text-xs text-blue-600 font-medium">Da chon / 선택됨</span>
                  )}
                </label>
              ))}
            </div>
            <div className="mt-4">
              <button onClick={() => setShowAssignModal(false)} className="w-full px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                Dong / 닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Worker Modal ── */}
      {showEditModal && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Sua cong nhan / 작업자 수정
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ten / 이름 *</label>
                <input type="text" value={mName} onChange={(e) => setMName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Loai / 유형</label>
                  <select value={mType} onChange={(e) => setMType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {WORKER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">SDT / 전화</label>
                  <input type="tel" value={mPhone} onChange={(e) => setMPhone(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nghe / 직종</label>
                  <input type="text" value={mTrade} onChange={(e) => setMTrade(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Luong ngay / 일당 (VND)</label>
                  <input type="text" inputMode="numeric" value={mRate} onChange={(e) => setMRate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chu / 메모</label>
                <textarea value={mMemo} onChange={(e) => setMMemo(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={mActive} onChange={(e) => setMActive(e.target.checked)} className="rounded border-gray-300" />
                  Hoat dong / 활동중
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">Huy / 취소</button>
              <button onClick={handleSaveEdit} disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? 'Dang luu...' : 'Luu / 저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
