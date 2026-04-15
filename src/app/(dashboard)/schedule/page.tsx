'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isAdmin } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

/* ── Types ───────────────────────────────────────── */

interface ScheduleItem {
  id: string
  project_id: string | null
  title: string
  start_date: string | null
  end_date: string | null
  progress: number | null
  assignee: string | null
  notes: string | null
  status: string | null
  created_by: string | null
  created_at: string | null
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

/* ── Component ─────────────────────────────────────── */

export default function SchedulePage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [items, setItems] = useState<ScheduleItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  /* ── Form state ── */
  const [fTask, setFTask] = useState('')
  const [fStart, setFStart] = useState(today())
  const [fEnd, setFEnd] = useState(today())
  const [fProgress, setFProgress] = useState('0')
  const [fAssignee, setFAssignee] = useState('')
  const [fNotes, setFNotes] = useState('')
  const [syncLoading, setSyncLoading] = useState(false)

  const toast = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  const canEdit = user ? isAdmin(user.role) || user.role === 'engineer' : false

  /* ── Load data ── */
  const loadData = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('schedule_items')
        .select('*')
        .eq('project_id', currentProject)
        .order('start_date', { ascending: true })
      setItems((data as ScheduleItem[]) ?? [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [currentProject])

  useEffect(() => {
    if (user && currentProject) loadData()
  }, [user, currentProject, loadData])

  /* ── Sync progress from daily reports ── */
  const handleSyncProgress = useCallback(async () => {
    if (!currentProject || !user) return
    setSyncLoading(true)
    try {
      // Get cumulative material quantities from daily_reports
      const { data: reportData, error: rErr } = await supabase
        .from('daily_reports')
        .select('qty_v250, qty_sv250, qty_hlm, qty_m230, qty_db2015, qty_other')
        .eq('project_id', currentProject)

      if (rErr) throw rErr

      const cumulative: Record<string, number> = {
        qty_v250: 0, qty_sv250: 0, qty_hlm: 0, qty_m230: 0, qty_db2015: 0, qty_other: 0,
      }
      ;(reportData ?? []).forEach((r: Record<string, number | null>) => {
        Object.keys(cumulative).forEach((k) => {
          cumulative[k] += r[k] ?? 0
        })
      })

      // Try to get contract quantities
      let contractQty: Record<string, number> = {}
      try {
        const { data: qData } = await supabase
          .from('quantity_items')
          .select('item_name, contract_qty')
          .eq('project_id', currentProject)

        const qMap: Record<string, number> = {}
        ;(qData ?? []).forEach((q: { item_name: string; contract_qty: number | null }) => {
          qMap[q.item_name] = q.contract_qty ?? 0
        })
        contractQty = qMap
      } catch {
        // quantity_items table may not exist
      }

      // Calculate progress percentages per material
      const materialNames: Record<string, string> = {
        qty_v250: 'V250', qty_sv250: 'SV250', qty_hlm: 'HLM',
        qty_m230: 'M230', qty_db2015: 'DB2015', qty_other: 'Other',
      }

      const summaryParts: string[] = []
      let totalActual = 0
      let totalContract = 0

      Object.keys(cumulative).forEach((key) => {
        const actual = cumulative[key]
        const code = materialNames[key] || key
        const contract = contractQty[code] || 0
        if (actual > 0) {
          summaryParts.push(`${code}: ${actual}${contract ? `/${contract}` : ''}`)
          totalActual += actual
          totalContract += contract
        }
      })

      // Update schedule items progress if we have contract data
      if (totalContract > 0) {
        const overallPct = Math.min(100, Math.round((totalActual / totalContract) * 100))
        // Update all schedule items proportionally
        for (const item of items) {
          const newProgress = Math.min(100, Math.round(overallPct * ((item.progress ?? 0) > 0 ? 1 : 0.5)))
          if (newProgress !== (item.progress ?? 0)) {
            await supabase
              .from('schedule_items')
              .update({ progress: newProgress })
              .eq('id', item.id)
          }
        }
        await loadData()
        toast('ok', `Dong bo hoan thanh: ${overallPct}% / 동기화 완료: ${overallPct}%`)
      } else {
        toast('ok', `Tong hop: ${summaryParts.join(', ') || 'Khong co du lieu'} / 누적 실적 집계 완료`)
      }
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Dong bo that bai / 동기화 실패')
    } finally {
      setSyncLoading(false)
    }
  }, [currentProject, user, items, loadData, toast])

  /* ── Reset form ── */
  function resetForm() {
    setFTask('')
    setFStart(today())
    setFEnd(today())
    setFProgress('0')
    setFAssignee('')
    setFNotes('')
    setEditId(null)
    setShowForm(false)
  }

  /* ── Edit item ── */
  function startEdit(item: ScheduleItem) {
    setEditId(item.id)
    setFTask(item.title)
    setFStart(item.start_date ?? '')
    setFEnd(item.end_date ?? '')
    setFProgress(String(item.progress))
    setFAssignee(item.assignee ?? '')
    setFNotes(item.notes ?? '')
    setShowForm(true)
  }

  /* ── Submit ── */
  async function handleSubmit() {
    if (!currentProject || !user) {
      toast('err', 'Chon cong trinh / 현장을 선택하세요')
      return
    }
    if (!fTask.trim()) {
      toast('err', 'Nhap ten cong viec / 공정명을 입력하세요')
      return
    }

    setSaving(true)
    try {
      const payload = {
        project_id: currentProject,
        title: fTask.trim(),
        start_date: fStart,
        end_date: fEnd,
        progress: parseInt(fProgress) || 0,
        assignee: fAssignee.trim() || null,
        notes: fNotes.trim() || null,
        created_by: user.id,
      }

      if (editId) {
        const { error } = await supabase
          .from('schedule_items')
          .update(payload)
          .eq('id', editId)
        if (error) throw error
        toast('ok', 'Da cap nhat / 수정 완료')
      } else {
        const { error } = await supabase.from('schedule_items').insert(payload)
        if (error) throw error
        toast('ok', 'Da them cong viec / 공정 추가 완료')
      }

      resetForm()
      loadData()
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  /* ── Gantt helpers ── */
  const allDates = items.flatMap((i) => [i.start_date, i.end_date]).filter((d): d is string => d != null)
  const minDate = allDates.length > 0 ? allDates.sort()[0] : today()
  const maxDate = allDates.length > 0 ? allDates.sort().reverse()[0] : today()
  const minTime = new Date(minDate).getTime()
  const maxTime = new Date(maxDate).getTime()
  const totalDays = Math.max(1, Math.ceil((maxTime - minTime) / 86400000) + 1)

  function getBarStyle(start: string, end: string) {
    const s = new Date(start).getTime()
    const e = new Date(end).getTime()
    const left = ((s - minTime) / (totalDays * 86400000)) * 100
    const width = (((e - s) / 86400000 + 1) / totalDays) * 100
    return { left: `${Math.max(0, left)}%`, width: `${Math.min(100, Math.max(2, width))}%` }
  }

  function progressColor(p: number) {
    if (p >= 100) return 'bg-green-500'
    if (p >= 50) return 'bg-blue-500'
    if (p >= 25) return 'bg-yellow-500'
    return 'bg-gray-400'
  }

  if (!currentProject) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        Vui long chon cong trinh / 현장을 선택해주세요.
      </div>
    )
  }

  const overallProgress = items.length > 0
    ? Math.round(items.reduce((s, i) => s + (i.progress ?? 0), 0) / items.length)
    : 0

  return (
    <div className="space-y-6">
      {/* Toast */}
      {msg && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            msg.type === 'ok'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Tien do / 공정관리
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Quan ly cong trinh va tien do / 공정 일정 및 진도 관리
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <button
              onClick={handleSyncProgress}
              disabled={syncLoading}
              className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {syncLoading ? '...' : '🔄 Tu dong TD / 공정률 동기화'}
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => { resetForm(); setShowForm(true) }}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Them / 추가
            </button>
          )}
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <p className="text-xs font-medium text-gray-500">Tong cong viec / 총 공정</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{items.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <p className="text-xs font-medium text-gray-500">Tien do chung / 전체 진도</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{overallProgress}%</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <p className="text-xs font-medium text-gray-500">Hoan thanh / 완료</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {items.filter((i) => (i.progress ?? 0) >= 100).length}/{items.length}
          </p>
        </div>
      </div>

      {/* ── Add/Edit Form ── */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              {editId ? 'Sua cong viec / 공정 수정' : 'Them cong viec / 공정 추가'}
            </h3>
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Ten cong viec / 공정명
                </label>
                <input
                  type="text"
                  value={fTask}
                  onChange={(e) => setFTask(e.target.value)}
                  placeholder="Nhap ten / 공정명 입력"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Ngay bat dau / 시작일
                </label>
                <input
                  type="date"
                  value={fStart}
                  onChange={(e) => setFStart(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Ngay ket thuc / 종료일
                </label>
                <input
                  type="date"
                  value={fEnd}
                  onChange={(e) => setFEnd(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Tien do / 진도 (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={fProgress}
                  onChange={(e) => setFProgress(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Nguoi phu trach / 담당자
                </label>
                <input
                  type="text"
                  value={fAssignee}
                  onChange={(e) => setFAssignee(e.target.value)}
                  placeholder="Nhap ten / 이름 입력"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Ghi chu / 비고
                </label>
                <input
                  type="text"
                  value={fNotes}
                  onChange={(e) => setFNotes(e.target.value)}
                  placeholder="Ghi chu / 메모"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Huy / 취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Dang luu... / 저장 중...' : 'Luu / 저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Gantt-like View ── */}
      {items.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              Bieu do tien do / 공정표
            </h3>
          </div>
          <div className="p-4 space-y-2">
            {items.map((item) => {
              const style = getBarStyle(item.start_date ?? today(), item.end_date ?? today())
              return (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="w-32 sm:w-48 shrink-0 text-xs text-gray-700 font-medium truncate">
                    {item.title}
                  </div>
                  <div className="flex-1 relative h-6 bg-gray-100 rounded overflow-hidden">
                    <div
                      className={`absolute top-0 h-full rounded ${progressColor(item.progress ?? 0)} opacity-80`}
                      style={style}
                    />
                    <div
                      className="absolute top-0 h-full bg-black/20 rounded"
                      style={{
                        left: style.left,
                        width: `calc(${style.width} * ${(item.progress ?? 0) / 100})`,
                      }}
                    />
                  </div>
                  <div className="w-12 text-xs text-gray-600 font-mono text-right">
                    {item.progress}%
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Schedule List Table ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Danh sach cong viec / 공정 목록
          </h3>
          <span className="text-xs text-gray-500">
            Tong / 총 {items.length}건
          </span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Dang tai... / 로딩 중...
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Chua co du lieu / 데이터 없음
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">Cong viec / 공정명</th>
                  <th className="px-3 py-3">Bat dau / 시작</th>
                  <th className="px-3 py-3">Ket thuc / 종료</th>
                  <th className="px-3 py-3 text-right">Tien do / 진도</th>
                  <th className="px-3 py-3">Phu trach / 담당</th>
                  <th className="px-3 py-3">Ghi chu / 비고</th>
                  {canEdit && <th className="px-3 py-3 text-center">Sua / 수정</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-xs text-gray-700 font-medium">
                      {item.title}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600 font-mono whitespace-nowrap">
                      {item.start_date}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600 font-mono whitespace-nowrap">
                      {item.end_date}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${progressColor(item.progress ?? 0)}`}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-gray-700">{item.progress}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600">
                      {item.assignee ?? '-'}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500 max-w-[150px] truncate">
                      {item.notes ?? '-'}
                    </td>
                    {canEdit && (
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => startEdit(item)}
                          className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Sua / 수정
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
