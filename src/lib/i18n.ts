'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'

export type Lang = 'ko' | 'vi'

export const translations: Record<string, { ko: string; vi: string }> = {
  // ── Common ──
  save: { ko: '저장', vi: 'Luu' },
  cancel: { ko: '취소', vi: 'Huy' },
  delete: { ko: '삭제', vi: 'Xoa' },
  edit: { ko: '수정', vi: 'Sua' },
  add: { ko: '추가', vi: 'Them' },
  search: { ko: '검색', vi: 'Tim kiem' },
  filter: { ko: '필터', vi: 'Loc' },
  loading: { ko: '로딩 중...', vi: 'Dang tai...' },
  no_data: { ko: '데이터 없음', vi: 'Khong co du lieu' },
  confirm: { ko: '확인', vi: 'Xac nhan' },
  close: { ko: '닫기', vi: 'Dong' },
  submit: { ko: '제출', vi: 'Gui' },
  reset: { ko: '초기화', vi: 'Dat lai' },
  back: { ko: '뒤로', vi: 'Quay lai' },
  next: { ko: '다음', vi: 'Tiep theo' },
  previous: { ko: '이전', vi: 'Truoc' },
  select: { ko: '선택', vi: 'Chon' },
  all: { ko: '전체', vi: 'Tat ca' },
  none: { ko: '없음', vi: 'Khong' },
  yes: { ko: '예', vi: 'Co' },
  no: { ko: '아니오', vi: 'Khong' },
  ok: { ko: '확인', vi: 'OK' },
  error: { ko: '오류', vi: 'Loi' },
  success: { ko: '성공', vi: 'Thanh cong' },
  warning: { ko: '경고', vi: 'Canh bao' },

  // ── Auth ──
  login: { ko: '로그인', vi: 'Dang nhap' },
  logout: { ko: '로그아웃', vi: 'Dang xuat' },
  password: { ko: '비밀번호', vi: 'Mat khau' },
  email: { ko: '이메일', vi: 'Email' },
  username: { ko: '사용자명', vi: 'Ten dang nhap' },

  // ── Attendance ──
  check_in: { ko: '출근', vi: 'Cham cong vao' },
  check_out: { ko: '퇴근', vi: 'Cham cong ra' },
  work_hours: { ko: '근무시간', vi: 'Gio lam' },
  overtime: { ko: '초과근무', vi: 'Tang ca' },
  absent: { ko: '결근', vi: 'Vang mat' },
  late: { ko: '지각', vi: 'Di muon' },
  attendance: { ko: '출석', vi: 'Cham cong' },
  leave_request: { ko: '휴가 신청', vi: 'Xin nghi phep' },

  // ── Report ──
  daily_report: { ko: '일일 보고', vi: 'Bao cao hang ngay' },
  confirmed: { ko: '확인됨', vi: 'Da xac nhan' },
  revision: { ko: '수정 요청', vi: 'Yeu cau sua doi' },
  report: { ko: '보고서', vi: 'Bao cao' },
  export: { ko: '내보내기', vi: 'Xuat' },
  print: { ko: '인쇄', vi: 'In' },

  // ── Finance ──
  amount: { ko: '금액', vi: 'So tien' },
  total: { ko: '합계', vi: 'Tong cong' },
  balance: { ko: '잔액', vi: 'So du' },
  paid: { ko: '지급됨', vi: 'Da thanh toan' },
  pending: { ko: '대기', vi: 'Cho xu ly' },
  approved: { ko: '승인됨', vi: 'Da duyet' },
  rejected: { ko: '거부됨', vi: 'Bi tu choi' },
  expense: { ko: '지출', vi: 'Chi phi' },
  income: { ko: '수입', vi: 'Thu nhap' },
  advance: { ko: '선급금', vi: 'Tam ung' },

  // ── Safety ──
  inspection: { ko: '점검', vi: 'Kiem tra' },
  checklist: { ko: '체크리스트', vi: 'Danh sach kiem tra' },
  pass: { ko: '합격', vi: 'Dat' },
  fail: { ko: '불합격', vi: 'Khong dat' },
  safety: { ko: '안전', vi: 'An toan' },
  incident: { ko: '사고', vi: 'Su co' },

  // ── Time ──
  today: { ko: '오늘', vi: 'Hom nay' },
  yesterday: { ko: '어제', vi: 'Hom qua' },
  this_month: { ko: '이번 달', vi: 'Thang nay' },
  this_year: { ko: '올해', vi: 'Nam nay' },
  date: { ko: '날짜', vi: 'Ngay' },
  time: { ko: '시간', vi: 'Thoi gian' },

  // ── Navigation ──
  home: { ko: '홈', vi: 'Trang chu' },
  dashboard: { ko: '대시보드', vi: 'Tong quan' },
  settings: { ko: '설정', vi: 'Cai dat' },
  more: { ko: '더보기', vi: 'Xem them' },
  profile: { ko: '프로필', vi: 'Ho so' },
  notifications: { ko: '알림', vi: 'Thong bao' },

  // ── Project / Workers ──
  project: { ko: '프로젝트', vi: 'Du an' },
  projects: { ko: '프로젝트 목록', vi: 'Danh sach du an' },
  worker: { ko: '근로자', vi: 'Cong nhan' },
  workers: { ko: '근로자 목록', vi: 'Danh sach cong nhan' },
  progress: { ko: '진행률', vi: 'Tien do' },
  status: { ko: '상태', vi: 'Trang thai' },
  name: { ko: '이름', vi: 'Ten' },
  category: { ko: '분류', vi: 'Phan loai' },
  description: { ko: '설명', vi: 'Mo ta' },

  // ── Dashboard specific ──
  monthly_attendance: { ko: '월별 출근 현황', vi: 'Cham cong theo thang' },
  expense_by_category: { ko: '분류별 지출', vi: 'Chi phi theo loai' },
  project_progress: { ko: '프로젝트 진행률', vi: 'Tien do du an' },
  select_project: { ko: '현장 선택', vi: 'Chon CT' },
  executive_summary: { ko: '경영진 종합 보고', vi: 'Bao cao tong hop cho lanh dao' },
  workers_today: { ko: '금일 출근', vi: 'CN hom nay' },
  monthly_expense: { ko: '월 지출', vi: 'Chi phi thang' },
  pending_approvals: { ko: '대기 승인', vi: 'Cho duyet' },
  project_status: { ko: '프로젝트 현황', vi: 'Tinh trang du an' },
  recent_activity: { ko: '최근 활동', vi: 'Hoat dong gan day' },
  no_activity: { ko: '활동 없음', vi: 'Khong co hoat dong' },
  no_access: { ko: '접근 권한이 없습니다', vi: 'Khong co quyen truy cap' },
  read_all: { ko: '모두 읽음', vi: 'Doc tat ca' },
  no_notifications: { ko: '알림 없음', vi: 'Khong co thong bao' },
}

const STORAGE_KEY = 'sinabro-erp-lang'

export interface I18nContextValue {
  t: (key: string) => string
  lang: Lang
  toggleLang: () => void
}

export const I18nContext = createContext<I18nContextValue>({
  t: (key: string) => key,
  lang: 'ko',
  toggleLang: () => {},
})

export function useI18n(): I18nContextValue {
  return useContext(I18nContext)
}

export function useI18nState(): I18nContextValue {
  const [lang, setLang] = useState<Lang>('ko')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null
    if (stored === 'ko' || stored === 'vi') {
      setLang(stored)
    }
  }, [])

  const toggleLang = useCallback(() => {
    setLang((prev) => {
      const next = prev === 'ko' ? 'vi' : 'ko'
      localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }, [])

  const t = useCallback(
    (key: string): string => {
      const entry = translations[key]
      if (!entry) return key
      return entry[lang]
    },
    [lang],
  )

  return { t, lang, toggleLang }
}
