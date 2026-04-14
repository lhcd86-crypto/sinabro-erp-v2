import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Role } from '@/types'

/* ── Types ── */

export interface SalarySetting {
  id?: string
  user_id: string
  salary_type: 'daily' | 'monthly'
  base_amount: number
  overtime_rate: number
  probation_salary: number
  probation_rate: number
  meal_allowance: number
  responsibility_allowance: number
  female_allowance: number
  site_allowance: number
  insurance_base_amount: number
  bhxh_rate: number
  bhyt_rate: number
  bhtn_rate: number
}

export interface SalaryUser {
  id: string
  name: string
  role: Role
  hire_date: string | null
  probation_end_date: string | null
}

export interface SalaryRow {
  user_id: string
  name: string
  role: Role
  probation_days: number
  regular_days: number
  ot_hours: number
  probation_pay: number
  regular_pay: number
  meal_total: number
  meal_per_day: number
  allowances: number
  responsibility_allowance: number
  female_allowance: number
  site_allowance: number
  ot_pay: number
  other_bonus: number
  insurance_base: number
  insurance_deduction: number
  company_insurance: number
  bhxh_rate: number
  bhyt_rate: number
  bhtn_rate: number
  tax: number
  exception_deduction: number
  exception_hours: number
  other_deduction: number
  net_total: number
  base_amount: number
  salary_type: 'daily' | 'monthly'
}

/* ── Helpers ── */

function localDate(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Last day of a YYYY-MM string */
function ymEnd(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return `${ym}-${String(last).padStart(2, '0')}`
}

/** Count weekdays (Mon-Fri) for a given YYYY-MM */
function workDaysForYM(ym: string): number {
  const [y, m] = ym.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  let wd = 0
  for (let d = 1; d <= last; d++) {
    const dow = new Date(y, m - 1, d).getDay()
    if (dow !== 0 && dow !== 6) wd++
  }
  return wd
}

/* ── Hook ── */

export function useSalary() {
  const [users, setUsers] = useState<SalaryUser[]>([])
  const [settings, setSettings] = useState<Record<string, SalarySetting>>({})
  const [salaryRows, setSalaryRows] = useState<SalaryRow[]>([])
  const [grandTotal, setGrandTotal] = useState(0)
  const [totalCompanyInsurance, setTotalCompanyInsurance] = useState(0)
  const [totalInsurance, setTotalInsurance] = useState(0)
  const [loading, setLoading] = useState(false)

  /* ── Load settings + users ── */
  const loadSettings = useCallback(async () => {
    setLoading(true)
    try {
      const { data: allUsers, error } = await supabase
        .from('users')
        .select('id, name, role, hire_date, probation_end_date')
        .order('name')
      if (error) throw error

      const { data: allSettings, error: error2 } = await supabase
        .from('v_salary_settings')
        .select('*')
      if (error2) throw error2

      const setMap: Record<string, SalarySetting> = {}
      ;(allSettings || []).forEach((s: Record<string, unknown>) => {
        const uid = s.user_id as string
        setMap[uid] = {
          id: s.id as string | undefined,
          user_id: uid,
          salary_type: (s.salary_type as 'daily' | 'monthly') || 'daily',
          base_amount: Number(s.base_amount) || 0,
          overtime_rate: Number(s.overtime_rate) || 0,
          probation_salary: Number(s.probation_salary) || 0,
          probation_rate: s.probation_rate != null ? Number(s.probation_rate) : 0.85,
          meal_allowance: s.meal_allowance != null ? Number(s.meal_allowance) : 100000,
          responsibility_allowance: Number(s.responsibility_allowance) || 0,
          female_allowance: Number(s.female_allowance) || 0,
          site_allowance: Number(s.site_allowance) || 0,
          insurance_base_amount: Number(s.insurance_base_amount) || 0,
          bhxh_rate: s.bhxh_rate != null ? Number(s.bhxh_rate) : 8,
          bhyt_rate: s.bhyt_rate != null ? Number(s.bhyt_rate) : 1.5,
          bhtn_rate: s.bhtn_rate != null ? Number(s.bhtn_rate) : 1,
        }
      })

      setUsers((allUsers as SalaryUser[]) || [])
      setSettings(setMap)
    } finally {
      setLoading(false)
    }
  }, [])

  /* ── Save one user's salary setting (upsert) ── */
  const saveSetting = useCallback(async (userId: string, data: Omit<SalarySetting, 'user_id'>) => {
    const payload = { user_id: userId, ...data }

    const { data: existing } = await supabase
      .from('v_salary_settings')
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    let saveOk = false
    if (existing && existing.length > 0) {
      const { error } = await supabase
        .from('salary_settings')
        .update(payload)
        .eq('user_id', userId)
      if (error) {
        // Fallback: try basic fields only
        const basic = { user_id: userId, salary_type: data.salary_type, base_amount: data.base_amount, overtime_rate: data.overtime_rate }
        const { error: e2 } = await supabase.from('salary_settings').update(basic).eq('user_id', userId)
        if (!e2) saveOk = true
        else throw e2
      } else {
        saveOk = true
      }
    } else {
      const { error } = await supabase.from('salary_settings').insert(payload)
      if (error) {
        const basic = { user_id: userId, salary_type: data.salary_type, base_amount: data.base_amount, overtime_rate: data.overtime_rate }
        const { error: e2 } = await supabase.from('salary_settings').insert(basic)
        if (!e2) saveOk = true
        else throw e2
      } else {
        saveOk = true
      }
    }

    // Update local state
    if (saveOk) {
      setSettings((prev) => ({ ...prev, [userId]: { ...payload } }))
    }
    return saveOk
  }, [])

  /* ── Calculate salary for a month ── */
  const calcSalary = useCallback(async (ym: string) => {
    setLoading(true)
    try {
      // 1. Load users
      const { data: allUsers } = await supabase
        .from('users')
        .select('*')
        .order('name')

      // 2. Load salary settings
      const { data: allSettings } = await supabase
        .from('v_salary_settings')
        .select('*')
      const setMap: Record<string, Record<string, unknown>> = {}
      ;(allSettings || []).forEach((s: Record<string, unknown>) => {
        setMap[s.user_id as string] = s
      })

      // 3. Load attendance records for the month
      const { data: records } = await supabase
        .from('employee_attendance')
        .select('*')
        .gte('work_date', ym + '-01')
        .lte('work_date', ymEnd(ym))

      // 4. Load attendance_exceptions (approved) for the month
      let exceptions: Record<string, unknown>[] = []
      try {
        const { data: exData, error: exErr } = await supabase
          .from('attendance_exceptions')
          .select('*')
          .eq('status', '승인')
          .gte('exception_date', ym + '-01')
          .lte('exception_date', ymEnd(ym))
        if (!exErr && exData) exceptions = exData
      } catch {
        /* table may not exist */
      }

      const ATT_WORK_HOURS = 8

      // Aggregate attendance per user
      const userAgg: Record<string, {
        name: string; role: Role; hire_date: string | null
        probation_end_date: string | null; days: number; hours: number
        overtime: number; probationDays: number; regularDays: number
      }> = {}
      const userDateSet: Record<string, Set<string>> = {}

      ;(allUsers || []).forEach((u: Record<string, unknown>) => {
        const uid = u.id as string
        userAgg[uid] = {
          name: u.name as string,
          role: u.role as Role,
          hire_date: (u.hire_date as string) || null,
          probation_end_date: (u.probation_end_date as string) || null,
          days: 0, hours: 0, overtime: 0, probationDays: 0, regularDays: 0,
        }
        userDateSet[uid] = new Set()
      })

      const today = localDate()
      ;(records || []).forEach((r: Record<string, unknown>) => {
        if (!r.check_in) return
        if (!r.check_out && r.work_date !== today) return
        const uid = r.user_id as string
        if (!userAgg[uid]) return

        if (!userDateSet[uid]) userDateSet[uid] = new Set()
        userDateSet[uid].add(r.work_date as string)
        userAgg[uid].days = userDateSet[uid].size

        const hrs = r.check_out
          ? (new Date(r.check_out as string).getTime() - new Date(r.check_in as string).getTime()) / 3600000
          : ATT_WORK_HOURS
        userAgg[uid].hours += hrs

        const otHrs = r.overtime_hours != null ? Number(r.overtime_hours) : Math.max(0, hrs - ATT_WORK_HOURS)
        const otMult = r.is_night ? 1.3 : r.is_weekend ? 1.5 : 1.0
        userAgg[uid].overtime += otHrs * otMult
      })

      // Classify probation vs regular days per unique date
      Object.entries(userAgg).forEach(([uid, u]) => {
        const dates = userDateSet[uid] || new Set()
        u.days = dates.size
        const pEnd = u.probation_end_date
        if (!pEnd) {
          u.regularDays = u.days
          u.probationDays = 0
        } else {
          let prob = 0
          let reg = 0
          dates.forEach((d) => { if (d <= pEnd) prob++; else reg++ })
          u.probationDays = prob
          u.regularDays = reg
        }
      })

      // Aggregate exception hours per user
      const exHoursMap: Record<string, number> = {}
      ;(exceptions || []).forEach((e) => {
        const uid = e.user_id as string
        exHoursMap[uid] = (exHoursMap[uid] || 0) + (parseFloat(String(e.absent_hours)) || 0)
      })

      // Calculate working days for the month
      const WD = workDaysForYM(ym)

      let gt = 0
      let compInsTotal = 0
      let insTotal = 0

      const rows: SalaryRow[] = Object.entries(userAgg).map(([uid, u]) => {
        const s = setMap[uid] || {}
        const baseAmt = Number(s.base_amount) || 0
        const isMonthly = s.salary_type === 'monthly'

        // Pro-rata for mid-month hires
        let proRataWD = WD
        if (u.hire_date && u.hire_date.slice(0, 7) === ym) {
          const hireD = new Date(u.hire_date)
          const [yyy, mmm] = ym.split('-').map(Number)
          const lastDay = new Date(yyy, mmm, 0).getDate()
          let wd = 0
          for (let d = hireD.getDate(); d <= lastDay; d++) {
            const dow = new Date(yyy, mmm - 1, d).getDay()
            if (dow !== 0 && dow !== 6) wd++
          }
          proRataWD = wd
        }
        void proRataWD // used implicitly through WD context

        // Probation pay
        const probRate = s.probation_rate != null && Number(s.probation_rate) > 0
          ? Number(s.probation_rate) : 0.85
        const probSalary = Number(s.probation_salary) || Math.round(baseAmt * probRate)
        let probationPay = 0
        if (isMonthly) {
          probationPay = Math.round(u.probationDays * (probSalary / WD))
        } else {
          probationPay = u.probationDays * probSalary
        }

        // Regular pay
        let regularPay = 0
        if (isMonthly) {
          regularPay = Math.round(baseAmt * (u.regularDays / WD))
        } else {
          regularPay = u.regularDays * baseAmt
        }

        // Meal
        const mealPerDay = s.meal_allowance != null ? Number(s.meal_allowance) : 100000
        const mealTotal = u.days * mealPerDay

        // Allowances
        const respAll = Number(s.responsibility_allowance) || 0
        const femAll = Number(s.female_allowance) || 0
        const siteAll = Number(s.site_allowance) || 0
        const allowances = respAll + femAll + siteAll

        // OT
        const otPay = Math.round(u.overtime * (Number(s.overtime_rate) || 0))

        // Insurance
        const insBaseCustom = Number(s.insurance_base_amount) || 0
        const insuranceBase = insBaseCustom > 0
          ? insBaseCustom
          : (isMonthly ? baseAmt : baseAmt * WD)
        const bhxhRate = s.bhxh_rate != null ? Number(s.bhxh_rate) : 8
        const bhytRate = s.bhyt_rate != null ? Number(s.bhyt_rate) : 1.5
        const bhtnRate = s.bhtn_rate != null ? Number(s.bhtn_rate) : 1
        const insuranceDeduction = Math.round(insuranceBase * (bhxhRate + bhytRate + bhtnRate) / 100)
        const companyInsurance = Math.round(insuranceBase * 21.5 / 100)

        // Exception deduction
        const exHours = exHoursMap[uid] || 0
        const hourlyRate = isMonthly ? (baseAmt / WD / 8) : (baseAmt / 8)
        const exceptionDeduction = Math.round(exHours * hourlyRate)

        const total = Math.round(
          probationPay + regularPay + mealTotal + allowances + otPay
          - insuranceDeduction - exceptionDeduction
        )

        gt += total
        compInsTotal += companyInsurance
        insTotal += insuranceDeduction + companyInsurance

        return {
          user_id: uid,
          name: u.name,
          role: u.role,
          probation_days: u.probationDays,
          regular_days: u.regularDays,
          ot_hours: parseFloat(u.overtime.toFixed(2)),
          probation_pay: probationPay,
          regular_pay: regularPay,
          meal_total: mealTotal,
          meal_per_day: mealPerDay,
          allowances,
          responsibility_allowance: respAll,
          female_allowance: femAll,
          site_allowance: siteAll,
          ot_pay: otPay,
          other_bonus: 0,
          insurance_base: insuranceBase,
          insurance_deduction: insuranceDeduction,
          company_insurance: companyInsurance,
          bhxh_rate: bhxhRate,
          bhyt_rate: bhytRate,
          bhtn_rate: bhtnRate,
          tax: 0,
          exception_deduction: exceptionDeduction,
          exception_hours: exHours,
          other_deduction: 0,
          net_total: total,
          base_amount: baseAmt,
          salary_type: (s.salary_type as 'daily' | 'monthly') || 'daily',
        }
      })

      setSalaryRows(rows)
      setGrandTotal(gt)
      setTotalCompanyInsurance(compInsTotal)
      setTotalInsurance(insTotal)
      return rows
    } finally {
      setLoading(false)
    }
  }, [])

  /* ── Confirm (save) salary for a month ── */
  const confirmSalary = useCallback(async (
    month: string,
    rows: SalaryRow[],
    confirmedBy: string,
    projectId?: string | null,
  ) => {
    if (rows.length === 0) throw new Error('No data')

    const inserts = rows.map((r) => ({
      user_id: r.user_id,
      month,
      probation_days: r.probation_days,
      regular_days: r.regular_days,
      ot_hours: r.ot_hours,
      probation_pay: r.probation_pay,
      regular_pay: r.regular_pay,
      meal_total: r.meal_total,
      allowances: r.allowances,
      ot_pay: r.ot_pay,
      other_bonus: r.other_bonus,
      insurance_deduction: r.insurance_deduction,
      tax: r.tax,
      exception_deduction: r.exception_deduction,
      other_deduction: r.other_deduction,
      net_total: r.net_total,
      confirmed_by: confirmedBy,
      confirmed_at: new Date().toISOString(),
    }))

    // Delete existing records for this month then insert
    const res1 = await supabase.from('salary_monthly').delete().eq('month', month)
    if (res1.error?.message?.includes('does not exist')) {
      throw new Error('salary_monthly table does not exist. Please run the SQL migration.')
    }

    const res2 = await supabase.from('salary_monthly').insert(inserts)
    if (res2.error) throw res2.error

    // Auto-register labor cost to costs table
    if (projectId) {
      const totalNet = inserts.reduce((s, r) => s + (r.net_total || 0), 0)
      if (totalNet > 0) {
        await supabase
          .from('costs')
          .delete()
          .eq('project_id', projectId)
          .eq('cost_type', '인건비')
          .eq('item_name', '급여 확정 ' + month)

        await supabase.from('costs').insert({
          project_id: projectId,
          user_id: confirmedBy,
          cost_date: month + '-25',
          cost_type: '인건비',
          item_name: '급여 확정 ' + month,
          amount: totalNet,
          note: `${month} 급여 확정 (${inserts.length}명) / Luong thang ${month} (${inserts.length} NV)`,
        })
      }
    }

    return inserts.length
  }, [])

  return {
    users,
    settings,
    salaryRows,
    setSalaryRows,
    grandTotal,
    setGrandTotal,
    totalCompanyInsurance,
    totalInsurance,
    loading,
    loadSettings,
    saveSetting,
    calcSalary,
    confirmSalary,
  }
}
