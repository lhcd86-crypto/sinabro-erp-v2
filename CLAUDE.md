@AGENTS.md

# 시나브로 ERP v2 개발 규칙

## 필수 체크리스트 (새 페이지/기능 추가 시)

### 1. DB 스키마 확인 (가장 중요!)
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name='테이블명' ORDER BY ordinal_position;
```
- `supabase/SCHEMA_REFERENCE.md` 참조
- 추정하지 말고 반드시 실제 컬럼명 확인
- 과거 47건 오류 중 60%가 컬럼명 불일치

### 2. FK 조인 사용 금지
```typescript
// ❌ 금지 — FK 관계 없으면 400 에러
.select('*, users:created_by(name)')

// ✅ 올바른 방법
.select('*')
// 프론트에서 별도 조회하거나 changed_by_name 등 비정규화 컬럼 사용
```

### 3. 라우팅 규칙
- `src/app/(dashboard)/xxx/page.tsx` → URL은 `/xxx` (NOT `/dashboard/xxx`)
- `(dashboard)`는 라우트 그룹 — URL 세그먼트에 포함 안 됨
- 알림 link, 리다이렉트 등에서 `/dashboard/` 접두사 쓰지 말 것

### 4. 사진/파일 URL
```typescript
// ❌ 상대경로 저장 금지
photo_url = 'equipment/xxx.jpg'

// ✅ 전체 URL 저장
const { data } = supabase.storage.from('report-photos').getPublicUrl(path)
photo_url = data.publicUrl  // https://...supabase.co/storage/v1/...
```

### 5. RLS 정책
- 새 테이블 추가 시 반드시 SELECT/INSERT/UPDATE/DELETE 4개 정책 생성
- 역할별 API 호출 테스트 필수 (CEO, Engineer, Driver 최소 3역할)

### 6. useCallback 순서
```typescript
// ❌ toast를 나중에 선언하면 ReferenceError
const loadData = useCallback(() => { toast('ok', '...') }, [toast]) // ← toast 아직 없음
const toast = useCallback(...)  // ← 너무 늦음

// ✅ toast를 먼저 선언
const toast = useCallback(...)
const loadData = useCallback(() => { toast('ok', '...') }, [toast])
```

### 7. 상태값 한글/영어
- DB status 값은 한글: '대기', '승인', '반려', '취소', '입금완료'
- 코드에서 'pending', 'approved' 등 영어 사용 시 DB와 불일치

## 주요 테이블 컬럼 (자주 틀리는 것)

| 테이블 | 주의 컬럼 |
|--------|----------|
| daily_reports | `report_date` (NOT date), `user_id` (NOT created_by), 개별 worker/qty 컬럼 |
| employee_attendance | `work_date`, `checkin_lat/lng` |
| equipment_items | `product_code` (NOT code), `registered_by` (NOT created_by) |
| vehicles | `plate_no` (NOT plate_number), `assigned_driver_id` |
| leave_balances | `total_days`, `used_days` (NOT total, used) |
| leave_requests | `leave_days` (NOT days), status='대기' (NOT pending) |
| prepayments | `recv_date` (NOT received_date), deducted |
| site_workers | `worker_name` (NOT name), `worker_type` |
| audit_logs | `changed_by`, `changed_by_name`, `changes` (NOT user_id, details) |
| notifications | `target_user_id` (NOT user_id), title, is_read, link |
| material_orders | `item_name`, `quantity` (NOT material_name, qty) |
| expenses | `item_name` 필수 (NOT NULL) |

## Supabase 접속 정보
- Project ref: `ltfjjwktqefchlshblve`
- CLI: `npx supabase db query --linked "SQL"`
