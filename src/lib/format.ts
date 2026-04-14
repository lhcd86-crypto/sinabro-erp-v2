/**
 * Centralized formatting utilities for the ERP system.
 * Import from here instead of duplicating in every component.
 */

/** Format Vietnamese Dong with thousand separators */
export function fmtVND(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '0'
  return new Intl.NumberFormat('vi-VN').format(n)
}

/** Format number with K/M/B suffix (e.g., 1,200,000 → 1.2M) */
export function fmtM(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '0'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`
  return `${sign}${abs}`
}

/** Format as full money string: "1,234,567 VND" */
export function fmtMoney(n: number | null | undefined): string {
  return `${fmtVND(n)} VND`
}

/** Format number input in real-time (add thousand separators) */
export function fmtMoneyInput(value: string): string {
  const num = value.replace(/[^\d]/g, '')
  if (!num) return ''
  return new Intl.NumberFormat('vi-VN').format(parseInt(num))
}

/** Parse formatted money string back to number */
export function parseMoney(formatted: string): number {
  return parseInt(formatted.replace(/[^\d]/g, '')) || 0
}

/** Convert VND to KRW (approximate rate) */
export function fmtKRW(vnd: number, rate = 0.055): string {
  const krw = Math.round(vnd * rate)
  return new Intl.NumberFormat('ko-KR').format(krw)
}

/** Format date as YYYY-MM-DD */
export function fmtD(d: string | Date | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return '—'
  return date.toISOString().slice(0, 10)
}

/** Format datetime for display (Vietnam timezone) */
export function fmtDT(d: string | Date | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleString('ko-KR', { timeZone: 'Asia/Ho_Chi_Minh' })
}

/** Format time as HH:MM */
export function fmtHM(d: string | Date | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
}

/** Get today's date in Vietnam timezone as YYYY-MM-DD */
export function todayVN(): string {
  const d = new Date()
  const offset = 7 * 60 // UTC+7
  const local = new Date(d.getTime() + offset * 60000)
  return local.toISOString().slice(0, 10)
}

/** Get current year-month as YYYY-MM */
export function currentYM(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Calculate working days in a year-month (exclude Sundays, Vietnam standard) */
export function workDaysForYM(ym: string): number {
  const [y, m] = ym.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  let count = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(y, m - 1, d).getDay()
    if (dow !== 0) count++ // Sunday = 0
  }
  return count
}

/** Status pill color mapping */
export function statusColor(status: string): string {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    pending: 'bg-yellow-100 text-yellow-800',
    submitted: 'bg-blue-100 text-blue-800',
    reviewed: 'bg-indigo-100 text-indigo-800',
    approved: 'bg-green-100 text-green-800',
    confirmed: 'bg-green-100 text-green-800',
    invoiced: 'bg-teal-100 text-teal-800',
    paid: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-red-100 text-red-800',
    completed: 'bg-green-100 text-green-800',
    in_progress: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-gray-100 text-gray-500',
    active: 'bg-green-100 text-green-800',
    repair: 'bg-orange-100 text-orange-800',
    idle: 'bg-gray-100 text-gray-600',
    expired: 'bg-red-100 text-red-800',
  }
  return map[status.toLowerCase()] ?? 'bg-gray-100 text-gray-700'
}
