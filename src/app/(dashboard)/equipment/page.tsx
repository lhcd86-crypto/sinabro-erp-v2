'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isAdmin } from '@/lib/roles'
import {
  useEquipment,
  EQUIPMENT_STATUSES,
  EQUIPMENT_CATEGORIES,
  type EquipmentRecord,
} from '@/hooks/useEquipment'

/* ── Helpers ───────────────────────────────────────── */

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-green-50', text: 'text-green-700', label: 'Hoat dong / 가동중' },
  repair: { bg: 'bg-red-50', text: 'text-red-700', label: 'Sua chua / 수리중' },
  idle: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Nghi / 대기' },
}

const CAT_LABELS: Record<string, string> = {
  heavy: 'May nang / 중장비',
  vehicle: 'Xe / 차량',
  tool: 'Dung cu / 공구',
  scaffold: 'Gian giao / 비계',
  electric: 'Dien / 전기',
  other: 'Khac / 기타',
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

/* ── Component ─────────────────────────────────────── */

export default function EquipmentPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)
  const projects = useAuthStore((s) => s.projects)

  const {
    equipment,
    repairs,
    loading,
    loadEquipment,
    addEquipment,
    updateEquipment,
    transferEquipment,
    loadRepairs,
    addRepair,
  } = useEquipment()

  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Add form
  const [showAdd, setShowAdd] = useState(false)
  const [fName, setFName] = useState('')
  const [fCode, setFCode] = useState('')
  const [fCat, setFCat] = useState('heavy')
  const [fStatus, setFStatus] = useState('active')

  // Transfer
  const [transferId, setTransferId] = useState<string | null>(null)
  const [transferTo, setTransferTo] = useState('')
  const [transferNote, setTransferNote] = useState('')

  // Repair
  const [repairId, setRepairId] = useState<string | null>(null)
  const [rDate, setRDate] = useState(today())
  const [rDesc, setRDesc] = useState('')
  const [rCost, setRCost] = useState('')
  const [rBy, setRBy] = useState('')

  /* ── Load data ─── */
  useEffect(() => {
    if (user) loadEquipment()
  }, [user, currentProject, loadEquipment])

  /* ── Toast ─── */
  const toast = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  /* ── Submit new equipment ─── */
  async function handleAdd() {
    if (!fName.trim() || !fCode.trim()) {
      toast('err', 'Nhap ten va ma thiet bi / 장비명과 코드를 입력하세요')
      return
    }
    setSaving(true)
    try {
      await addEquipment({
        name: fName.trim(),
        code: fCode.trim(),
        category: fCat,
        status: fStatus,
      })
      setFName('')
      setFCode('')
      setFCat('heavy')
      setFStatus('active')
      setShowAdd(false)
      toast('ok', 'Da them thiet bi / 장비 등록 완료')
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  /* ── Transfer ─── */
  async function handleTransfer() {
    if (!transferId || !transferTo) {
      toast('err', 'Chon thiet bi va cong trinh / 장비와 현장을 선택하세요')
      return
    }
    setSaving(true)
    try {
      await transferEquipment(transferId, transferTo, transferNote)
      setTransferId(null)
      setTransferTo('')
      setTransferNote('')
      toast('ok', 'Da chuyen thiet bi / 장비 이동 완료')
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Transfer failed')
    } finally {
      setSaving(false)
    }
  }

  /* ── Add repair ─── */
  async function handleRepair() {
    if (!repairId || !rDesc.trim()) {
      toast('err', 'Nhap noi dung sua chua / 수리 내용을 입력하세요')
      return
    }
    setSaving(true)
    try {
      await addRepair({
        equipment_id: repairId,
        repair_date: rDate,
        description: rDesc.trim(),
        cost: rCost ? parseFloat(rCost) : null,
        performed_by: rBy.trim() || null,
        status: 'completed',
      })
      setRDesc('')
      setRCost('')
      setRBy('')
      toast('ok', 'Da them lich su sua chua / 수리 이력 등록 완료')
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Repair save failed')
    } finally {
      setSaving(false)
    }
  }

  /* ── Open repair panel ─── */
  function openRepairPanel(eqId: string) {
    setRepairId(eqId)
    loadRepairs(eqId)
  }

  const canManage = user ? isAdmin(user.role) : false

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Thiet bi / 장비관리
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Quan ly thiet bi va cong cu / 장비 및 공구 관리
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showAdd ? 'Dong / 닫기' : 'Them moi / 장비 등록'}
        </button>
      </div>

      {/* ── Add Equipment Form ── */}
      {showAdd && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              Dang ky thiet bi / 장비 등록
            </h3>
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Ten thiet bi / 장비명
                </label>
                <input
                  type="text"
                  value={fName}
                  onChange={(e) => setFName(e.target.value)}
                  placeholder="VD: May xuc / 굴삭기"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Ma thiet bi / 코드
                </label>
                <input
                  type="text"
                  value={fCode}
                  onChange={(e) => setFCode(e.target.value)}
                  placeholder="VD: EX-001"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Phan loai / 분류
                </label>
                <select
                  value={fCat}
                  onChange={(e) => setFCat(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {EQUIPMENT_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Trang thai / 상태
                </label>
                <select
                  value={fStatus}
                  onChange={(e) => setFStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {EQUIPMENT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={handleAdd}
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Dang luu... / 저장 중...' : 'Luu / 저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Transfer Section ── */}
      {canManage && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              Chuyen thiet bi / 장비 이동
            </h3>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Thiet bi / 장비
                </label>
                <select
                  value={transferId || ''}
                  onChange={(e) => setTransferId(e.target.value || null)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Chon thiet bi / 장비 선택 --</option>
                  {equipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} ({eq.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Cong trinh dich / 이동할 현장
                </label>
                <select
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Chon cong trinh / 현장 선택 --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Ghi chu / 비고
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    placeholder="Ghi chu / 메모"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleTransfer}
                    disabled={saving}
                    className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    {saving ? '...' : 'Chuyen / 이동'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Equipment Table ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Danh sach thiet bi / 장비 목록
          </h3>
          <span className="text-xs text-gray-500">
            Tong / 총 {equipment.length}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Dang tai... / 로딩 중...
          </div>
        ) : equipment.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Chua co thiet bi / 장비 없음
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">Ten / 장비명</th>
                  <th className="px-3 py-3">Ma / 코드</th>
                  <th className="px-3 py-3">Loai / 분류</th>
                  <th className="px-3 py-3">Trang thai / 상태</th>
                  <th className="px-3 py-3">Cong trinh / 현장</th>
                  <th className="px-3 py-3 text-center">Thao tac / 관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {equipment.map((eq) => {
                  const st = STATUS_BADGE[eq.status] || STATUS_BADGE.idle
                  return (
                    <tr key={eq.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-xs font-medium text-gray-900">
                        {eq.name}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 font-mono">
                        {eq.code}
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                          {CAT_LABELS[eq.category] || eq.category}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${st.bg} ${st.text}`}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600">
                        {eq.projects?.code || eq.projects?.name || '-'}
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {canManage && eq.status !== 'active' && (
                            <button
                              onClick={() =>
                                updateEquipment(eq.id, { status: 'active' }).catch(
                                  (err) => toast('err', err.message),
                                )
                              }
                              className="px-2 py-1 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              Kich hoat / 가동
                            </button>
                          )}
                          {canManage && eq.status !== 'idle' && (
                            <button
                              onClick={() =>
                                updateEquipment(eq.id, { status: 'idle' }).catch(
                                  (err) => toast('err', err.message),
                                )
                              }
                              className="px-2 py-1 text-xs font-medium bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                            >
                              Nghi / 대기
                            </button>
                          )}
                          <button
                            onClick={() => openRepairPanel(eq.id)}
                            className="px-2 py-1 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                          >
                            Sua chua / 수리
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Repair History Panel ── */}
      {repairId && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Lich su sua chua / 수리 이력 -{' '}
              {equipment.find((e) => e.id === repairId)?.name || ''}
            </h3>
            <button
              onClick={() => setRepairId(null)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Dong / 닫기
            </button>
          </div>

          {/* Add repair form */}
          <div className="p-4 border-b border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Ngay / 날짜
                </label>
                <input
                  type="date"
                  value={rDate}
                  onChange={(e) => setRDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Noi dung / 수리 내용
                </label>
                <input
                  type="text"
                  value={rDesc}
                  onChange={(e) => setRDesc(e.target.value)}
                  placeholder="Mo ta sua chua / 수리 설명"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Chi phi / 비용 (VND)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={rCost}
                  onChange={(e) => setRCost(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Nguoi sua / 수리자
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={rBy}
                    onChange={(e) => setRBy(e.target.value)}
                    placeholder="Ten"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleRepair}
                    disabled={saving}
                    className="px-3 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? '...' : 'Luu / 저장'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Repair list */}
          {repairs.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">
              Chua co lich su sua chua / 수리 이력 없음
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-3 py-2">Ngay / 날짜</th>
                    <th className="px-3 py-2">Noi dung / 내용</th>
                    <th className="px-3 py-2 text-right">Chi phi / 비용</th>
                    <th className="px-3 py-2">Nguoi sua / 수리자</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {repairs.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs text-gray-600 font-mono">
                        {r.repair_date}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">
                        {r.description}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 text-right font-mono">
                        {r.cost ? r.cost.toLocaleString('vi-VN') : '-'}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {r.performed_by || '-'}
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
