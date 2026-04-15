import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

/* ── Types ─────────────────────────────────────────── */

export interface ExpenseRecord {
  id: string
  project_id: string
  expense_date: string
  category: string
  description: string | null
  vendor: string | null
  unit: string | null
  qty: number | null
  unit_price: number | null
  total_amount: number
  vat_rate: number | null
  vat_amount: number | null
  grand_total: number | null
  note: string | null
  doc_url: string | null
  submitted_by: string
  status: string
  current_step: string | null
  approval_chain: Record<string, unknown> | null
  created_at: string
  users?: { name: string } | null
  projects?: { code: string } | null
}

export type ExpenseCategory =
  | '자재'      // 자재
  | '장비'      // 장비
  | '인건비' // 인건비
  | '교통'      // 교통
  | '기타'      // 기타

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: '자재', label: 'Vat tu / 자재' },
  { value: '장비', label: 'Thiet bi / 장비' },
  { value: '인건비', label: 'Nhan cong / 인건비' },
  { value: '교통', label: 'Giao thong / 교통' },
  { value: '기타', label: 'Khac / 기타' },
]

/* ── Hook ──────────────────────────────────────────── */

export function useExpense() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  /* ── Load expenses ─── */
  const loadExpenses = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false })
        .limit(300)

      if (currentProject) query = query.eq('project_id', currentProject)

      const { data, error: err } = await query
      if (err) throw new Error(err.message)
      setExpenses((data as ExpenseRecord[]) ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }, [user, currentProject])

  /* ── Save expense ─── */
  const saveExpense = useCallback(
    async (rec: {
      expense_date: string
      category: string
      description: string
      vendor: string
      unit: string
      qty: number
      unit_price: number
      total_amount: number
      vat_rate: number
      vat_amount: number
      grand_total: number
      note: string
      doc_url?: string | null
    }) => {
      if (!user || !currentProject)
        throw new Error('No user or project selected')

      const now = new Date().toISOString()
      const insertData: Record<string, unknown> = {
        expense_date: rec.expense_date,
        category: rec.category,
        project_id: currentProject,
        item_name: rec.description,
        description: rec.description,
        vendor: rec.vendor,
        unit: rec.unit,
        qty: rec.qty,
        unit_price: rec.unit_price,
        total_amount: rec.total_amount,
        vat_rate: rec.vat_rate,
        vat_amount: rec.vat_amount,
        grand_total: rec.grand_total,
        note: rec.note || null,
        doc_url: rec.doc_url ?? null,
        submitted_by: user.id,
        submitted_role: user.role,
        status: '대기', // 대기
        current_step: 'submitted',
        approval_chain: {
          submitted: {
            by: user.id,
            by_name: user.name,
            role: user.role,
            at: now,
          },
        },
      }

      let { error: err } = await supabase.from('expenses').insert(insertData)

      // Fallback: approval columns
      if (
        err?.message?.includes('approval_chain') ||
        err?.message?.includes('current_step') ||
        err?.message?.includes('submitted_role')
      ) {
        delete insertData.approval_chain
        delete insertData.current_step
        delete insertData.submitted_role
        ;({ error: err } = await supabase.from('expenses').insert(insertData))
      }

      // Fallback: VAT columns
      if (
        err?.message?.includes('vat_rate') ||
        err?.message?.includes('vat_amount') ||
        err?.message?.includes('grand_total')
      ) {
        delete insertData.vat_rate
        delete insertData.vat_amount
        delete insertData.grand_total
        ;({ error: err } = await supabase.from('expenses').insert(insertData))
      }

      // Fallback: minimal fields
      if (
        err?.message?.includes('column') ||
        err?.message?.includes('does not exist')
      ) {
        const minData = {
          expense_date: rec.expense_date,
          category: rec.category,
          project_id: currentProject,
          description: rec.description,
          vendor: rec.vendor,
          total_amount: rec.total_amount,
          submitted_by: user.id,
          status: '대기',
        }
        ;({ error: err } = await supabase.from('expenses').insert(minData))
      }

      if (err) throw new Error(err.message)

      // Auto-insert price history
      if (rec.unit_price > 0) {
        await supabase.from('price_history').insert({
          item_name: rec.description,
          unit_price: rec.unit_price,
          vendor: rec.vendor,
          purchase_date: rec.expense_date,
          project_id: currentProject,
          category: rec.category,
          unit: rec.unit,
          qty: rec.qty,
        }).then(({ error: phErr }) => {
          if (phErr) console.warn('price_history insert skipped:', phErr.message)
        })
      }

      await loadExpenses()
    },
    [user, currentProject, loadExpenses],
  )

  /* ── Approve expense ─── */
  const approveExpense = useCallback(
    async (id: string) => {
      if (!user) return
      const { error: err } = await supabase
        .from('expenses')
        .update({ status: '승인' }) // 승인
        .eq('id', id)

      if (err) throw new Error(err.message)
      await loadExpenses()
    },
    [user, loadExpenses],
  )

  /* ── Reject expense ─── */
  const rejectExpense = useCallback(
    async (id: string) => {
      if (!user) return
      const { error: err } = await supabase
        .from('expenses')
        .update({ status: '반려' }) // 반려
        .eq('id', id)

      if (err) throw new Error(err.message)
      await loadExpenses()
    },
    [user, loadExpenses],
  )

  return {
    expenses,
    loading,
    error,
    loadExpenses,
    saveExpense,
    approveExpense,
    rejectExpense,
  }
}
