'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

/* ── Types ───────────────────────────────────────── */

interface PhotoRecord {
  id: string
  project_id: string | null
  photo_url: string
  caption: string | null
  category: string | null
  created_by: string | null
  created_at: string | null
  taken_date?: string | null
  uploaded_by?: string | null
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

/* ── Component ─────────────────────────────────────── */

export default function GalleryPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [photos, setPhotos] = useState<PhotoRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [dateFilter, setDateFilter] = useState('')
  const [modalPhoto, setModalPhoto] = useState<PhotoRecord | null>(null)

  /* ── Upload form ── */
  const [showUpload, setShowUpload] = useState(false)
  const [uFiles, setUFiles] = useState<File[]>([])
  const [uCaption, setUCaption] = useState('')
  const [uDate, setUDate] = useState(today())

  const toast = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  /* ── Load photos ── */
  const loadPhotos = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      // Load from both workforce_photos and site_work_photos, plus gallery
      const [{ data: wf }, { data: sw }, { data: gal }] = await Promise.all([
        supabase
          .from('workforce_photos')
          .select('id, project_id, photo_urls, memo, created_by, created_at')
          .eq('project_id', currentProject)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('site_work_photos')
          .select('id, project_id, photo_urls, memo, created_by, created_at')
          .eq('project_id', currentProject)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('gallery_photos')
          .select('id, project_id, photo_url, caption, category, created_by, created_at')
          .eq('project_id', currentProject)
          .order('created_at', { ascending: false })
          .limit(100),
      ])

      // Normalize: workforce/site_work have photo_urls array, gallery has single photo_url
      const wfPhotos = (wf ?? []).flatMap((r: Record<string, unknown>) => {
        const urls = (r.photo_urls as string[]) ?? []
        return urls.map((url: string) => ({
          id: `${r.id}-${url.slice(-8)}`,
          project_id: r.project_id as string,
          photo_url: url.startsWith('http') ? url : `https://ltfjjwktqefchlshblve.supabase.co/storage/v1/object/public/report-photos/${url}`,
          caption: (r.memo as string) || '',
          category: 'workforce',
          taken_date: (r.created_at as string) || '',
          uploaded_by: (r.created_by as string) || '',
          created_at: (r.created_at as string) || '',
        }))
      })

      const swPhotos = (sw ?? []).flatMap((r: Record<string, unknown>) => {
        const urls = (r.photo_urls as string[]) ?? []
        return urls.map((url: string) => ({
          id: `${r.id}-${url.slice(-8)}`,
          project_id: r.project_id as string,
          photo_url: url.startsWith('http') ? url : `https://ltfjjwktqefchlshblve.supabase.co/storage/v1/object/public/report-photos/${url}`,
          caption: (r.memo as string) || '',
          category: 'site_work',
          taken_date: (r.created_at as string) || '',
          uploaded_by: (r.created_by as string) || '',
          created_at: (r.created_at as string) || '',
        }))
      })

      const galPhotos = ((gal as PhotoRecord[]) ?? []).map((r) => ({
        ...r,
        photo_url: r.photo_url?.startsWith('http') ? r.photo_url : `https://ltfjjwktqefchlshblve.supabase.co/storage/v1/object/public/report-photos/${r.photo_url}`,
        taken_date: r.created_at,
        uploaded_by: r.created_by,
      }))

      const all = [
        ...wfPhotos,
        ...swPhotos,
        ...galPhotos,
      ].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))

      setPhotos(all as PhotoRecord[])
    } catch {
      // silent - some tables may not exist yet
    } finally {
      setLoading(false)
    }
  }, [currentProject])

  useEffect(() => {
    if (user && currentProject) loadPhotos()
  }, [user, currentProject, loadPhotos])

  /* ── Upload ── */
  async function handleUpload() {
    if (!currentProject || !user) {
      toast('err', 'Chon cong trinh / 현장을 선택하세요')
      return
    }
    if (uFiles.length === 0) {
      toast('err', 'Chon anh / 사진을 선택하세요')
      return
    }

    setUploading(true)
    try {
      for (const file of uFiles) {
        const path = `gallery/${currentProject}/${uDate}_${Date.now()}_${file.name}`
        const { error: upErr } = await supabase.storage
          .from('report-photos')
          .upload(path, file, { upsert: true })
        if (upErr) continue

        const { data } = supabase.storage.from('report-photos').getPublicUrl(path)
        if (!data?.publicUrl) continue

        await supabase.from('gallery_photos').insert({
          project_id: currentProject,
          photo_url: data.publicUrl,
          caption: uCaption.trim() || null,
          category: 'general',
          created_by: user.id,
        })
      }

      setUFiles([])
      setUCaption('')
      setShowUpload(false)
      toast('ok', 'Da tai anh len / 업로드 완료')
      loadPhotos()
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  /* ── Filtered photos ── */
  const filtered = dateFilter
    ? photos.filter((p) => (p.created_at?.slice(0, 10)) === dateFilter)
    : photos

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

      {/* Modal */}
      {modalPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setModalPhoto(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={modalPhoto.photo_url}
              alt={modalPhoto.caption ?? 'photo'}
              className="max-w-full max-h-[80vh] object-contain"
            />
            <div className="p-3 bg-white border-t">
              <p className="text-sm font-medium text-gray-900">
                {modalPhoto.caption ?? 'Khong co ghi chu / 메모 없음'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {modalPhoto.taken_date ?? modalPhoto.created_at?.slice(0, 10)}
                {modalPhoto.category && ` | ${modalPhoto.category}`}
              </p>
            </div>
            <button
              onClick={() => setModalPhoto(null)}
              className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              X
            </button>
          </div>
        </div>
      )}

      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Anh cong trinh / 현장사진
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Thu vien anh cong trinh / 현장 사진 갤러리
          </p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Tai len / 업로드
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <p className="text-xs font-medium text-gray-500">Tong anh / 총 사진</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{photos.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <p className="text-xs font-medium text-gray-500">Hien thi / 표시</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{filtered.length}</p>
        </div>
      </div>

      {/* ── Upload Form ── */}
      {showUpload && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              Tai anh len / 사진 업로드
            </h3>
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Ngay chup / 촬영일
                </label>
                <input
                  type="date"
                  value={uDate}
                  onChange={(e) => setUDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Ghi chu / 메모
                </label>
                <input
                  type="text"
                  value={uCaption}
                  onChange={(e) => setUCaption(e.target.value)}
                  placeholder="Mo ta anh / 사진 설명"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Chon anh / 사진 선택
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setUFiles(Array.from(e.target.files ?? []))}
                className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {uFiles.length > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  {uFiles.length} anh da chon / 장 선택됨
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowUpload(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Huy / 취소
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? 'Dang tai... / 업로드 중...' : 'Tai len / 업로드'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Date Filter ── */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-gray-600">Loc ngay / 날짜 필터:</label>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {dateFilter && (
          <button
            onClick={() => setDateFilter('')}
            className="text-xs text-blue-600 hover:underline"
          >
            Xoa loc / 필터 해제
          </button>
        )}
      </div>

      {/* ── Photo Grid ── */}
      {loading ? (
        <div className="p-8 text-center text-sm text-gray-400">
          Dang tai... / 로딩 중...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-400">
          Chua co anh / 사진 없음
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((photo) => (
            <div
              key={photo.id}
              className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setModalPhoto(photo)}
            >
              <div className="aspect-square">
                <img
                  src={photo.photo_url}
                  alt={photo.caption ?? 'site photo'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>
              <div className="p-2">
                <p className="text-xs text-gray-700 font-medium truncate">
                  {photo.caption ?? '-'}
                </p>
                <p className="text-[10px] text-gray-400 font-mono">
                  {photo.taken_date ?? photo.created_at?.slice(0, 10)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
