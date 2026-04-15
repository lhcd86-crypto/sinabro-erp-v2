'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isAdmin } from '@/lib/roles'
import {
  useMaterial,
  MATERIAL_UNITS,
  type MaterialItem,
} from '@/hooks/useMaterial'
import { supabase } from '@/lib/supabase'

/* ── Types ────────────────────────────────────────── */

interface MaterialOrderRow {
  id: string
  project_id: string
  item_name: string
  quantity: number
  unit: string
  urgency: string
  expected_date: string | null
  requested_by: string
  status: string
  reason: string | null
  created_at: string
}

/* ── Helpers ───────────────────────────────────────── */

function today() {
  return new Date().toISOString().slice(0, 10)
}

function fmtVND(n: number) {
  return n.toLocaleString('vi-VN')
}

type Tab = 'stock' | 'transactions' | 'orders'

const TABS: { value: Tab; label: string }[] = [
  { value: 'stock', label: 'Ton kho / 현재 재고' },
  { value: 'transactions', label: 'Nhap xuat / 입출고' },
  { value: 'orders', label: 'Dat hang / 발주' },
]

/* ── Component ─────────────────────────────────────── */

export default function MaterialPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const {
    inventory,
    transactions,
    loading,
    loadInventory,
    loadTransactions,
    saveTransaction,
    addItem,
  } = useMaterial()

  const [tab, setTab] = useState<Tab>('stock')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Add item form
  const [showAddItem, setShowAddItem] = useState(false)
  const [iName, setIName] = useState('')
  const [iUnit, setIUnit] = useState('kg')
  const [iStock, setIStock] = useState('')
  const [iMin, setIMin] = useState('')
  const [iLoc, setILoc] = useState('')

  // Transaction form
  const [tItemId, setTItemId] = useState('')
  const [tType, setTType] = useState<'in' | 'out'>('in')
  const [tQty, setTQty] = useState('')
  const [tDate, setTDate] = useState(today())
  const [tVendor, setTVendor] = useState('')
  const [tPrice, setTPrice] = useState('')
  const [tNote, setTNote] = useState('')

  // Order form state
  const [orders, setOrders] = useState<MaterialOrderRow[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [oMaterial, setOMaterial] = useState('')
  const [oQty, setOQty] = useState('')
  const [oUnit, setOUnit] = useState('kg')
  const [oUrgency, setOUrgency] = useState('normal')
  const [oExpDate, setOExpDate] = useState(today())
  const [oNote, setONote] = useState('')

  /* ── Load orders ─── */
  const loadOrders = useCallback(async () => {
    if (!user || !currentProject) return
    setOrdersLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('material_orders')
        .select('*')
        .eq('project_id', currentProject)
        .order('created_at', { ascending: false })
        .limit(100)

      if (err) throw err
      setOrders((data as MaterialOrderRow[]) ?? [])
    } catch {
      // table may not exist yet, silent
      setOrders([])
    } finally {
      setOrdersLoading(false)
    }
  }, [user, currentProject])

  /* ── Submit order ─── */
  const handleSubmitOrder = useCallback(async () => {
    if (!user || !currentProject) return
    if (!oMaterial) {
      toast('err', 'Chon vat tu / 자재를 선택하세요')
      return
    }
    const qty = parseFloat(oQty) || 0
    if (qty <= 0) {
      toast('err', 'Nhap so luong / 수량을 입력하세요')
      return
    }
    setSaving(true)
    try {
      const materialItem = inventory.find((i) => i.id === oMaterial)
      const insertData: Record<string, unknown> = {
        project_id: currentProject,
        item_name: materialItem?.name || oMaterial,
        quantity: qty,
        unit: oUnit,
        urgency: oUrgency,
        expected_date: oExpDate || null,
        requested_by: user.id,
        status: 'pending',
        note: oNote.trim() || null,
      }

      let { error: err } = await supabase
        .from('material_orders')
        .insert(insertData)

      // Fallback: remove optional columns
      if (err?.message?.includes('column') || err?.message?.includes('does not exist')) {
        delete insertData.urgency
        delete insertData.expected_date
        ;({ error: err } = await supabase.from('material_orders').insert(insertData))
      }

      if (err) throw err

      setOQty('')
      setONote('')
      toast('ok', 'Da gui yeu cau dat hang / 발주 요청 완료')
      await loadOrders()
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Dat hang that bai / 발주 실패')
    } finally {
      setSaving(false)
    }
  }, [user, currentProject, oMaterial, oQty, oUnit, oUrgency, oExpDate, oNote, inventory, toast, loadOrders])

  /* ── Update order status ─── */
  const handleUpdateOrderStatus = useCallback(async (orderId: string, newStatus: string) => {
    if (!user) return
    setSaving(true)
    try {
      const { error: err } = await supabase
        .from('material_orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (err) throw err
      toast('ok', `Trang thai: ${newStatus} / 상태 변경: ${newStatus}`)
      await loadOrders()
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Cap nhat that bai / 상태 변경 실패')
    } finally {
      setSaving(false)
    }
  }, [user, toast, loadOrders])

  /* ── Load data ─── */
  useEffect(() => {
    if (user && currentProject) {
      loadInventory()
      loadTransactions()
      loadOrders()
    }
  }, [user, currentProject, loadInventory, loadTransactions, loadOrders])

  /* ── Toast ─── */
  const toast = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  /* ── Add item ─── */
  async function handleAddItem() {
    if (!iName.trim()) {
      toast('err', 'Nhap ten vat tu / 자재명을 입력하세요')
      return
    }
    setSaving(true)
    try {
      await addItem({
        name: iName.trim(),
        unit: iUnit,
        current_stock: parseFloat(iStock) || 0,
        min_stock: parseFloat(iMin) || 0,
        location: iLoc.trim() || undefined,
      })
      setIName('')
      setIStock('')
      setIMin('')
      setILoc('')
      setShowAddItem(false)
      toast('ok', 'Da them vat tu / 자재 등록 완료')
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  /* ── Save transaction ─── */
  async function handleTransaction() {
    if (!tItemId) {
      toast('err', 'Chon vat tu / 자재를 선택하세요')
      return
    }
    const qty = parseFloat(tQty) || 0
    if (qty <= 0) {
      toast('err', 'Nhap so luong / 수량을 입력하세요')
      return
    }
    setSaving(true)
    try {
      const unitPrice = parseFloat(tPrice.replace(/[^0-9]/g, '')) || 0
      await saveTransaction({
        item_id: tItemId,
        transaction_type: tType,
        quantity: qty,
        transaction_date: tDate,
        vendor: tVendor.trim() || undefined,
        unit_price: unitPrice || undefined,
        total_amount: unitPrice ? unitPrice * qty : undefined,
        note: tNote.trim() || undefined,
      })
      setTQty('')
      setTVendor('')
      setTPrice('')
      setTNote('')
      toast(
        'ok',
        tType === 'in'
          ? 'Da nhap kho / 입고 완료'
          : 'Da xuat kho / 출고 완료',
      )
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Transaction failed')
    } finally {
      setSaving(false)
    }
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
            Vat tu / 자재관리
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Quan ly vat tu va nhap xuat kho / 자재 및 입출고 관리
          </p>
        </div>
        <button
          onClick={() => setShowAddItem(!showAddItem)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showAddItem ? 'Dong / 닫기' : 'Them vat tu / 자재 등록'}
        </button>
      </div>

      {/* ── Add Item Form ── */}
      {showAddItem && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              Dang ky vat tu moi / 신규 자재 등록
            </h3>
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Ten vat tu / 자재명
                </label>
                <input
                  type="text"
                  value={iName}
                  onChange={(e) => setIName(e.target.value)}
                  placeholder="VD: Xi mang / 시멘트"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Don vi / 단위
                </label>
                <select
                  value={iUnit}
                  onChange={(e) => setIUnit(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {MATERIAL_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Ton kho hien tai / 현재 재고
                </label>
                <input
                  type="number"
                  value={iStock}
                  onChange={(e) => setIStock(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Ton kho toi thieu / 최소 재고
                </label>
                <input
                  type="number"
                  value={iMin}
                  onChange={(e) => setIMin(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Vi tri / 위치
                </label>
                <input
                  type="text"
                  value={iLoc}
                  onChange={(e) => setILoc(e.target.value)}
                  placeholder="VD: Kho A"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={handleAddItem}
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Dang luu... / 저장 중...' : 'Luu / 저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Tong vat tu / 총 자재"
          value={String(inventory.length)}
          sub="loai / 종"
          color="bg-blue-500"
        />
        <KpiCard
          title="Duoi muc toi thieu / 최소 재고 미달"
          value={String(
            inventory.filter((i) => i.current_stock < i.min_stock).length,
          )}
          sub="loai / 종"
          color="bg-red-500"
        />
        <KpiCard
          title="Giao dich hom nay / 오늘 거래"
          value={String(
            transactions.filter((t) => t.transaction_date === today()).length,
          )}
          sub="phieu / 건"
          color="bg-green-500"
        />
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-200">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === t.value
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Stock Tab ── */}
        {tab === 'stock' && (
          <>
            {loading ? (
              <div className="p-8 text-center text-sm text-gray-400">
                Dang tai... / 로딩 중...
              </div>
            ) : inventory.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                Chua co vat tu / 자재 없음
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="px-3 py-3">Ten / 자재명</th>
                      <th className="px-3 py-3">Don vi / 단위</th>
                      <th className="px-3 py-3 text-right">Ton kho / 재고</th>
                      <th className="px-3 py-3 text-right">Toi thieu / 최소</th>
                      <th className="px-3 py-3">Vi tri / 위치</th>
                      <th className="px-3 py-3">Trang thai / 상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {inventory.map((item) => {
                      const isLow = item.current_stock < item.min_stock
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3 text-xs font-medium text-gray-900">
                            {item.name}
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-600">
                            {item.unit}
                          </td>
                          <td
                            className={`px-3 py-3 text-xs text-right font-mono font-bold ${
                              isLow ? 'text-red-600' : 'text-gray-900'
                            }`}
                          >
                            {item.current_stock.toLocaleString('vi-VN')}
                          </td>
                          <td className="px-3 py-3 text-xs text-right font-mono text-gray-500">
                            {item.min_stock.toLocaleString('vi-VN')}
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-600">
                            {item.location || '-'}
                          </td>
                          <td className="px-3 py-3">
                            {isLow ? (
                              <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-red-50 text-red-700">
                                Thieu / 부족
                              </span>
                            ) : (
                              <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-green-50 text-green-700">
                                Du / 충분
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── Transactions Tab ── */}
        {tab === 'transactions' && (
          <div>
            {/* Transaction form */}
            <div className="p-4 border-b border-gray-100">
              <h4 className="text-xs font-semibold text-gray-700 mb-3">
                Nhap / Xuat kho - 입고 / 출고
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Vat tu / 자재
                  </label>
                  <select
                    value={tItemId}
                    onChange={(e) => setTItemId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Chon vat tu / 자재 선택 --</option>
                    {inventory.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Loai / 구분
                  </label>
                  <select
                    value={tType}
                    onChange={(e) => setTType(e.target.value as 'in' | 'out')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="in">Nhap kho / 입고</option>
                    <option value="out">Xuat kho / 출고</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    So luong / 수량
                  </label>
                  <input
                    type="number"
                    value={tQty}
                    onChange={(e) => setTQty(e.target.value)}
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Ngay / 날짜
                  </label>
                  <input
                    type="date"
                    value={tDate}
                    onChange={(e) => setTDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    NCC / 거래처
                  </label>
                  <input
                    type="text"
                    value={tVendor}
                    onChange={(e) => setTVendor(e.target.value)}
                    placeholder="Nha cung cap"
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
                    value={tPrice}
                    onChange={(e) => setTPrice(e.target.value)}
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
                    value={tNote}
                    onChange={(e) => setTNote(e.target.value)}
                    placeholder="Ghi chu them"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleTransaction}
                    disabled={saving}
                    className={`w-full px-4 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors ${
                      tType === 'in'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-orange-600 hover:bg-orange-700'
                    }`}
                  >
                    {saving
                      ? '...'
                      : tType === 'in'
                        ? 'Nhap kho / 입고'
                        : 'Xuat kho / 출고'}
                  </button>
                </div>
              </div>
            </div>

            {/* Transaction history */}
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                Chua co giao dich / 거래 내역 없음
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="px-3 py-3">Ngay / 날짜</th>
                      <th className="px-3 py-3">Vat tu / 자재</th>
                      <th className="px-3 py-3">Loai / 구분</th>
                      <th className="px-3 py-3 text-right">SL / 수량</th>
                      <th className="px-3 py-3 text-right">Don gia / 단가</th>
                      <th className="px-3 py-3 text-right">Tong / 합계</th>
                      <th className="px-3 py-3">NCC / 거래처</th>
                      <th className="px-3 py-3">Ghi chu / 비고</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 text-xs text-gray-600 font-mono">
                          {tx.transaction_date}
                        </td>
                        <td className="px-3 py-3 text-xs font-medium text-gray-900">
                          {tx.material_items?.name || '-'}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${
                              tx.transaction_type === 'in'
                                ? 'bg-green-50 text-green-700'
                                : 'bg-orange-50 text-orange-700'
                            }`}
                          >
                            {tx.transaction_type === 'in'
                              ? 'Nhap / 입고'
                              : 'Xuat / 출고'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-right font-mono font-bold text-gray-900">
                          {tx.quantity.toLocaleString('vi-VN')}{' '}
                          {tx.material_items?.unit || ''}
                        </td>
                        <td className="px-3 py-3 text-xs text-right font-mono text-gray-600">
                          {tx.unit_price ? fmtVND(tx.unit_price) : '-'}
                        </td>
                        <td className="px-3 py-3 text-xs text-right font-mono font-bold text-gray-900">
                          {tx.total_amount ? fmtVND(tx.total_amount) : '-'}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600">
                          {tx.vendor || '-'}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500 max-w-[150px] truncate">
                          {tx.note || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Orders Tab ── */}
        {tab === 'orders' && (
          <div>
            {/* Order request form */}
            <div className="p-4 border-b border-gray-100">
              <h4 className="text-xs font-semibold text-gray-700 mb-3">
                Yeu cau dat hang / 발주 요청
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Vat tu / 자재
                  </label>
                  <select
                    value={oMaterial}
                    onChange={(e) => setOMaterial(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Chon vat tu / 자재 선택 --</option>
                    {inventory.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    So luong / 수량
                  </label>
                  <input
                    type="number"
                    value={oQty}
                    onChange={(e) => setOQty(e.target.value)}
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Don vi / 단위
                  </label>
                  <select
                    value={oUnit}
                    onChange={(e) => setOUnit(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {MATERIAL_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Muc do / 긴급도
                  </label>
                  <select
                    value={oUrgency}
                    onChange={(e) => setOUrgency(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="normal">Binh thuong / 일반</option>
                    <option value="urgent">Khan cap / 긴급</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Ngay du kien / 희망 납기
                  </label>
                  <input
                    type="date"
                    value={oExpDate}
                    onChange={(e) => setOExpDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Ghi chu / 비고
                  </label>
                  <input
                    type="text"
                    value={oNote}
                    onChange={(e) => setONote(e.target.value)}
                    placeholder="Ghi chu them"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-end sm:col-span-2">
                  <button
                    onClick={handleSubmitOrder}
                    disabled={saving}
                    className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? '...' : 'Gui yeu cau / 발주 요청'}
                  </button>
                </div>
              </div>
            </div>

            {/* Low stock items */}
            {inventory.filter((i) => i.current_stock < i.min_stock).length > 0 && (
              <div className="p-4 border-b border-gray-100">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h4 className="text-xs font-semibold text-blue-800 mb-2">
                    Vat tu can dat hang / 발주 필요 자재
                  </h4>
                  {inventory
                    .filter((i) => i.current_stock < i.min_stock)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-1.5 border-b border-blue-100 last:border-0"
                      >
                        <span className="text-xs font-medium text-blue-900">
                          {item.name}
                        </span>
                        <span className="text-xs text-red-600 font-mono">
                          {item.current_stock} / {item.min_stock} {item.unit}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Orders list */}
            {ordersLoading ? (
              <div className="p-8 text-center text-sm text-gray-400">
                Dang tai... / 로딩 중...
              </div>
            ) : orders.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                Chua co yeu cau dat hang / 발주 요청 없음
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="px-3 py-3">Ngay / 날짜</th>
                      <th className="px-3 py-3">Vat tu / 자재</th>
                      <th className="px-3 py-3 text-right">SL / 수량</th>
                      <th className="px-3 py-3">Don vi / 단위</th>
                      <th className="px-3 py-3">Muc do / 긴급</th>
                      <th className="px-3 py-3">Ngay du kien / 납기</th>
                      <th className="px-3 py-3">Trang thai / 상태</th>
                      <th className="px-3 py-3">Ghi chu / 비고</th>
                      {canManage && <th className="px-3 py-3 text-center">Thao tac / 관리</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 text-xs text-gray-600 font-mono whitespace-nowrap">
                          {order.created_at?.slice(0, 10) || '-'}
                        </td>
                        <td className="px-3 py-3 text-xs font-medium text-gray-900">
                          {order.item_name}
                        </td>
                        <td className="px-3 py-3 text-xs text-right font-mono font-bold text-gray-900">
                          {order.quantity}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600">
                          {order.unit}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${
                              order.urgency === 'urgent'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {order.urgency === 'urgent' ? 'Khan cap / 긴급' : 'Binh thuong / 일반'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600 font-mono whitespace-nowrap">
                          {order.expected_date || '-'}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${
                              order.status === 'delivered'
                                ? 'bg-green-50 text-green-700'
                                : order.status === 'approved'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-yellow-50 text-yellow-700'
                            }`}
                          >
                            {order.status === 'delivered'
                              ? 'Da nhan / 납품완료'
                              : order.status === 'approved'
                                ? 'Da duyet / 승인'
                                : 'Cho duyet / 대기'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500 max-w-[150px] truncate">
                          {order.reason || '-'}
                        </td>
                        {canManage && (
                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              {order.status === 'pending' && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, 'approved')}
                                  disabled={saving}
                                  className="px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                  Duyet / 승인
                                </button>
                              )}
                              {order.status === 'approved' && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                                  disabled={saving}
                                  className="px-2 py-1 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                                >
                                  Nhan hang / 납품
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Sub-components ────────────────────────────────── */

function KpiCard({
  title,
  value,
  sub,
  color,
}: {
  title: string
  value: string
  sub: string
  color: string
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 truncate">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
          <p className="mt-1 text-xs text-gray-400">{sub}</p>
        </div>
        <div className={`w-3 h-3 rounded-full ${color} shrink-0 mt-1`} />
      </div>
    </div>
  )
}
