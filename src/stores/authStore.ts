import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User, Project, Role } from '@/types'

interface AuthState {
  user: User | null
  currentProject: string | null
  projects: Project[]
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ error: string | null }>
  logout: () => Promise<void>
  setCurrentProject: (id: string | null) => void
  loadSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  currentProject: null,
  projects: [],
  isLoading: true,

  login: async (email: string, password: string) => {
    set({ isLoading: true })

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password })

    if (authError || !authData.user) {
      set({ isLoading: false })
      return { error: authError?.message ?? 'Login failed' }
    }

    // Load user profile from users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, email, name, role, hire_date, probation_end_date')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) {
      set({ isLoading: false })
      return { error: profileError?.message ?? 'User profile not found' }
    }

    // Load projects
    const { data: projects } = await supabase
      .from('projects')
      .select('id, code, name, status, contract_amount, end_date')
      .eq('status', 'active')
      .order('name')

    const user: User = {
      id: profile.id,
      email: profile.email ?? '',
      name: profile.name,
      role: profile.role as Role,
      hire_date: profile.hire_date ?? '',
      probation_end_date: profile.probation_end_date ?? null,
    }

    set({
      user,
      projects: (projects as Project[]) ?? [],
      isLoading: false,
    })

    // Restore last selected project from localStorage
    const savedProject = localStorage.getItem('currentProject')
    if (savedProject && projects?.some((p) => p.id === savedProject)) {
      set({ currentProject: savedProject })
    } else if (projects && projects.length > 0) {
      set({ currentProject: projects[0].id })
      localStorage.setItem('currentProject', projects[0].id)
    }

    return { error: null }
  },

  logout: async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('currentProject')
    set({ user: null, currentProject: null, projects: [], isLoading: false })
  },

  setCurrentProject: (id: string | null) => {
    set({ currentProject: id })
    if (id) {
      localStorage.setItem('currentProject', id)
    } else {
      localStorage.removeItem('currentProject')
    }
  },

  loadSession: async () => {
    set({ isLoading: true })

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      set({ user: null, isLoading: false })
      return
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id, email, name, role, hire_date, probation_end_date')
      .eq('id', session.user.id)
      .single()

    if (!profile) {
      set({ user: null, isLoading: false })
      return
    }

    const { data: projects } = await supabase
      .from('projects')
      .select('id, code, name, status, contract_amount, end_date')
      .eq('status', 'active')
      .order('name')

    const user: User = {
      id: profile.id,
      email: profile.email ?? '',
      name: profile.name,
      role: profile.role as Role,
      hire_date: profile.hire_date ?? '',
      probation_end_date: profile.probation_end_date ?? null,
    }

    set({
      user,
      projects: (projects as Project[]) ?? [],
      isLoading: false,
    })

    const savedProject = localStorage.getItem('currentProject')
    if (savedProject && projects?.some((p) => p.id === savedProject)) {
      set({ currentProject: savedProject })
    } else if (projects && projects.length > 0) {
      set({ currentProject: projects[0].id })
    }
  },
}))
