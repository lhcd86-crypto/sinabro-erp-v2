'use client'

import { ReactNode } from 'react'

interface PrintZoneProps {
  title: string
  subtitle?: string
  children: ReactNode
  show: boolean
}

export default function PrintZone({ title, subtitle, children, show }: PrintZoneProps) {
  if (!show) return null

  return (
    <>
      {/* Print-only styles */}
      <style jsx global>{`
        @media print {
          body > *:not(.print-zone-root) {
            display: none !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print-zone-root {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            background: white;
            z-index: 99999;
          }
        }
      `}</style>

      <div className="print-zone-root">
        {/* Print header */}
        <div className="hidden print:block mb-6 border-b-2 border-gray-800 pb-4">
          <h1 className="text-lg font-bold text-gray-900">SINABRO VINA CO., LTD / 시나브로 비나</h1>
          <h2 className="text-base font-semibold text-gray-800 mt-1">{title}</h2>
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        </div>

        {/* Content */}
        {children}

        {/* Print footer */}
        <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500">
          <div className="flex justify-between">
            <span>SINABRO VINA CO., LTD</span>
            <span>In ngay / 출력일: {new Date().toLocaleDateString('vi-VN')}</span>
          </div>
        </div>
      </div>
    </>
  )
}

/** Small print trigger button */
export function PrintButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="print:hidden inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
      title="In / 인쇄"
    >
      <span>&#128424;</span>
      <span>In / 인쇄</span>
    </button>
  )
}
