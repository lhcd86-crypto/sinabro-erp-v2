'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import {
  useDailyReport,
  type DailyReportRow,
  type WorkerCounts,
  type MaterialQty,
  type ExtraMaterial,
} from '@/hooks/useDailyReport'

export default function GongmuPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)
  const projects = useAuthStore((s) => s.projects)

  const {
    reports,
    loading,
    error,
    loadReports,
    confirmReport,
    requestRevision,
  } = useDailyReport()

  const [filterProject, setFilterProject] = useState<string>('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  /* Load reports on mount / filter change */
  useEffect(() => {
    const pid = filterProject || currentProject || undefined
    loadReports(pid)
  }, [filterProject, currentProject, loadReports])

  /* ── Derived lists ── */
  const pendingReports = reports.filter((r) => !r.confirmed)
  const confirmedReports = reports.filter((r) => r.confirmed)

  /* ── Metrics ── */
  const pendingCount = pendingReports.length
  const confirmedCount = confirmedReports.length
  const totalCount = reports.length

  /* ── Helpers ── */
  const workerTotal = (r: DailyReportRow) => {
    return (
      (r.direct_worker_am ?? 0) + (r.direct_worker_pm ?? 0) + (r.direct_worker_ni ?? 0) +
      (r.indirect_worker_am ?? 0) + (r.indirect_worker_pm ?? 0) + (r.indirect_worker_ni ?? 0) +
      (r.vn_engineer_am ?? 0) + (r.vn_engineer_pm ?? 0) + (r.vn_engineer_ni ?? 0)
    )
  }

  const matSummary = (r: DailyReportRow) => {
    const parts: string[] = []
    if (r.qty_v250) parts.push(`V250:${r.qty_v250}m`)
    if (r.qty_sv250) parts.push(`SV:${r.qty_sv250}m`)
    if (r.qty_hlm) parts.push(`HLM:${r.qty_hlm}k`)
    if (r.qty_m230) parts.push(`M230:${r.qty_m230}k`)
    if (r.qty_db2015) parts.push(`DB:${r.qty_db2015}m`)
    if (r.qty_other) parts.push(`etc:${r.qty_other}`)
    return parts.length > 0 ? parts.join(', ') : '-'
  }

  const _matSummaryOld = (r: DailyReportRow) => {
    const m = r.materials
    if (!m) return '-'
    const parts: string[] = []
    if (m.v250) parts.push(`V250:${m.v250}m`)
    if (m.sv250) parts.push(`SV:${m.sv250}m`)
    if (m.hlm) parts.push(`HLM:${m.hlm}k`)
    if (m.m230) parts.push(`M230:${m.m230}k`)
    if (m.db2015) parts.push(`DB:${m.db2015}m`)
    if (m.etc) parts.push(`etc:${m.etc}`)
    if (r.extra_materials?.length) {
      r.extra_materials.forEach((e) => {
        if (e.name) parts.push(`${e.name}:${e.qty}${e.unit}`)
      })
    }
    return parts.length > 0 ? parts.join(', ') : '-'
  }

  const projectLabel = (r: DailyReportRow) => {
    const p = r.projects
    if (p) return `${p.code} ${p.name}`
    const found = projects.find((pr) => pr.id === r.project_id)
    return found ? `${found.code} ${found.name}` : r.project_id
  }

  /* ── Actions ── */
  const handleConfirm = useCallback(
    async (id: string) => {
      if (!confirm('Xac nhan bao cao nay? / 이 일보를 확인하시겠습니까?'))
        return
      setActionLoading(id)
      try {
        await confirmReport(id)
      } catch {
        // error handled in hook
      } finally {
        setActionLoading(null)
      }
    },
    [confirmReport]
  )

  const handleRevision = useCallback(
    async (id: string) => {
      if (
        !confirm(
          'Yeu cau sua lai bao cao nay? / 수정을 요청하시겠습니까?'
        )
      )
        return
      setActionLoading(id)
      try {
        await requestRevision(id)
      } catch {
        // error handled in hook
      } finally {
        setActionLoading(null)
      }
    },
    [requestRevision]
  )

  const inp =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none'

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Xac nhan nhat ky / 일보 확인 (공무)
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Kiem tra va xac nhan bao cao hang ngay / 일보를 검토하고 확인합니다
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* ── Project filter ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">
            Cong trinh / 현장 필터:
          </label>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className={`${inp} sm:w-72`}
          >
            <option value="">
              {currentProject
                ? 'Hien tai / 현재 현장'
                : 'Tat ca / 전체'}
            </option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} - {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              loadReports(filterProject || currentProject || undefined)
            }
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold whitespace-nowrap"
          >
            Lam moi / 새로고침
          </button>
        </div>
      </div>

      {/* ── Metrics ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <p className="text-xs text-yellow-600 font-semibold">
            Cho duyet / 대기
          </p>
          <p className="text-3xl font-extrabold text-yellow-700 mt-1">
            {pendingCount}
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-xs text-green-600 font-semibold">
            Da xac nhan / 확인 완료
          </p>
          <p className="text-3xl font-extrabold text-green-700 mt-1">
            {confirmedCount}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-xs text-blue-600 font-semibold">
            Tong cong / 합계
          </p>
          <p className="text-3xl font-extrabold text-blue-700 mt-1">
            {totalCount}
          </p>
        </div>
      </div>

      {loading && (
        <p className="text-sm text-gray-400 text-center py-4">
          Dang tai... / 로딩 중...
        </p>
      )}

      {/* ══════════ PENDING REPORTS ══════════ */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          Bao cao cho duyet / 미확인 일보
          {pendingCount > 0 && (
            <span className="bg-yellow-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </h2>

        {!loading && pendingReports.length === 0 && (
          <p className="text-sm text-gray-400">
            Khong co bao cao cho duyet / 대기 중인 일보가 없습니다
          </p>
        )}

        {pendingReports.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 pr-2">Ngay / 날짜</th>
                  <th className="pb-2 pr-2">Cong trinh / 현장</th>
                  <th className="pb-2 pr-2">Loai / 구분</th>
                  <th className="pb-2 pr-2">Noi dung / 내용</th>
                  <th className="pb-2 pr-2 text-center">
                    Nhan luc / 인원
                  </th>
                  <th className="pb-2 pr-2">Vat tu / 자재</th>
                  <th className="pb-2 pr-2 text-center">
                    Anh / 사진
                  </th>
                  <th className="pb-2 text-center">
                    Thao tac / 관리
                  </th>
                </tr>
              </thead>
              <tbody>
                {pendingReports.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${
                      r.revision_requested ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="py-2 pr-2 whitespace-nowrap font-medium text-gray-700">
                      {r.report_date}
                    </td>
                    <td className="py-2 pr-2 text-gray-600 max-w-[140px] truncate">
                      {projectLabel(r)}
                    </td>
                    <td className="py-2 pr-2 text-gray-600">
                      {r.work_type}
                    </td>
                    <td className="py-2 pr-2 text-gray-600 max-w-[180px] truncate">
                      {r.work_desc}
                    </td>
                    <td className="py-2 pr-2 text-center font-semibold text-blue-700">
                      {workerTotal(r)}
                    </td>
                    <td className="py-2 pr-2 text-gray-500 max-w-[160px] truncate">
                      {matSummary(r)}
                    </td>
                    <td className="py-2 pr-2 text-center text-gray-500">
                      {r.photo_urls?.length ?? 0}
                    </td>
                    <td className="py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleConfirm(r.id)}
                          disabled={actionLoading === r.id}
                          className="px-2 py-1 bg-green-600 text-white rounded text-[10px] font-semibold hover:bg-green-700 disabled:opacity-50"
                        >
                          {actionLoading === r.id
                            ? '...'
                            : 'Xac nhan / 확인'}
                        </button>
                        {!r.revision_requested && (
                          <button
                            onClick={() => handleRevision(r.id)}
                            disabled={actionLoading === r.id}
                            className="px-2 py-1 bg-orange-500 text-white rounded text-[10px] font-semibold hover:bg-orange-600 disabled:opacity-50"
                          >
                            Sua lai / 수정
                          </button>
                        )}
                        {r.revision_requested && (
                          <span className="text-[10px] text-red-600 font-semibold">
                            Da yeu cau sua / 수정요청됨
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════ CONFIRMED REPORTS ══════════ */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          Bao cao da xac nhan / 확인 완료 일보
          {confirmedCount > 0 && (
            <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {confirmedCount}
            </span>
          )}
        </h2>

        {!loading && confirmedReports.length === 0 && (
          <p className="text-sm text-gray-400">
            Chua co bao cao da xac nhan / 확인 완료된 일보가 없습니다
          </p>
        )}

        {confirmedReports.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 pr-2">Ngay / 날짜</th>
                  <th className="pb-2 pr-2">Cong trinh / 현장</th>
                  <th className="pb-2 pr-2">Loai / 구분</th>
                  <th className="pb-2 pr-2">Noi dung / 내용</th>
                  <th className="pb-2 pr-2 text-center">
                    Nhan luc / 인원
                  </th>
                  <th className="pb-2 text-center">
                    Ngay XN / 확인일
                  </th>
                </tr>
              </thead>
              <tbody>
                {confirmedReports.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-2 pr-2 whitespace-nowrap font-medium text-gray-700">
                      {r.report_date}
                    </td>
                    <td className="py-2 pr-2 text-gray-600 max-w-[140px] truncate">
                      {projectLabel(r)}
                    </td>
                    <td className="py-2 pr-2 text-gray-600">
                      {r.work_type}
                    </td>
                    <td className="py-2 pr-2 text-gray-600 max-w-[200px] truncate">
                      {r.work_desc}
                    </td>
                    <td className="py-2 pr-2 text-center font-semibold text-blue-700">
                      {workerTotal(r)}
                    </td>
                    <td className="py-2 text-center text-gray-500 whitespace-nowrap">
                      {r.confirmed_at
                        ? new Date(r.confirmed_at)
                            .toISOString()
                            .slice(0, 10)
                        : '-'}
                    </td>
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
