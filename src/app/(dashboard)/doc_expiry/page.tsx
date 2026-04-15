'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isAdmin } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

/* ── Types ── */

interface DocRecord {
  id: string
  project_id: string
  title: string
  doc_type: string
  person: string | null
  issue_date: string | null
  expiry_date: string
  notes: string | null
  created_by: string | null
}

const DOC_TYPES = [
  { value: 'license', label: 'Giay phep / 면허' },
  { value: 'insurance', label: 'Bao hiem / 보험' },
  { value: 'certification', label: 'Chung chi / 자격증' },
  { value: 'permit', label: 'Giay phep XD / 허가' },
  { value: 'other', label: 'Khac / 기타' },
]

const docTypeLabel = (v: string) => DOC_TYPES.find((t) => t.value === v)?.label ?? v

function today() {
  return new Date().toISOString().slice(0, 10)
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
}

function expiryColor(days: number): { bg: string; text: string; label: string } {
  if (days < 0) return { bg: 'bg-gray-900', text: 'text-white', label: `Het han ${Math.abs(days)} ngay / ${Math.abs(days)}일 만료` }
  if (days <= 30) return { bg: 'bg-red-100', text: 'text-red-800', label: `${days} ngay / ${days}일` }
  if (days <= 60) return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: `${days} ngay / ${days}일` }
  return { bg: 'bg-green-100', text: 'text-green-800', label: `${days} ngay / ${days}일` }
}

/* ── Component ── */

export default function DocExpiryPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [docs, setDocs] = useState<DocRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<DocRecord | null>(null)
  const [mName, setMName] = useState('')
  const [mType, setMType] = useState('license')
  const [mHolder, setMHolder] = useState('')
  const [mIssue, setMIssue] = useState('')
  const [mExpiry, setMExpiry] = useState('')
  const [mNotes, setMNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const canManage = user && isAdmin(user.role)

  const showToast = useCallback((msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  /* ── Load ── */
  const loadDocs = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('doc_expiry')
        .select('*')
        .eq('project_id', currentProject)
        .order('expiry_date', { ascending: true })
      if (error) throw error
      setDocs((data ?? []) as DocRecord[])
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Load failed', 'err')
    } finally {
      setLoading(false)
    }
  }, [currentProject, showToast])

  useEffect(() => {
    loadDocs()
  }, [loadDocs])

  /* ── Modal ── */
  const openAdd = () => {
    setEditing(null)
    setMName(''); setMType('license'); setMHolder(''); setMIssue(today()); setMExpiry(''); setMNotes('')
    setShowModal(true)
  }

  const openEdit = (d: DocRecord) => {
    setEditing(d)
    setMName(d.title); setMType(d.doc_type)
    setMHolder(d.person ?? ''); setMIssue(d.issue_date ?? '')
    setMExpiry(d.expiry_date); setMNotes(d.notes ?? '')
    setShowModal(true)
  }

  /* ── Save ── */
  const handleSave = async () => {
    if (!mName.trim() || !mExpiry) { showToast('Nhap ten va ngay het han / 문서명과 만료일을 입력하세요', 'err'); return }
    if (!currentProject) return
    setSaving(true)
    try {
      const payload = {
        project_id: currentProject,
        title: mName.trim(),
        doc_type: mType,
        person: mHolder.trim() || null,
        issue_date: mIssue || null,
        expiry_date: mExpiry,
        notes: mNotes.trim() || null,
        created_by: user?.id ?? null,
      }
      if (editing) {
        const { error } = await supabase.from('doc_expiry').update(payload).eq('id', editing.id)
        if (error) throw error
        showToast('Da cap nhat / 수정 완료', 'ok')
      } else {
        const { error } = await supabase.from('doc_expiry').insert(payload)
        if (error) throw error
        showToast('Da them moi / 등록 완료', 'ok')
      }
      setShowModal(false)
      await loadDocs()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Save failed', 'err')
    } finally {
      setSaving(false)
    }
  }

  /* ── KPI ── */
  const totalDocs = docs.length
  const expiredCount = docs.filter((d) => daysUntil(d.expiry_date) < 0).length
  const expiringSoon = docs.filter((d) => { const days = daysUntil(d.expiry_date); return days >= 0 && days <= 30 }).length
  const safeCount = docs.filter((d) => daysUntil(d.expiry_date) > 60).length

  if (!currentProject) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        Vui long chon cong trinh / 현장을 선택해주세요.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>{toast.msg}</div>
      )}

      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Theo doi van ban / 문서만료</h1>
          <p className="mt-1 text-sm text-gray-500">Theo doi han su dung cac van ban / 문서 만료일 관리</p>
        </div>
        {canManage && (
          <button onClick={openAdd} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            + Them / 추가
          </button>
        )}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-medium text-gray-500">Tong / 전체</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{totalDocs}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Het han / 만료</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{expiredCount}</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-gray-900 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Sap het / 곧만료</p>
              <p className="mt-2 text-2xl font-bold text-red-600">{expiringSoon}</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-red-500 shrink-0 mt-1" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">An toan / 안전</p>
              <p className="mt-2 text-2xl font-bold text-green-600">{safeCount}</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-green-500 shrink-0 mt-1" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        {loading && <p className="text-sm text-gray-400 mb-2">Dang tai... / 로딩 중...</p>}
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="px-5 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Ten van ban / 문서명</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Loai / 유형</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Nguoi / 보유자</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Ngay cap / 발급일</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Het han / 만료일</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Con lai / 남은일</th>
                {canManage && <th className="px-5 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Thao tac / 작업</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {docs.length === 0 && !loading && (
                <tr><td colSpan={canManage ? 7 : 6} className="px-5 py-6 text-center text-sm text-gray-400">Khong co du lieu / 데이터 없음</td></tr>
              )}
              {docs.map((d) => {
                const days = daysUntil(d.expiry_date)
                const ec = expiryColor(days)
                return (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-5 py-2 text-gray-900 font-medium whitespace-nowrap">{d.title}</td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">{docTypeLabel(d.doc_type)}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-600 text-xs whitespace-nowrap">{d.person ?? '-'}</td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap font-mono">{d.issue_date ?? '-'}</td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap font-mono">{d.expiry_date}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${ec.bg} ${ec.text}`}>{ec.label}</span>
                    </td>
                    {canManage && (
                      <td className="px-5 py-2 whitespace-nowrap">
                        <button onClick={() => openEdit(d)} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors">Sua / 수정</button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editing ? 'Sua van ban / 문서 수정' : 'Them van ban / 문서 추가'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ten van ban / 문서명 *</label>
                <input type="text" value={mName} onChange={(e) => setMName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Loai / 유형</label>
                  <select value={mType} onChange={(e) => setMType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nguoi giu / 보유자</label>
                  <input type="text" value={mHolder} onChange={(e) => setMHolder(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ngay cap / 발급일</label>
                  <input type="date" value={mIssue} onChange={(e) => setMIssue(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Het han / 만료일 *</label>
                  <input type="date" value={mExpiry} onChange={(e) => setMExpiry(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chu / 비고</label>
                <textarea value={mNotes} onChange={(e) => setMNotes(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">Huy / 취소</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? 'Dang luu...' : 'Luu / 저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
