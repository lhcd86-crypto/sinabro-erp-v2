'use client'

import { useState, useCallback } from 'react'

/* ── Types ────────────────────────────────────────── */

interface LineItem {
  id: string
  work_type: string
  quantity: number
  unit: string
  unit_price: number
  subtotal: number
}

/* ── Helpers ───────────────────────────────────────── */

function fmtVND(n: number) {
  return n.toLocaleString('vi-VN')
}

function genId() {
  return Math.random().toString(36).slice(2, 10)
}

/* ── Component ─────────────────────────────────────── */

export default function EstimatorPage() {
  const [items, setItems] = useState<LineItem[]>([])
  const [vatEnabled, setVatEnabled] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Form state for new item
  const [fWorkType, setFWorkType] = useState('')
  const [fQty, setFQty] = useState('')
  const [fUnit, setFUnit] = useState('')
  const [fPrice, setFPrice] = useState('')

  /* ── Toast ─── */
  const toast = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  /* ── Add item ─── */
  function handleAddItem() {
    if (!fWorkType.trim()) {
      toast('err', 'Nhap loai cong viec / 공종을 입력하세요')
      return
    }
    const qty = parseFloat(fQty) || 0
    const price = parseFloat(fPrice.replace(/[^0-9]/g, '')) || 0
    if (!qty || !price) {
      toast('err', 'Nhap so luong va don gia / 수량과 단가를 입력하세요')
      return
    }

    const newItem: LineItem = {
      id: genId(),
      work_type: fWorkType.trim(),
      quantity: qty,
      unit: fUnit.trim() || 'EA',
      unit_price: price,
      subtotal: qty * price,
    }

    setItems((prev) => [...prev, newItem])
    setFWorkType('')
    setFQty('')
    setFUnit('')
    setFPrice('')
    toast('ok', 'Da them hang muc / 항목 추가 완료')
  }

  /* ── Remove item ─── */
  function handleRemoveItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  /* ── Print placeholder ─── */
  function handlePrint() {
    window.print()
  }

  /* ── Calculations ─── */
  const grandTotal = items.reduce((s, item) => s + item.subtotal, 0)
  const vatAmount = vatEnabled ? Math.round(grandTotal * 0.1) : 0
  const finalTotal = grandTotal + vatAmount

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
            Bao gia / 견적 계산기
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Tinh toan chi phi cong viec / 공사 견적 산출 도구
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            In / 인쇄
          </button>
        </div>
      </div>

      {/* ── Input Form ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            Them hang muc / 항목 추가
          </h3>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Loai cong viec / 공종
              </label>
              <input
                type="text"
                value={fWorkType}
                onChange={(e) => setFWorkType(e.target.value)}
                placeholder="VD: Do be tong, Cot thep..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                So luong / 수량
              </label>
              <input
                type="number"
                value={fQty}
                onChange={(e) => setFQty(e.target.value)}
                placeholder="0"
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
                placeholder="m3, m2, kg..."
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
                value={fPrice}
                onChange={(e) => setFPrice(e.target.value)}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Preview */}
          {fQty && fPrice && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-700">Thanh tien / 소계 (VND):</span>
                <span className="text-blue-900 font-bold font-mono text-sm">
                  {fmtVND(
                    (parseFloat(fQty) || 0) *
                      (parseFloat(fPrice.replace(/[^0-9]/g, '')) || 0),
                  )}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleAddItem}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Them / 항목 추가
            </button>
          </div>
        </div>
      </div>

      {/* ── VAT Toggle ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">
              Thue GTGT / VAT (10%)
            </p>
            <p className="text-xs text-gray-500">
              Ap dung thue gia tri gia tang / 부가가치세 적용
            </p>
          </div>
          <button
            onClick={() => setVatEnabled(!vatEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              vatEnabled ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                vatEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* ── Items Table ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden print:border-black">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Bang bao gia / 견적서
          </h3>
          <span className="text-xs text-gray-500">
            {items.length} hang muc / 항목
          </span>
        </div>

        {items.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Chua co hang muc / 항목을 추가하세요
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3 w-8">STT</th>
                  <th className="px-3 py-3">Cong viec / 공종</th>
                  <th className="px-3 py-3 text-right">SL / 수량</th>
                  <th className="px-3 py-3">DV / 단위</th>
                  <th className="px-3 py-3 text-right">Don gia / 단가</th>
                  <th className="px-3 py-3 text-right">Thanh tien / 소계</th>
                  <th className="px-3 py-3 text-center print:hidden">Xoa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-xs text-gray-500 font-mono">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-3 text-xs font-medium text-gray-900">
                      {item.work_type}
                    </td>
                    <td className="px-3 py-3 text-xs text-right font-mono text-gray-700">
                      {item.quantity.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600">
                      {item.unit}
                    </td>
                    <td className="px-3 py-3 text-xs text-right font-mono text-gray-700 whitespace-nowrap">
                      {fmtVND(item.unit_price)}
                    </td>
                    <td className="px-3 py-3 text-xs text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                      {fmtVND(item.subtotal)}
                    </td>
                    <td className="px-3 py-3 text-center print:hidden">
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Xoa / 삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {/* Subtotal */}
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={5} className="px-3 py-3 text-xs text-gray-700 text-right">
                    Tong cong / 합계:
                  </td>
                  <td className="px-3 py-3 text-xs text-right font-mono text-gray-900 whitespace-nowrap">
                    {fmtVND(grandTotal)}
                  </td>
                  <td className="print:hidden" />
                </tr>

                {/* VAT row */}
                {vatEnabled && (
                  <tr className="bg-amber-50 font-bold">
                    <td colSpan={5} className="px-3 py-3 text-xs text-amber-700 text-right">
                      VAT (10%):
                    </td>
                    <td className="px-3 py-3 text-xs text-right font-mono text-amber-800 whitespace-nowrap">
                      {fmtVND(vatAmount)}
                    </td>
                    <td className="print:hidden" />
                  </tr>
                )}

                {/* Final total */}
                <tr className="bg-gray-900 text-white font-bold">
                  <td colSpan={5} className="px-3 py-3 text-xs text-right">
                    Tong thanh toan / 총액 (VND):
                  </td>
                  <td className="px-3 py-3 text-xs text-right font-mono whitespace-nowrap">
                    {fmtVND(finalTotal)}
                  </td>
                  <td className="print:hidden" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Quick summary ── */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            title="Tong cong / 합계"
            value={fmtVND(grandTotal)}
            sub="VND (truoc thue / 세전)"
            color="bg-blue-500"
          />
          <KpiCard
            title="VAT / 부가세"
            value={fmtVND(vatAmount)}
            sub={vatEnabled ? '10%' : 'Tat / 미적용'}
            color="bg-amber-500"
          />
          <KpiCard
            title="Tong thanh toan / 총액"
            value={fmtVND(finalTotal)}
            sub="VND (sau thue / 세후)"
            color="bg-green-500"
          />
        </div>
      )}
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
