import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

/* ── Types ── */

export interface LeaveBalance {
  id: string
  user_id: string
  total: number
  used: number
  remaining: number
}

export interface LeaveRecord {
  id: string
  user_id: string
  leave_type: string
  start_date: string
  end_date: string
  half_day: 'full' | 'am' | 'pm'
  days: number
  reason: string | null
  status: 'pending' | 'approved' | 'rejected'
  approved_by: string | null
  created_at: string
  users?: { name: string; role: string; hire_date: string } | null
  approver?: { name: string } | null
}

export type LeaveType = '연차' | '병가' | '경조사' | '무급' | '공가'

export const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: '연차', label: 'Phep nam / 연차' },
  { value: '병가', label: 'Om dau / 병가' },
  { value: '경조사', label: 'Hieu hi / 경조사' },
  { value: '무급', label: 'Khong luong / 무급' },
  { value: '공가', label: 'Cong vu / 공가' },
]

/* ── Helpers ── */

function calcDays(start: string, end: string, half: 'full' | 'am' | 'pm'): number {
  const s = new Date(start)
  const e = new Date(end)
  const diff = Math.floor((e.getTime() - s.getTime()) / 86400000) + 1
  if (diff <= 0) return 0
  if (diff === 1 && half !== 'full') return 0.5
  return diff
}

function todayStr(): string {
  const d = new Date()
  const offset = 7 * 60
  const local = new Date(d.getTime() + offset * 60000)
  return local.toISOString().slice(0, 10)
}

/* ── Hook ── */

export function useLeave() {
  const user = useAuthStore((s) => s.user)

  const [balance, setBalance] = useState<LeaveBalance | null>(null)
  const [history, setHistory] = useState<LeaveRecord[]>([])
  const [allLeaves, setAllLeaves] = useState<LeaveRecord[]>([])
  const [allBalances, setAllBalances] = useState<(LeaveBalance & { users?: { name: string; role: string; hire_date: string } | null })[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* ── Load my balance ── */
  const loadBalance = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (err && err.code !== 'PGRST116') throw err

      if (data) {
        setBalance({
          id: data.id,
          user_id: data.user_id,
          total: data.total ?? 12,
          used: data.used ?? 0,
          remaining: data.remaining ?? (data.total ?? 12) - (data.used ?? 0),
        })
      } else {
        setBalance({ id: '', user_id: user.id, total: 12, used: 0, remaining: 12 })
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Load failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  /* ── Load my history ── */
  const loadHistory = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('leave_requests')
        .select('*, approver:approved_by(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (err) throw err
      setHistory((data ?? []) as LeaveRecord[])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Load failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  /* ── Submit leave request ── */
  const submitLeave = useCallback(async (
    leaveType: string,
    startDate: string,
    endDate: string,
    halfDay: 'full' | 'am' | 'pm',
    reason: string,
  ) => {
    if (!user?.id) throw new Error('Chua dang nhap / 로그인 필요')
    if (!reason.trim()) throw new Error('Vui long nhap ly do / 사유를 입력하세요')

    const today = todayStr()
    if (startDate < today) throw new Error('Khong the chon ngay qua khu / 과거 날짜는 선택할 수 없습니다')
    if (endDate < startDate) throw new Error('Ngay ket thuc phai sau ngay bat dau / 종료일이 시작일보다 빨라야 합니다')

    const days = calcDays(startDate, endDate, halfDay)
    if (days <= 0) throw new Error('So ngay khong hop le / 유효하지 않은 일수')

    const { error: insErr } = await supabase
      .from('leave_requests')
      .insert({
        user_id: user.id,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        half_day: halfDay,
        days,
        reason,
        status: 'pending',
      })

    if (insErr) throw insErr

    await loadHistory()
    await loadBalance()
  }, [user?.id, loadHistory, loadBalance])

  /* ── Load all leaves (admin) ── */
  const loadAllLeaves = useCallback(async (status?: string, yearMonth?: string) => {
    setLoading(true)
    setError(null)
    try {
      let q = supabase
        .from('leave_requests')
        .select('*, users:user_id(name, role, hire_date), approver:approved_by(name)')
        .order('created_at', { ascending: false })

      if (status && status !== 'all') {
        q = q.eq('status', status)
      }

      if (yearMonth) {
        const startDate = `${yearMonth}-01`
        const [y, m] = yearMonth.split('-').map(Number)
        const lastDay = new Date(y, m, 0).getDate()
        const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`
        q = q.gte('start_date', startDate).lte('start_date', endDate)
      }

      const { data, error: err } = await q
      if (err) throw err
      setAllLeaves((data ?? []) as LeaveRecord[])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Load failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  /* ── Load all balances (admin) ── */
  const loadAllBalances = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('leave_balances')
        .select('*, users:user_id(name, role, hire_date)')
        .order('user_id')

      if (err) throw err
      setAllBalances((data ?? []) as typeof allBalances)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Load failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  /* ── Approve leave ── */
  const approveLeave = useCallback(async (leaveId: string) => {
    if (!user?.id) throw new Error('Chua dang nhap / 로그인 필요')

    const { error: err } = await supabase
      .from('leave_requests')
      .update({ status: 'approved', approved_by: user.id })
      .eq('id', leaveId)

    if (err) throw err

    // Update leave balance: increase used, decrease remaining
    const { data: req } = await supabase
      .from('leave_requests')
      .select('user_id, days')
      .eq('id', leaveId)
      .single()

    if (req) {
      const { data: bal } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('user_id', req.user_id)
        .single()

      if (bal) {
        await supabase
          .from('leave_balances')
          .update({
            used: (bal.used ?? 0) + (req.days ?? 0),
            remaining: (bal.total ?? 12) - (bal.used ?? 0) - (req.days ?? 0),
          })
          .eq('id', bal.id)
      }
    }
  }, [user?.id])

  /* ── Reject leave ── */
  const rejectLeave = useCallback(async (leaveId: string) => {
    if (!user?.id) throw new Error('Chua dang nhap / 로그인 필요')

    const { error: err } = await supabase
      .from('leave_requests')
      .update({ status: 'rejected', approved_by: user.id })
      .eq('id', leaveId)

    if (err) throw err
  }, [user?.id])

  /* ── Update balance (admin adjust) ── */
  const updateBalance = useCallback(async (balanceId: string, newTotal: number) => {
    const { data: bal } = await supabase
      .from('leave_balances')
      .select('used')
      .eq('id', balanceId)
      .single()

    const used = bal?.used ?? 0

    const { error: err } = await supabase
      .from('leave_balances')
      .update({
        total: newTotal,
        remaining: newTotal - used,
      })
      .eq('id', balanceId)

    if (err) throw err
  }, [])

  return {
    balance,
    history,
    allLeaves,
    allBalances,
    loading,
    error,
    loadBalance,
    loadHistory,
    submitLeave,
    loadAllLeaves,
    loadAllBalances,
    approveLeave,
    rejectLeave,
    updateBalance,
  }
}
