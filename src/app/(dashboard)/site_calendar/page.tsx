'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

/* ── Types ───────────────────────────────────────── */

interface SiteEvent {
  id: string
  project_id: string | null
  title: string
  category: string | null
  priority: string | null
  start_date: string
  end_date: string | null
  progress: number | null
  assignee: string | null
  location: string | null
  memo: string | null
  created_by: string | null
  created_at: string | null
  status: string | null
  attendees: string[] | null
  repeat_type: string | null
  updated_at: string | null
}

/* ── Constants ───────────────────────────────────── */

const CATEGORIES = [
  { value: 'construction', label: '시공 / Thi cong', color: 'bg-blue-100 text-blue-700' },
  { value: 'safety', label: '안전 / An toan', color: 'bg-red-100 text-red-700' },
  { value: 'material', label: '자재 / Vat lieu', color: 'bg-amber-100 text-amber-700' },
  { value: 'meeting', label: '회의 / Hop', color: 'bg-purple-100 text-purple-700' },
  { value: 'inspection', label: '검수 / Kiem tra', color: 'bg-green-100 text-green-700' },
  { value: 'document', label: '서류 / Giay to', color: 'bg-gray-100 text-gray-700' },
  { value: 'education', label: '교육 / Dao tao', color: 'bg-teal-100 text-teal-700' },
  { value: 'other', label: '기타 / Khac', color: 'bg-slate-100 text-slate-700' },
]

const PRIORITIES = [
  { value: 'normal', label: '보통 / Binh thuong' },
  { value: 'high', label: '높음 / Cao' },
  { value: 'urgent', label: '긴급 / Khan cap' },
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

/* ── Component ─────────────────────────────────────── */

export default function SiteCalendarPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  /* ── Calendar state ── */
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')
  const [filterCat, setFilterCat] = useState<string>('all')

  /* ── Events ── */
  const [events, setEvents] = useState<SiteEvent[]>([])

  /* ── Modal ── */
  const [showModal, setShowModal] = useState(false)
  const [fTitle, setFTitle] = useState('')
  const [fCategory, setFCategory] = useState('construction')
  const [fPriority, setFPriority] = useState('normal')
  const [fStartDate, setFStartDate] = useState(today())
  const [fEndDate, setFEndDate] = useState(today())
  const [fProgress, setFProgress] = useState('0')
  const [fAssignee, setFAssignee] = useState('')
  const [fLocation, setFLocation] = useState('')
  const [fMemo, setFMemo] = useState('')

  const toast = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  /* ── Load data ── */
  const loadData = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('site_events')
        .select('*')
        .eq('project_id', currentProject)
        .order('start_date', { ascending: true })
        .limit(200)
      setEvents((data as SiteEvent[]) ?? [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [currentProject])

  useEffect(() => {
    if (user && currentProject) loadData()
  }, [user, currentProject, loadData])

  /* ── Navigation ── */
  function goPrev() {
    if (viewMode === 'month') {
      if (viewMonth === 0) {
        setViewMonth(11)
        setViewYear(viewYear - 1)
      } else {
        setViewMonth(viewMonth - 1)
      }
    } else {
      const d = new Date(viewYear, viewMonth, 1)
      d.setDate(d.getDate() - 7)
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    }
  }

  function goNext() {
    if (viewMode === 'month') {
      if (viewMonth === 11) {
        setViewMonth(0)
        setViewYear(viewYear + 1)
      } else {
        setViewMonth(viewMonth + 1)
      }
    } else {
      const d = new Date(viewYear, viewMonth, 1)
      d.setDate(d.getDate() + 7)
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    }
  }

  function goToday() {
    const n = new Date()
    setViewYear(n.getFullYear())
    setViewMonth(n.getMonth())
  }

  /* ── Submit event ── */
  async function handleSubmit() {
    if (!currentProject || !user) {
      toast('err', 'Chon cong trinh / 현장을 선택하세요')
      return
    }
    if (!fTitle.trim()) {
      toast('err', 'Nhap tieu de / 제목을 입력하세요')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.from('site_events').insert({
        project_id: currentProject,
        title: fTitle.trim(),
        category: fCategory,
        priority: fPriority,
        start_date: fStartDate,
        end_date: fEndDate,
        progress: parseInt(fProgress) || 0,
        assignee: fAssignee.trim() || null,
        location: fLocation.trim() || null,
        memo: fMemo.trim() || null,
        created_by: user.id,
      })
      if (error) throw error

      setFTitle('')
      setFCategory('construction')
      setFPriority('normal')
      setFStartDate(today())
      setFEndDate(today())
      setFProgress('0')
      setFAssignee('')
      setFLocation('')
      setFMemo('')
      setShowModal(false)
      toast('ok', 'Da luu su kien / 일정 저장 완료')
      loadData()
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (!currentProject) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        Vui long chon cong trinh / 현장을 선택해주세요.
      </div>
    )
  }

  /* ── Derived ── */
  const filteredEvents = filterCat === 'all' ? events : events.filter((e) => e.category === filterCat)
  const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)
  const calendarDays: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) calendarDays.push(null)
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i)

  function eventsForDay(day: number) {
    const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`
    return filteredEvents.filter((e) => e.start_date <= dateStr && (e.end_date ?? e.start_date) >= dateStr)
  }

  const todayStr = today()
  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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

      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Lich cong trinh / 현장 일정관리
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Quan ly lich trinh cong trinh / 현장 일정 관리
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Them / 추가
        </button>
      </div>

      {/* View tabs & navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('month')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              viewMode === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Thang / 월간
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              viewMode === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tuan / 주간
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goPrev} className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            &larr;
          </button>
          <span className="text-sm font-semibold text-gray-900 min-w-[120px] text-center">
            {viewYear}. {String(viewMonth + 1).padStart(2, '0')}
          </span>
          <button onClick={goNext} className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            &rarr;
          </button>
          <button onClick={goToday} className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            Hom nay / 오늘
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCat('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            filterCat === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Tat ca / 전체
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setFilterCat(cat.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filterCat === cat.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Calendar Grid (Month view) ── */}
      {viewMode === 'month' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-7">
            {DAY_LABELS.map((d, i) => (
              <div key={d} className={`px-2 py-2 text-center text-xs font-medium border-b border-gray-200 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'}`}>
                {d}
              </div>
            ))}
            {calendarDays.map((day, idx) => {
              const dateStr = day ? `${monthStr}-${String(day).padStart(2, '0')}` : ''
              const dayEvents = day ? eventsForDay(day) : []
              const isToday = dateStr === todayStr
              return (
                <div
                  key={idx}
                  className={`min-h-[80px] sm:min-h-[100px] border-b border-r border-gray-100 p-1 ${
                    !day ? 'bg-gray-50' : ''
                  }`}
                >
                  {day && (
                    <>
                      <div className={`text-xs font-medium mb-1 ${
                        isToday
                          ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center'
                          : idx % 7 === 0 ? 'text-red-500' : idx % 7 === 6 ? 'text-blue-500' : 'text-gray-700'
                      }`}>
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map((ev) => {
                          const catInfo = CATEGORIES.find((c) => c.value === ev.category)
                          return (
                            <div
                              key={ev.id}
                              className={`text-[10px] px-1 py-0.5 rounded truncate ${catInfo?.color ?? 'bg-gray-100 text-gray-700'}`}
                              title={ev.title}
                            >
                              {ev.title}
                            </div>
                          )
                        })}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] text-gray-400">+{dayEvents.length - 3}</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Week view (simple list) ── */}
      {viewMode === 'week' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4">
            <div className="space-y-2">
              {Array.from({ length: 7 }).map((_, i) => {
                const d = new Date(viewYear, viewMonth, 1)
                // Get start of the week containing the 1st
                const dayOfWeek = d.getDay()
                d.setDate(d.getDate() - dayOfWeek + i)
                const dateStr = d.toISOString().slice(0, 10)
                const dayEvts = filteredEvents.filter((e) => e.start_date <= dateStr && (e.end_date ?? e.start_date) >= dateStr)
                const isToday = dateStr === todayStr
                return (
                  <div key={i} className={`flex gap-3 p-2 rounded-lg ${isToday ? 'bg-blue-50' : ''}`}>
                    <div className="w-20 shrink-0">
                      <div className={`text-xs font-medium ${isToday ? 'text-blue-700' : 'text-gray-600'}`}>
                        {DAY_LABELS[d.getDay()]}
                      </div>
                      <div className={`text-sm font-bold ${isToday ? 'text-blue-700' : 'text-gray-900'}`}>
                        {dateStr.slice(5)}
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      {dayEvts.length === 0 ? (
                        <span className="text-xs text-gray-300">-</span>
                      ) : (
                        dayEvts.map((ev) => {
                          const catInfo = CATEGORIES.find((c) => c.value === ev.category)
                          return (
                            <div key={ev.id} className={`text-xs px-2 py-1 rounded ${catInfo?.color ?? 'bg-gray-100 text-gray-700'}`}>
                              {ev.title}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Event List ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Danh sach su kien / 일정 목록
          </h3>
          <span className="text-xs text-gray-500">Tong / 총 {filteredEvents.length}건</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Dang tai... / 로딩 중...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Chua co du lieu / 데이터 없음
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">Tieu de / 제목</th>
                  <th className="px-3 py-3">Loai / 분류</th>
                  <th className="px-3 py-3">Uu tien / 우선순위</th>
                  <th className="px-3 py-3">Bat dau / 시작</th>
                  <th className="px-3 py-3">Ket thuc / 종료</th>
                  <th className="px-3 py-3 text-right">Tien do / 진행률</th>
                  <th className="px-3 py-3">Vi tri / 위치</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEvents.map((ev) => {
                  const catInfo = CATEGORIES.find((c) => c.value === ev.category)
                  return (
                    <tr key={ev.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-xs text-gray-900 font-medium max-w-[200px] truncate">
                        {ev.title}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <span className={`inline-block px-2 py-0.5 rounded font-semibold ${catInfo?.color ?? 'bg-gray-100 text-gray-700'}`}>
                          {catInfo?.label ?? ev.category}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <span className={`inline-block px-2 py-0.5 rounded font-semibold ${
                          ev.priority === 'urgent' ? 'bg-red-50 text-red-700' :
                          ev.priority === 'high' ? 'bg-amber-50 text-amber-700' :
                          'bg-gray-50 text-gray-600'
                        }`}>
                          {PRIORITIES.find((p) => p.value === ev.priority)?.label ?? ev.priority}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 font-mono whitespace-nowrap">{ev.start_date}</td>
                      <td className="px-3 py-3 text-xs text-gray-600 font-mono whitespace-nowrap">{ev.end_date}</td>
                      <td className="px-3 py-3 text-xs text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${ev.progress}%` }} />
                          </div>
                          <span className="text-gray-600 font-mono">{ev.progress}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500 max-w-[150px] truncate">
                        {ev.location ?? '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Event Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Them su kien / 일정 추가
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">
                &times;
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tieu de / 제목</label>
                <input
                  type="text"
                  value={fTitle}
                  onChange={(e) => setFTitle(e.target.value)}
                  placeholder="Nhap tieu de / 제목 입력"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Loai / 분류</label>
                  <select
                    value={fCategory}
                    onChange={(e) => setFCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Uu tien / 우선순위</label>
                  <select
                    value={fPriority}
                    onChange={(e) => setFPriority(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Bat dau / 시작일</label>
                  <input
                    type="date"
                    value={fStartDate}
                    onChange={(e) => setFStartDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ket thuc / 종료일</label>
                  <input
                    type="date"
                    value={fEndDate}
                    onChange={(e) => setFEndDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tien do / 진행률 (%)</label>
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
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nguoi phu trach / 담당자</label>
                  <input
                    type="text"
                    value={fAssignee}
                    onChange={(e) => setFAssignee(e.target.value)}
                    placeholder="ID hoac ten / ID 또는 이름"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Vi tri / 위치</label>
                <input
                  type="text"
                  value={fLocation}
                  onChange={(e) => setFLocation(e.target.value)}
                  placeholder="Nhap vi tri / 위치 입력"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chu / 메모</label>
                <textarea
                  value={fMemo}
                  onChange={(e) => setFMemo(e.target.value)}
                  rows={3}
                  placeholder="Ghi chu them / 추가 메모"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowModal(false)}
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
        </div>
      )}
    </div>
  )
}
