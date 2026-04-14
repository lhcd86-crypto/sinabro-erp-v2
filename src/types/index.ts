export type Role =
  | 'engineer'
  | 'foreman'
  | 'driver'
  | 'qs'
  | 'hr'
  | 'account'
  | 'director_f'
  | 'director_m'
  | 'ceo'

export interface User {
  id: string
  email: string
  name: string
  role: Role
  hire_date: string
  probation_end_date: string | null
}

export interface Project {
  id: string
  code: string
  name: string
  status: 'active' | 'completed' | 'suspended'
  contract_amount: number | null
  end_date: string | null
}

export interface DailyReport {
  id: string
  project_id: string
  date: string
  weather: string | null
  summary: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface Expense {
  id: string
  project_id: string
  date: string
  category: string
  description: string | null
  amount: number
  approved_by: string | null
  created_by: string
  created_at: string
}

export interface Advance {
  id: string
  user_id: string
  project_id: string | null
  amount: number
  reason: string | null
  status: 'pending' | 'approved' | 'rejected' | 'repaid'
  requested_at: string
  approved_by: string | null
}

export interface LeaveRequest {
  id: string
  user_id: string
  leave_type: string
  start_date: string
  end_date: string
  reason: string | null
  status: 'pending' | 'approved' | 'rejected'
  approved_by: string | null
  created_at: string
}

export interface Attendance {
  id: string
  user_id: string
  project_id: string | null
  date: string
  check_in: string | null
  check_out: string | null
  status: 'present' | 'absent' | 'late' | 'half_day'
  created_at: string
}
