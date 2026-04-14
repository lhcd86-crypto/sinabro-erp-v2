import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

/* ── Types ─────────────────────────────────────────── */

export interface BillingRecord {
  id: string
  project_id: string
  billing_date: string
  description: string
  amount: number
  contract_item: string | null
  status: string
  prepayment_deduction: number | null
  net_amount: number | null
  note: string | null
  submitted_by: string
  created_at: string
  projects?: { code: string } | null
  users?: { name: string } | null
}

export interface PrepaymentRecord {
  id: string
  project_id: string
  amount: number
  received_date: string
  remaining: number
  note: string | null
  created_at: string
}

export type BillingStatus =
  | 'draft'
  | 'submitted'
  | 'reviewed'
  | 'approved'
  | 'invoiced'
  | 'paid'
  | 'rejected'

export const BILLING_STATUSES: { value: BillingStatus; label: string }[] = [
  { value: 'draft', label: 'Nhap / 초안' },
  { value: 'submitted', label: 'Da gui / 제출' },
  { value: 'reviewed', label: 'Da kiem tra / 검토완료' },
  { value: 'approved', label: 'Da duyet / 승인' },
  { value: 'invoiced', label: 'Da xuat HD / 청구' },
  { value: 'paid', label: 'Da thanh toan / 수금완료' },
  { value: 'rejected', label: 'Tu choi / 반려' },
]

/* ── Hook ──────────────────────────────────────────── */

export function useBilling() {
  const [billings, setBillings] = useState<BillingRecord[]>([])
  const [prepayments, setPrepayments] = useState<PrepaymentRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  /* ── Load billings ─── */
  const loadBillings = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('billings')
        .select('*, projects:project_id(code)')
        .order('billing_date', { ascending: false })
        .limit(300)

      if (currentProject) query = query.eq('project_id', currentProject)

      const { data, error: err } = await query
      if (err) throw new Error(err.message)
      setBillings((data as BillingRecord[]) ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load billings')
    } finally {
      setLoading(false)
    }
  }, [user, currentProject])

  /* ── Save billing ─── */
  const saveBilling = useCallback(
    async (rec: {
      billing_date: string
      description: string
      amount: number
      contract_item?: string
      prepayment_deduction?: number
      note?: string
    }) => {
      if (!user || !currentProject)
        throw new Error('No user or project selected')

      const deduction = rec.prepayment_deduction || 0
      const netAmount = rec.amount - deduction

      const insertData: Record<string, unknown> = {
        project_id: currentProject,
        billing_date: rec.billing_date,
        description: rec.description,
        amount: rec.amount,
        contract_item: rec.contract_item || null,
        prepayment_deduction: deduction,
        net_amount: netAmount,
        note: rec.note || null,
        submitted_by: user.id,
        status: 'draft',
      }

      let { error: err } = await supabase.from('billings').insert(insertData)

      // Fallback: remove optional columns
      if (
        err?.message?.includes('column') ||
        err?.message?.includes('does not exist')
      ) {
        delete insertData.contract_item
        delete insertData.prepayment_deduction
        delete insertData.net_amount
        ;({ error: err } = await supabase.from('billings').insert(insertData))
      }

      if (err) throw new Error(err.message)
      await loadBillings()
    },
    [user, currentProject, loadBillings],
  )

  /* ── Update billing status ─── */
  const updateBillingStatus = useCallback(
    async (id: string, status: BillingStatus) => {
      if (!user) throw new Error('No user')

      const { error: err } = await supabase
        .from('billings')
        .update({ status })
        .eq('id', id)

      if (err) throw new Error(err.message)
      await loadBillings()
    },
    [user, loadBillings],
  )

  /* ── Load prepayments ─── */
  const loadPrepayments = useCallback(async () => {
    if (!user) return
    try {
      let query = supabase
        .from('prepayments')
        .select('*')
        .order('received_date', { ascending: false })
        .limit(100)

      if (currentProject) query = query.eq('project_id', currentProject)

      const { data, error: err } = await query
      if (err) throw new Error(err.message)
      setPrepayments((data as PrepaymentRecord[]) ?? [])
    } catch (e) {
      console.warn('Failed to load prepayments:', e)
      setPrepayments([])
    }
  }, [user, currentProject])

  return {
    billings,
    prepayments,
    loading,
    error,
    loadBillings,
    saveBilling,
    updateBillingStatus,
    loadPrepayments,
  }
}
