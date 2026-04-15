import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

/* ── Types ─────────────────────────────────────────── */

export interface AdvanceRecord {
  id: string
  project_id: string
  user_id: string
  requester_name: string
  request_date: string
  category: string
  amount: number
  detail: string | null
  receipt_type: string | null
  receipt_url: string | null
  status: string
  current_step: string | null
  created_at: string
  users?: { name: string } | null
  projects?: { code: string } | null
}

export interface AdvanceRequest {
  id: string
  project_id: string
  user_id: string
  amount: number
  needed_date: string
  purpose: string | null
  reason: string | null
  status: string
  current_step: string | null
  created_at: string
  users?: { name: string } | null
  projects?: { code: string } | null
}

export interface AdvanceDeposit {
  id: string
  project_id: string
  amount: number
  deposit_date: string
  note: string | null
  processed_by: string | null
  projects?: { code: string } | null
}

/* ── Hook ──────────────────────────────────────────── */

export function useAdvance() {
  const [advances, setAdvances] = useState<AdvanceRecord[]>([])
  const [requests, setRequests] = useState<AdvanceRequest[]>([])
  const [deposits, setDeposits] = useState<AdvanceDeposit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  /* ── Load advances (usage history) ─── */
  const loadAdvances = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('advances')
        .select('*')
        .order('request_date', { ascending: false })
        .limit(200)

      if (currentProject) query = query.eq('project_id', currentProject)

      const { data, error: err } = await query
      if (err) throw new Error(err.message)
      setAdvances((data as AdvanceRecord[]) ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load advances')
    } finally {
      setLoading(false)
    }
  }, [user, currentProject])

  /* ── Load deposits ─── */
  const loadDeposits = useCallback(async () => {
    if (!user) return
    try {
      let query = supabase
        .from('advance_deposits')
        .select('*')
        .order('deposit_date', { ascending: false })
        .limit(200)

      if (currentProject) query = query.eq('project_id', currentProject)

      const { data, error: err } = await query
      if (err) throw new Error(err.message)
      setDeposits((data as AdvanceDeposit[]) ?? [])
    } catch (e) {
      console.warn('loadDeposits error:', e)
    }
  }, [user, currentProject])

  /* ── Load advance requests ─── */
  const loadRequests = useCallback(async () => {
    if (!user) return
    try {
      let query = supabase
        .from('advance_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (currentProject) query = query.eq('project_id', currentProject)

      // Non-admin roles see only their own
      if (['engineer', 'foreman', 'driver'].includes(user.role)) {
        query = query.eq('user_id', user.id)
      }

      const { data, error: err } = await query
      if (err) throw new Error(err.message)
      setRequests((data as AdvanceRequest[]) ?? [])
    } catch (e) {
      console.warn('loadRequests error:', e)
    }
  }, [user, currentProject])

  /* ── Save advance usage ─── */
  const saveAdvance = useCallback(
    async (rec: {
      request_date: string
      category: string
      amount: number
      detail: string
      receipt_type: string
      receipt_url?: string | null
    }) => {
      if (!user || !currentProject) throw new Error('No user or project')

      const now = new Date().toISOString()
      const insertData: Record<string, unknown> = {
        project_id: currentProject,
        user_id: user.id,
        requester_name: user.name,
        request_date: rec.request_date,
        category: rec.category,
        amount: rec.amount,
        detail: rec.detail,
        receipt_type: rec.receipt_type,
        receipt_url: rec.receipt_url ?? null,
        status: '대기중', // 대기중
        current_step: 'recorded',
        approval_chain: {
          recorded: {
            by: user.id,
            by_name: user.name,
            role: user.role,
            at: now,
          },
        },
      }

      let { error: err } = await supabase.from('advances').insert(insertData)

      // Fallback: approval columns may not exist
      if (
        err?.message?.includes('approval_chain') ||
        err?.message?.includes('current_step')
      ) {
        delete insertData.approval_chain
        delete insertData.current_step
        ;({ error: err } = await supabase.from('advances').insert(insertData))
      }

      // Fallback: receipt columns may not exist
      if (
        err?.message?.includes('receipt_type') ||
        err?.message?.includes('receipt_url')
      ) {
        delete insertData.receipt_type
        delete insertData.receipt_url
        ;({ error: err } = await supabase.from('advances').insert(insertData))
      }

      if (err) throw new Error(err.message)
      await loadAdvances()
    },
    [user, currentProject, loadAdvances],
  )

  /* ── Save advance request ─── */
  const saveAdvRequest = useCallback(
    async (rec: {
      amount: number
      needed_date: string
      purpose: string
      reason: string
    }) => {
      if (!user || !currentProject) throw new Error('No user or project')

      const now = new Date().toISOString()
      const insertData: Record<string, unknown> = {
        project_id: currentProject,
        user_id: user.id,
        amount: rec.amount,
        needed_date: rec.needed_date,
        purpose: rec.purpose || '기타',
        reason: rec.reason,
        status: '대기', // 대기
        current_step: 'requested',
        approval_chain: {
          requested: {
            by: user.id,
            by_name: user.name,
            role: user.role,
            at: now,
          },
        },
      }

      let { error: err } = await supabase
        .from('advance_requests')
        .insert(insertData)

      // Fallback: approval columns
      if (
        err?.message?.includes('approval_chain') ||
        err?.message?.includes('current_step')
      ) {
        delete insertData.approval_chain
        delete insertData.current_step
        ;({ error: err } = await supabase
          .from('advance_requests')
          .insert(insertData))
      }

      // Fallback: purpose/reason columns
      if (
        err?.message?.includes('purpose') ||
        err?.message?.includes('reason')
      ) {
        const minData = {
          project_id: currentProject,
          user_id: user.id,
          amount: rec.amount,
          needed_date: rec.needed_date,
          status: '대기',
        }
        ;({ error: err } = await supabase
          .from('advance_requests')
          .insert(minData))
      }

      if (err) throw new Error(err.message)
      await loadRequests()
    },
    [user, currentProject, loadRequests],
  )

  /* ── Approve advance usage step ─── */
  const approveAdvance = useCallback(
    async (id: string) => {
      if (!user) return
      const { error: err } = await supabase
        .from('advances')
        .update({
          status: '정산완료', // 정산완료
          current_step: 'settled',
        })
        .eq('id', id)

      if (err) throw new Error(err.message)
      await loadAdvances()
    },
    [user, loadAdvances],
  )

  /* ── Approve advance request ─── */
  const approveRequest = useCallback(
    async (id: string) => {
      if (!user) return
      const { error: err } = await supabase
        .from('advance_requests')
        .update({ status: '승인' }) // 승인
        .eq('id', id)

      if (err) throw new Error(err.message)
      await loadRequests()
    },
    [user, loadRequests],
  )

  /* ── Reject advance request ─── */
  const rejectRequest = useCallback(
    async (id: string) => {
      if (!user) return
      const { error: err } = await supabase
        .from('advance_requests')
        .update({ status: '거절' }) // 거절
        .eq('id', id)

      if (err) throw new Error(err.message)
      await loadRequests()
    },
    [user, loadRequests],
  )

  return {
    advances,
    requests,
    deposits,
    loading,
    error,
    loadAdvances,
    loadDeposits,
    loadRequests,
    saveAdvance,
    saveAdvRequest,
    approveAdvance,
    approveRequest,
    rejectRequest,
  }
}
