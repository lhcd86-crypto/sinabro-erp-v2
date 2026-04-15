'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isAdmin } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

/* ── Types ── */

interface LaborContract {
  id: string
  project_id: string | null
  worker_name: string
  position: string | null
  start_date: string | null
  end_date: string | null
  daily_rate: number | null
  created_by: string | null
  created_by_name: string | null
  created_at: string | null
  signature_url: string | null
}

interface WorkerOption {
  id: string
  name: string
}

const CONTRACT_TYPES = [
  { value: 'probation', label: 'Thu viec / 수습' },
  { value: 'regular', label: 'Chinh thuc / 정규직' },
  { value: 'temporary', label: 'Tam thoi / 임시직' },
]

const typeLabel = (v: string) => CONTRACT_TYPES.find((t) => t.value === v)?.label ?? v

function today() {
  return new Date().toISOString().slice(0, 10)
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - new Date().getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function contractStatus(c: LaborContract): { label: string; style: string } {
  if (!c.end_date) return { label: 'Hoat dong / 유효', style: 'bg-green-50 text-green-700' }
  const days = daysUntil(c.end_date)!
  if (days < 0) return { label: 'Het han / 만료', style: 'bg-gray-100 text-gray-500' }
  if (days <= 30) return { label: 'Sap het / 곧만료', style: 'bg-yellow-50 text-yellow-700' }
  return { label: 'Hoat dong / 유효', style: 'bg-green-50 text-green-700' }
}

function fmtVND(n: number) {
  return n.toLocaleString('vi-VN')
}

/* ── Component ── */

export default function ContractsPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [contracts, setContracts] = useState<LaborContract[]>([])
  const [workerOpts, setWorkerOpts] = useState<WorkerOption[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<LaborContract | null>(null)
  const [mWorkerId, setMWorkerId] = useState('')
  const [mWorkerName, setMWorkerName] = useState('')
  const [mType, setMType] = useState('regular')
  const [mStart, setMStart] = useState(today())
  const [mEnd, setMEnd] = useState('')
  const [mSalary, setMSalary] = useState('')
  const [mPosition, setMPosition] = useState('')
  const [mNotes, setMNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const canManage = user && isAdmin(user.role)

  const showToast = useCallback((msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  /* ── Load ── */
  const loadData = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const [cRes, wRes] = await Promise.all([
        supabase.from('labor_contracts').select('*').eq('project_id', currentProject).order('end_date', { ascending: true, nullsFirst: false }),
        supabase.from('users').select('id, name').order('name'),
      ])
      if (cRes.error) throw cRes.error
      setContracts((cRes.data ?? []) as LaborContract[])
      setWorkerOpts((wRes.data ?? []) as WorkerOption[])
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Load failed', 'err')
    } finally {
      setLoading(false)
    }
  }, [currentProject, showToast])

  useEffect(() => {
    loadData()
  }, [loadData])

  /* ── Modal open ── */
  const openAdd = () => {
    setEditing(null)
    setMWorkerId(''); setMWorkerName(''); setMType('regular')
    setMStart(today()); setMEnd(''); setMSalary(''); setMPosition(''); setMNotes('')
    setShowModal(true)
  }

  const openEdit = (c: LaborContract) => {
    setEditing(c)
    setMWorkerId(''); setMWorkerName(c.worker_name)
    setMType(c.position ?? ''); setMStart(c.start_date ?? ''); setMEnd(c.end_date ?? '')
    setMSalary(c.daily_rate ? String(c.daily_rate) : ''); setMPosition(c.position ?? '')
    setMNotes('')
    setShowModal(true)
  }

  /* ── Worker select handler ── */
  const handleWorkerSelect = (id: string) => {
    setMWorkerId(id)
    const w = workerOpts.find((o) => o.id === id)
    if (w) setMWorkerName(w.name)
  }

  /* ── Save ── */
  const handleSave = async () => {
    if (!mWorkerName.trim()) { showToast('Chon cong nhan / 근로자를 선택하세요', 'err'); return }
    if (!currentProject) return
    setSaving(true)
    try {
      const payload = {
        project_id: currentProject,
        worker_name: mWorkerName.trim(),
        position: mPosition.trim() || null,
        start_date: mStart,
        end_date: mEnd || null,
        daily_rate: parseFloat(mSalary) || null,
        created_by: user?.id ?? null,
      }
      if (editing) {
        const { error } = await supabase.from('labor_contracts').update(payload).eq('id', editing.id)
        if (error) throw error
        showToast('Da cap nhat / 수정 완료', 'ok')
      } else {
        const { error } = await supabase.from('labor_contracts').insert(payload)
        if (error) throw error
        showToast('Da tao hop dong / 계약 등록 완료', 'ok')
      }
      setShowModal(false)
      await loadData()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Save failed', 'err')
    } finally {
      setSaving(false)
    }
  }

  /* ── KPI ── */
  const activeCount = contracts.filter((c) => {
    if (!c.end_date) return true
    return daysUntil(c.end_date)! >= 0
  }).length
  const expiringSoon = contracts.filter((c) => {
    if (!c.end_date) return false
    const d = daysUntil(c.end_date)!
    return d >= 0 && d <= 30
  }).length
  const expired = contracts.filter((c) => c.end_date && daysUntil(c.end_date)! < 0).length

  if (!currentProject) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        Vui long chon cong trinh / 현장을 선택해주세요.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>{toast.msg}</div>
      )}

      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hop dong lao dong / 근로계약</h1>
          <p className="mt-1 text-sm text-gray-500">Quan ly hop dong lao dong / 근로계약 관리</p>
        </div>
        {canManage && (
          <button onClick={openAdd} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            + Them / 추가
          </button>
        )}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-medium text-gray-500">Hieu luc / 유효</p>
          <p className="mt-2 text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-medium text-gray-500">Sap het han / 곧만료 (30 ngay)</p>
          <p className="mt-2 text-2xl font-bold text-yellow-600">{expiringSoon}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-medium text-gray-500">Het han / 만료</p>
          <p className="mt-2 text-2xl font-bold text-gray-500">{expired}</p>
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
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Chuc vu / 직위</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Bat dau / 시작</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Ket thuc / 종료</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Luong / 급여</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Trang thai / 상태</th>
                {canManage && <th className="px-5 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Thao tac / 작업</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contracts.length === 0 && !loading && (
                <tr><td colSpan={canManage ? 8 : 7} className="px-5 py-6 text-center text-sm text-gray-400">Khong co du lieu / 데이터 없음</td></tr>
              )}
              {contracts.map((c) => {
                const st = contractStatus(c)
                const days = daysUntil(c.end_date)
                const rowHighlight = days !== null && days >= 0 && days <= 30 ? 'bg-yellow-50' : ''
                return (
                  <tr key={c.id} className={`hover:bg-gray-50 ${rowHighlight}`}>
                    <td className="px-5 py-2 text-gray-900 font-medium whitespace-nowrap">{c.worker_name}</td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">{typeLabel(c.position ?? '')}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs whitespace-nowrap">{c.position ?? '-'}</td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap font-mono">{c.start_date}</td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap font-mono">{c.end_date ?? '-'}</td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap font-mono">{c.daily_rate ? fmtVND(c.daily_rate) : '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${st.style}`}>{st.label}</span>
                    </td>
                    {canManage && (
                      <td className="px-5 py-2 whitespace-nowrap">
                        <button onClick={() => openEdit(c)} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors">Sua / 수정</button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editing ? 'Sua hop dong / 계약 수정' : 'Them hop dong / 계약 추가'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cong nhan / 근로자 *</label>
                <select value={mWorkerId} onChange={(e) => handleWorkerSelect(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">-- Chon / 선택 --</option>
                  {workerOpts.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
                <input type="text" value={mWorkerName} onChange={(e) => setMWorkerName(e.target.value)} placeholder="Hoac nhap ten / 또는 이름 입력" className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Loai HD / 계약유형</label>
                  <select value={mType} onChange={(e) => setMType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {CONTRACT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Chuc vu / 직위</label>
                  <input type="text" value={mPosition} onChange={(e) => setMPosition(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Bat dau / 시작일 *</label>
                  <input type="date" value={mStart} onChange={(e) => setMStart(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ket thuc / 종료일</label>
                  <input type="date" value={mEnd} onChange={(e) => setMEnd(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Luong co ban / 기본급 (VND)</label>
                <input type="text" inputMode="numeric" value={mSalary} onChange={(e) => setMSalary(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chu / 비고</label>
                <textarea value={mNotes} onChange={(e) => setMNotes(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
