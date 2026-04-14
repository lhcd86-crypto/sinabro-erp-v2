'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isFinance } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

/* -- Types ------------------------------------------------ */

interface MonthlyCashFlow {
  month: string
  income: number
  expense: number
  net: number
}

/* -- Helpers ---------------------------------------------- */

function fmtVND(n: number): string {
  return n.toLocaleString('vi-VN') + ' VND'
}

function shortMonth(m: string): string {
  const [y, mo] = m.split('-')
  return `${y}.${mo}`
}

/* -- Component -------------------------------------------- */

export default function AccountingPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const [totalIncome, setTotalIncome] = useState(0)
  const [totalExpense, setTotalExpense] = useState(0)
  const [accountsReceivable, setAccountsReceivable] = useState(0)
  const [cashFlow, setCashFlow] = useState<MonthlyCashFlow[]>([])

  const toast = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  /* -- Load data ------------------------------------------ */
  const loadData = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const [{ data: billings }, { data: expenses }] = await Promise.all([
        supabase
          .from('billings')
          .select('paid_amount, billed_amount, payment_date, period')
          .eq('project_id', currentProject),
        supabase
          .from('expenses')
          .select('amount, date')
          .eq('project_id', currentProject),
      ])

      const billRows = billings ?? []
      const expRows = expenses ?? []

      // Summary totals
      const incTotal = billRows.reduce((s, r) => s + (r.paid_amount ?? 0), 0)
      const expTotal = expRows.reduce((s, r) => s + (r.amount ?? 0), 0)
      const billedNotPaid = billRows.reduce(
        (s, r) => s + ((r.billed_amount ?? 0) - (r.paid_amount ?? 0)),
        0,
      )

      setTotalIncome(incTotal)
      setTotalExpense(expTotal)
      setAccountsReceivable(Math.max(0, billedNotPaid))

      // Monthly cash flow
      const monthMap: Record<string, { income: number; expense: number }> = {}

      for (const b of billRows) {
        const m = (b.payment_date ?? b.period ?? '').slice(0, 7)
        if (!m) continue
        if (!monthMap[m]) monthMap[m] = { income: 0, expense: 0 }
        monthMap[m].income += b.paid_amount ?? 0
      }

      for (const e of expRows) {
        const m = (e.date ?? '').slice(0, 7)
        if (!m) continue
        if (!monthMap[m]) monthMap[m] = { income: 0, expense: 0 }
        monthMap[m].expense += e.amount ?? 0
      }

      const months = Object.keys(monthMap).sort()
      const flows: MonthlyCashFlow[] = months.map((m) => ({
        month: m,
        income: monthMap[m].income,
        expense: monthMap[m].expense,
        net: monthMap[m].income - monthMap[m].expense,
      }))

      setCashFlow(flows)
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [currentProject, toast])

  useEffect(() => {
    if (user && currentProject) loadData()
  }, [user, currentProject, loadData])

  /* -- Access guard ---------------------------------------- */
  if (!user) return null

  if (!isFinance(user.role)) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
        Khong co quyen truy cap / 접근 권한이 없습니다. (account, director_m, ceo)
      </div>
    )
  }

  if (!currentProject) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        Vui long chon cong trinh / 현장을 선택해주세요.
      </div>
    )
  }

  const balance = totalIncome - totalExpense

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Tong quan tai chinh / 회계 개요
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Quan ly chi phi va doanh thu / 비용 및 수입 관리
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Tong thu nhap / 수입</p>
              <p className="mt-2 text-xl font-bold text-gray-900">{fmtVND(totalIncome)}</p>
              <p className="mt-1 text-xs text-gray-400">Da thanh toan / 지급 완료</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-green-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Tong chi / 지출</p>
              <p className="mt-2 text-xl font-bold text-gray-900">{fmtVND(totalExpense)}</p>
              <p className="mt-1 text-xs text-gray-400">Tong chi phi / 총 비용</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-red-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">So du / 잔액</p>
              <p className={`mt-2 text-xl font-bold ${balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {fmtVND(balance)}
              </p>
              <p className="mt-1 text-xs text-gray-400">Thu - Chi / 수입 - 지출</p>
            </div>
            <div className={`w-3 h-3 rounded-full ${balance >= 0 ? 'bg-emerald-500' : 'bg-red-500'} shrink-0 mt-1`} />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Cong no / 미수금</p>
              <p className="mt-2 text-xl font-bold text-amber-700">{fmtVND(accountsReceivable)}</p>
              <p className="mt-1 text-xs text-gray-400">Chua thanh toan / 미지급</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0 mt-1" />
          </div>
        </div>
      </div>

      {/* Monthly Cash Flow Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Dong tien hang thang / 월별 현금 흐름
          </h3>
          <button
            onClick={loadData}
            disabled={loading}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
          >
            {loading ? 'Dang tai... / 로딩 중...' : 'Lam moi / 새로고침'}
          </button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Dang tai... / 로딩 중...
          </div>
        ) : cashFlow.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Chua co du lieu / 데이터 없음
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">Thang / 월</th>
                  <th className="px-3 py-3 text-right">Thu nhap / 수입</th>
                  <th className="px-3 py-3 text-right">Chi phi / 지출</th>
                  <th className="px-3 py-3 text-right">Rong / 순이익</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cashFlow.map((row) => (
                  <tr key={row.month} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-xs text-gray-700 font-mono whitespace-nowrap">
                      {shortMonth(row.month)}
                    </td>
                    <td className="px-3 py-3 text-xs text-green-700 text-right font-mono">
                      {fmtVND(row.income)}
                    </td>
                    <td className="px-3 py-3 text-xs text-red-700 text-right font-mono">
                      {fmtVND(row.expense)}
                    </td>
                    <td className={`px-3 py-3 text-xs text-right font-mono font-semibold ${
                      row.net >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {fmtVND(row.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-3 py-3 text-xs text-gray-700">Tong / 합계</td>
                  <td className="px-3 py-3 text-xs text-green-700 text-right font-mono">
                    {fmtVND(cashFlow.reduce((s, r) => s + r.income, 0))}
                  </td>
                  <td className="px-3 py-3 text-xs text-red-700 text-right font-mono">
                    {fmtVND(cashFlow.reduce((s, r) => s + r.expense, 0))}
                  </td>
                  <td className={`px-3 py-3 text-xs text-right font-mono ${
                    balance >= 0 ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {fmtVND(cashFlow.reduce((s, r) => s + r.net, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
