'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isAdmin } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

/* ── Types ── */

interface Contact {
  id: string
  project_id: string | null
  name: string
  role: string | null
  phone: string | null
  email: string | null
  organization: string | null
  contact_type: string | null
  created_at: string | null
  created_by: string | null
}

const CONTACT_TYPES = [
  { value: 'emergency', label: 'Khan cap / 긴급', color: 'bg-red-100 text-red-800' },
  { value: 'hospital', label: 'Benh vien / 병원', color: 'bg-pink-100 text-pink-800' },
  { value: 'fire', label: 'Cuu hoa / 소방', color: 'bg-orange-100 text-orange-800' },
  { value: 'police', label: 'Cong an / 경찰', color: 'bg-blue-100 text-blue-800' },
  { value: 'company', label: 'Cong ty / 회사', color: 'bg-green-100 text-green-800' },
  { value: 'other', label: 'Khac / 기타', color: 'bg-gray-100 text-gray-800' },
]

const typeInfo = (v: string) => CONTACT_TYPES.find((t) => t.value === v) ?? CONTACT_TYPES[5]

/* ── Component ── */

export default function ContactsPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [mName, setMName] = useState('')
  const [mPosition, setMPosition] = useState('')
  const [mPhone, setMPhone] = useState('')
  const [mEmail, setMEmail] = useState('')
  const [mOrg, setMOrg] = useState('')
  const [mType, setMType] = useState('company')
  const [mNotes, setMNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const canManage = user && isAdmin(user.role)

  const showToast = useCallback((msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  /* ── Load ── */
  const loadContacts = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('project_id', currentProject)
        .order('contact_type')
        .order('name')
      if (error) throw error
      setContacts((data ?? []) as Contact[])
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Load failed', 'err')
    } finally {
      setLoading(false)
    }
  }, [currentProject, showToast])

  useEffect(() => {
    loadContacts()
  }, [loadContacts])

  /* ── Modal ── */
  const openAdd = () => {
    setEditing(null)
    setMName(''); setMPosition(''); setMPhone(''); setMEmail('')
    setMOrg(''); setMType('company'); setMNotes('')
    setShowModal(true)
  }

  const openEdit = (c: Contact) => {
    setEditing(c)
    setMName(c.name); setMPosition(c.role ?? ''); setMPhone(c.phone ?? '')
    setMEmail(c.email ?? ''); setMOrg(c.organization ?? '')
    setMType(c.contact_type ?? ''); setMNotes('')
    setShowModal(true)
  }

  /* ── Save ── */
  const handleSave = async () => {
    if (!mName.trim()) { showToast('Nhap ten / 이름을 입력하세요', 'err'); return }
    if (!currentProject) return
    setSaving(true)
    try {
      const payload = {
        project_id: currentProject,
        name: mName.trim(),
        role: mPosition.trim() || null,
        phone: mPhone.trim() || null,
        email: mEmail.trim() || null,
        organization: mOrg.trim() || null,
        contact_type: mType,
      }
      if (editing) {
        const { error } = await supabase.from('contacts').update(payload).eq('id', editing.id)
        if (error) throw error
        showToast('Da cap nhat / 수정 완료', 'ok')
      } else {
        const { error } = await supabase.from('contacts').insert(payload)
        if (error) throw error
        showToast('Da them moi / 등록 완료', 'ok')
      }
      setShowModal(false)
      await loadContacts()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Save failed', 'err')
    } finally {
      setSaving(false)
    }
  }

  /* ── Delete ── */
  const handleDelete = async (id: string) => {
    if (!confirm('Xoa lien he nay? / 이 연락처를 삭제하시겠습니까?')) return
    try {
      const { error } = await supabase.from('contacts').delete().eq('id', id)
      if (error) throw error
      showToast('Da xoa / 삭제 완료', 'ok')
      await loadContacts()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Delete failed', 'err')
    }
  }

  /* ── Group by type ── */
  const grouped = CONTACT_TYPES.map((t) => ({
    ...t,
    items: contacts.filter((c) => c.contact_type === t.value),
  })).filter((g) => g.items.length > 0)

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
          <h1 className="text-2xl font-bold text-gray-900">Lien he khan cap / 비상연락처</h1>
          <p className="mt-1 text-sm text-gray-500">Danh ba lien he khan cap / 비상 연락처 관리</p>
        </div>
        {canManage && (
          <button onClick={openAdd} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            + Them / 추가
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-gray-400">Dang tai... / 로딩 중...</p>}

      {/* Grouped sections */}
      {grouped.length === 0 && !loading && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-400">
          Chua co lien he nao / 연락처 없음
        </div>
      )}

      {grouped.map((group) => (
        <div key={group.value} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 flex items-center gap-2">
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${group.color}`}>{group.label}</span>
            <span className="text-xs text-gray-400">{group.items.length}</span>
          </div>
          <div className="divide-y divide-gray-100">
            {group.items.map((c) => (
              <div key={c.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{c.name}</span>
                    {c.role && <span className="text-xs text-gray-500">({c.role})</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {c.organization && <span className="text-xs text-gray-500">{c.organization}</span>}
                    {c.email && <span className="text-xs text-gray-400">{c.email}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {c.phone && (
                    <a
                      href={`tel:${c.phone}`}
                      className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      {c.phone}
                    </a>
                  )}
                  {canManage && (
                    <>
                      <button onClick={() => openEdit(c)} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors">Sua / 수정</button>
                      <button onClick={() => handleDelete(c.id)} className="px-2 py-1 bg-red-50 text-red-600 text-xs rounded hover:bg-red-100 transition-colors">Xoa / 삭제</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editing ? 'Sua lien he / 연락처 수정' : 'Them lien he / 연락처 추가'}
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ten / 이름 *</label>
                  <input type="text" value={mName} onChange={(e) => setMName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Loai / 유형</label>
                  <select value={mType} onChange={(e) => setMType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {CONTACT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Chuc vu / 직위</label>
                  <input type="text" value={mPosition} onChange={(e) => setMPosition(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">To chuc / 소속</label>
                  <input type="text" value={mOrg} onChange={(e) => setMOrg(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">SDT / 전화</label>
                  <input type="tel" value={mPhone} onChange={(e) => setMPhone(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input type="email" value={mEmail} onChange={(e) => setMEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
