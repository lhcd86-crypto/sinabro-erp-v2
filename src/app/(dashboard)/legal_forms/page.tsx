'use client'

import { useState } from 'react'

/* -- Types ------------------------------------------------- */

interface FormItem {
  name_kr: string
  name_vn: string
  description: string
}

interface FormCategory {
  key: string
  label: string
  icon: string
  color: string
  items: FormItem[]
}

/* -- Constants --------------------------------------------- */

const CATEGORIES: FormCategory[] = [
  {
    key: 'safety',
    label: 'An toan / 안전',
    icon: '\u{1F6E1}',
    color: 'bg-red-50 border-red-200 text-red-700',
    items: [
      {
        name_kr: 'TBM 기록지',
        name_vn: 'Bien ban TBM',
        description: 'Noi dung TBM hang ngay / 매일 작업 전 안전교육 기록',
      },
      {
        name_kr: '안전점검표',
        name_vn: 'Phieu kiem tra an toan',
        description: 'Kiem tra an toan dinh ky / 정기 안전점검 체크리스트',
      },
      {
        name_kr: '작업허가서',
        name_vn: 'Giay phep lam viec',
        description: 'Giay phep cong viec nguy hiem / 위험작업 허가서 (고소, 밀폐, 화기 등)',
      },
      {
        name_kr: '위험성평가표',
        name_vn: 'Bang danh gia rui ro',
        description: 'Danh gia rui ro truoc khi thi cong / 작업 전 위험성 평가 기록',
      },
    ],
  },
  {
    key: 'quality',
    label: 'Chat luong / 품질',
    icon: '\u{2705}',
    color: 'bg-green-50 border-green-200 text-green-700',
    items: [
      {
        name_kr: '품질검사표',
        name_vn: 'Phieu kiem tra chat luong',
        description: 'Kiem tra chat luong thi cong / 시공 품질검사 체크리스트',
      },
      {
        name_kr: '시험성적서',
        name_vn: 'Ket qua thu nghiem',
        description: 'Ket qua thu nghiem vat lieu / 자재 시험 결과 성적서',
      },
      {
        name_kr: '자재검수기록',
        name_vn: 'Bien ban nghiem thu vat tu',
        description: 'Kiem tra vat tu nhap kho / 입고 자재 검수 기록',
      },
    ],
  },
  {
    key: 'labor',
    label: 'Lao dong / 노무',
    icon: '\u{1F465}',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    items: [
      {
        name_kr: '근로계약서',
        name_vn: 'Hop dong lao dong',
        description: 'Hop dong lao dong voi cong nhan / 근로자 고용 계약서',
      },
      {
        name_kr: '출퇴근기록부',
        name_vn: 'Bang cham cong',
        description: 'Ghi nhan gio lam viec / 근로자 출퇴근 시간 기록',
      },
      {
        name_kr: '급여명세서',
        name_vn: 'Phieu luong',
        description: 'Chi tiet luong hang thang / 월별 급여 상세 내역',
      },
    ],
  },
  {
    key: 'environment',
    label: 'Moi truong / 환경',
    icon: '\u{1F33F}',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    items: [
      {
        name_kr: '폐기물관리대장',
        name_vn: 'So quan ly chat thai',
        description: 'Theo doi xu ly chat thai xay dung / 건설 폐기물 처리 관리대장',
      },
      {
        name_kr: '환경점검표',
        name_vn: 'Phieu kiem tra moi truong',
        description: 'Kiem tra moi truong dinh ky / 정기 환경 점검 체크리스트',
      },
    ],
  },
]

/* -- Component --------------------------------------------- */

export default function LegalFormsPage() {
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const filtered =
    activeCategory === 'all'
      ? CATEGORIES
      : CATEGORIES.filter((c) => c.key === activeCategory)

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bieu mau phap ly / 법정서식
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Cac bieu mau bat buoc cho cong trinh / 건설현장 법정 필수 서식 모음
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeCategory === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Tat ca / 전체
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeCategory === cat.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {CATEGORIES.map((cat) => (
          <div
            key={cat.key}
            className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setActiveCategory(cat.key)}
          >
            <div className="text-2xl mb-2">{cat.icon}</div>
            <p className="text-xs font-medium text-gray-500">{cat.label}</p>
            <p className="mt-1 text-lg font-bold text-gray-900">{cat.items.length}</p>
            <p className="text-xs text-gray-400">bieu mau / 서식</p>
          </div>
        ))}
      </div>

      {/* Form Lists by Category */}
      {filtered.map((cat) => (
        <div key={cat.key} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
            <span className="text-lg">{cat.icon}</span>
            <h3 className="text-sm font-semibold text-gray-900">{cat.label}</h3>
            <span className="ml-auto text-xs text-gray-500">{cat.items.length} bieu mau / 서식</span>
          </div>
          <div className="divide-y divide-gray-100">
            {cat.items.map((item, idx) => (
              <div
                key={idx}
                className="px-4 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-gray-50 transition-colors"
              >
                <div className={`w-10 h-10 rounded-lg border flex items-center justify-center text-sm font-bold shrink-0 ${cat.color}`}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {item.name_kr}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.name_vn}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {item.description}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                    Xem / 보기
                  </button>
                  <button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors">
                    Tai xuong / 다운로드
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
