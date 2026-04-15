'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isAdmin } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

/* ── Types ───────────────────────────────────────── */

interface InspectionRecord {
  id: string
  project_id: string | null
  inspection_date: string | null
  inspector_id: string | null
  checklist: unknown
  photo_urls: string[] | null
  notes: string | null
  unchecked_items: string[] | null
  created_at: string | null
}

interface TBMRecord {
  id: string
  project_id: string | null
  tbm_date: string
  work_description: string | null
  attendee_count: number | null
  safety_measures: string | null
  created_by: string | null
  created_at: string | null
}

/* ── Constants ───────────────────────────────────── */

const INSPECTION_TYPES = [
  { value: 'daily', label: 'Hang ngay / 일일점검' },
  { value: 'weekly', label: 'Hang tuan / 주간점검' },
  { value: 'monthly', label: 'Hang thang / 월간점검' },
  { value: 'special', label: 'Dac biet / 특별점검' },
]

const CHECKLIST_ITEMS = [
  { key: 'helmet', label: 'Mu bao ho / 안전모' },
  { key: 'vest', label: 'Ao phan quang / 안전조끼' },
  { key: 'scaffold', label: 'Gian giao / 비계' },
  { key: 'fire_ext', label: 'Binh chua chay / 소화기' },
  { key: 'first_aid', label: 'Y te / 구급상자' },
  { key: 'signage', label: 'Bien bao / 안전표지' },
  { key: 'electrical', label: 'Dien / 전기안전' },
  { key: 'excavation', label: 'Dao dat / 굴착안전' },
  { key: 'lifting', label: 'Cau truc / 양중안전' },
  { key: 'housekeeping', label: 'Ve sinh / 정리정돈' },
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

/* ── Component ─────────────────────────────────────── */

export default function SafetyPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [tab, setTab] = useState<'inspection' | 'tbm'>('inspection')

  /* ── Inspection state ── */
  const [inspections, setInspections] = useState<InspectionRecord[]>([])
  const [fDate, setFDate] = useState(today())
  const [fType, setFType] = useState('daily')
  const [fInspector, setFInspector] = useState('')
  const [fChecklist, setFChecklist] = useState<Record<string, boolean>>(
    Object.fromEntries(CHECKLIST_ITEMS.map((c) => [c.key, false]))
  )
  const [fPhotos, setFPhotos] = useState<File[]>([])
  const [fNotes, setFNotes] = useState('')

  /* ── TBM state ── */
  const [tbmRecords, setTbmRecords] = useState<TBMRecord[]>([])
  const [tDate, setTDate] = useState(today())
  const [tTopic, setTTopic] = useState('')
  const [tParticipants, setTParticipants] = useState('')
  const [tNotes, setTNotes] = useState('')

  const toast = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  /* ── Load data ── */
  const loadData = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const [{ data: ins }, { data: tbm }] = await Promise.all([
        supabase
          .from('safety_inspections')
          .select('*')
          .eq('project_id', currentProject)
          .order('inspection_date', { ascending: false })
          .limit(50),
        supabase
          .from('tbm_records')
          .select('*')
          .eq('project_id', currentProject)
          .order('tbm_date', { ascending: false })
          .limit(50),
      ])
      setInspections((ins as InspectionRecord[]) ?? [])
      setTbmRecords((tbm as TBMRecord[]) ?? [])
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
      const path = `safety/${currentProject}/${today()}_${Date.now()}_${file.name}`
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

  /* ── Submit inspection ── */
  async function handleSubmitInspection() {
    if (!currentProject || !user) {
      toast('err', 'Chon cong trinh / 현장을 선택하세요')
      return
    }
    if (!fInspector.trim()) {
      toast('err', 'Nhap nguoi kiem tra / 점검자를 입력하세요')
      return
    }

    setSaving(true)
    try {
      let photoUrls: string[] = []
      if (fPhotos.length > 0) {
        photoUrls = await uploadPhotos(fPhotos)
      }

      const { error } = await supabase.from('safety_inspections').insert({
        project_id: currentProject,
        inspection_date: fDate,
        inspector_id: user.id,
        checklist: fChecklist,
        photo_urls: photoUrls,
        notes: fNotes.trim() || null,
      })
      if (error) throw error

      setFInspector('')
      setFChecklist(Object.fromEntries(CHECKLIST_ITEMS.map((c) => [c.key, false])))
      setFPhotos([])
      setFNotes('')
      toast('ok', 'Da luu kiem tra / 점검 저장 완료')
      loadData()
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  /* ── Submit TBM ── */
  async function handleSubmitTBM() {
    if (!currentProject || !user) {
      toast('err', 'Chon cong trinh / 현장을 선택하세요')
      return
    }
    if (!tTopic.trim()) {
      toast('err', 'Nhap chu de TBM / TBM 주제를 입력하세요')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.from('tbm_records').insert({
        project_id: currentProject,
        tbm_date: tDate,
        work_description: tTopic.trim(),
        attendee_count: parseInt(tParticipants) || 0,
        safety_measures: tNotes.trim() || null,
        created_by: user.id,
      })
      if (error) throw error

      setTTopic('')
      setTParticipants('')
      setTNotes('')
      toast('ok', 'Da luu TBM / TBM 저장 완료')
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

  const passCount = inspections.length > 0
    ? Object.values(inspections[0]?.checklist ?? {}).filter(Boolean).length
    : 0
  const totalItems = CHECKLIST_ITEMS.length

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
          An toan / 안전점검
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Kiem tra an toan va TBM / 안전점검 및 TBM 관리
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Tong kiem tra / 총 점검</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{inspections.length}</p>
              <p className="mt-1 text-xs text-gray-400">lan / 건</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">TBM thang nay / 이번달 TBM</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{tbmRecords.length}</p>
              <p className="mt-1 text-xs text-gray-400">buoi / 건</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-green-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Lan gan nhat / 최근 점검</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {passCount}/{totalItems}
              </p>
              <p className="mt-1 text-xs text-gray-400">dat / 적합</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0 mt-1" />
          </div>
        </div>
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('inspection')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            tab === 'inspection'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Kiem tra / 안전점검
        </button>
        <button
          onClick={() => setTab('tbm')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            tab === 'tbm'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          TBM
        </button>
      </div>

      {tab === 'inspection' ? (
        <>
          {/* ── Inspection Form ── */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">
                Tao phieu kiem tra / 점검표 작성
              </h3>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    Loai kiem tra / 점검유형
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
                    Nguoi kiem tra / 점검자
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
                  Hang muc kiem tra / 점검항목
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
                  onClick={handleSubmitInspection}
                  disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Dang luu... / 저장 중...' : 'Luu kiem tra / 점검 저장'}
                </button>
              </div>
            </div>
          </div>

          {/* ── Inspection History ── */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Lich su kiem tra / 점검 이력
              </h3>
              <span className="text-xs text-gray-500">
                Tong / 총 {inspections.length}건
              </span>
            </div>
            {loading ? (
              <div className="p-8 text-center text-sm text-gray-400">
                Dang tai... / 로딩 중...
              </div>
            ) : inspections.length === 0 ? (
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
                      <th className="px-3 py-3">Nguoi KT / 점검자</th>
                      <th className="px-3 py-3">Ket qua / 결과</th>
                      <th className="px-3 py-3">Anh / 사진</th>
                      <th className="px-3 py-3">Ghi chu / 비고</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {inspections.map((ins) => {
                      const passed = Object.values(ins.checklist ?? {}).filter(Boolean).length
                      const total = Object.keys(ins.checklist ?? {}).length
                      return (
                        <tr key={ins.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3 text-xs text-gray-600 font-mono whitespace-nowrap">
                            {ins.inspection_date}
                          </td>
                          <td className="px-3 py-3 text-xs">
                            <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold">
                              {ins.inspection_date ?? '-'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-700">{ins.inspector_id ?? '-'}</td>
                          <td className="px-3 py-3 text-xs">
                            <span
                              className={`inline-block px-2 py-0.5 rounded font-semibold ${
                                passed === total
                                  ? 'bg-green-50 text-green-700'
                                  : 'bg-yellow-50 text-yellow-700'
                              }`}
                            >
                              {passed}/{total} dat / 적합
                            </span>
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-500">
                            {(ins.photo_urls ?? []).length > 0 ? `${(ins.photo_urls ?? []).length} anh` : '-'}
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-500 max-w-[200px] truncate">
                            {ins.notes ?? '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* ── TBM Form ── */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">
                Tao TBM / TBM 작성
              </h3>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Ngay / 날짜
                  </label>
                  <input
                    type="date"
                    value={tDate}
                    onChange={(e) => setTDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Chu de / 주제
                  </label>
                  <input
                    type="text"
                    value={tTopic}
                    onChange={(e) => setTTopic(e.target.value)}
                    placeholder="Chu de an toan / 안전 주제"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    So nguoi / 참석인원
                  </label>
                  <input
                    type="number"
                    value={tParticipants}
                    onChange={(e) => setTParticipants(e.target.value)}
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Ghi chu / 비고
                </label>
                <textarea
                  value={tNotes}
                  onChange={(e) => setTNotes(e.target.value)}
                  rows={3}
                  placeholder="Noi dung TBM / TBM 내용"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSubmitTBM}
                  disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Dang luu... / 저장 중...' : 'Luu TBM / TBM 저장'}
                </button>
              </div>
            </div>
          </div>

          {/* ── TBM History ── */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Lich su TBM / TBM 이력
              </h3>
              <span className="text-xs text-gray-500">
                Tong / 총 {tbmRecords.length}건
              </span>
            </div>
            {loading ? (
              <div className="p-8 text-center text-sm text-gray-400">
                Dang tai... / 로딩 중...
              </div>
            ) : tbmRecords.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                Chua co du lieu / 데이터 없음
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="px-3 py-3">Ngay / 날짜</th>
                      <th className="px-3 py-3">Chu de / 주제</th>
                      <th className="px-3 py-3 text-right">So nguoi / 참석</th>
                      <th className="px-3 py-3">Ghi chu / 비고</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tbmRecords.map((tbm) => (
                      <tr key={tbm.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 text-xs text-gray-600 font-mono whitespace-nowrap">
                          {tbm.tbm_date}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-700 font-medium">
                          {tbm.work_description ?? '-'}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600 text-right font-mono">
                          {tbm.attendee_count ?? 0}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500 max-w-[200px] truncate">
                          {tbm.safety_measures ?? '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
