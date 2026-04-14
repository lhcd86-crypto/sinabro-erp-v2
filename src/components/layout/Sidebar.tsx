'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/stores/authStore'
import { MENUS, type MenuItem } from '@/lib/menus'
import type { Role } from '@/types'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const role: Role = user?.role ?? 'engineer'
  const items: MenuItem[] = MENUS[role] ?? MENUS.engineer

  /** Map menu id to route path */
  const ROUTE_MAP: Record<string, string> = {
    home: '/home',
    multi_site: '/multi-site',
    cost_analysis: '/cost-analysis',
    leave_mgmt: '/leave-mgmt',
    leave_all: '/leave-mgmt',
    attendance_all: '/attendance_mgmt',
    expense_all: '/expense',
    billing_all: '/billing',
    billing_status: '/billing_status',
    staff_all: '/staff',
    sys_settings: '/settings',
    costana: '/costana',
    dashboard_all: '/dashboard',
    report: '/report',
    security_all: '/security_all',
  }

  function menuHref(id: string): string {
    return ROUTE_MAP[id] ?? `/${id}`
  }

  function isActive(id: string): boolean {
    const href = menuHref(id)
    return pathname === href
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-full w-64 bg-gray-900 border-r border-gray-800
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-gray-800">
          <span className="text-white font-bold text-sm tracking-tight">
            시나브로 ERP
          </span>
          <button
            onClick={onClose}
            className="lg:hidden text-gray-400 hover:text-white"
            aria-label="Close sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Menu items */}
        <nav className="overflow-y-auto h-[calc(100%-3.5rem)] py-2 px-2">
          {items.map((item, idx) => {
            // Category header
            if (item.cat) {
              return (
                <div
                  key={`cat-${idx}`}
                  className="mt-4 mb-1 px-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider"
                >
                  {item.cat}
                </div>
              )
            }

            // Menu item
            const id = item.id!
            const active = isActive(id)

            return (
              <Link
                key={id}
                href={menuHref(id)}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition
                  ${
                    active
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }
                `}
              >
                <span className="text-base leading-none">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
