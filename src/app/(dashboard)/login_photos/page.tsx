'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

/* -- Types ------------------------------------------------- */

interface LoginPhoto {
  id: string
  user_id: string
  photo_url: string
  face_descriptor: unknown | null
  created_at: string
  users?: { name: string } | null
}

/* -- Helpers ----------------------------------------------- */

const ALLOWED_ROLES = ['hr', 'ceo', 'director_m']

function today() {
  return new Date().toISOString().slice(0, 10)
}

/* -- Component --------------------------------------------- */

export default function LoginPhotosPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [loading, setLoading] = useState(false)
  const [photos, setPhotos] = useState<LoginPhoto[]>([])
  const [dateFrom, setDateFrom] = useState(today())
  const [dateTo, setDateTo] = useState(today())
  const [selectedPhoto, setSelectedPhoto] = useState<LoginPhoto | null>(null)

  /* -- Access check ---------------------------------------- */
  if (user && !ALLOWED_ROLES.includes(user.role)) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
        Khong co quyen truy cap / 접근 권한이 없습니다.
      </div>
    )
  }

  /* -- Load data ------------------------------------------- */
  const loadData = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const fromTs = `${dateFrom}T00:00:00`
      const toTs = `${dateTo}T23:59:59`

      const { data } = await supabase
        .from('login_photos')
        .select('id, user_id, photo_url, face_descriptor, created_at, users(name)')
        .gte('created_at', fromTs)
        .lte('created_at', toTs)
        .order('created_at', { ascending: false })
        .limit(200)

      setPhotos((data as unknown as LoginPhoto[]) ?? [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [currentProject, dateFrom, dateTo])

  useEffect(() => {
    if (user && currentProject) loadData()
  }, [user, currentProject, loadData])

  /* -- Derived -------------------------------------------- */
  const uniqueUsers = new Set(photos.map((p) => p.user_id)).size
  const todayPhotos = photos.filter((p) => p.created_at.startsWith(today()))

  if (!currentProject) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        Vui long chon cong trinh / 현장을 선택해주세요.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="bg-white rounded-xl overflow-hidden max-w-lg w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <img
                src={selectedPhoto.photo_url}
                alt="Login photo"
                className="w-full max-h-[70vh] object-contain bg-gray-100"
              />
            </div>
            <div className="p-4">
              <p className="text-sm font-medium text-gray-900">
                {typeof selectedPhoto.users === 'object' && selectedPhoto.users != null
                  ? (selectedPhoto.users as { name: string }).name
                  : selectedPhoto.user_id.slice(0, 8)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(selectedPhoto.created_at).toLocaleString('ko-KR')}
              </p>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="mt-3 w-full py-2 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Dong / 닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Anh dang nhap / 로그인 사진
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Lich su anh dang nhap cua nhan vien / 직원 로그인 사진 이력
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Tu ngay / 시작일
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Den ngay / 종료일
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={loadData}
            className="mt-5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tim / 조회
          </button>
          <button
            onClick={() => { setDateFrom(today()); setDateTo(today()) }}
            className="mt-5 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Hom nay / 오늘
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Tong anh hom nay / 오늘 로그인</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{todayPhotos.length}</p>
              <p className="mt-1 text-xs text-gray-400">luot / 건</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Nguoi dung / 사용자 수</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{uniqueUsers}</p>
              <p className="mt-1 text-xs text-gray-400">nguoi / 명</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-green-500 shrink-0 mt-1" />
          </div>
        </div>
      </div>

      {/* Photo Grid */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Anh dang nhap / 로그인 사진
          </h3>
          <span className="text-xs text-gray-500">
            Tong / 총 {photos.length}건
          </span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Dang tai... / 로딩 중...
          </div>
        ) : photos.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Khong co anh / 사진 없음
          </div>
        ) : (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {photos.map((photo) => {
              const userName =
                typeof photo.users === 'object' && photo.users != null
                  ? (photo.users as { name: string }).name
                  : photo.user_id.slice(0, 8)
              const time = new Date(photo.created_at)
              return (
                <div
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  className="group cursor-pointer bg-gray-50 rounded-lg overflow-hidden border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all"
                >
                  <div className="aspect-square bg-gray-100 relative overflow-hidden">
                    <img
                      src={photo.photo_url}
                      alt={userName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium text-gray-700 truncate">
                      {userName}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {time.toLocaleDateString('ko-KR')} {time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
