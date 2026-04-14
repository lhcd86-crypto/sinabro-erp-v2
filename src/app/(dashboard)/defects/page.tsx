'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isAdmin } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

/* ── Types ───────────────────────────────────────── */

interface DefectRecord {
  id: string
  project_id: string
  location: string
  description: string
  photos: string[]
  priority: 'low' | 'medium' | 'high'
  status: 'reported' | 'in-progress' | 'completed'
  assigned_to: string | null
  repair_notes: string | null
  reported_by: string
  reported_at: string
  completed_at: string | null
}

/* ── Constants ───────────────────────────────────── */

const PRIORITY_MAP: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: 'bg-gray-50', text: 'text-gray-700', label: 'Thap / 낮음' },
  medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Trung binh / 보통' },
  high: { bg: 'bg-red-50', text: 'text-red-700', label: 'Cao / 높음' },
}

const STATUS_MAP: Record<string, { bg: string; text: string; label: string }> = {
  reported: { bg: 'bg-red-50', text: 'text-red-700', label: 'Bao cao / 접수' },
  'in-progress': { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Dang sua / 보수중' },
  completed: { bg: 'bg-green-50', text: 'text-green-700', label: 'Hoan thanh / 완료' },
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

/* ── Component ─────────────────────────────────────── */

export default function DefectsPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [defects, setDefects] = useState<DefectRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  /* ── Form state ── */
  const [fLocation, setFLocation] = useState('')
  const [fDesc, setFDesc] = useState('')
  const [fPhotos, setFPhotos] = useState<File[]>([])
  const [fPriority, setFPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [fAssignee, setFAssignee] = useState('')

  const toast = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  const canManage = user ? isAdmin(user.role) || user.role === 'engineer' : false

  /* ── Load data ── */
  const loadData = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('defects')
        .select('*')
        .eq('project_id', currentProject)
        .order('reported_at', { ascending: false })
      setDefects((data as DefectRecord[]) ?? [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [currentProject])

  useEffect(() => {
    if (user && currentProject) loadData()
  }, [user, currentProject, loadData])

  /* ── Upload photos ── */
  async function uploadPhotos(files: File[]): Promise<string[]> {
    const urls: string[] = []
    for (const file of files) {
      const path = `defects/${currentProject}/${today()}_${Date.now()}_${file.name}`
      const { error } = await supabase.storage
        .from('report-photos')
        .upload(path, file, { upsert: true })
      if (!error) {
        const { data } = supabase.storage.from('report-photos').getPublicUrl(path)
        if (data?.publicUrl) urls.push(data.publicUrl)
      }
    }
    return urls
  }

  /* ── Submit defect ── */
  async function handleSubmit() {
    if (!currentProject || !user) {
      toast('err', 'Chon cong trinh / 현장을 선택하세요')
      return
    }
    if (!fLocation.trim() || !fDesc.trim()) {
      toast('err', 'Nhap vi tri va mo ta / 위치와 내용을 입력하세요')
      return
    }

    setSaving(true)
    try {
      let photoUrls: string[] = []
      if (fPhotos.length > 0) {
        photoUrls = await uploadPhotos(fPhotos)
      }

      const { error } = await supabase.from('defects').insert({
        project_id: currentProject,
        location: fLocation.trim(),
        description: fDesc.trim(),
        photos: photoUrls,
        priority: fPriority,
        status: 'reported',
        assigned_to: fAssignee.trim() || null,
        reported_by: user.id,
        reported_at: new Date().toISOString(),
      })
      if (error) throw error

      setFLocation('')
      setFDesc('')
      setFPhotos([])
      setFPriority('medium')
      setFAssignee('')
      setShowForm(false)
      toast('ok', 'Da bao cao ha tu / 하자 접수 완료')
      loadData()
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  /* ── Update status ── */
  async function updateStatus(id: string, status: string, repairNotes?: string) {
    try {
      const update: Record<string, unknown> = { status }
      if (status === 'completed') update.completed_at = new Date().toISOString()
      if (repairNotes) update.repair_notes = repairNotes

      const { error } = await supabase.from('defects').update(update).eq('id', id)
      if (error) throw error
      toast('ok', 'Da cap nhat / 상태 업데이트 완료')
      loadData()
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Update failed')
    }
  }

  const filtered = filterStatus === 'all'
    ? defects
    : defects.filter((d) => d.status === filterStatus)

  if (!currentProject) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        Vui long chon cong trinh / 현장을 선택해주세요.
      </div>
    )
  }

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
            Ha tu bao hanh / 하자보수
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Quan ly ha tu va bao hanh / 하자 관리 및 보수 이력
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Bao cao / 접수
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Tong ha tu / 총 하자</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{defects.length}</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Chua xu ly / 미처리</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {defects.filter((d) => d.status !== 'completed').length}
              </p>
            </div>
            <div className="w-3 h-3 rounded-full bg-red-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Da hoan thanh / 완료</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {defects.filter((d) => d.status === 'completed').length}
              </p>
            </div>
            <div className="w-3 h-3 rounded-full bg-green-500 shrink-0 mt-1" />
          </div>
        </div>
      </div>

      {/* ── Report Form ── */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              Bao cao ha tu / 하자 접수
            </h3>
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Vi tri / 위치
                </label>
                <input
                  type="text"
                  value={fLocation}
                  onChange={(e) => setFLocation(e.target.value)}
                  placeholder="Tang 3, phong 301 / 3층 301호"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Muc do / 우선순위
                </label>
                <select
                  value={fPriority}
                  onChange={(e) => setFPriority(e.target.value as 'low' | 'medium' | 'high')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Thap / 낮음</option>
                  <option value="medium">Trung binh / 보통</option>
                  <option value="high">Cao / 높음</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Nguoi xu ly / 담당자
                </label>
                <input
                  type="text"
                  value={fAssignee}
                  onChange={(e) => setFAssignee(e.target.value)}
                  placeholder="Nhap ten / 이름 입력"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Mo ta / 내용
              </label>
              <textarea
                value={fDesc}
                onChange={(e) => setFDesc(e.target.value)}
                rows={3}
                placeholder="Mo ta chi tiet ha tu / 하자 상세 내용"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Anh / 사진
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setFPhotos(Array.from(e.target.files ?? []))}
                className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
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
                {saving ? 'Dang gui... / 저장 중...' : 'Gui bao cao / 접수'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Filter ── */}
      <div className="flex gap-2">
        {['all', 'reported', 'in-progress', 'completed'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filterStatus === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {s === 'all' ? 'Tat ca / 전체' : STATUS_MAP[s]?.label ?? s}
          </button>
        ))}
      </div>

      {/* ── Defects List ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Danh sach ha tu / 하자 목록
          </h3>
          <span className="text-xs text-gray-500">
            {filtered.length}건
          </span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Dang tai... / 로딩 중...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Chua co du lieu / 데이터 없음
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((defect) => {
              const st = STATUS_MAP[defect.status] ?? STATUS_MAP.reported
              const pr = PRIORITY_MAP[defect.priority] ?? PRIORITY_MAP.medium
              const isExpanded = expandedId === defect.id

              return (
                <div key={defect.id} className="hover:bg-gray-50">
                  <div
                    className="px-4 py-3 flex items-center gap-3 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : defect.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${pr.bg} ${pr.text}`}>
                          {pr.label}
                        </span>
                        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${st.bg} ${st.text}`}>
                          {st.label}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">{defect.location}</p>
                      <p className="text-xs text-gray-500 truncate">{defect.description}</p>
                    </div>
                    <div className="text-xs text-gray-400 font-mono whitespace-nowrap">
                      {defect.reported_at?.slice(0, 10)}
                    </div>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-gray-500">Vi tri / 위치:</span>
                          <p className="font-medium text-gray-900">{defect.location}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Nguoi xu ly / 담당:</span>
                          <p className="font-medium text-gray-900">{defect.assigned_to ?? '-'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Ngay bao cao / 접수일:</span>
                          <p className="font-medium text-gray-900">{defect.reported_at?.slice(0, 10)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Hoan thanh / 완료일:</span>
                          <p className="font-medium text-gray-900">{defect.completed_at?.slice(0, 10) ?? '-'}</p>
                        </div>
                      </div>
                      <div className="text-xs">
                        <span className="text-gray-500">Mo ta / 내용:</span>
                        <p className="mt-1 text-gray-700">{defect.description}</p>
                      </div>
                      {defect.repair_notes && (
                        <div className="text-xs">
                          <span className="text-gray-500">Ghi chu sua chua / 보수 내용:</span>
                          <p className="mt-1 text-gray-700">{defect.repair_notes}</p>
                        </div>
                      )}
                      {(defect.photos ?? []).length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {defect.photos.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                              <img src={url} alt={`defect-${i}`} className="w-20 h-20 object-cover rounded-lg border" />
                            </a>
                          ))}
                        </div>
                      )}
                      {canManage && defect.status !== 'completed' && (
                        <div className="flex gap-2 pt-2">
                          {defect.status === 'reported' && (
                            <button
                              onClick={() => updateStatus(defect.id, 'in-progress')}
                              className="px-3 py-1.5 text-xs font-medium bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                            >
                              Bat dau sua / 보수시작
                            </button>
                          )}
                          <button
                            onClick={() => {
                              const notes = prompt('Ghi chu sua chua / 보수 내용:')
                              if (notes !== null) updateStatus(defect.id, 'completed', notes)
                            }}
                            className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Hoan thanh / 완료
                          </button>
                        </div>
                      )}
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
