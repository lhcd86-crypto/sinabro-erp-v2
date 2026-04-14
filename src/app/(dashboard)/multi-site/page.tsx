'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

/* ── Types ── */

interface ProjectCard {
  id: string
  code: string
  name: string
  status: string
  contract_amount: number | null
  end_date: string | null
  workerCount: number
  progress: number
}

/* ── Helpers ── */

function localDate(): string {
  const d = new Date()
  const offset = 7 * 60
  const local = new Date(d.getTime() + offset * 60000)
  return local.toISOString().slice(0, 10)
}

function fmtVND(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`
  return n.toLocaleString('vi-VN')
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-50 text-green-700 border-green-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  suspended: 'bg-gray-100 text-gray-500 border-gray-200',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Dang thi cong / 진행중',
  completed: 'Hoan thanh / 완료',
  suspended: 'Tam dung / 중단',
}

/* ── Component ── */

export default function MultiSitePage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)
  const setCurrentProject = useAuthStore((s) => s.setCurrentProject)

  const [cards, setCards] = useState<ProjectCard[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const showToast = useCallback((msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  /* ── Load projects ── */
  const loadProjects = useCallback(async () => {
    setLoading(true)
    try {
      const today = localDate()

      const { data: projects, error } = await supabase
        .from('projects')
        .select('id, code, name, status, contract_amount, end_date')
        .order('name')

      if (error) throw error

      const result: ProjectCard[] = []

      for (const p of (projects ?? [])) {
        // Worker count for today
        const { count: wc } = await supabase
          .from('employee_attendance')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', p.id)
          .eq('work_date', today)

        // Simple progress: days elapsed / total days
        let progress = 0
        if (p.end_date) {
          const start = new Date(p.end_date)
          start.setMonth(start.getMonth() - 12) // assume 12-month project
          const total = new Date(p.end_date).getTime() - start.getTime()
          const elapsed = new Date().getTime() - start.getTime()
          if (total > 0) {
            progress = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
          }
        }
        if (p.status === 'completed') progress = 100

        result.push({
          id: p.id,
          code: p.code,
          name: p.name,
          status: p.status,
          contract_amount: p.contract_amount,
          end_date: p.end_date,
          workerCount: wc ?? 0,
          progress,
        })
      }

      setCards(result)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Load failed', 'err')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  /* ── Select project ── */
  const handleSelect = (id: string) => {
    setCurrentProject(id)
    const proj = cards.find((c) => c.id === id)
    showToast(`Da chon: ${proj?.name ?? id} / 현장 선택 완료`, 'ok')
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tat ca cong truong / 전체 현장</h1>
        <p className="mt-1 text-sm text-gray-500">
          Tong quan tat ca du an / 전체 프로젝트 현황
        </p>
      </div>

      {loading && <p className="text-sm text-gray-400">Dang tai... / 로딩 중...</p>}

      {/* Project grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => {
          const isSelected = card.id === currentProject
          const statusColor = STATUS_COLORS[card.status] ?? STATUS_COLORS.active
          const statusLabel = STATUS_LABELS[card.status] ?? card.status

          return (
            <button
              key={card.id}
              onClick={() => handleSelect(card.id)}
              className={`text-left bg-white border rounded-xl p-5 hover:shadow-md transition-all ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-mono font-medium text-blue-600">{card.code}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{card.name}</p>
                </div>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${statusColor}`}>
                  {statusLabel}
                </span>
              </div>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Tien do / 진행률</span>
                  <span>{card.progress}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      card.progress >= 80 ? 'bg-green-500' : card.progress >= 50 ? 'bg-blue-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${card.progress}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>CN / 근로자: {card.workerCount}</span>
                {card.contract_amount && (
                  <span>HD / 계약: {fmtVND(card.contract_amount)}</span>
                )}
              </div>

              {card.end_date && (
                <p className="text-[10px] text-gray-400 mt-2">
                  Han / 완공일: {card.end_date}
                </p>
              )}

              {/* Selected indicator */}
              {isSelected && (
                <div className="mt-3 text-xs text-blue-600 font-medium text-center">
                  Dang chon / 선택됨
                </div>
              )}
            </button>
          )
        })}
      </div>

      {cards.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-sm text-gray-400">Khong co du an / 프로젝트 없음</p>
        </div>
      )}
    </div>
  )
}
