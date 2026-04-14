import type { Role } from '@/types'

export function isTop(role: Role): boolean {
  return role === 'ceo' || role === 'director_m'
}

export function isAdmin(role: Role): boolean {
  return ['ceo', 'director_m', 'director_f', 'hr', 'account'].includes(role)
}

export function isFinance(role: Role): boolean {
  return ['ceo', 'director_m', 'account'].includes(role)
}

export function isOffice(role: Role): boolean {
  return ['ceo', 'director_m', 'director_f', 'hr', 'account', 'qs'].includes(role)
}

export function isHR(role: Role): boolean {
  return ['ceo', 'director_m', 'hr'].includes(role)
}

export const ROLE_LABELS: Record<Role, string> = {
  engineer: 'KS CT / 소장',
  foreman: '현장 반장',
  driver: '기사',
  qs: 'QS',
  hr: '인사/총무',
  account: '경리',
  director_f: '현장 이사',
  director_m: '관리 이사',
  ceo: '대표',
}

export const ROLE_COLORS: Record<Role, string> = {
  engineer: '#2563EB',
  foreman: '#D97706',
  driver: '#6B7280',
  qs: '#7C3AED',
  hr: '#059669',
  account: '#DC2626',
  director_f: '#0891B2',
  director_m: '#4F46E5',
  ceo: '#BE123C',
}
