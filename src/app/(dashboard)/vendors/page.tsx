'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isAdmin } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

/* ── Types ── */

interface Vendor {
  id: string
  project_id: string
  company_name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  category: string
  address: string | null
  tax_id: string | null
  notes: string | null
  is_active: boolean
}

const CATEGORIES = [
  { value: 'material', label: 'Vat tu / 자재' },
  { value: 'equipment', label: 'Thiet bi / 장비' },
  { value: 'subcontractor', label: 'Nha thau phu / 하도급' },
  { value: 'other', label: 'Khac / 기타' },
]

const catLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label ?? v

/* ── Component ── */

export default function VendorsPage() {
  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Vendor | null>(null)
  const [mCompany, setMCompany] = useState('')
  const [mContact, setMContact] = useState('')
  const [mPhone, setMPhone] = useState('')
  const [mEmail, setMEmail] = useState('')
  const [mCat, setMCat] = useState('material')
  const [mAddress, setMAddress] = useState('')
  const [mTaxId, setMTaxId] = useState('')
  const [mNotes, setMNotes] = useState('')
  const [mActive, setMActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const canManage = user && isAdmin(user.role)

  /* ── Toast ── */
  const showToast = useCallback((msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  /* ── Load ── */
  const loadVendors = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('project_id', currentProject)
        .order('company_name')
      if (error) throw error
      setVendors((data ?? []) as Vendor[])
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Load failed', 'err')
    } finally {
      setLoading(false)
    }
  }, [currentProject, showToast])

  useEffect(() => {
    loadVendors()
  }, [loadVendors])

  /* ── Modal open ── */
  const openAdd = () => {
    setEditing(null)
    setMCompany(''); setMContact(''); setMPhone(''); setMEmail('')
    setMCat('material'); setMAddress(''); setMTaxId(''); setMNotes(''); setMActive(true)
    setShowModal(true)
  }

  const openEdit = (v: Vendor) => {
    setEditing(v)
    setMCompany(v.company_name); setMContact(v.contact_person ?? ''); setMPhone(v.phone ?? '')
    setMEmail(v.email ?? ''); setMCat(v.category); setMAddress(v.address ?? '')
    setMTaxId(v.tax_id ?? ''); setMNotes(v.notes ?? ''); setMActive(v.is_active)
    setShowModal(true)
  }

  /* ── Save ── */
  const handleSave = async () => {
    if (!mCompany.trim()) { showToast('Nhap ten cong ty / 업체명을 입력하세요', 'err'); return }
    if (!currentProject) { showToast('Chon cong trinh / 현장을 선택하세요', 'err'); return }
    setSaving(true)
    try {
      const payload = {
        project_id: currentProject,
        company_name: mCompany.trim(),
        contact_person: mContact.trim() || null,
        phone: mPhone.trim() || null,
        email: mEmail.trim() || null,
        category: mCat,
        address: mAddress.trim() || null,
        tax_id: mTaxId.trim() || null,
        notes: mNotes.trim() || null,
        is_active: mActive,
      }
      if (editing) {
        const { error } = await supabase.from('vendors').update(payload).eq('id', editing.id)
        if (error) throw error
        showToast('Da cap nhat / 수정 완료', 'ok')
      } else {
        const { error } = await supabase.from('vendors').insert(payload)
        if (error) throw error
        showToast('Da them moi / 등록 완료', 'ok')
      }
      setShowModal(false)
      await loadVendors()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Save failed', 'err')
    } finally {
      setSaving(false)
    }
  }

  /* ── Filtered ── */
  const filtered = vendors.filter((v) => {
    if (filterCat !== 'all' && v.category !== filterCat) return false
    if (search) {
      const q = search.toLowerCase()
      return v.company_name.toLowerCase().includes(q) ||
        (v.contact_person ?? '').toLowerCase().includes(q) ||
        (v.phone ?? '').includes(q)
    }
    return true
  })

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
          <h1 className="text-2xl font-bold text-gray-900">Quan ly upche / 업체관리</h1>
          <p className="mt-1 text-sm text-gray-500">Quan ly nha cung cap va nha thau / 협력업체 관리</p>
        </div>
        {canManage && (
          <button onClick={openAdd} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            + Them / 추가
          </button>
        )}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tim kiem / 검색..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2">
          <button onClick={() => setFilterCat('all')} className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${filterCat === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Tat ca / 전체
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setFilterCat(c.value)} className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${filterCat === c.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        {loading && <p className="text-sm text-gray-400 mb-2">Dang tai... / 로딩 중...</p>}
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="px-5 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Ten cong ty / 업체명</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Loai / 분류</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Lien he / 담당자</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">SDT / 전화</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Email</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">MST / 사업자번호</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Trang thai / 상태</th>
                {canManage && <th className="px-5 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">Thao tac / 작업</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && !loading && (
                <tr><td colSpan={canManage ? 8 : 7} className="px-5 py-6 text-center text-sm text-gray-400">Khong co du lieu / 데이터 없음</td></tr>
              )}
              {filtered.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-5 py-2 text-gray-900 font-medium whitespace-nowrap">{v.company_name}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">
                    <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">{catLabel(v.category)}</span>
                  </td>
                  <td className="px-3 py-2 text-gray-600 text-xs whitespace-nowrap">{v.contact_person ?? '-'}</td>
                  <td className="px-3 py-2 text-gray-600 text-xs whitespace-nowrap">{v.phone ?? '-'}</td>
                  <td className="px-3 py-2 text-gray-600 text-xs whitespace-nowrap">{v.email ?? '-'}</td>
                  <td className="px-3 py-2 text-gray-600 text-xs whitespace-nowrap font-mono">{v.tax_id ?? '-'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${v.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {v.is_active ? 'Hoat dong / 활동' : 'Ngung / 비활동'}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-5 py-2 whitespace-nowrap">
                      <button onClick={() => openEdit(v)} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors">Sua / 수정</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editing ? 'Sua upche / 업체 수정' : 'Them upche / 업체 추가'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ten cong ty / 업체명 *</label>
                <input type="text" value={mCompany} onChange={(e) => setMCompany(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nguoi lien he / 담당자</label>
                  <input type="text" value={mContact} onChange={(e) => setMContact(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Loai / 분류</label>
                  <select value={mCat} onChange={(e) => setMCat(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
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
                <label className="block text-xs font-medium text-gray-600 mb-1">Dia chi / 주소</label>
                <input type="text" value={mAddress} onChange={(e) => setMAddress(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">MST / 사업자번호</label>
                  <input type="text" value={mTaxId} onChange={(e) => setMTaxId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={mActive} onChange={(e) => setMActive(e.target.checked)} className="rounded border-gray-300" />
                    Hoat dong / 활동중
                  </label>
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
