'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/stores/authStore'
import type { Role } from '@/types'

interface NavItem {
  id: string
  icon: string
  label: string
  href: string
}

/** Role-specific bottom nav quick links (max 5 items) */
const BOTTOM_MENUS: Record<Role, NavItem[]> = {
  engineer: [
    { id: 'home', icon: '🏠', label: '홈', href: '/home' },
    { id: 'attendance', icon: '⏰', label: '출퇴근', href: '/attendance' },
    { id: 'report', icon: '📋', label: '일보', href: '/report' },
    { id: 'safety', icon: '🛡️', label: '안전', href: '/safety' },
    { id: 'more', icon: '☰', label: '더보기', href: '' },
  ],
  foreman: [
    { id: 'home', icon: '🏠', label: '홈', href: '/home' },
    { id: 'attendance', icon: '⏰', label: '출퇴근', href: '/attendance' },
    { id: 'roll_call', icon: '✅', label: '출석', href: '/roll_call' },
    { id: 'report', icon: '📋', label: '일보', href: '/report' },
    { id: 'more', icon: '☰', label: '더보기', href: '' },
  ],
  driver: [
    { id: 'home', icon: '🏠', label: '홈', href: '/home' },
    { id: 'attendance', icon: '⏰', label: '출퇴근', href: '/attendance' },
    { id: 'vehicle', icon: '🚗', label: '차량', href: '/vehicle' },
    { id: 'advance', icon: '💵', label: '전도금', href: '/advance' },
    { id: 'more', icon: '☰', label: '더보기', href: '' },
  ],
  qs: [
    { id: 'home', icon: '🏠', label: '홈', href: '/home' },
    { id: 'gongmu', icon: '✅', label: '일보확인', href: '/gongmu' },
    { id: 'quantities', icon: '📐', label: '물량', href: '/quantities' },
    { id: 'billing', icon: '🧾', label: '기성', href: '/billing' },
    { id: 'more', icon: '☰', label: '더보기', href: '' },
  ],
  hr: [
    { id: 'home', icon: '🏠', label: '홈', href: '/home' },
    { id: 'attendance', icon: '⏰', label: '근태', href: '/attendance' },
    { id: 'salary', icon: '💰', label: '급여', href: '/salary' },
    { id: 'chongmu', icon: '📝', label: '전도금', href: '/chongmu' },
    { id: 'more', icon: '☰', label: '더보기', href: '' },
  ],
  account: [
    { id: 'home', icon: '🏠', label: '홈', href: '/home' },
    { id: 'expense', icon: '💸', label: '비용', href: '/expense' },
    { id: 'billing', icon: '🧾', label: '기성', href: '/billing' },
    { id: 'salary', icon: '💰', label: '급여', href: '/salary' },
    { id: 'more', icon: '☰', label: '더보기', href: '' },
  ],
  director_f: [
    { id: 'home', icon: '🏠', label: '홈', href: '/home' },
    { id: 'dashboard', icon: '🏛️', label: '대시보드', href: '/home' },
    { id: 'schedule', icon: '📅', label: '공정', href: '/schedule' },
    { id: 'billing', icon: '📑', label: '기성', href: '/billing' },
    { id: 'more', icon: '☰', label: '더보기', href: '' },
  ],
  director_m: [
    { id: 'home', icon: '🏠', label: '홈', href: '/home' },
    { id: 'multi_site', icon: '🌐', label: '전체현장', href: '/multi-site' },
    { id: 'costana', icon: '💹', label: '자금', href: '/costana' },
    { id: 'billing', icon: '🧾', label: '기성', href: '/billing' },
    { id: 'more', icon: '☰', label: '더보기', href: '' },
  ],
  ceo: [
    { id: 'home', icon: '🏠', label: '홈', href: '/home' },
    { id: 'multi_site', icon: '🌐', label: '전체현장', href: '/multi-site' },
    { id: 'dashboard', icon: '🏛️', label: '대시보드', href: '/home' },
    { id: 'costana', icon: '💹', label: '자금', href: '/costana' },
    { id: 'more', icon: '☰', label: '더보기', href: '' },
  ],
}

interface BottomNavProps {
  onMoreClick: () => void
}

export default function BottomNav({ onMoreClick }: BottomNavProps) {
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const role: Role = user?.role ?? 'engineer'
  const items = BOTTOM_MENUS[role] ?? BOTTOM_MENUS.engineer

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {items.map((item) => {
          if (item.id === 'more') {
            return (
              <button
                key="more"
                onClick={onMoreClick}
                className="flex flex-col items-center justify-center flex-1 h-full text-gray-400 hover:text-blue-600 transition-colors"
              >
                <span className="text-lg leading-none">{item.icon}</span>
                <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
              </button>
            )
          }

          const active = pathname === item.href

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                active
                  ? 'text-blue-600'
                  : 'text-gray-400 hover:text-blue-600'
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className={`text-[10px] mt-0.5 ${active ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
