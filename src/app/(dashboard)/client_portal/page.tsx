'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

/* -- Types ------------------------------------------------- */

interface ProjectSummary {
  id: string
  code: string
  name: string
  status: string
  contract_amount: number | null
  end_date: string | null
}

interface GalleryPhoto {
  id: string
  photo_url: string
  description: string | null
  created_at: string
}

interface RecentInspection {
  id: string
  inspection_date: string
  inspection_type: string
  result: string
  inspector: string
}

/* -- Component --------------------------------------------- */

export default function ClientPortalPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)
  const projects = useAuthStore((s) => s.projects)

  const [loading, setLoading] = useState(false)
  const [project, setProject] = useState<ProjectSummary | null>(null)
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [inspections, setInspections] = useState<RecentInspection[]>([])
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const isCeo = user?.role === 'ceo'

  const toast = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  /* -- Load data -- */
  const loadData = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      // Project info
      const proj = projects.find((p) => p.id === currentProject)
      if (proj) {
        setProject({
          id: proj.id,
          code: proj.code,
          name: proj.name,
          status: proj.status,
          contract_amount: proj.contract_amount,
          end_date: proj.end_date,
        })
      }

      // Recent photos
      const { data: photoData } = await supabase
        .from('gallery_photos')
        .select('id, photo_url, description, created_at')
        .eq('project_id', currentProject)
        .order('created_at', { ascending: false })
        .limit(8)
      setPhotos((photoData as GalleryPhoto[]) ?? [])

      // Recent quality inspections
      const { data: inspData } = await supabase
        .from('quality_inspections')
        .select('id, inspection_date, inspection_type, result, inspector')
        .eq('project_id', currentProject)
        .order('inspection_date', { ascending: false })
        .limit(10)
      setInspections((inspData as RecentInspection[]) ?? [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [currentProject, projects])

  useEffect(() => {
    if (isCeo && currentProject) loadData()
  }, [isCeo, currentProject, loadData])

  /* -- Generate share link placeholder -- */
  function generateShareLink() {
    const token = Math.random().toString(36).substring(2, 15)
    const link = `${window.location.origin}/shared/${currentProject}/${token}`
    setShareLink(link)
    navigator.clipboard.writeText(link).then(
      () => toast('ok', 'Da sao chep link / 링크 복사 완료'),
      () => toast('ok', 'Da tao link / 링크 생성 완료')
    )
  }

  /* -- Access guard -- */
  if (!user) return null
  if (!isCeo) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
        Chi danh cho CEO / CEO 전용 페이지입니다.
      </div>
    )
  }

  if (!currentProject) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        Vui long chon cong trinh / 현장을 선택해주세요.
      </div>
    )
  }

  const RESULT_COLORS: Record<string, string> = {
    pass: 'bg-green-50 text-green-700',
    conditional: 'bg-yellow-50 text-yellow-700',
    fail: 'bg-red-50 text-red-700',
  }

  const RESULT_LABELS: Record<string, string> = {
    pass: 'Dat / 합격',
    conditional: 'Co DK / 조건부',
    fail: 'Khong dat / 불합격',
  }

  const TYPE_LABELS: Record<string, string> = {
    concrete: 'Be tong / 콘크리트',
    waterproof: 'Chong tham / 방수',
    rebar: 'Cot thep / 철근',
    finishing: 'Hoan thien / 마감',
    other: 'Khac / 기타',
  }

  const passRate =
    inspections.length > 0
      ? Math.round(
          (inspections.filter((i) => i.result === 'pass').length / inspections.length) * 100
        )
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

      {/* Page title */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Cong khach hang / 고객포털
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Chia se thong tin du an / 프로젝트 정보 공유 (읽기 전용 뷰 개념)
          </p>
        </div>
        <button
          onClick={generateShareLink}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shrink-0"
        >
          Tao link / 공유 링크 생성
        </button>
      </div>

      {/* Share Link */}
      {shareLink && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs font-medium text-blue-700 mb-2">Link chia se / 공유 링크:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800 font-mono truncate">
              {shareLink}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(shareLink)
                toast('ok', 'Da sao chep / 복사 완료')
              }}
              className="px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors shrink-0"
            >
              Copy
            </button>
          </div>
          <p className="text-xs text-blue-500 mt-2">
            * Day la link mau. Chuc nang chia se thuc te se duoc phat trien sau. / 이 링크는 데모용입니다. 실제 공유 기능은 추후 개발 예정입니다.
          </p>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-sm text-gray-400">Dang tai... / 로딩 중...</div>
      ) : (
        <>
          {/* Project Summary */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">
                Tong quan du an / 프로젝트 요약
              </h3>
            </div>
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500">Ten du an / 프로젝트명</p>
                  <p className="mt-1 text-sm font-bold text-gray-900">
                    {project?.name ?? '-'}
                  </p>
                  <p className="text-xs text-gray-400">{project?.code ?? ''}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Trang thai / 상태</p>
                  <p className="mt-1">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                        project?.status === 'active'
                          ? 'bg-green-50 text-green-700'
                          : project?.status === 'completed'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {project?.status === 'active'
                        ? 'Dang thi cong / 진행중'
                        : project?.status === 'completed'
                          ? 'Hoan thanh / 완료'
                          : 'Tam dung / 중단'}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Ty le hop cach / 합격률</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{passRate}%</p>
                  <p className="text-xs text-gray-400">
                    {inspections.filter((i) => i.result === 'pass').length}/{inspections.length} kiem tra / 검사
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Ngay ket thuc / 종료일</p>
                  <p className="mt-1 text-sm font-bold text-gray-900">
                    {project?.end_date ?? 'Chua xac dinh / 미정'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Photos */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Anh gan day / 최근 사진
              </h3>
              <span className="text-xs text-gray-500">{photos.length} anh / 장</span>
            </div>
            {photos.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                Chua co anh / 사진 없음
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-square bg-gray-100">
                      <img
                        src={photo.photo_url}
                        alt={photo.description ?? 'photo'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                    <div className="p-2">
                      <p className="text-xs text-gray-500 truncate">
                        {photo.description ?? new Date(photo.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Inspections */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Ket qua kiem tra gan day / 최근 검사 결과
              </h3>
              <span className="text-xs text-gray-500">{inspections.length}건</span>
            </div>
            {inspections.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                Chua co du lieu / 데이터 없음
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="px-3 py-3">Ngay / 날짜</th>
                      <th className="px-3 py-3">Loai / 유형</th>
                      <th className="px-3 py-3">Nguoi KT / 검사자</th>
                      <th className="px-3 py-3">Ket qua / 결과</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {inspections.map((ins) => (
                      <tr key={ins.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 text-xs text-gray-600 font-mono whitespace-nowrap">
                          {ins.inspection_date}
                        </td>
                        <td className="px-3 py-3 text-xs">
                          <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold">
                            {TYPE_LABELS[ins.inspection_type] ?? ins.inspection_type}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-700">{ins.inspector}</td>
                        <td className="px-3 py-3 text-xs">
                          <span
                            className={`inline-block px-2 py-0.5 rounded font-semibold ${
                              RESULT_COLORS[ins.result] ?? 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {RESULT_LABELS[ins.result] ?? ins.result}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Read-only notice */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500">
              Day la giao dien doc / 이 페이지는 읽기 전용 뷰입니다.
              Khach hang chi co the xem, khong the chinh sua. / 고객은 열람만 가능하며 수정할 수 없습니다.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
