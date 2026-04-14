'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

/* ── Types ───────────────────────────────────────── */

interface SiteWorker {
  id: string
  name: string
  role: string | null
}

interface TBMRecord {
  id: string
  project_id: string
  tbm_date: string
  tbm_time: string | null
  hazards: string[]
  measures: string | null
  work_desc: string | null
  attendee_ids: string[]
  safety_checklist: Record<string, boolean>
  photo_urls: string[]
  created_by: string
  created_at: string
}

/* ── Constants ───────────────────────────────────── */

const HAZARD_ITEMS = [
  { key: 'height', label: '고소작업 / Tren cao' },
  { key: 'fire', label: '화기사용 / Lua' },
  { key: 'confined', label: '밀폐공간 / K.gian kin' },
  { key: 'chemical', label: '화학물질 / Hoa chat' },
  { key: 'heavy', label: '중량물 / Nang' },
  { key: 'electrical', label: '전기작업 / Dien' },
  { key: 'slippery', label: '미끄러움 / Tron' },
  { key: 'other', label: '기타 / Khac' },
]

const SAFETY_CHECKLIST_ITEMS = [
  { key: 'helmet', label: '안전모 / Mu BH' },
  { key: 'harness', label: '안전대 / Day an toan' },
  { key: 'gloves', label: '보호장갑 / Gang tay' },
  { key: 'boots', label: '안전화 / Giay BH' },
  { key: 'scaffold', label: '비계상태 / Gian giao' },
  { key: 'safety_net', label: '안전망 / Luoi an toan' },
  { key: 'ventilation', label: '환기 / Thong gio' },
  { key: 'chemical_storage', label: '화학물질보관 / Hoa chat' },
  { key: 'fire_ext', label: '소화기 / Binh chua chay' },
  { key: 'housekeeping', label: '정리정돈 / Sap xep' },
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

function nowTime() {
  return new Date().toTimeString().slice(0, 5)
}

/* ── Component ─────────────────────────────────────── */

export default function TBMPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  /* ── Workers ── */
  const [workers, setWorkers] = useState<SiteWorker[]>([])
  const [selectedAttendees, setSelectedAttendees] = useState<Set<string>>(new Set())

  /* ── Form state ── */
  const [fDate, setFDate] = useState(today())
  const [fTime, setFTime] = useState(nowTime())
  const [fHazards, setFHazards] = useState<Set<string>>(new Set())
  const [fMeasures, setFMeasures] = useState('')
  const [fWorkDesc, setFWorkDesc] = useState('')
  const [fSafetyChecklist, setFSafetyChecklist] = useState<Record<string, boolean>>(
    Object.fromEntries(SAFETY_CHECKLIST_ITEMS.map((c) => [c.key, false]))
  )
  const [fPhotos, setFPhotos] = useState<File[]>([])

  /* ── History ── */
  const [records, setRecords] = useState<TBMRecord[]>([])
  const [filterMonth, setFilterMonth] = useState(today().slice(0, 7))

  const toast = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  /* ── Load data ── */
  const loadData = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const [{ data: wk }, { data: recs }] = await Promise.all([
        supabase
          .from('site_workers')
          .select('id, name, role')
          .eq('project_id', currentProject)
          .order('name'),
        supabase
          .from('tbm_records')
          .select('*')
          .eq('project_id', currentProject)
          .order('tbm_date', { ascending: false })
          .limit(100),
      ])
      setWorkers((wk as SiteWorker[]) ?? [])
      setRecords((recs as TBMRecord[]) ?? [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [currentProject])

  useEffect(() => {
    if (user && currentProject) loadData()
  }, [user, currentProject, loadData])

  /* ── Toggles ── */
  function toggleHazard(key: string) {
    setFHazards((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleAttendee(id: string) {
    setSelectedAttendees((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllAttendees() {
    if (selectedAttendees.size === workers.length) {
      setSelectedAttendees(new Set())
    } else {
      setSelectedAttendees(new Set(workers.map((w) => w.id)))
    }
  }

  /* ── Upload photos ── */
  async function uploadPhotos(files: File[]): Promise<string[]> {
    const urls: string[] = []
    for (const file of files) {
      const path = `tbm/${currentProject}/${fDate}_${Date.now()}_${file.name}`
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

  /* ── Submit ── */
  async function handleSubmit() {
    if (!currentProject || !user) {
      toast('err', 'Chon cong trinh / 현장을 선택하세요')
      return
    }
    if (fHazards.size === 0) {
      toast('err', 'Chon nguy hiem / 위험요소를 선택하세요')
      return
    }

    setSaving(true)
    try {
      let photoUrls: string[] = []
      if (fPhotos.length > 0) {
        photoUrls = await uploadPhotos(fPhotos)
      }

      const { error } = await supabase.from('tbm_records').insert({
        project_id: currentProject,
        tbm_date: fDate,
        tbm_time: fTime || null,
        hazards: Array.from(fHazards),
        measures: fMeasures.trim() || null,
        work_desc: fWorkDesc.trim() || null,
        attendee_ids: Array.from(selectedAttendees),
        safety_checklist: fSafetyChecklist,
        photo_urls: photoUrls,
        created_by: user.id,
      })
      if (error) throw error

      setFHazards(new Set())
      setFMeasures('')
      setFWorkDesc('')
      setSelectedAttendees(new Set())
      setFSafetyChecklist(Object.fromEntries(SAFETY_CHECKLIST_ITEMS.map((c) => [c.key, false])))
      setFPhotos([])
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

  const filteredRecords = records.filter((r) => r.tbm_date.startsWith(filterMonth))

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
          TBM / 안전교육
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Giao duc an toan TBM / TBM 안전교육 관리
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Tong TBM / 총 TBM</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{records.length}</p>
              <p className="mt-1 text-xs text-gray-400">buoi / 건</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Thang nay / 이번달</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{filteredRecords.length}</p>
              <p className="mt-1 text-xs text-gray-400">buoi / 건</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-green-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Cong nhan / 등록 근로자</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{workers.length}</p>
              <p className="mt-1 text-xs text-gray-400">nguoi / 명</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0 mt-1" />
          </div>
        </div>
      </div>

      {/* ── TBM Form ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            Tao TBM / TBM 작성
          </h3>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                Gio / 시간
              </label>
              <input
                type="time"
                value={fTime}
                onChange={(e) => setFTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Hazard checklist */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Nguy hiem / 위험요소
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {HAZARD_ITEMS.map((item) => (
                <label
                  key={item.key}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs transition-colors ${
                    fHazards.has(item.key)
                      ? 'bg-red-50 border-red-300 text-red-800'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={fHazards.has(item.key)}
                    onChange={() => toggleHazard(item.key)}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>

          {/* Safety measures */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Bien phap an toan / 안전대책
            </label>
            <textarea
              value={fMeasures}
              onChange={(e) => setFMeasures(e.target.value)}
              rows={3}
              placeholder="Nhap bien phap an toan / 안전대책 입력"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Work description */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Noi dung cong viec / 작업내용
            </label>
            <input
              type="text"
              value={fWorkDesc}
              onChange={(e) => setFWorkDesc(e.target.value)}
              placeholder="Nhap noi dung cong viec / 작업내용 입력"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Attendees */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">
                Nguoi tham gia / 참석자 ({selectedAttendees.size}/{workers.length})
              </label>
              <button
                onClick={toggleAllAttendees}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                {selectedAttendees.size === workers.length ? 'Bo chon tat ca / 전체해제' : 'Chon tat ca / 전체선택'}
              </button>
            </div>
            {workers.length === 0 ? (
              <p className="text-xs text-gray-400">Chua co cong nhan / 등록된 근로자 없음</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
                {workers.map((w) => (
                  <label
                    key={w.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs transition-colors ${
                      selectedAttendees.has(w.id)
                        ? 'bg-green-50 border-green-300 text-green-800'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAttendees.has(w.id)}
                      onChange={() => toggleAttendee(w.id)}
                      className="rounded text-green-600 focus:ring-green-500"
                    />
                    <span className="truncate">{w.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Safety checklist */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              An toan checklist / 안전 체크리스트
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {SAFETY_CHECKLIST_ITEMS.map((item) => (
                <label
                  key={item.key}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs transition-colors ${
                    fSafetyChecklist[item.key]
                      ? 'bg-green-50 border-green-300 text-green-800'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={fSafetyChecklist[item.key]}
                    onChange={(e) =>
                      setFSafetyChecklist((prev) => ({
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

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSubmit}
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
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-xs text-gray-500">
              {filteredRecords.length}건
            </span>
          </div>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Dang tai... / 로딩 중...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Chua co du lieu / 데이터 없음
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">Ngay / 날짜</th>
                  <th className="px-3 py-3">Gio / 시간</th>
                  <th className="px-3 py-3">Nguy hiem / 위험요소</th>
                  <th className="px-3 py-3">Cong viec / 작업내용</th>
                  <th className="px-3 py-3 text-right">Nguoi / 참석</th>
                  <th className="px-3 py-3">Anh / 사진</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-xs text-gray-600 font-mono whitespace-nowrap">
                      {r.tbm_date}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600 font-mono">
                      {r.tbm_time ?? '-'}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <div className="flex flex-wrap gap-1">
                        {(r.hazards ?? []).map((h) => (
                          <span key={h} className="inline-block px-1.5 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-medium">
                            {HAZARD_ITEMS.find((hi) => hi.key === h)?.label ?? h}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-700 max-w-[200px] truncate">
                      {r.work_desc ?? '-'}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600 text-right font-mono">
                      {(r.attendee_ids ?? []).length}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500">
                      {(r.photo_urls ?? []).length > 0 ? `${r.photo_urls.length} anh` : '-'}
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
