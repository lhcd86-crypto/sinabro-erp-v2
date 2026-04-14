'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isAdmin } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

/* ── Types ───────────────────────────────────────── */

interface QuantityItem {
  id: string
  project_id: string
  item_name: string
  unit: string
  contract_qty: number
  executed_qty: number
  unit_price: number
  notes: string | null
  created_by: string
  created_at: string
}

function fmtVND(n: number) {
  return n.toLocaleString('vi-VN')
}

/* ── Component ─────────────────────────────────────── */

export default function QuantitiesPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [items, setItems] = useState<QuantityItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  /* ── Form state ── */
  const [fName, setFName] = useState('')
  const [fUnit, setFUnit] = useState('')
  const [fContractQty, setFContractQty] = useState('')
  const [fExecutedQty, setFExecutedQty] = useState('')
  const [fUnitPrice, setFUnitPrice] = useState('')
  const [fNotes, setFNotes] = useState('')

  const toast = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  const canEdit = user ? isAdmin(user.role) || user.role === 'qs' || user.role === 'engineer' : false

  /* ── Load data ── */
  const loadData = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('quantity_items')
        .select('*')
        .eq('project_id', currentProject)
        .order('created_at', { ascending: true })
      setItems((data as QuantityItem[]) ?? [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [currentProject])

  useEffect(() => {
    if (user && currentProject) loadData()
  }, [user, currentProject, loadData])

  /* ── Reset form ── */
  function resetForm() {
    setFName('')
    setFUnit('')
    setFContractQty('')
    setFExecutedQty('')
    setFUnitPrice('')
    setFNotes('')
    setEditId(null)
    setShowForm(false)
  }

  /* ── Edit item ── */
  function startEdit(item: QuantityItem) {
    setEditId(item.id)
    setFName(item.item_name)
    setFUnit(item.unit)
    setFContractQty(String(item.contract_qty))
    setFExecutedQty(String(item.executed_qty))
    setFUnitPrice(String(item.unit_price))
    setFNotes(item.notes ?? '')
    setShowForm(true)
  }

  /* ── Submit ── */
  async function handleSubmit() {
    if (!currentProject || !user) {
      toast('err', 'Chon cong trinh / 현장을 선택하세요')
      return
    }
    if (!fName.trim()) {
      toast('err', 'Nhap ten hang muc / 항목명을 입력하세요')
      return
    }

    setSaving(true)
    try {
      const payload = {
        project_id: currentProject,
        item_name: fName.trim(),
        unit: fUnit.trim(),
        contract_qty: parseFloat(fContractQty) || 0,
        executed_qty: parseFloat(fExecutedQty) || 0,
        unit_price: parseFloat(fUnitPrice.replace(/[^0-9]/g, '')) || 0,
        notes: fNotes.trim() || null,
        created_by: user.id,
      }

      if (editId) {
        const { error } = await supabase
          .from('quantity_items')
          .update(payload)
          .eq('id', editId)
        if (error) throw error
        toast('ok', 'Da cap nhat / 수정 완료')
      } else {
        const { error } = await supabase.from('quantity_items').insert(payload)
        if (error) throw error
        toast('ok', 'Da them hang muc / 항목 추가 완료')
      }

      resetForm()
      loadData()
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  /* ── Totals ── */
  const totalContract = items.reduce((s, i) => s + (i.contract_qty * i.unit_price), 0)
  const totalExecuted = items.reduce((s, i) => s + (i.executed_qty * i.unit_price), 0)

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

      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Khoi luong HD / 계약물량
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Quan ly khoi luong hop dong / 계약물량 관리
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Them / 추가
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Gia tri HD / 계약금액</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{fmtVND(totalContract)}</p>
              <p className="mt-1 text-xs text-gray-400">VND</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Da thi cong / 기성금액</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{fmtVND(totalExecuted)}</p>
              <p className="mt-1 text-xs text-gray-400">VND</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-green-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Tien do / 기성률</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {totalContract > 0 ? ((totalExecuted / totalContract) * 100).toFixed(1) : '0.0'}%
              </p>
            </div>
            <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0 mt-1" />
          </div>
        </div>
      </div>

      {/* ── Add/Edit Form ── */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              {editId ? 'Sua hang muc / 항목 수정' : 'Them hang muc / 항목 추가'}
            </h3>
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Ten hang muc / 항목명
                </label>
                <input
                  type="text"
                  value={fName}
                  onChange={(e) => setFName(e.target.value)}
                  placeholder="VD: Be tong M250 / 예: 콘크리트 M250"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Don vi / 단위
                </label>
                <input
                  type="text"
                  value={fUnit}
                  onChange={(e) => setFUnit(e.target.value)}
                  placeholder="m3, m2, kg, md..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  KL hop dong / 계약수량
                </label>
                <input
                  type="number"
                  value={fContractQty}
                  onChange={(e) => setFContractQty(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  KL thi cong / 기성수량
                </label>
                <input
                  type="number"
                  value={fExecutedQty}
                  onChange={(e) => setFExecutedQty(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Don gia / 단가 (VND)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={fUnitPrice}
                  onChange={(e) => setFUnitPrice(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Ghi chu / 비고
                </label>
                <input
                  type="text"
                  value={fNotes}
                  onChange={(e) => setFNotes(e.target.value)}
                  placeholder="Ghi chu / 메모"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Huy / 취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Dang luu... / 저장 중...' : 'Luu / 저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quantity Items Table ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Bang khoi luong / 물량표
          </h3>
          <span className="text-xs text-gray-500">
            Tong / 총 {items.length} hang muc / 항목
          </span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Dang tai... / 로딩 중...
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Chua co du lieu / 데이터 없음
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">#</th>
                  <th className="px-3 py-3">Hang muc / 항목</th>
                  <th className="px-3 py-3">DV / 단위</th>
                  <th className="px-3 py-3 text-right">KL HD / 계약</th>
                  <th className="px-3 py-3 text-right">KL TC / 기성</th>
                  <th className="px-3 py-3 text-right">Con lai / 잔여</th>
                  <th className="px-3 py-3 text-right">Don gia / 단가</th>
                  <th className="px-3 py-3 text-right">Tien do / 진도</th>
                  {canEdit && <th className="px-3 py-3 text-center">Sua / 수정</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, idx) => {
                  const remaining = item.contract_qty - item.executed_qty
                  const progress = item.contract_qty > 0
                    ? (item.executed_qty / item.contract_qty) * 100
                    : 0

                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-xs text-gray-400">{idx + 1}</td>
                      <td className="px-3 py-3 text-xs text-gray-700 font-medium">
                        {item.item_name}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600">{item.unit}</td>
                      <td className="px-3 py-3 text-xs text-right font-mono text-gray-600">
                        {fmtVND(item.contract_qty)}
                      </td>
                      <td className="px-3 py-3 text-xs text-right font-mono font-bold text-gray-900">
                        {fmtVND(item.executed_qty)}
                      </td>
                      <td className={`px-3 py-3 text-xs text-right font-mono ${remaining < 0 ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                        {fmtVND(remaining)}
                      </td>
                      <td className="px-3 py-3 text-xs text-right font-mono text-gray-600">
                        {fmtVND(item.unit_price)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                progress >= 100 ? 'bg-green-500' : progress >= 50 ? 'bg-blue-500' : 'bg-yellow-500'
                              }`}
                              style={{ width: `${Math.min(100, progress)}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-gray-700">
                            {progress.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      {canEdit && (
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={() => startEdit(item)}
                            className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            Sua / 수정
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-900 text-white font-bold">
                  <td colSpan={3} className="px-3 py-3 text-xs">Tong / 합계</td>
                  <td className="px-3 py-3 text-xs text-right font-mono">{fmtVND(totalContract)}</td>
                  <td className="px-3 py-3 text-xs text-right font-mono">{fmtVND(totalExecuted)}</td>
                  <td className="px-3 py-3 text-xs text-right font-mono">{fmtVND(totalContract - totalExecuted)}</td>
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3 text-xs text-right font-mono">
                    {totalContract > 0 ? ((totalExecuted / totalContract) * 100).toFixed(1) : '0.0'}%
                  </td>
                  {canEdit && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
