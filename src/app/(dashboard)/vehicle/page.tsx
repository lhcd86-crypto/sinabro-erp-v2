'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isAdmin } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

/* ── Types ── */

interface Vehicle {
  id: string
  plate_no: string
  vehicle_type: string
  assigned_driver_id: string | null
  status: string
  insurance_expiry: string | null
  inspection_expiry: string | null
  notes: string | null
}

interface DriverOption {
  id: string
  name: string
}

const VEHICLE_TYPES = [
  { value: 'truck', label: 'Xe tai / 트럭' },
  { value: 'car', label: 'Xe con / 승용차' },
  { value: 'crane', label: 'Can cau / 크레인' },
  { value: 'other', label: 'Khac / 기타' },
]

const STATUSES = [
  { value: 'active', label: 'Hoat dong / 운행중', bg: 'bg-green-50', text: 'text-green-700' },
  { value: 'repair', label: 'Sua chua / 수리중', bg: 'bg-yellow-50', text: 'text-yellow-700' },
  { value: 'idle', label: 'Ngung / 대기', bg: 'bg-gray-100', text: 'text-gray-500' },
]

const typeLabel = (v: string) => VEHICLE_TYPES.find((t) => t.value === v)?.label ?? v
const statusInfo = (v: string) => STATUSES.find((s) => s.value === v) ?? STATUSES[2]

function today() {
  return new Date().toISOString().slice(0, 10)
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
}

function expiryBadge(dateStr: string | null): { label: string; style: string } | null {
  if (!dateStr) return null
  const d = daysUntil(dateStr)!
  if (d < 0) return { label: 'Het han / 만료', style: 'bg-red-100 text-red-700' }
  if (d <= 30) return { label: `${d} ngay / ${d}일`, style: 'bg-yellow-100 text-yellow-700' }
  return null
}

/* ── Component ── */

export default function VehiclePage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<DriverOption[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [mPlate, setMPlate] = useState('')
  const [mType, setMType] = useState('truck')
  const [mDriverId, setMDriverId] = useState('')
  const [mDriverName, setMDriverName] = useState('')
  const [mStatus, setMStatus] = useState('active')
  const [mRegExpiry, setMRegExpiry] = useState('')
  const [mInsExpiry, setMInsExpiry] = useState('')
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
      const [vRes, dRes] = await Promise.all([
        supabase.from('vehicles').select('*').order('plate_no'),
        supabase.from('users').select('id, name').eq('role', 'driver').order('name'),
      ])
      if (vRes.error) throw vRes.error
      setVehicles((vRes.data ?? []) as Vehicle[])
      setDrivers((dRes.data ?? []) as DriverOption[])
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Load failed', 'err')
    } finally {
      setLoading(false)
    }
  }, [currentProject, showToast])

  useEffect(() => {
    loadData()
  }, [loadData])

  /* ── Modal ── */
  const openAdd = () => {
    setEditing(null)
    setMPlate(''); setMType('truck'); setMDriverId(''); setMDriverName('')
    setMStatus('active'); setMRegExpiry(''); setMInsExpiry(''); setMNotes('')
    setShowModal(true)
  }

  const openEdit = (v: Vehicle) => {
    setEditing(v)
    setMPlate(v.plate_no); setMType(v.vehicle_type)
    setMDriverId(v.assigned_driver_id ?? ''); setMDriverName(drivers.find(d=>d.id===v.assigned_driver_id)?.name ?? '')
    setMStatus(v.status); setMRegExpiry(v.inspection_expiry ?? '')
    setMInsExpiry(v.insurance_expiry ?? ''); setMNotes(v.notes ?? '')
    setShowModal(true)
  }

  const handleDriverSelect = (id: string) => {
    setMDriverId(id)
    const d = drivers.find((o) => o.id === id)
    if (d) setMDriverName(d.name)
  }

  /* ── Save ── */
  const handleSave = async () => {
    if (!mPlate.trim()) { showToast('Nhap bien so / 차량번호를 입력하세요', 'err'); return }
    if (!currentProject) return
    setSaving(true)
    try {
      const payload = {
        plate_no: mPlate.trim(),
        vehicle_type: mType,
        assigned_driver_id: mDriverId || null,
        status: mStatus,
        inspection_expiry: mRegExpiry || null,
        insurance_expiry: mInsExpiry || null,
        notes: mNotes.trim() || null,
      }
      if (editing) {
        const { error } = await supabase.from('vehicles').update(payload).eq('id', editing.id)
        if (error) throw error
        showToast('Da cap nhat / 수정 완료', 'ok')
      } else {
        const { error } = await supabase.from('vehicles').insert(payload)
        if (error) throw error
        showToast('Da them xe / 차량 등록 완료', 'ok')
      }
      setShowModal(false)
      await loadData()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Save failed', 'err')
    } finally {
      setSaving(false)
    }
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
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>{toast.msg}</div>
      )}

      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quan ly xe / 차량현황</h1>
          <p className="mt-1 text-sm text-gray-500">Quan ly phuong tien va lai xe / 차량 및 운전 관리</p>
        </div>
        {canManage && (
          <button onClick={openAdd} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            + Them xe / 차량 추가
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500">Tong / 전체</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{vehicles.length}</p>
        </div>
        {STATUSES.map((s) => (
          <div key={s.value} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{vehicles.filter((v) => v.status === s.value).length}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        {loading && <p className="text-sm text-gray-400 mb-2">Dang tai... / 로딩 중...</p>}
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="px-5 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Bien so / 차량번호</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Loai / 유형</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Tai xe / 운전기사</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Trang thai / 상태</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">DK het han / 등록만료</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">BH het han / 보험만료</th>
                {canManage && <th className="px-5 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Thao tac / 작업</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vehicles.length === 0 && !loading && (
                <tr><td colSpan={canManage ? 7 : 6} className="px-5 py-6 text-center text-sm text-gray-400">Khong co du lieu / 데이터 없음</td></tr>
              )}
              {vehicles.map((v) => {
                const si = statusInfo(v.status)
                const regBadge = expiryBadge(v.inspection_expiry)
                const insBadge = expiryBadge(v.insurance_expiry)
                return (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-5 py-2 text-gray-900 font-medium font-mono whitespace-nowrap">{v.plate_no}</td>
                    <td className="px-3 py-2 text-gray-700 text-xs whitespace-nowrap">{typeLabel(v.vehicle_type)}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs whitespace-nowrap">{drivers.find(d=>d.id===v.assigned_driver_id)?.name ?? '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${si.bg} ${si.text}`}>{si.label}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="text-xs text-gray-700 font-mono">{v.inspection_expiry ?? '-'}</span>
                      {regBadge && <span className={`ml-1 inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${regBadge.style}`}>{regBadge.label}</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="text-xs text-gray-700 font-mono">{v.insurance_expiry ?? '-'}</span>
                      {insBadge && <span className={`ml-1 inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${insBadge.style}`}>{insBadge.label}</span>}
                    </td>
                    {canManage && (
                      <td className="px-5 py-2 whitespace-nowrap">
                        <button onClick={() => openEdit(v)} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors">Sua / 수정</button>
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
              {editing ? 'Sua xe / 차량 수정' : 'Them xe / 차량 추가'}
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Bien so / 차량번호 *</label>
                  <input type="text" value={mPlate} onChange={(e) => setMPlate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Loai xe / 유형</label>
                  <select value={mType} onChange={(e) => setMType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {VEHICLE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tai xe / 운전기사</label>
                  <select value={mDriverId} onChange={(e) => handleDriverSelect(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Chon / 선택 --</option>
                    {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Trang thai / 상태</label>
                  <select value={mStatus} onChange={(e) => setMStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">DK het han / 등록만료</label>
                  <input type="date" value={mRegExpiry} onChange={(e) => setMRegExpiry(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">BH het han / 보험만료</label>
                  <input type="date" value={mInsExpiry} onChange={(e) => setMInsExpiry(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
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
