'use client'

import { useAuthStore } from '@/stores/authStore'
import { ROLE_LABELS } from '@/lib/roles'

const KPI_CARDS = [
  {
    title: 'Công nhân hôm nay / 금일 출근',
    value: '—',
    sub: 'Đang tải...',
    color: 'bg-blue-500',
  },
  {
    title: 'Tiến độ / 공정률',
    value: '—%',
    sub: 'Chưa có dữ liệu',
    color: 'bg-emerald-500',
  },
  {
    title: 'Nghiệm thu / 기성',
    value: '—',
    sub: 'VNĐ',
    color: 'bg-violet-500',
  },
  {
    title: 'Tạm ứng / 전도금',
    value: '—',
    sub: 'Chờ duyệt / 대기',
    color: 'bg-amber-500',
  },
]

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)
  const projects = useAuthStore((s) => s.projects)

  const project = projects.find((p) => p.id === currentProject)
  const roleLabel = user ? ROLE_LABELS[user.role] : ''

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Trang chu / 홈
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Xin chao, {user?.name} ({roleLabel}) — 환영합니다
        </p>
      </div>

      {/* Current project info */}
      {project && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {project.code} — {project.name}
              </p>
              <p className="text-xs text-gray-500">
                {project.end_date
                  ? `Han CT / 준공일: ${project.end_date}`
                  : 'Chua xac dinh / 미정'}
              </p>
            </div>
          </div>
        </div>
      )}

      {!currentProject && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          Vui long chon cong trinh / 현장을 선택해주세요.
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CARDS.map((card) => (
          <div
            key={card.title}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 truncate">
                  {card.title}
                </p>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {card.value}
                </p>
                <p className="mt-1 text-xs text-gray-400">{card.sub}</p>
              </div>
              <div
                className={`w-3 h-3 rounded-full ${card.color} shrink-0 mt-1`}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Placeholder sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 min-h-[200px]">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Nhat ky gan day / 최근 일보
          </h3>
          <p className="text-sm text-gray-400">
            Chua co du lieu / 데이터 없음
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 min-h-[200px]">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Thong bao / 알림
          </h3>
          <p className="text-sm text-gray-400">
            Khong co thong bao moi / 새 알림 없음
          </p>
        </div>
      </div>
    </div>
  )
}
