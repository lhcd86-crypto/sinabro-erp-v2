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
  id_number: string | null
  address: string | null
  emergency_contact: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
}

interface ProjectWorker {
  id: string
  project_id: string
  worker_id: string
  created_at: string
}

interface Project {
  id: string
  name: string
  code: string
}

const WORKER_TYPES = [
  { value: 'direct', label: 'Truc tiep / 직영' },
  { value: 'indirect', label: 'Gian tiep / 간접' },
  { value: 'vn_tech', label: 'KTV VN / 베트남기술자' },
]

const typeLabel = (v: string) => WORKER_TYPES.find((t) => t.value === v)?.label ?? v

/* ── Component ── */

export default function WorkersMasterPage() {
  const user = useAuthStore((s) => s.user)

  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [filterType, setFilterType] = useState('all')
  const [searchText, setSearchText] = useState('')

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Worker | null>(null)
  const [mName, setMName] = useState('')
  const [mType, setMType] = useState('direct')
  const [mPhone, setMPhone] = useState('')
  const [mTrade, setMTrade] = useState('')
  const [mRate, setMRate] = useState('')
  const [mMemo, setMMemo] = useState('')
  const [mIdNumber, setMIdNumber] = useState('')
  const [mAddress, setMAddress] = useState('')
  const [mEmergency, setMEmergency] = useState('')
  const [mActive, setMActive] = useState(true)
  const [saving, setSaving] = useState(false)

  // Project assignment section
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [projectWorkerIds, setProjectWorkerIds] = useState<Set<string>>(new Set())
  const [assignLoading, setAssignLoading] = useState(false)

  const canManage = user && isAdmin(user.role)

  /* ── Toast ── */
  const showToast = useCallback((msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  /* ── Load workers ── */
  const loadWorkers = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .order('worker_name')
      if (error) throw error
      setWorkers((data ?? []) as Worker[])
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Load failed', 'err')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  /* ── Load projects ── */
  const loadProjects = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('status', 'active')
        .order('name')
      if (error) throw error
      setProjects((data ?? []).map((p: Record<string, unknown>) => ({
        id: p.id as string,
        name: p.name as string,
        code: p.code as string,
      })))
    } catch {
      // ignore
    }
  }, [])

  /* ── Load project assignments ── */
  const loadProjectWorkers = useCallback(async (projectId: string) => {
    if (!projectId) { setProjectWorkerIds(new Set()); return }
    setAssignLoading(true)
    try {
      const { data, error } = await supabase
        .from('project_workers')
        .select('*')
        .eq('project_id', projectId)
      if (error) throw error
      const ids = new Set((data ?? []).map((pw: Record<string, unknown>) => pw.worker_id as string))
      setProjectWorkerIds(ids)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Load assignments failed', 'err')
    } finally {
      setAssignLoading(false)
    }
  }, [showToast])

  useEffect(() => { loadWorkers(); loadProjects() }, [loadWorkers, loadProjects])

  useEffect(() => {
    if (selectedProject) loadProjectWorkers(selectedProject)
  }, [selectedProject, loadProjectWorkers])

  /* ── Modal open ── */
  const openAdd = () => {
    setEditing(null)
    setMName(''); setMType('direct'); setMPhone(''); setMTrade('')
    setMRate(''); setMMemo(''); setMIdNumber(''); setMAddress(''); setMEmergency('')
    setMActive(true)
    setShowModal(true)
  }

  const openEdit = (w: Worker) => {
    setEditing(w)
    setMName(w.worker_name); setMType(w.worker_type); setMPhone(w.phone ?? '')
    setMTrade(w.trade ?? ''); setMRate(w.daily_rate ? String(w.daily_rate) : '')
    setMMemo(w.memo ?? ''); setMIdNumber(w.id_number ?? '')
    setMAddress(w.address ?? ''); setMEmergency(w.emergency_contact ?? '')
    setMActive(w.is_active)
    setShowModal(true)
  }

  /* ── Save ── */
  const handleSave = async () => {
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
        id_number: mIdNumber.trim() || null,
        address: mAddress.trim() || null,
        emergency_contact: mEmergency.trim() || null,
        is_active: mActive,
        created_by: user?.id ?? null,
      }
      if (editing) {
        const { error } = await supabase.from('workers').update(payload).eq('id', editing.id)
        if (error) throw error
        showToast('Da cap nhat / 수정 완료', 'ok')
      } else {
        const { error } = await supabase.from('workers').insert(payload)
        if (error) throw error
        showToast('Da them moi / 등록 완료', 'ok')
      }
      setShowModal(false)
      await loadWorkers()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Save failed', 'err')
    } finally {
      setSaving(false)
    }
  }

  /* ── Toggle active ── */
  const toggleActive = async (w: Worker) => {
    try {
      const { error } = await supabase
        .from('workers')
        .update({ is_active: !w.is_active })
        .eq('id', w.id)
      if (error) throw error
      showToast(w.is_active ? 'Da ngung / 비활성화' : 'Da kich hoat / 활성화', 'ok')
      await loadWorkers()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Toggle failed', 'err')
    }
  }

  /* ── Project assignment toggle ── */
  const toggleAssignment = async (workerId: string) => {
    if (!selectedProject) return
    const isAssigned = projectWorkerIds.has(workerId)
    try {
      if (isAssigned) {
        const { error } = await supabase
          .from('project_workers')
          .delete()
          .eq('project_id', selectedProject)
          .eq('worker_id', workerId)
        if (error) throw error
        showToast('Da huy / 배정 해제', 'ok')
      } else {
        const { error } = await supabase
          .from('project_workers')
          .insert({ project_id: selectedProject, worker_id: workerId })
        if (error) throw error
        showToast('Da them / 배정 완료', 'ok')
      }
      await loadProjectWorkers(selectedProject)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Assignment failed', 'err')
    }
  }

  /* ── Filtered list ── */
  const filtered = workers
    .filter((w) => filterType === 'all' || w.worker_type === filterType)
    .filter((w) => !searchText || w.worker_name.toLowerCase().includes(searchText.toLowerCase()))

  const activeCount = workers.filter((w) => w.is_active).length
  const byCounts = WORKER_TYPES.map((t) => ({
    label: t.label,
    count: workers.filter((w) => w.worker_type === t.value).length,
  }))

  // Workers assigned to selected project
  const assignedWorkers = workers.filter((w) => projectWorkerIds.has(w.id))

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
          <h1 className="text-2xl font-bold text-gray-900">Ho so cong nhan / 인력 마스터</h1>
          <p className="mt-1 text-sm text-gray-500">Quan ly toan bo cong nhan / 전체 작업자 관리</p>
        </div>
        {canManage && (
          <button onClick={openAdd} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            + Them / 추가
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500">Tong / 전체</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{workers.length}</p>
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

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Tim kiem ten / 이름 검색..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-64"
        />
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterType('all')} className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${filterType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Tat ca / 전체
          </button>
          {WORKER_TYPES.map((t) => (
            <button key={t.value} onClick={() => setFilterType(t.value)} className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${filterType === t.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {t.label}
            </button>
          ))}
        </div>
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
                      <button onClick={() => toggleActive(w)} className={`px-2 py-1 text-xs rounded transition-colors ${w.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                        {w.is_active ? 'Ngung / 비활성' : 'Kich hoat / 활성'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Project Assignment Section ── */}
      {canManage && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Du an phan cong / 프로젝트 배정</h2>

          {/* Project selector */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Chon cong trinh / 프로젝트 선택</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Chon / 선택 --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>
              ))}
            </select>
          </div>

          {selectedProject && (
            <>
              {/* Currently assigned */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Da phan cong / 배정된 인력 ({assignedWorkers.length})
                </h3>
                {assignLoading && <p className="text-sm text-gray-400">Dang tai... / 로딩 중...</p>}
                {!assignLoading && assignedWorkers.length === 0 && (
                  <p className="text-sm text-gray-400">Chua co / 배정 인력 없음</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {assignedWorkers.map((w) => (
                    <div key={w.id} className="flex items-center gap-2 bg-blue-50 text-blue-800 px-3 py-1.5 rounded-lg text-sm">
                      <span className="font-medium">{w.worker_name}</span>
                      <span className="text-xs text-blue-500">{typeLabel(w.worker_type)}</span>
                      <button
                        onClick={() => toggleAssignment(w.id)}
                        className="ml-1 text-red-500 hover:text-red-700 text-xs font-bold"
                        title="Xoa / 해제"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* All workers checklist */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Chon cong nhan / 작업자 선택</h3>
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {workers.filter((w) => w.is_active).map((w) => (
                    <label key={w.id} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={projectWorkerIds.has(w.id)}
                        onChange={() => toggleAssignment(w.id)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-900 font-medium">{w.worker_name}</span>
                      <span className="text-xs text-gray-500">{typeLabel(w.worker_type)}</span>
                      {w.trade && <span className="text-xs text-gray-400">({w.trade})</span>}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Worker Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editing ? 'Sua cong nhan / 작업자 수정' : 'Them cong nhan / 작업자 추가'}
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
                <label className="block text-xs font-medium text-gray-600 mb-1">So CMND / 신분증번호</label>
                <input type="text" value={mIdNumber} onChange={(e) => setMIdNumber(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Dia chi / 주소</label>
                <input type="text" value={mAddress} onChange={(e) => setMAddress(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Lien he khan cap / 비상연락처</label>
                <input type="text" value={mEmergency} onChange={(e) => setMEmergency(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">Huy / 취소</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? 'Dang luu...' : 'Luu / 저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
