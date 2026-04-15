'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

/* ── Types ───────────────────────────────────────── */

interface WorkOrder {
  id: string
  project_id: string | null
  location: string | null
  work_type: string | null
  qty: string | null
  assignee_id: string | null
  assignee_name: string | null
  content: string | null
  caution: string | null
  status: string | null
  created_by: string | null
  created_by_name: string | null
  created_at: string | null
  updated_at: string | null
}

interface UserOption {
  id: string
  name: string
}

/* ── Constants ───────────────────────────────────── */

const WORK_TYPES = [
  { value: 'V250', label: 'V250' },
  { value: 'HLM', label: 'HLM' },
  { value: 'M230', label: 'M230' },
  { value: 'sealing', label: '실링 / Sealing' },
  { value: 'other', label: '기타 / Khac' },
]

const STATUSES = [
  { value: 'pending', label: '대기 / Cho', color: 'bg-gray-100 text-gray-700' },
  { value: 'in_progress', label: '진행중 / Dang lam', color: 'bg-blue-100 text-blue-700' },
  { value: 'done', label: '완료 / Xong', color: 'bg-green-100 text-green-700' },
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

/* ── Component ─────────────────────────────────────── */

export default function WorkOrdersPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  /* ── Data ── */
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [users, setUsers] = useState<UserOption[]>([])

  /* ── Form state ── */
  const [fLocation, setFLocation] = useState('')
  const [fWorkType, setFWorkType] = useState('V250')
  const [fQuantity, setFQuantity] = useState('')
  const [fAssignee, setFAssignee] = useState('')
  const [fDueDate, setFDueDate] = useState(today())
  const [fContent, setFContent] = useState('')
  const [fCaution, setFCaution] = useState('')

  const toast = useCallback((type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  /* ── Load data ── */
  const loadData = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const [{ data: ord }, { data: usr }] = await Promise.all([
        supabase
          .from('work_orders')
          .select('*')
          .eq('project_id', currentProject)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('users')
          .select('id, name')
          .order('name'),
      ])
      setOrders((ord as WorkOrder[]) ?? [])
      setUsers((usr as UserOption[]) ?? [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [currentProject])

  useEffect(() => {
    if (user && currentProject) loadData()
  }, [user, currentProject, loadData])

  /* ── Submit ── */
  async function handleSubmit() {
    if (!currentProject || !user) {
      toast('err', 'Chon cong trinh / 현장을 선택하세요')
      return
    }
    if (!fLocation.trim()) {
      toast('err', 'Nhap vi tri / 위치를 입력하세요')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.from('work_orders').insert({
        project_id: currentProject,
        location: fLocation.trim(),
        work_type: fWorkType,
        qty: fQuantity.trim() || null,
        assignee_id: fAssignee || null,
        content: fContent.trim() || null,
        caution: fCaution.trim() || null,
        status: 'pending',
        created_by: user.id,
      })
      if (error) throw error

      setFLocation('')
      setFWorkType('V250')
      setFQuantity('')
      setFAssignee('')
      setFDueDate(today())
      setFContent('')
      setFCaution('')
      toast('ok', 'Da luu lenh / 작업지시 저장 완료')
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
        .from('work_orders')
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
  const pendingCount = orders.filter((o) => o.status === 'pending').length
  const inProgressCount = orders.filter((o) => o.status === 'in_progress').length
  const doneCount = orders.filter((o) => o.status === 'done').length

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
          Lenh cong viec / 작업지시서
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Quan ly lenh cong viec / 작업지시 관리
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Cho xu ly / 대기</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{pendingCount}</p>
              <p className="mt-1 text-xs text-gray-400">lenh / 건</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-gray-400 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Dang lam / 진행중</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{inProgressCount}</p>
              <p className="mt-1 text-xs text-gray-400">lenh / 건</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Hoan thanh / 완료</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{doneCount}</p>
              <p className="mt-1 text-xs text-gray-400">lenh / 건</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-green-500 shrink-0 mt-1" />
          </div>
        </div>
      </div>

      {/* ── Work Order Form ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            Tao lenh moi / 작업지시 작성
          </h3>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                So luong / 수량
              </label>
              <input
                type="text"
                value={fQuantity}
                onChange={(e) => setFQuantity(e.target.value)}
                placeholder="Nhap so luong / 수량 입력"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Nguoi phu trach / 담당자
              </label>
              <select
                value={fAssignee}
                onChange={(e) => setFAssignee(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Chon nguoi / 담당자 선택</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Han / 기한
              </label>
              <input
                type="date"
                value={fDueDate}
                onChange={(e) => setFDueDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Noi dung / 작업내용
            </label>
            <textarea
              value={fContent}
              onChange={(e) => setFContent(e.target.value)}
              rows={3}
              placeholder="Nhap noi dung chi tiet / 상세 내용 입력"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Luu y / 주의사항
            </label>
            <input
              type="text"
              value={fCaution}
              onChange={(e) => setFCaution(e.target.value)}
              placeholder="Nhap luu y / 주의사항 입력"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Dang luu... / 저장 중...' : 'Luu lenh / 작업지시 저장'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Work Order List ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Danh sach lenh / 작업지시 목록
          </h3>
          <span className="text-xs text-gray-500">Tong / 총 {orders.length}건</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Dang tai... / 로딩 중...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Chua co du lieu / 데이터 없음
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">Vi tri / 위치</th>
                  <th className="px-3 py-3">Loai / 유형</th>
                  <th className="px-3 py-3">So luong / 수량</th>
                  <th className="px-3 py-3">Han / 기한</th>
                  <th className="px-3 py-3">Noi dung / 내용</th>
                  <th className="px-3 py-3">Trang thai / 상태</th>
                  <th className="px-3 py-3">Hanh dong / 액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((ord) => {
                  const statusInfo = STATUSES.find((s) => s.value === ord.status)
                  return (
                    <tr key={ord.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-xs text-gray-900 font-medium">{ord.location}</td>
                      <td className="px-3 py-3 text-xs">
                        <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold">
                          {WORK_TYPES.find((t) => t.value === ord.work_type)?.label ?? ord.work_type}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 font-mono">{ord.qty ?? '-'}</td>
                      <td className="px-3 py-3 text-xs text-gray-600 font-mono whitespace-nowrap">{ord.created_at?.slice(0, 10) ?? '-'}</td>
                      <td className="px-3 py-3 text-xs text-gray-500 max-w-[200px] truncate">{ord.content ?? '-'}</td>
                      <td className="px-3 py-3 text-xs">
                        <span className={`inline-block px-2 py-0.5 rounded font-semibold ${statusInfo?.color ?? 'bg-gray-100 text-gray-700'}`}>
                          {statusInfo?.label ?? ord.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <div className="flex gap-1">
                          {ord.status === 'pending' && (
                            <button
                              onClick={() => updateStatus(ord.id, 'in_progress')}
                              className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-[10px] font-medium hover:bg-blue-100 transition-colors"
                            >
                              Bat dau / 시작
                            </button>
                          )}
                          {ord.status === 'in_progress' && (
                            <button
                              onClick={() => updateStatus(ord.id, 'done')}
                              className="px-2 py-1 bg-green-50 text-green-700 rounded text-[10px] font-medium hover:bg-green-100 transition-colors"
                            >
                              Hoan thanh / 완료
                            </button>
                          )}
                          {ord.status !== 'pending' && (
                            <button
                              onClick={() => updateStatus(ord.id, 'pending')}
                              className="px-2 py-1 bg-gray-50 text-gray-600 rounded text-[10px] font-medium hover:bg-gray-100 transition-colors"
                            >
                              Reset / 초기화
                            </button>
                          )}
                        </div>
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
