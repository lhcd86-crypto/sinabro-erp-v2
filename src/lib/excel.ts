/**
 * Excel/CSV export utilities.
 * Uses the xlsx library already installed in the project.
 */

interface ExportOptions {
  filename: string
  sheetName?: string
}

/**
 * Export an array of objects to Excel (.xlsx).
 * Columns are auto-detected from the first row's keys.
 */
export async function exportToExcel(
  data: Record<string, unknown>[],
  options: ExportOptions
): Promise<void> {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.json_to_sheet(data)

  // Auto-width columns
  const colWidths = Object.keys(data[0] ?? {}).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...data.map((row) => String(row[key] ?? '').length)
    )
    return { wch: Math.min(maxLen + 2, 40) }
  })
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, options.sheetName ?? 'Sheet1')
  XLSX.writeFile(wb, `${options.filename}.xlsx`)
}

/**
 * Export to CSV (lighter than full Excel).
 */
export function exportToCsv(
  data: Record<string, unknown>[],
  options: ExportOptions
): void {
  if (data.length === 0) return

  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = String(row[h] ?? '')
          // Escape commas and quotes
          return val.includes(',') || val.includes('"')
            ? `"${val.replace(/"/g, '""')}"`
            : val
        })
        .join(',')
    ),
  ]

  const blob = new Blob(['\uFEFF' + csvRows.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${options.filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Format number for VND display.
 */
export function fmtVND(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n)
}

/**
 * Prepare attendance data for export.
 */
export function formatAttendanceForExport(
  records: {
    user_name?: string
    check_in?: string
    check_out?: string
    work_hours?: number
    overtime_hours?: number
    date?: string
  }[]
): Record<string, unknown>[] {
  return records.map((r) => ({
    'Ngày / 날짜': r.date ?? '',
    'Tên / 이름': r.user_name ?? '',
    'Vào / 출근': r.check_in ?? '',
    'Ra / 퇴근': r.check_out ?? '',
    'Giờ LV / 근무시간': r.work_hours ?? 0,
    'Tăng ca / 연장': r.overtime_hours ?? 0,
  }))
}

/**
 * Prepare salary data for export.
 */
export function formatSalaryForExport(
  records: {
    user_name?: string
    base_salary?: number
    work_days?: number
    overtime_amount?: number
    deductions?: number
    net_salary?: number
    month?: string
  }[]
): Record<string, unknown>[] {
  return records.map((r) => ({
    'Tháng / 월': r.month ?? '',
    'Tên / 이름': r.user_name ?? '',
    'Lương cơ bản / 기본급': fmtVND(r.base_salary ?? 0),
    'Ngày LV / 근무일수': r.work_days ?? 0,
    'Tăng ca / 연장수당': fmtVND(r.overtime_amount ?? 0),
    'Khấu trừ / 공제': fmtVND(r.deductions ?? 0),
    'Thực nhận / 실수령': fmtVND(r.net_salary ?? 0),
  }))
}

/**
 * Prepare expense data for export.
 */
export function formatExpenseForExport(
  records: {
    expense_date?: string
    category?: string
    vendor?: string
    description?: string
    amount?: number
    vat?: number
    total?: number
    status?: string
  }[]
): Record<string, unknown>[] {
  return records.map((r) => ({
    'Ngày / 날짜': r.expense_date ?? '',
    'Phân loại / 분류': r.category ?? '',
    'NCC / 거래처': r.vendor ?? '',
    'Nội dung / 내용': r.description ?? '',
    'Số tiền / 금액': fmtVND(r.amount ?? 0),
    'VAT': fmtVND(r.vat ?? 0),
    'Tổng / 합계': fmtVND(r.total ?? 0),
    'Trạng thái / 상태': r.status ?? '',
  }))
}
