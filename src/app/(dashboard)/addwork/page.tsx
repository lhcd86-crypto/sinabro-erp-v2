'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isAdmin } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

/* ── Types ───────────────────────────────────────── */

interface AdditionalWork {
  id: string
  project_id: string
  work_date: string
  category: string
  work_type: string
  description: string | null
  location: string | null
  quantity: number | null
  unit: string | null
  unit_price: number | null
  notes: string | null
  photos: string[]
  status: string
  user_id: string
  created_at: string
}

/* ── Constants ───────────────────────────────────── */

const CATEGORIES = [
  { value: 'additional', label: '추가공사 / Cong viec them' },
  { value: 'change_order', label: '변경지시 / Thay doi chi thi' },
  { value: 'design_change', label: '설계변경 / Thay doi thiet ke' },
  { value: 'emergency', label: '긴급처리 / Xu ly khan cap' },
]

const WORK_TYPES = [
  { value: 'V250', label: 'V250' },
  { value: 'SV250', label: 'SV250' },
  { value: 'HLM', label: 'HLM' },
  { value: 'M230', label: 'M230' },
  { value: 'MCR1', label: 'MCR1' },
  { value: 'MCR2', label: 'MCR2' },
  { value: 'LT', label: 'LT' },
  { value: 'HPS', label: 'HPS' },
  { value: 'MN', label: 'MN' },
  { value: 'PU600', label: 'PU600' },
  { value: 'other', label: '기타 / Khac' },
]

const UNITS = [
  { value: 'm', label: 'm' },
  { value: 'm2', label: 'm2' },
  { value: 'ea', label: 'ea / 개' },
  { value: 'kg', label: 'kg' },
]

const STATUSES = [
  { value: 'pending', label: '대기 / Cho', color: 'bg-gray-100 text-gray-700' },
  { value: 'confirmed', label: '확인 / Xac nhan', color: 'bg-blue-100 text-blue-700' },
  { value: 'billed', label: '청구 / Thanh toan', color: 'bg-green-100 text-green-700' },
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

/* ── Component ─────────────────────────────────────── */

export default function AddWorkPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  /* ── Data ── */
  const [works, setWorks] = useState<AdditionalWork[]>([])

  /* ── Form state ── */
  const [fDate, setFDate] = useState(today())
  const [fCategory, setFCategory] = useState('additional')
  const [fWorkType, setFWorkType] = useState('V250')
  const [fDescription, setFDescription] = useState('')
  const [fLocation, setFLocation] = useState('')
  const [fQuantity, setFQuantity] = useState('')
  const [fUnit, setFUnit] = useState('m')
  const [fUnitPrice, setFUnitPrice] = useState('')
  const [fNotes, setFNotes] = useState('')
  const [fPhotos, setFPhotos] = useState<File[]>([])

  const toast = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  const userIsAdmin = user?.role ? isAdmin(user.role) : false

  /* ── Load data ── */
  const loadData = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('additional_works')
        .select('*')
        .eq('project_id', currentProject)
        .order('work_date', { ascending: false })
        .limit(100)
      setWorks((data as AdditionalWork[]) ?? [])
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
      const path = `addwork/${currentProject}/${fDate}_${Date.now()}_${file.name}`
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
    if (!fDescription.trim()) {
      toast('err', 'Nhap mo ta / 내용을 입력하세요')
      return
    }

    setSaving(true)
    try {
      let photoUrls: string[] = []
      if (fPhotos.length > 0) {
        photoUrls = await uploadPhotos(fPhotos)
      }

      const { error } = await supabase.from('additional_works').insert({
        project_id: currentProject,
        work_date: fDate,
        category: fCategory,
        work_type: fWorkType,
        description: fDescription.trim(),
        location: fLocation.trim() || null,
        quantity: parseFloat(fQuantity) || null,
        unit: fUnit || null,
        unit_price: parseFloat(fUnitPrice) || null,
        notes: fNotes.trim() || null,
        photos: photoUrls,
        status: 'pending',
        user_id: user.id,
      })
      if (error) throw error

      setFDate(today())
      setFCategory('additional')
      setFWorkType('V250')
      setFDescription('')
      setFLocation('')
      setFQuantity('')
      setFUnit('m')
      setFUnitPrice('')
      setFNotes('')
      setFPhotos([])
      toast('ok', 'Da luu / 추가항목 저장 완료')
      loadData()
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  /* ── Update status ── */
  async function updateStatus(id: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from('additional_works')
        .update({ status: newStatus })
        .eq('id', id)
      if (error) throw error
      toast('ok', 'Da cap nhat / 상태 변경 완료')
      loadData()
    } catch (e) {
      toast('err', e instanceof Error ? e.message : 'Update failed')
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
  const totalAmount = works.reduce((sum, w) => {
    const qty = w.quantity ?? 0
    const price = w.unit_price ?? 0
    return sum + qty * price
  }, 0)
  const pendingCount = works.filter((w) => w.status === 'pending').length
  const confirmedCount = works.filter((w) => w.status === 'confirmed').length
  const billedCount = works.filter((w) => w.status === 'billed').length

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
          Cong viec them / 추가항목 &middot; 변更지시
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Quan ly cong viec bo sung / 추가공사 및 변경지시 관리
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Cho xu ly / 대기</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{pendingCount}</p>
              <p className="mt-1 text-xs text-gray-400">muc / 건</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-gray-400 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Xac nhan / 확인</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{confirmedCount}</p>
              <p className="mt-1 text-xs text-gray-400">muc / 건</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Da tinh tien / 청구</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{billedCount}</p>
              <p className="mt-1 text-xs text-gray-400">muc / 건</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-green-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Tong tien / 총액</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {totalAmount.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-gray-400">VND</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0 mt-1" />
          </div>
        </div>
      </div>

      {/* ── Add Work Form ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            Them moi / 추가항목 등록
          </h3>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                Phan loai / 분류
              </label>
              <select
                value={fCategory}
                onChange={(e) => setFCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Loai cong viec / 작업유형
              </label>
              <select
                value={fWorkType}
                onChange={(e) => setFWorkType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {WORK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Mo ta / 내용
            </label>
            <textarea
              value={fDescription}
              onChange={(e) => setFDescription(e.target.value)}
              rows={3}
              placeholder="Nhap mo ta chi tiet / 상세 내용 입력"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Vi tri / 위치
              </label>
              <input
                type="text"
                value={fLocation}
                onChange={(e) => setFLocation(e.target.value)}
                placeholder="Nhap vi tri / 위치 입력"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                So luong / 수량
              </label>
              <input
                type="number"
                step="0.01"
                value={fQuantity}
                onChange={(e) => setFQuantity(e.target.value)}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Don vi / 단위
              </label>
              <select
                value={fUnit}
                onChange={(e) => setFUnit(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Don gia / 단가
              </label>
              <input
                type="number"
                step="1"
                value={fUnitPrice}
                onChange={(e) => setFUnitPrice(e.target.value)}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Ghi chu / 비고
            </label>
            <input
              type="text"
              value={fNotes}
              onChange={(e) => setFNotes(e.target.value)}
              placeholder="Ghi chu them / 추가 비고"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
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
              {saving ? 'Dang luu... / 저장 중...' : 'Luu / 추가항목 저장'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Work List ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Danh sach / 추가항목 목록
          </h3>
          <span className="text-xs text-gray-500">Tong / 총 {works.length}건</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Dang tai... / 로딩 중...
          </div>
        ) : works.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Chua co du lieu / 데이터 없음
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">Ngay / 날짜</th>
                  <th className="px-3 py-3">Phan loai / 분류</th>
                  <th className="px-3 py-3">Loai / 유형</th>
                  <th className="px-3 py-3">Mo ta / 내용</th>
                  <th className="px-3 py-3">Vi tri / 위치</th>
                  <th className="px-3 py-3 text-right">SL / 수량</th>
                  <th className="px-3 py-3 text-right">Don gia / 단가</th>
                  <th className="px-3 py-3 text-right">Thanh tien / 금액</th>
                  <th className="px-3 py-3">Trang thai / 상태</th>
                  {userIsAdmin && <th className="px-3 py-3">Hanh dong / 액션</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {works.map((w) => {
                  const statusInfo = STATUSES.find((s) => s.value === w.status)
                  const amount = (w.quantity ?? 0) * (w.unit_price ?? 0)
                  return (
                    <tr key={w.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-xs text-gray-600 font-mono whitespace-nowrap">{w.work_date}</td>
                      <td className="px-3 py-3 text-xs">
                        <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold">
                          {CATEGORIES.find((c) => c.value === w.category)?.label ?? w.category}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-700 font-medium">{w.work_type}</td>
                      <td className="px-3 py-3 text-xs text-gray-500 max-w-[180px] truncate">{w.description ?? '-'}</td>
                      <td className="px-3 py-3 text-xs text-gray-500">{w.location ?? '-'}</td>
                      <td className="px-3 py-3 text-xs text-gray-600 text-right font-mono">
                        {w.quantity != null ? `${w.quantity} ${w.unit ?? ''}` : '-'}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 text-right font-mono">
                        {w.unit_price != null ? w.unit_price.toLocaleString() : '-'}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-900 text-right font-mono font-bold">
                        {amount > 0 ? amount.toLocaleString() : '-'}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <span className={`inline-block px-2 py-0.5 rounded font-semibold ${statusInfo?.color ?? 'bg-gray-100 text-gray-700'}`}>
                          {statusInfo?.label ?? w.status}
                        </span>
                      </td>
                      {userIsAdmin && (
                        <td className="px-3 py-3 text-xs">
                          <div className="flex gap-1">
                            {w.status === 'pending' && (
                              <button
                                onClick={() => updateStatus(w.id, 'confirmed')}
                                className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-[10px] font-medium hover:bg-blue-100 transition-colors"
                              >
                                Xac nhan / 확인
                              </button>
                            )}
                            {w.status === 'confirmed' && (
                              <button
                                onClick={() => updateStatus(w.id, 'billed')}
                                className="px-2 py-1 bg-green-50 text-green-700 rounded text-[10px] font-medium hover:bg-green-100 transition-colors"
                              >
                                Thanh toan / 청구
                              </button>
                            )}
                            {w.status !== 'pending' && (
                              <button
                                onClick={() => updateStatus(w.id, 'pending')}
                                className="px-2 py-1 bg-gray-50 text-gray-600 rounded text-[10px] font-medium hover:bg-gray-100 transition-colors"
                              >
                                Reset / 초기화
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
                {/* Totals row */}
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={7} className="px-3 py-3 text-xs text-gray-700 text-right">
                    Tong cong / 합계
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-900 text-right font-mono font-bold">
                    {totalAmount.toLocaleString()}
                  </td>
                  <td colSpan={userIsAdmin ? 2 : 1} />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
