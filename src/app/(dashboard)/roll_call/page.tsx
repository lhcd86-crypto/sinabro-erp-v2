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

interface WorkforcePhoto {
  id: string
  project_id: string
  photo_date: string
  slot: string
  worker_ids: string[]
  manual_counts: { direct: number; indirect: number; vn_tech: number }
  time_records: Record<string, string>
  photo_urls: string[]
  memo: string | null
  created_by: string
  created_at: string
}

/* ── Constants ───────────────────────────────────── */

const SLOTS = [
  { value: 'am', label: 'AM / 오전' },
  { value: 'pm', label: 'PM / 오후' },
  { value: 'night', label: 'Night / 야간' },
]

const TIME_FIELDS = [
  { key: 'am_in', label: 'AM In / 오전출근' },
  { key: 'am_out', label: 'AM Out / 오전퇴근' },
  { key: 'pm_in', label: 'PM In / 오후출근' },
  { key: 'pm_out', label: 'PM Out / 오후퇴근' },
  { key: 'ot_in', label: 'OT In / 잔업출근' },
  { key: 'ot_out', label: 'OT Out / 잔업퇴근' },
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

function getMonthKey(d: string) {
  return d.slice(0, 7)
}

/* ── Component ─────────────────────────────────────── */

export default function RollCallPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  /* ── Workers ── */
  const [workers, setWorkers] = useState<SiteWorker[]>([])
  const [selectedWorkers, setSelectedWorkers] = useState<Set<string>>(new Set())

  /* ── Form state ── */
  const [fDate, setFDate] = useState(today())
  const [fSlot, setFSlot] = useState('am')
  const [fDirect, setFDirect] = useState('')
  const [fIndirect, setFIndirect] = useState('')
  const [fVnTech, setFVnTech] = useState('')
  const [fTimes, setFTimes] = useState<Record<string, string>>(
    Object.fromEntries(TIME_FIELDS.map((t) => [t.key, '']))
  )
  const [fPhotos, setFPhotos] = useState<File[]>([])
  const [fMemo, setFMemo] = useState('')

  /* ── History ── */
  const [records, setRecords] = useState<WorkforcePhoto[]>([])

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
          .select('id, worker_name, worker_type')
          .eq('project_id', currentProject)
          .order('name'),
        supabase
          .from('workforce_photos')
          .select('*')
          .eq('project_id', currentProject)
          .order('photo_date', { ascending: false })
          .limit(60),
      ])
      setWorkers((wk as SiteWorker[]) ?? [])
      setRecords((recs as WorkforcePhoto[]) ?? [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [currentProject])

  useEffect(() => {
    if (user && currentProject) loadData()
  }, [user, currentProject, loadData])

  /* ── Select all / deselect all ── */
  function toggleAll() {
    if (selectedWorkers.size === workers.length) {
      setSelectedWorkers(new Set())
    } else {
      setSelectedWorkers(new Set(workers.map((w) => w.id)))
    }
  }

  function toggleWorker(id: string) {
    setSelectedWorkers((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /* ── Upload photos ── */
  async function uploadPhotos(files: File[]): Promise<string[]> {
    const urls: string[] = []
    for (const file of files) {
      const path = `roll_call/${currentProject}/${fDate}_${Date.now()}_${file.worker_name}`
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

    setSaving(true)
    try {
      let photoUrls: string[] = []
      if (fPhotos.length > 0) {
        photoUrls = await uploadPhotos(fPhotos)
      }

      const { error } = await supabase.from('workforce_photos').insert({
        project_id: currentProject,
        photo_date: fDate,
        slot: fSlot,
        worker_ids: Array.from(selectedWorkers),
        manual_counts: {
          direct: parseInt(fDirect) || 0,
          indirect: parseInt(fIndirect) || 0,
          vn_tech: parseInt(fVnTech) || 0,
        },
        time_records: fTimes,
        photo_urls: photoUrls,
        memo: fMemo.trim() || null,
        created_by: user.id,
      })
      if (error) throw error

      setSelectedWorkers(new Set())
      setFDirect('')
      setFIndirect('')
      setFVnTech('')
      setFTimes(Object.fromEntries(TIME_FIELDS.map((t) => [t.key, ''])))
      setFPhotos([])
      setFMemo('')
      toast('ok', 'Da luu diem danh / 출석 저장 완료')
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

  /* ── Derived ── */
  const todayRecords = records.filter((r) => r.photo_date === today())
  const todayTotal = todayRecords.reduce(
    (sum, r) => sum + (r.manual_counts?.direct ?? 0) + (r.manual_counts?.indirect ?? 0) + (r.manual_counts?.vn_tech ?? 0),
    0
  )
  const currentMonth = getMonthKey(today())
  const monthRecords = records.filter((r) => getMonthKey(r.photo_date) === currentMonth)

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
          Diem danh / 출석체크
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Quan ly diem danh cong nhan / 근로자 출석 관리
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Hom nay / 오늘 출석</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{todayRecords.length}</p>
              <p className="mt-1 text-xs text-gray-400">lan ghi / 건</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Tong nhan luc / 오늘 총인원</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{todayTotal}</p>
              <p className="mt-1 text-xs text-gray-400">nguoi / 명</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-green-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Thang nay / 이번달</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{monthRecords.length}</p>
              <p className="mt-1 text-xs text-gray-400">lan ghi / 건</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0 mt-1" />
          </div>
        </div>
      </div>

      {/* ── Roll Call Form ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            Diem danh / 출석 기록
          </h3>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          {/* Date & Slot */}
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
                Ca / 근무조
              </label>
              <div className="flex gap-2">
                {SLOTS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setFSlot(s.value)}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                      fSlot === s.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Worker checkboxes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">
                Cong nhan / 근로자 ({selectedWorkers.size}/{workers.length})
              </label>
              <button
                onClick={toggleAll}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                {selectedWorkers.size === workers.length ? 'Bo chon tat ca / 전체해제' : 'Chon tat ca / 전체선택'}
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
                      selectedWorkers.has(w.id)
                        ? 'bg-green-50 border-green-300 text-green-800'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedWorkers.has(w.id)}
                      onChange={() => toggleWorker(w.id)}
                      className="rounded text-green-600 focus:ring-green-500"
                    />
                    <span className="truncate">{w.worker_name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Manual counts */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              So luong thu cong / 수동 인원입력
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Truc tiep / 직접</label>
                <input
                  type="number"
                  value={fDirect}
                  onChange={(e) => setFDirect(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Gian tiep / 간접</label>
                <input
                  type="number"
                  value={fIndirect}
                  onChange={(e) => setFIndirect(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">KT Viet Nam / VN기술</label>
                <input
                  type="number"
                  value={fVnTech}
                  onChange={(e) => setFVnTech(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Time inputs */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Thoi gian / 시간 기록
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {TIME_FIELDS.map((tf) => (
                <div key={tf.key}>
                  <label className="block text-xs text-gray-500 mb-1">{tf.label}</label>
                  <input
                    type="time"
                    value={fTimes[tf.key]}
                    onChange={(e) =>
                      setFTimes((prev) => ({ ...prev, [tf.key]: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
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

          {/* Memo */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Ghi chu / 메모
            </label>
            <textarea
              value={fMemo}
              onChange={(e) => setFMemo(e.target.value)}
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
              {saving ? 'Dang luu... / 저장 중...' : 'Luu diem danh / 출석 저장'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Today Summary ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            Hom nay / 오늘 요약
          </h3>
        </div>
        {todayRecords.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Chua co du lieu hom nay / 오늘 데이터 없음
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">Ca / 근무조</th>
                  <th className="px-3 py-3 text-right">Truc tiep / 직접</th>
                  <th className="px-3 py-3 text-right">Gian tiep / 간접</th>
                  <th className="px-3 py-3 text-right">VN KT / VN기술</th>
                  <th className="px-3 py-3 text-right">Tong / 합계</th>
                  <th className="px-3 py-3">Anh / 사진</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {todayRecords.map((r) => {
                  const mc = r.manual_counts ?? { direct: 0, indirect: 0, vn_tech: 0 }
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-xs">
                        <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold">
                          {SLOTS.find((s) => s.value === r.slot)?.label ?? r.slot}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 text-right font-mono">{mc.direct}</td>
                      <td className="px-3 py-3 text-xs text-gray-600 text-right font-mono">{mc.indirect}</td>
                      <td className="px-3 py-3 text-xs text-gray-600 text-right font-mono">{mc.vn_tech}</td>
                      <td className="px-3 py-3 text-xs text-gray-900 text-right font-mono font-bold">
                        {mc.direct + mc.indirect + mc.vn_tech}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500">
                        {(r.photo_urls ?? []).length > 0 ? `${r.photo_urls.length} anh` : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Monthly History ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Lich su thang / 월별 이력
          </h3>
          <span className="text-xs text-gray-500">
            Tong / 총 {monthRecords.length}건
          </span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Dang tai... / 로딩 중...
          </div>
        ) : monthRecords.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Chua co du lieu / 데이터 없음
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">Ngay / 날짜</th>
                  <th className="px-3 py-3">Ca / 근무조</th>
                  <th className="px-3 py-3 text-right">Truc tiep / 직접</th>
                  <th className="px-3 py-3 text-right">Gian tiep / 간접</th>
                  <th className="px-3 py-3 text-right">VN KT / VN기술</th>
                  <th className="px-3 py-3">Ghi chu / 메모</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {monthRecords.map((r) => {
                  const mc = r.manual_counts ?? { direct: 0, indirect: 0, vn_tech: 0 }
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-xs text-gray-600 font-mono whitespace-nowrap">
                        {r.photo_date}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold">
                          {SLOTS.find((s) => s.value === r.slot)?.label ?? r.slot}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 text-right font-mono">{mc.direct}</td>
                      <td className="px-3 py-3 text-xs text-gray-600 text-right font-mono">{mc.indirect}</td>
                      <td className="px-3 py-3 text-xs text-gray-600 text-right font-mono">{mc.vn_tech}</td>
                      <td className="px-3 py-3 text-xs text-gray-500 max-w-[200px] truncate">
                        {r.memo ?? '-'}
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
