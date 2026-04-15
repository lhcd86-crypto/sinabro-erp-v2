'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isAdmin } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

/* ── Types ───────────────────────────────────────── */

interface Announcement {
  id: string
  title: string
  content: string
  created_by: string
  created_at: string
  author_name?: string
}

interface ReadStatus {
  announcement_id: string
  user_id: string
  read_at: string
}

/* ── Component ─────────────────────────────────────── */

export default function AnnouncementsPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  /* ── Form state ── */
  const [fTitle, setFTitle] = useState('')
  const [fContent, setFContent] = useState('')

  const toast = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  const canCreate = user ? isAdmin(user.role) : false

  /* ── Load data ── */
  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      let query = supabase
        .from('announcements')
        .select('id, title, content, created_by, created_at')
        .order('created_at', { ascending: false })
        .limit(50)

      if (currentProject) {
        query = query.or(`project_id.eq.${currentProject},project_id.is.null`)
      }

      const { data: anns } = await query
      setAnnouncements((anns as Announcement[]) ?? [])

      // Load read statuses
      const { data: reads } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', user.id)

      setReadIds(new Set((reads ?? []).map((r: { announcement_id: string | null }) => r.announcement_id ?? '')))
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [user, currentProject])

  useEffect(() => {
    if (user) loadData()
  }, [user, loadData])

  /* ── Mark as read ── */
  async function markAsRead(announcementId: string) {
    if (!user || readIds.has(announcementId)) return
    try {
      await supabase.from('announcement_reads').insert({
        announcement_id: announcementId,
        user_id: user.id,
        read_at: new Date().toISOString(),
      })
      setReadIds((prev) => new Set([...prev, announcementId]))
    } catch {
      // silent
    }
  }

  /* ── Toggle expand ── */
  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      markAsRead(id)
    }
  }

  /* ── Submit announcement ── */
  async function handleSubmit() {
    if (!user) return
    if (!fTitle.trim() || !fContent.trim()) {
      toast('err', 'Nhap tieu de va noi dung / 제목과 내용을 입력하세요')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.from('announcements').insert({
        title: fTitle.trim(),
        content: fContent.trim(),
        created_by: user.id,
      })
      if (error) throw error

      setFTitle('')
      setFContent('')
      setShowForm(false)
      toast('ok', 'Da dang thong bao / 공지 등록 완료')
      loadData()
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  /* ── Delete announcement ── */
  async function handleDelete(id: string) {
    if (!confirm('Xoa thong bao nay? / 이 공지를 삭제하시겠습니까?')) return
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id)
      if (error) throw error
      toast('ok', 'Da xoa / 삭제 완료')
      loadData()
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Delete failed')
    }
  }

  const unreadCount = announcements.filter((a) => !readIds.has(a.id)).length

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
            Thong bao / 공지사항
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Thong bao chung va cong trinh / 전체 및 현장 공지
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Tao moi / 새 공지
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Tong thong bao / 총 공지</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{announcements.length}</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Chua doc / 미읽음</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{unreadCount}</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-red-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Da doc / 읽음</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {announcements.length - unreadCount}
              </p>
            </div>
            <div className="w-3 h-3 rounded-full bg-green-500 shrink-0 mt-1" />
          </div>
        </div>
      </div>

      {/* ── Create Form (admin only) ── */}
      {showForm && canCreate && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              Tao thong bao moi / 새 공지 작성
            </h3>
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Tieu de / 제목
              </label>
              <input
                type="text"
                value={fTitle}
                onChange={(e) => setFTitle(e.target.value)}
                placeholder="Nhap tieu de / 제목 입력"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Noi dung / 내용
              </label>
              <textarea
                value={fContent}
                onChange={(e) => setFContent(e.target.value)}
                rows={6}
                placeholder="Nhap noi dung thong bao / 공지 내용 입력"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Huy / 취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Dang gui... / 저장 중...' : 'Dang thong bao / 공지 등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Announcements List ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            Danh sach thong bao / 공지 목록
          </h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Dang tai... / 로딩 중...
          </div>
        ) : announcements.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Chua co thong bao / 공지 없음
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {announcements.map((ann) => {
              const isRead = readIds.has(ann.id)
              const isExpanded = expandedId === ann.id

              return (
                <div key={ann.id} className={`${!isRead ? 'bg-blue-50/30' : ''}`}>
                  <div
                    className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleExpand(ann.id)}
                  >
                    {/* Unread dot */}
                    <div className="shrink-0">
                      {!isRead ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-transparent" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${!isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {ann.title}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {ann.content.slice(0, 80)}
                        {ann.content.length > 80 ? '...' : ''}
                      </p>
                    </div>
                    <div className="text-xs text-gray-400 font-mono whitespace-nowrap">
                      {ann.created_at?.slice(0, 10)}
                    </div>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 ml-6 border-t border-gray-100">
                      <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap text-sm mt-2">
                        {ann.content}
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-xs text-gray-400">
                          {ann.created_at?.slice(0, 16).replace('T', ' ')}
                        </p>
                        {canCreate && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(ann.id)
                            }}
                            className="px-2.5 py-1 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            Xoa / 삭제
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
