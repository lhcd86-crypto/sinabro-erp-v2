'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isAdmin } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

/* ── Types ── */

interface VehicleCost {
  id: string
  project_id: string
  vehicle_id: string | null
  plate_no: string | null
  cost_type: string
  amount: number
  date: string
  receipt_url: string | null
  notes: string | null
  created_by: string | null
  created_at: string | null
}

interface VehicleOption {
  id: string
  plate_no: string
}

const COST_TYPES = [
  { value: 'fuel', label: 'Xang dau / 연료' },
  { value: 'repair', label: 'Sua chua / 수리' },
  { value: 'toll', label: 'Phi duong / 통행료' },
  { value: 'parking', label: 'Gui xe / 주차' },
  { value: 'other', label: 'Khac / 기타' },
]

const costLabel = (v: string) => COST_TYPES.find((c) => c.value === v)?.label ?? v

function today() {
  return new Date().toISOString().slice(0, 10)
}

function fmtVND(n: number) {
  return n.toLocaleString('vi-VN')
}

/* ── Component ── */

export default function DriverAdvancePage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [costs, setCosts] = useState<VehicleCost[]>([])
  const [vehicleOpts, setVehicleOpts] = useState<VehicleOption[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [saving, setSaving] = useState(false)

  // Form
  const [fVehicleId, setFVehicleId] = useState('')
  const [fPlate, setFPlate] = useState('')
  const [fType, setFType] = useState('fuel')
  const [fAmount, setFAmount] = useState('')
  const [fDate, setFDate] = useState(today())
  const [fFile, setFFile] = useState<File | null>(null)
  const [fNotes, setFNotes] = useState('')

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
      const [cRes, vRes] = await Promise.all([
        supabase.from('vehicle_costs').select('*').eq('project_id', currentProject).order('date', { ascending: false }),
        supabase.from('vehicles').select('id, plate_no').order('plate_no'),
      ])
      if (cRes.error) throw cRes.error
      setCosts((cRes.data ?? []) as VehicleCost[])
      setVehicleOpts((vRes.data ?? []) as VehicleOption[])
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Load failed', 'err')
    } finally {
      setLoading(false)
    }
  }, [currentProject, showToast])

  useEffect(() => {
    loadData()
  }, [loadData])

  /* ── Vehicle select ── */
  const handleVehicleSelect = (id: string) => {
    setFVehicleId(id)
    const v = vehicleOpts.find((o) => o.id === id)
    if (v) setFPlate(v.plate_no)
  }

  /* ── Upload photo ── */
  async function uploadPhoto(file: File): Promise<string | null> {
    if (!user) return null
    try {
      const path = `vehicle-receipts/${user.id}/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('report-photos').upload(path, file, { cacheControl: '3600', upsert: false })
      if (error) return null
      return path
    } catch {
      return null
    }
  }

  /* ── Save ── */
  const handleSave = async () => {
    const amount = parseFloat(fAmount.replace(/[^0-9]/g, '')) || 0
    if (!amount) { showToast('Nhap so tien / 금액을 입력하세요', 'err'); return }
    if (!currentProject) return
    setSaving(true)
    try {
      let receiptUrl: string | null = null
      if (fFile) receiptUrl = await uploadPhoto(fFile)

      const payload = {
        project_id: currentProject,
        vehicle_id: fVehicleId || null,
        plate_no: fPlate.trim() || null,
        cost_type: fType,
        amount,
        date: fDate,
        receipt_url: receiptUrl,
        notes: fNotes.trim() || null,
        created_by: user?.id ?? null,
      }
      const { error } = await supabase.from('vehicle_costs').insert(payload)
      if (error) throw error

      setFAmount(''); setFNotes(''); setFFile(null)
      showToast('Da ghi nhan / 기록 완료', 'ok')
      await loadData()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Save failed', 'err')
    } finally {
      setSaving(false)
    }
  }

  /* ── Summary ── */
  const totalAll = costs.reduce((s, c) => s + c.amount, 0)
  const byType = COST_TYPES.map((t) => ({
    label: t.label,
    total: costs.filter((c) => c.cost_type === t.value).reduce((s, c) => s + c.amount, 0),
  })).filter((t) => t.total > 0)

  const currentMonth = today().slice(0, 7)
  const monthlyTotal = costs.filter((c) => c.date.startsWith(currentMonth)).reduce((s, c) => s + c.amount, 0)

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Chi phi xe / 차량비용</h1>
        <p className="mt-1 text-sm text-gray-500">Quan ly chi phi phuong tien / 차량 비용 관리</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <p className="text-xs font-medium text-gray-500">Tong / 총 비용</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{fmtVND(totalAll)}</p>
          <p className="mt-1 text-xs text-gray-400">VND</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <p className="text-xs font-medium text-gray-500">Thang nay / 이번달</p>
          <p className="mt-2 text-2xl font-bold text-blue-600">{fmtVND(monthlyTotal)}</p>
          <p className="mt-1 text-xs text-gray-400">VND</p>
        </div>
        {byType.slice(0, 2).map((t) => (
          <div key={t.label} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
            <p className="text-xs font-medium text-gray-500">{t.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{fmtVND(t.total)}</p>
            <p className="mt-1 text-xs text-gray-400">VND</p>
          </div>
        ))}
      </div>

      {/* Form */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Ghi nhan chi phi / 비용 기록</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Xe / 차량</label>
            <select value={fVehicleId} onChange={(e) => handleVehicleSelect(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="">-- Chon xe / 선택 --</option>
              {vehicleOpts.map((v) => <option key={v.id} value={v.id}>{v.plate_no}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Loai chi phi / 비용유형</label>
            <select value={fType} onChange={(e) => setFType(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              {COST_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">So tien / 금액 (VND)</label>
            <input type="text" inputMode="numeric" value={fAmount} onChange={(e) => setFAmount(e.target.value)} placeholder="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ngay / 날짜</label>
            <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Anh hoa don / 영수증</label>
            <input type="file" accept="image/*" onChange={(e) => setFFile(e.target.files?.[0] ?? null)} className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chu / 비고</label>
            <input type="text" value={fNotes} onChange={(e) => setFNotes(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {saving ? 'Dang luu... / 저장 중...' : 'Ghi nhan / 기록'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Lich su chi phi / 비용 내역</h3>
          <span className="text-xs text-gray-500">Tong / 총 {costs.length}건</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Dang tai... / 로딩 중...</div>
        ) : costs.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Chua co du lieu / 기록 없음</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Ngay / 날짜</th>
                  <th className="px-4 py-3">Xe / 차량</th>
                  <th className="px-4 py-3">Loai / 유형</th>
                  <th className="px-4 py-3">So tien / 금액</th>
                  <th className="px-4 py-3">Ghi chu / 비고</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {costs.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap font-mono">{c.date}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap font-mono">{c.plate_no ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">{costLabel(c.cost_type)}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-600 whitespace-nowrap font-mono">{fmtVND(c.amount)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[200px] truncate">{c.notes ?? '-'}</td>
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
