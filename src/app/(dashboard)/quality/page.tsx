'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

/* -- Types ------------------------------------------------- */

interface QualityInspection {
  id: string
  project_id: string
  inspection_date: string
  inspection_type: string
  location: string
  inspector: string
  checklist: Record<string, boolean>
  result: 'pass' | 'conditional' | 'fail'
  photo_urls: string[]
  notes: string | null
  created_by: string
  created_at: string
}

/* -- Constants --------------------------------------------- */

const INSPECTION_TYPES = [
  { value: 'concrete', label: 'Be tong / 콘크리트' },
  { value: 'waterproof', label: 'Chong tham / 방수' },
  { value: 'rebar', label: 'Cot thep / 철근' },
  { value: 'finishing', label: 'Hoan thien / 마감' },
  { value: 'other', label: 'Khac / 기타' },
]

const CHECKLIST_ITEMS = [
  { key: 'material', label: 'Vat lieu / 재료상태' },
  { key: 'accuracy', label: 'Do chinh xac / 시공정확도' },
  { key: 'finish_quality', label: 'Chat luong / 마감품질' },
  { key: 'dimension', label: 'Kich thuoc / 치수확인' },
  { key: 'standard', label: 'Tieu chuan / 규격준수' },
]

const RESULT_OPTIONS = [
  { value: 'pass', label: 'Dat / 합격', color: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'conditional', label: 'Co dieu kien / 조건부', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { value: 'fail', label: 'Khong dat / 불합격', color: 'bg-red-50 text-red-700 border-red-200' },
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

/* -- Component --------------------------------------------- */

export default function QualityPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [records, setRecords] = useState<QualityInspection[]>([])

  /* -- Form state -- */
  const [fDate, setFDate] = useState(today())
  const [fType, setFType] = useState('concrete')
  const [fLocation, setFLocation] = useState('')
  const [fInspector, setFInspector] = useState('')
  const [fChecklist, setFChecklist] = useState<Record<string, boolean>>(
    Object.fromEntries(CHECKLIST_ITEMS.map((c) => [c.key, false]))
  )
  const [fResult, setFResult] = useState<'pass' | 'conditional' | 'fail'>('pass')
  const [fPhotos, setFPhotos] = useState<File[]>([])
  const [fNotes, setFNotes] = useState('')

  const toast = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  /* -- Load data -- */
  const loadData = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('quality_inspections')
        .select('*')
        .eq('project_id', currentProject)
        .order('inspection_date', { ascending: false })
        .limit(50)
      setRecords((data as QualityInspection[]) ?? [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [currentProject])

  useEffect(() => {
    if (user && currentProject) loadData()
  }, [user, currentProject, loadData])

  /* -- Upload photos -- */
  async function uploadPhotos(files: File[]): Promise<string[]> {
    const urls: string[] = []
    for (const file of files) {
      const path = `quality/${currentProject}/${today()}_${Date.now()}_${file.name}`
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

  /* -- Submit -- */
  async function handleSubmit() {
    if (!currentProject || !user) {
      toast('err', 'Chon cong trinh / 현장을 선택하세요')
      return
    }
    if (!fInspector.trim()) {
      toast('err', 'Nhap nguoi kiem tra / 검사자를 입력하세요')
      return
    }
    if (!fLocation.trim()) {
      toast('err', 'Nhap vi tri / 위치를 입력하세요')
      return
    }

    setSaving(true)
    try {
      let photoUrls: string[] = []
      if (fPhotos.length > 0) {
        photoUrls = await uploadPhotos(fPhotos)
      }

      const { error } = await supabase.from('quality_inspections').insert({
        project_id: currentProject,
        inspection_date: fDate,
        inspection_type: fType,
        location: fLocation.trim(),
        inspector: fInspector.trim(),
        checklist: fChecklist,
        result: fResult,
        photo_urls: photoUrls,
        notes: fNotes.trim() || null,
        created_by: user.id,
      })
      if (error) throw error

      setFLocation('')
      setFInspector('')
      setFChecklist(Object.fromEntries(CHECKLIST_ITEMS.map((c) => [c.key, false])))
      setFResult('pass')
      setFPhotos([])
      setFNotes('')
      toast('ok', 'Da luu kiem tra / 검사 저장 완료')
      loadData()
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  /* -- KPI helpers -- */
  const passCount = records.filter((r) => r.result === 'pass').length
  const condCount = records.filter((r) => r.result === 'conditional').length
  const failCount = records.filter((r) => r.result === 'fail').length

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

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Kiem tra chat luong / 품질검사
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Quan ly kiem tra chat luong cong trinh / 시공 품질검사 관리
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Tong kiem tra / 총 검사</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{records.length}</p>
              <p className="mt-1 text-xs text-gray-400">lan / 건</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Dat / 합격</p>
              <p className="mt-2 text-2xl font-bold text-green-700">{passCount}</p>
              <p className="mt-1 text-xs text-gray-400">lan / 건</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-green-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Co dieu kien / 조건부</p>
              <p className="mt-2 text-2xl font-bold text-yellow-700">{condCount}</p>
              <p className="mt-1 text-xs text-gray-400">lan / 건</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-yellow-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Khong dat / 불합격</p>
              <p className="mt-2 text-2xl font-bold text-red-700">{failCount}</p>
              <p className="mt-1 text-xs text-gray-400">lan / 건</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-red-500 shrink-0 mt-1" />
          </div>
        </div>
      </div>

      {/* Inspection Form */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            Tao phieu kiem tra / 품질검사표 작성
          </h3>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Ngay / 날짜
              </label>
              <input
                type="date"
                value={fDate}
                onChange={(e) => setFDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Loai kiem tra / 검사유형
              </label>
              <select
                value={fType}
                onChange={(e) => setFType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {INSPECTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Vi tri / 위치
              </label>
              <input
                type="text"
                value={fLocation}
                onChange={(e) => setFLocation(e.target.value)}
                placeholder="Tang 3, Zone A / 3층 A구역"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Nguoi kiem tra / 검사자
              </label>
              <input
                type="text"
                value={fInspector}
                onChange={(e) => setFInspector(e.target.value)}
                placeholder="Nhap ten / 이름 입력"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Checklist */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Hang muc kiem tra / 검사항목
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {CHECKLIST_ITEMS.map((item) => (
                <label
                  key={item.key}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs transition-colors ${
                    fChecklist[item.key]
                      ? 'bg-green-50 border-green-300 text-green-800'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={fChecklist[item.key]}
                    onChange={(e) =>
                      setFChecklist((prev) => ({
                        ...prev,
                        [item.key]: e.target.checked,
                      }))
                    }
                    className="rounded text-green-600 focus:ring-green-500"
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>

          {/* Result */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Ket qua / 판정결과
            </label>
            <div className="flex gap-2 flex-wrap">
              {RESULT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFResult(opt.value as 'pass' | 'conditional' | 'fail')}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    fResult === opt.value
                      ? opt.color + ' ring-2 ring-offset-1 ring-current'
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Photos */}
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

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Ghi chu / 비고
            </label>
            <textarea
              value={fNotes}
              onChange={(e) => setFNotes(e.target.value)}
              rows={3}
              placeholder="Ghi chu them / 추가 메모"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Dang luu... / 저장 중...' : 'Luu kiem tra / 검사 저장'}
            </button>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Lich su kiem tra / 검사 이력
          </h3>
          <span className="text-xs text-gray-500">
            Tong / 총 {records.length}건
          </span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Dang tai... / 로딩 중...
          </div>
        ) : records.length === 0 ? (
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
                  <th className="px-3 py-3">Vi tri / 위치</th>
                  <th className="px-3 py-3">Nguoi KT / 검사자</th>
                  <th className="px-3 py-3">Checklist</th>
                  <th className="px-3 py-3">Ket qua / 결과</th>
                  <th className="px-3 py-3">Anh / 사진</th>
                  <th className="px-3 py-3">Ghi chu / 비고</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((rec) => {
                  const checked = Object.values(rec.checklist ?? {}).filter(Boolean).length
                  const total = Object.keys(rec.checklist ?? {}).length
                  const resultOpt = RESULT_OPTIONS.find((o) => o.value === rec.result)
                  return (
                    <tr key={rec.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-xs text-gray-600 font-mono whitespace-nowrap">
                        {rec.inspection_date}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold">
                          {INSPECTION_TYPES.find((t) => t.value === rec.inspection_type)?.label ?? rec.inspection_type}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-700">{rec.location}</td>
                      <td className="px-3 py-3 text-xs text-gray-700">{rec.inspector}</td>
                      <td className="px-3 py-3 text-xs text-gray-600 font-mono">
                        {checked}/{total}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <span className={`inline-block px-2 py-0.5 rounded font-semibold ${resultOpt?.color ?? ''}`}>
                          {resultOpt?.label ?? rec.result}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500">
                        {(rec.photo_urls ?? []).length > 0 ? `${rec.photo_urls.length} anh` : '-'}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500 max-w-[200px] truncate">
                        {rec.notes ?? '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
