'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import {
  useDailyReport,
  type WorkerCounts,
  type MaterialQty,
  type ExtraMaterial,
} from '@/hooks/useDailyReport'
import { useAutoSave } from '@/hooks/useAutoSave'
import { supabase } from '@/lib/supabase'

const today = () => new Date().toISOString().slice(0, 10)

const WORK_TYPES = [
  { value: '주간', label: 'Ban ngay / 주간' },
  { value: '야간', label: 'Ban dem / 야간' },
  { value: '주+야', label: 'Ngay+Dem / 주+야' },
]

const WEATHER_OPTIONS = [
  { value: 'Nắng', label: '☀️ Nang / 맑음' },
  { value: 'Âm u', label: '⛅ Am u / 흐림' },
  { value: 'Mưa', label: '🌧 Mua / 비' },
  { value: 'Nắng nóng', label: '🌡 Nong / 폭염' },
]

const emptyWorkers = (): WorkerCounts => ({
  wd_am: 0, wd_pm: 0, wd_ni: 0,
  wi_am: 0, wi_pm: 0, wi_ni: 0,
  vn_am: 0, vn_pm: 0, vn_ni: 0,
  ot_direct: 0, ot_indirect: 0,
})

const emptyMaterials = (): MaterialQty => ({
  v250: 0, sv250: 0, hlm: 0, m230: 0, db2015: 0, etc: 0,
})

interface DraftData {
  date: string
  workType: string
  weather: string
  workers: WorkerCounts
  materials: MaterialQty
  extraMaterials: ExtraMaterial[]
  description: string
}

export default function ReportPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)
  const projects = useAuthStore((s) => s.projects)

  const { reports, loading, error, loadMyReports, submitReport } =
    useDailyReport()

  /* ── Form state ── */
  const [date, setDate] = useState(today())
  const [workType, setWorkType] = useState('주간')
  const [weather, setWeather] = useState('Nắng')
  const [workers, setWorkers] = useState<WorkerCounts>(emptyWorkers())
  const [materials, setMaterials] = useState<MaterialQty>(emptyMaterials())
  const [extraMaterials, setExtraMaterials] = useState<ExtraMaterial[]>([])
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [showRestore, setShowRestore] = useState(false)
  const [autoSavedAt, setAutoSavedAt] = useState<string | null>(null)
  const [copyLoading, setCopyLoading] = useState(false)
  const [copyToast, setCopyToast] = useState<string | null>(null)

  /* ── Copy yesterday's report ── */
  const handleCopyYesterday = useCallback(async () => {
    if (!user || !currentProject) return
    setCopyLoading(true)
    setCopyToast(null)
    try {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().slice(0, 10)

      const { data, error: err } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('user_id', user.id)
        .eq('report_date', yesterdayStr)
        .eq('project_id', currentProject)
        .limit(1)
        .maybeSingle()

      if (err) throw err
      if (!data) {
        setCopyToast('Khong tim thay bao cao hom qua / 어제 일보가 없습니다')
        setTimeout(() => setCopyToast(null), 4000)
        return
      }

      setWorkType(data.work_type || '주간')
      setWeather(data.weather || 'Nắng')
      setWorkers({
        wd_am: data.direct_worker_am ?? 0,
        wd_pm: data.direct_worker_pm ?? 0,
        wd_ni: data.direct_worker_ni ?? 0,
        wi_am: data.indirect_worker_am ?? 0,
        wi_pm: data.indirect_worker_pm ?? 0,
        wi_ni: data.indirect_worker_ni ?? 0,
        vn_am: data.vn_engineer_am ?? 0,
        vn_pm: data.vn_engineer_pm ?? 0,
        vn_ni: data.vn_engineer_ni ?? 0,
        ot_direct: 0,
        ot_indirect: 0,
      })
      setMaterials({
        v250: data.qty_v250 ?? 0,
        sv250: data.qty_sv250 ?? 0,
        hlm: data.qty_hlm ?? 0,
        m230: data.qty_m230 ?? 0,
        db2015: data.qty_db2015 ?? 0,
        etc: data.qty_other ?? 0,
      })
      setDescription(data.work_desc || data.note || '')
      setDate(today())
      setCopyToast('Da sao chep / 어제 일보를 복사했습니다')
      setTimeout(() => setCopyToast(null), 4000)
    } catch {
      setCopyToast('Loi khi sao chep / 복사 오류')
      setTimeout(() => setCopyToast(null), 4000)
    } finally {
      setCopyLoading(false)
    }
  }, [user, currentProject])

  /* ── Auto-save ── */
  const { save: autoSave, load: autoLoad, clear: autoClear } = useAutoSave<DraftData>('daily-report')

  /* Load my reports on mount / project change */
  useEffect(() => {
    loadMyReports(currentProject ?? undefined)
  }, [currentProject, loadMyReports])

  /* Check for auto-saved draft on mount */
  useEffect(() => {
    const saved = autoLoad()
    if (saved) {
      setShowRestore(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Auto-save on form changes ── */
  useEffect(() => {
    // Only auto-save if there is actual content
    if (!description && !workers.wd_am && !workers.wd_pm) return
    autoSave({ date, workType, weather, workers, materials, extraMaterials, description })
    setAutoSavedAt(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }))
  }, [date, workType, weather, workers, materials, extraMaterials, description, autoSave])

  /* ── Restore draft handler ── */
  const handleRestore = () => {
    const saved = autoLoad()
    if (saved) {
      const d = saved.data
      setDate(d.date)
      setWorkType(d.workType)
      setWeather(d.weather)
      setWorkers(d.workers)
      setMaterials(d.materials)
      setExtraMaterials(d.extraMaterials)
      setDescription(d.description)
    }
    setShowRestore(false)
  }

  const handleDismissRestore = () => {
    autoClear()
    setShowRestore(false)
  }

  /* ── Worker helpers ── */
  const wk = (field: keyof WorkerCounts, val: string) => {
    setWorkers((prev) => ({ ...prev, [field]: parseFloat(val) || 0 }))
  }

  const totalDirect =
    workers.wd_am + workers.wd_pm + workers.wd_ni
  const totalIndirect =
    workers.wi_am + workers.wi_pm + workers.wi_ni
  const totalVN =
    workers.vn_am + workers.vn_pm + workers.vn_ni
  const totalOT = workers.ot_direct + workers.ot_indirect
  const grandTotal = totalDirect + totalIndirect + totalVN

  /* ── Material helpers ── */
  const mt = (field: keyof MaterialQty, val: string) => {
    setMaterials((prev) => ({ ...prev, [field]: parseFloat(val) || 0 }))
  }

  /* ── Extra materials ── */
  const addExtra = () =>
    setExtraMaterials((prev) => [...prev, { name: '', qty: 0, unit: '' }])
  const removeExtra = (idx: number) =>
    setExtraMaterials((prev) => prev.filter((_, i) => i !== idx))
  const updateExtra = (
    idx: number,
    field: keyof ExtraMaterial,
    val: string
  ) =>
    setExtraMaterials((prev) =>
      prev.map((m, i) =>
        i === idx
          ? {
              ...m,
              [field]: field === 'qty' ? parseFloat(val) || 0 : val,
            }
          : m
      )
    )

  /* ── Photos ── */
  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 5)
    setPhotos(files)
    setPreviews(files.map((f) => URL.createObjectURL(f)))
  }
  const removePhoto = (idx: number) => {
    URL.revokeObjectURL(previews[idx])
    setPhotos((prev) => prev.filter((_, i) => i !== idx))
    setPreviews((prev) => prev.filter((_, i) => i !== idx))
  }

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!currentProject) {
      alert('Vui long chon cong trinh / 현장을 선택해주세요')
      return
    }
    if (!description.trim()) {
      alert('Vui long nhap noi dung / 작업 내용을 입력해주세요')
      return
    }

    setSubmitting(true)
    setSuccess(false)
    try {
      await submitReport({
        project_id: currentProject,
        date,
        work_type: workType,
        weather,
        workers,
        materials,
        extra_materials: extraMaterials.filter((m) => m.name.trim()),
        description,
        photos,
      })
      setSuccess(true)
      autoClear()
      setAutoSavedAt(null)
      // Reset form
      setDate(today())
      setWorkType('주간')
      setWeather('Nắng')
      setWorkers(emptyWorkers())
      setMaterials(emptyMaterials())
      setExtraMaterials([])
      setDescription('')
      setPhotos([])
      setPreviews([])
      if (fileRef.current) fileRef.current.value = ''
      // Reload list
      await loadMyReports(currentProject)
    } catch {
      // error is handled in hook
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Material summary text ── */
  const matSummary = (r: { materials?: MaterialQty; extra_materials?: ExtraMaterial[] }) => {
    const m = r.materials
    if (!m) return '-'
    const parts: string[] = []
    if (m.v250) parts.push(`V250:${m.v250}m`)
    if (m.sv250) parts.push(`SV:${m.sv250}m`)
    if (m.hlm) parts.push(`HLM:${m.hlm}k`)
    if (m.m230) parts.push(`M230:${m.m230}k`)
    if (m.db2015) parts.push(`DB:${m.db2015}m`)
    if (m.etc) parts.push(`etc:${m.etc}`)
    const extra = r.extra_materials
    if (extra && extra.length > 0) {
      extra.forEach((e) => {
        if (e.name) parts.push(`${e.name}:${e.qty}${e.unit}`)
      })
    }
    return parts.length > 0 ? parts.join(', ') : '-'
  }

  const workerTotal = (r: { workers?: WorkerCounts }) => {
    const w = r.workers
    if (!w) return 0
    return (
      (w.wd_am ?? 0) + (w.wd_pm ?? 0) + (w.wd_ni ?? 0) +
      (w.wi_am ?? 0) + (w.wi_pm ?? 0) + (w.wi_ni ?? 0) +
      (w.vn_am ?? 0) + (w.vn_pm ?? 0) + (w.vn_ni ?? 0)
    )
  }

  /* ── Input component helpers ── */
  const inp =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none'
  const lbl = 'block text-xs font-semibold text-gray-600 mb-1'

  const numInput = (
    value: number,
    onChange: (v: string) => void,
    className?: string
  ) => (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      step={0.5}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder="0"
      className={`w-16 text-center border rounded-md px-1 py-1.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none ${className ?? 'border-gray-300'}`}
    />
  )

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Nhat ky cong trinh / 일보 입력
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Nhap bao cao hang ngay / 매일 작업 일보를 작성합니다
          </p>
        </div>
        <div className="flex items-center gap-3">
          {autoSavedAt && (
            <span className="text-[10px] text-gray-400 whitespace-nowrap">
              Auto-saved / 자동저장됨 {autoSavedAt}
            </span>
          )}
          <button
            onClick={handleCopyYesterday}
            disabled={copyLoading || !currentProject}
            className="print:hidden inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors"
            title="Sao chep bao cao hom qua / 어제 일보 복사"
          >
            {copyLoading ? '...' : '📋 Hom qua / 어제 복사'}
          </button>
          <button
            onClick={() => window.print()}
            className="print:hidden inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
            title="In / 인쇄"
          >
            &#128424; In / 인쇄
          </button>
        </div>
      </div>

      {/* Copy yesterday toast */}
      {copyToast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            copyToast.includes('Da sao chep')
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {copyToast}
        </div>
      )}

      {/* Restore draft banner */}
      {showRestore && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-center justify-between gap-3">
          <span>
            Co ban nhap chua luu. Khoi phuc? / 저장되지 않은 초안이 있습니다. 복구할까요?
          </span>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleRestore}
              className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700"
            >
              Khoi phuc / 복구
            </button>
            <button
              onClick={handleDismissRestore}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-300"
            >
              Bo qua / 무시
            </button>
          </div>
        </div>
      )}

      {/* Success banner */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800 flex items-center gap-2">
          <span className="text-lg">&#10003;</span>
          Da luu thanh cong / 저장되었습니다!
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {!currentProject && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          Vui long chon cong trinh / 현장을 선택해주세요.
        </div>
      )}

      {/* ══════════ FORM ══════════ */}
      {currentProject && (
        <div className="space-y-4">
          {/* ── Basic info ── */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-4">
              Thong tin co ban / 기본 정보
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Date */}
              <div>
                <label className={lbl}>Ngay / 날짜</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inp}
                />
              </div>
              {/* Work type */}
              <div>
                <label className={lbl}>
                  Loai cong viec / 작업 구분
                </label>
                <select
                  value={workType}
                  onChange={(e) => setWorkType(e.target.value)}
                  className={inp}
                >
                  {WORK_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              {/* Weather */}
              <div>
                <label className={lbl}>Thoi tiet / 날씨</label>
                <select
                  value={weather}
                  onChange={(e) => setWeather(e.target.value)}
                  className={inp}
                >
                  {WEATHER_OPTIONS.map((w) => (
                    <option key={w.value} value={w.value}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── Workers ── */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-1">
              Nhan luc / 투입 인원
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              Cong = 1 ngay / 공 = 1일 기준
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[420px]">
                <thead>
                  <tr className="bg-gray-900 text-white text-xs">
                    <th className="px-3 py-2 text-left w-28">
                      Loai / 구분
                    </th>
                    <th className="px-2 py-2 text-center bg-blue-900/60">
                      Sang / 오전
                    </th>
                    <th className="px-2 py-2 text-center bg-amber-900/60">
                      Chieu / 오후
                    </th>
                    <th className="px-2 py-2 text-center bg-indigo-900/60">
                      Toi / 야간
                    </th>
                    <th className="px-2 py-2 text-center bg-green-900/60">
                      Tong / 합계
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Direct workers */}
                  <tr className="bg-blue-50">
                    <td className="px-3 py-2 font-semibold text-blue-900 border-b border-gray-200">
                      Tho truc tiep
                      <br />
                      <span className="text-xs font-normal text-blue-500">
                        직접 인부
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center border-b border-gray-200">
                      {numInput(workers.wd_am, (v) => wk('wd_am', v), 'border-blue-200 bg-blue-50 text-blue-900')}
                    </td>
                    <td className="px-2 py-2 text-center border-b border-gray-200">
                      {numInput(workers.wd_pm, (v) => wk('wd_pm', v), 'border-amber-200 bg-amber-50 text-amber-900')}
                    </td>
                    <td className="px-2 py-2 text-center border-b border-gray-200">
                      {numInput(workers.wd_ni, (v) => wk('wd_ni', v), 'border-purple-200 bg-purple-50 text-purple-900')}
                    </td>
                    <td className="px-2 py-2 text-center border-b border-gray-200">
                      <span className="text-lg font-bold text-blue-700">
                        {totalDirect}
                      </span>
                    </td>
                  </tr>
                  {/* Indirect workers */}
                  <tr>
                    <td className="px-3 py-2 font-semibold text-gray-700 border-b border-gray-200">
                      Tho gian tiep
                      <br />
                      <span className="text-xs font-normal text-gray-400">
                        간접 인부
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center border-b border-gray-200">
                      {numInput(workers.wi_am, (v) => wk('wi_am', v))}
                    </td>
                    <td className="px-2 py-2 text-center border-b border-gray-200">
                      {numInput(workers.wi_pm, (v) => wk('wi_pm', v))}
                    </td>
                    <td className="px-2 py-2 text-center border-b border-gray-200">
                      {numInput(workers.wi_ni, (v) => wk('wi_ni', v))}
                    </td>
                    <td className="px-2 py-2 text-center border-b border-gray-200">
                      <span className="text-lg font-bold text-gray-700">
                        {totalIndirect}
                      </span>
                    </td>
                  </tr>
                  {/* VN Engineer */}
                  <tr className="bg-teal-50">
                    <td className="px-3 py-2 font-semibold text-teal-800 border-b border-gray-200">
                      Ky thuat vien
                      <br />
                      <span className="text-xs font-normal text-teal-500">
                        VN 기술자
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center border-b border-gray-200">
                      {numInput(workers.vn_am, (v) => wk('vn_am', v), 'border-teal-200 bg-teal-50 text-teal-800')}
                    </td>
                    <td className="px-2 py-2 text-center border-b border-gray-200">
                      {numInput(workers.vn_pm, (v) => wk('vn_pm', v), 'border-teal-200 bg-teal-50 text-teal-800')}
                    </td>
                    <td className="px-2 py-2 text-center border-b border-gray-200">
                      {numInput(workers.vn_ni, (v) => wk('vn_ni', v), 'border-teal-200 bg-teal-50 text-teal-800')}
                    </td>
                    <td className="px-2 py-2 text-center border-b border-gray-200">
                      <span className="text-lg font-bold text-teal-700">
                        {totalVN}
                      </span>
                    </td>
                  </tr>
                  {/* OT */}
                  <tr className="bg-amber-50">
                    <td className="px-3 py-2 font-semibold text-amber-700">
                      OT (gio ngoai)
                      <br />
                      <span className="text-xs font-normal">
                        시간외 근무
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center" colSpan={2}>
                      <div className="flex items-center justify-center gap-2">
                        {numInput(workers.ot_direct, (v) => wk('ot_direct', v), 'border-amber-300 bg-amber-50 text-amber-800')}
                        <span className="text-xs text-amber-600">
                          Truc tiep OT / 직접
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {numInput(workers.ot_indirect, (v) => wk('ot_indirect', v), 'border-amber-300 bg-amber-50 text-amber-800')}
                        <span className="text-xs text-amber-600">
                          Gian tiep OT / 간접
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span className="text-sm font-bold text-amber-700">
                        {totalOT}h
                      </span>
                    </td>
                  </tr>
                  {/* Grand total */}
                  <tr className="border-t-2 border-gray-800">
                    <td className="px-3 py-3 font-bold text-gray-900 bg-gray-100">
                      Tong / 합계
                    </td>
                    <td className="px-2 py-3 text-center bg-blue-100">
                      <span className="text-xl font-extrabold text-blue-800">
                        {workers.wd_am + workers.wi_am + workers.vn_am}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center bg-amber-100">
                      <span className="text-xl font-extrabold text-amber-800">
                        {workers.wd_pm + workers.wi_pm + workers.vn_pm}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center bg-purple-100">
                      <span className="text-xl font-extrabold text-purple-800">
                        {workers.wd_ni + workers.wi_ni + workers.vn_ni}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center bg-green-800 rounded-br-lg">
                      <span className="text-2xl font-extrabold text-white">
                        {grandTotal}
                      </span>
                      <div className="text-[10px] text-green-200 mt-0.5">
                        Tong / 총공수
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Materials ── */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-4">
              Vat tu su dung / 자재 사용량
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {([
                ['v250', 'V250', 'm'],
                ['sv250', 'SV250', 'm'],
                ['hlm', 'HLM 5000R', 'kg'],
                ['m230', 'M230', 'kg'],
                ['db2015', 'DB-2015', 'm'],
                ['etc', 'Khac / 기타', 'SL'],
              ] as [keyof MaterialQty, string, string][]).map(
                ([field, label, unit]) => (
                  <div
                    key={field}
                    className="bg-gray-50 rounded-lg p-3 text-center"
                  >
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      {label}
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={0.5}
                      value={materials[field] || ''}
                      onChange={(e) => mt(field, e.target.value)}
                      placeholder="0"
                      className="w-full text-center border border-gray-300 rounded-md px-2 py-1.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <div className="text-[10px] text-gray-400 mt-1">
                      {unit}
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Extra materials */}
            {extraMaterials.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500">
                  Vat tu khac / 기타 자재
                </p>
                {extraMaterials.map((m, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      placeholder="Ten / 이름"
                      value={m.name}
                      onChange={(e) =>
                        updateExtra(idx, 'name', e.target.value)
                      }
                      className={`${inp} flex-1`}
                    />
                    <input
                      type="number"
                      placeholder="SL"
                      value={m.qty || ''}
                      onChange={(e) =>
                        updateExtra(idx, 'qty', e.target.value)
                      }
                      className={`${inp} w-20 text-center`}
                    />
                    <input
                      type="text"
                      placeholder="DV / 단위"
                      value={m.unit}
                      onChange={(e) =>
                        updateExtra(idx, 'unit', e.target.value)
                      }
                      className={`${inp} w-20`}
                    />
                    <button
                      type="button"
                      onClick={() => removeExtra(idx)}
                      className="text-red-400 hover:text-red-600 text-lg px-1"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={addExtra}
              className="mt-3 text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              + Them vat tu khac / 기타 자재 추가
            </button>
          </div>

          {/* ── Description ── */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <label className={lbl}>
              Noi dung cong viec / 작업 내용
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mo ta cong viec trong ngay / 금일 작업 내용을 상세히 입력하세요"
              className={`${inp} resize-y`}
            />
          </div>

          {/* ── Photos ── */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <label className={lbl}>
              Anh cong trinh / 현장 사진 (toi da 5 / 최대 5장)
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotos}
                className="hidden"
              />
              <p className="text-sm text-gray-500">
                Chon anh hoac cham vao day / 사진을 선택하세요
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {photos.length}/5
              </p>
            </div>
            {previews.length > 0 && (
              <div className="mt-3 flex gap-2 flex-wrap">
                {previews.map((src, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={src}
                      alt={`photo-${idx}`}
                      className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Submit ── */}
          <button
            onClick={handleSubmit}
            disabled={submitting || loading}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {submitting
              ? 'Dang luu... / 저장 중...'
              : 'Luu nhat ky / 일보 저장'}
          </button>
        </div>
      )}

      {/* ══════════ MY REPORT HISTORY ══════════ */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-4">
          Lich su bao cao / 내 일보 이력
        </h2>

        {loading && (
          <p className="text-sm text-gray-400">Dang tai... / 로딩 중...</p>
        )}

        {!loading && reports.length === 0 && (
          <p className="text-sm text-gray-400">
            Chua co bao cao / 작성된 일보가 없습니다
          </p>
        )}

        {reports.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 pr-2">Ngay / 날짜</th>
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
                    Trang thai / 상태
                  </th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-2 pr-2 whitespace-nowrap font-medium text-gray-700">
                      {r.date}
                    </td>
                    <td className="py-2 pr-2 text-gray-600">
                      {r.work_type}
                    </td>
                    <td className="py-2 pr-2 text-gray-600 max-w-[200px] truncate">
                      {r.description}
                    </td>
                    <td className="py-2 pr-2 text-center font-semibold text-blue-700">
                      {workerTotal(r)}
                    </td>
                    <td className="py-2 pr-2 text-gray-500 max-w-[180px] truncate">
                      {matSummary(r)}
                    </td>
                    <td className="py-2 pr-2 text-center text-gray-500">
                      {r.photo_urls?.length ?? 0}
                    </td>
                    <td className="py-2 text-center">
                      {r.revision_requested ? (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-semibold">
                          Yeu cau sua / 수정요청
                        </span>
                      ) : r.confirmed ? (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold">
                          Da xac nhan / 확인됨
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-semibold">
                          Cho duyet / 대기
                        </span>
                      )}
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
