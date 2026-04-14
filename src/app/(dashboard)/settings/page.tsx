'use client'

import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/roles'

/* ── Component ─────────────────────────────────────── */

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const projects = useAuthStore((s) => s.projects)
  const currentProject = useAuthStore((s) => s.currentProject)

  const [lang, setLang] = useState<'ko' | 'vi'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('erp-lang') as 'ko' | 'vi') ?? 'vi'
    }
    return 'vi'
  })

  function toggleLang(newLang: 'ko' | 'vi') {
    setLang(newLang)
    localStorage.setItem('erp-lang', newLang)
  }

  const currentPrj = projects.find((p) => p.id === currentProject)

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Cai dat / 시스템 설정
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Cai dat he thong va thong tin ca nhan / 시스템 설정 및 개인 정보
        </p>
      </div>

      {/* ── Language Toggle ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            Ngon ngu / 언어 설정
          </h3>
        </div>
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => toggleLang('vi')}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                lang === 'vi'
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span className="text-xl">VN</span>
              <div className="text-left">
                <p className={`text-sm font-semibold ${lang === 'vi' ? 'text-blue-700' : 'text-gray-700'}`}>
                  Tieng Viet
                </p>
                <p className="text-xs text-gray-500">Vietnamese</p>
              </div>
            </button>
            <button
              onClick={() => toggleLang('ko')}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                lang === 'ko'
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span className="text-xl">KR</span>
              <div className="text-left">
                <p className={`text-sm font-semibold ${lang === 'ko' ? 'text-blue-700' : 'text-gray-700'}`}>
                  한국어
                </p>
                <p className="text-xs text-gray-500">Korean</p>
              </div>
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Ngon ngu hien tai / 현재 언어: {lang === 'vi' ? 'Tieng Viet' : '한국어'}
          </p>
        </div>
      </div>

      {/* ── User Profile ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            Thong tin ca nhan / 개인 정보
          </h3>
        </div>
        <div className="p-4 sm:p-6">
          {user ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold"
                  style={{ backgroundColor: ROLE_COLORS[user.role] ?? '#6B7280' }}
                >
                  {user.name?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{user.name}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    Chuc vu / 직급
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {ROLE_LABELS[user.role] ?? user.role}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    Ngay vao / 입사일
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {user.hire_date ?? '-'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    Thu viec den / 수습 종료일
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {user.probation_end_date ?? '-'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    ID
                  </p>
                  <p className="text-sm font-mono text-gray-600 truncate">
                    {user.id}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              Chua dang nhap / 로그인되지 않음
            </p>
          )}
        </div>
      </div>

      {/* ── Current Project ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            Cong trinh hien tai / 현재 현장
          </h3>
        </div>
        <div className="p-4 sm:p-6">
          {currentPrj ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 mb-1">
                  Ten / 현장명
                </p>
                <p className="text-sm font-semibold text-gray-900">{currentPrj.name}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 mb-1">
                  Ma / 코드
                </p>
                <p className="text-sm font-semibold text-gray-900">{currentPrj.code}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 mb-1">
                  Trang thai / 상태
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {currentPrj.status === 'active' ? 'Dang chay / 진행중' : currentPrj.status}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 mb-1">
                  Gia tri HD / 계약금액
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {currentPrj.contract_amount
                    ? `${currentPrj.contract_amount.toLocaleString('vi-VN')} VND`
                    : '-'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              Chua chon cong trinh / 현장 미선택
            </p>
          )}
        </div>
      </div>

      {/* ── App Version ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            Phien ban / 앱 버전
          </h3>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 mb-1">
                Phien ban / 버전
              </p>
              <p className="text-sm font-semibold text-gray-900">v0.1.0</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 mb-1">
                Framework
              </p>
              <p className="text-sm font-semibold text-gray-900">Next.js 16</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 mb-1">
                Database
              </p>
              <p className="text-sm font-semibold text-gray-900">Supabase</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Sinabro ERP - He thong quan ly cong trinh / 건설현장 관리 시스템
          </p>
        </div>
      </div>
    </div>
  )
}
