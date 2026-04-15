#!/bin/bash
# ============================================================
# 시나브로 ERP v2 — 전체 자동 검증 스크립트
# 사용: bash scripts/full-verify.sh
# ============================================================

APIKEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0Zmpqd2t0cWVmY2hsc2hibHZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzOTU1NjEsImV4cCI6MjA4OTk3MTU2MX0.z45lBB8DVolT8CEmcSwuSwz7m_Bb4rMM75PtyivIbZs"
BASE="https://ltfjjwktqefchlshblve.supabase.co/rest/v1"
APP="https://sinabro-erp-v2.vercel.app"
PASS=0; FAIL=0; WARN=0

ok()   { PASS=$((PASS+1)); printf "  ✓ %s\n" "$1"; }
fail() { FAIL=$((FAIL+1)); printf "  ✗ %s\n" "$1"; }
warn() { WARN=$((WARN+1)); printf "  ⚠ %s\n" "$1"; }

get_token() {
  curl -s -X POST "https://ltfjjwktqefchlshblve.supabase.co/auth/v1/token?grant_type=password" \
    -H "apikey: $APIKEY" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"sinabro1234\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null
}

api_code() {
  curl -s -o /dev/null -w "%{http_code}" "$BASE/$1" \
    -H "apikey: $APIKEY" -H "Authorization: Bearer $2" --max-time 8
}

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  시나브로 ERP v2 — 전체 자동 검증 (16항목)               ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# ── A. 코드 품질 ──
echo "━━ A. 코드 품질 (배포 전) ━━"

# A1. 빌드
echo -n "  A1. 빌드... "
build_out=$(node node_modules/next/dist/bin/next build 2>&1)
if echo "$build_out" | grep -q "Compiled successfully"; then
  ok "A1 빌드 성공"
else
  fail "A1 빌드 실패"
fi

# A2. 미사용 import 경고
unused=$(echo "$build_out" | grep -c "warning" 2>/dev/null || echo 0)
[ "$unused" -le 5 ] && ok "A2 경고 ${unused}건 (허용)" || warn "A2 경고 ${unused}건"

# A3. currentProject.id 사용
cpid=$(grep -rn "currentProject\.id" src/ 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
[ "$cpid" -eq 0 ] && ok "A3 currentProject.id 없음" || fail "A3 currentProject.id ${cpid}건 발견"

# A4. 영어 상태값 ('pending' 등)
eng_status=$(grep -rn "status.*'pending'\|status.*'approved'\|status.*'rejected'" src/ 2>/dev/null | grep -v node_modules | grep -v "CLAUDE\|SCHEMA\|verify\|billing_status\|README" | wc -l | tr -d ' ')
[ "$eng_status" -le 3 ] && ok "A4 영어 상태값 ${eng_status}건 (허용)" || warn "A4 영어 상태값 ${eng_status}건"

# A5. useCallback 순서 (toast 참조 전 선언)
toast_issues=0
for f in src/app/\(dashboard\)/*/page.tsx; do
  if [ -f "$f" ]; then
    first_toast_use=$(grep -n "toast(" "$f" 2>/dev/null | head -1 | cut -d: -f1)
    toast_def=$(grep -n "const toast = useCallback" "$f" 2>/dev/null | head -1 | cut -d: -f1)
    if [ -n "$first_toast_use" ] && [ -n "$toast_def" ] && [ "$first_toast_use" -lt "$toast_def" ] 2>/dev/null; then
      toast_issues=$((toast_issues+1))
    fi
  fi
done
[ "$toast_issues" -eq 0 ] && ok "A5 toast 순서 정상" || fail "A5 toast 순서 문제 ${toast_issues}건"

echo ""

# ── B. DB 무결성 ──
echo "━━ B. DB 무결성 ━━"

CEO_T=$(get_token "hun.sinabro@gmail.com")

# B6. RLS 완전성
export SUPABASE_ACCESS_TOKEN="sbp_068b3d9f454bcf61cf889bf16c3b35132214b024"
npx supabase link --project-ref ltfjjwktqefchlshblve 2>&1 > /dev/null

rls_missing=$(npx supabase db query --linked "
SELECT COUNT(*) as c FROM (
  SELECT t.tablename FROM pg_tables t
  WHERE t.schemaname='public'
    AND EXISTS (SELECT 1 FROM pg_class c WHERE c.relname=t.tablename AND c.relrowsecurity=true)
    AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=t.tablename AND p.cmd='SELECT')
) x;
" 2>&1 | grep -oE '"c":"[0-9]+"' | grep -oE '[0-9]+')
[ "${rls_missing:-0}" -eq 0 ] && ok "B6 RLS SELECT 정책 완전" || fail "B6 RLS SELECT 누락 ${rls_missing}건"

# B7. 고아 데이터 (간략)
orphan=$(npx supabase db query --linked "
SELECT COUNT(*) as c FROM employee_attendance ea
WHERE ea.project_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id=ea.project_id)
LIMIT 1;
" 2>&1 | grep -oE '"c":"[0-9]+"' | grep -oE '[0-9]+')
[ "${orphan:-0}" -eq 0 ] && ok "B7 고아 데이터 없음" || warn "B7 고아 데이터 ${orphan}건"

# B8. 트리거 작동
npx supabase db query --linked "
INSERT INTO expenses (id,project_id,category,item_name,total_amount,expense_date,status,submitted_by)
VALUES ('00000000-0000-0000-0000-000000000f01','7ab80f50-973c-4251-952e-659ebc53e065','test','VERIFY',1,'2099-01-01','draft','940bb795-c0a6-42cc-9eda-6de707bca2c7');
" 2>&1 > /dev/null
audit_c=$(npx supabase db query --linked "SELECT COUNT(*) as c FROM audit_logs WHERE record_id='00000000-0000-0000-0000-000000000f01';" 2>&1 | grep -oE '"c":"[0-9]+"' | grep -oE '[0-9]+')
npx supabase db query --linked "DELETE FROM expenses WHERE id='00000000-0000-0000-0000-000000000f01'; DELETE FROM audit_logs WHERE record_id='00000000-0000-0000-0000-000000000f01';" 2>&1 > /dev/null
[ "${audit_c:-0}" -ge 1 ] && ok "B8 감사 트리거 작동" || fail "B8 감사 트리거 미작동"

# B9. MV 최신성
mv_ok=$(npx supabase db query --linked "SELECT refresh_all_mv(); SELECT 'ok' as r;" 2>&1)
echo "$mv_ok" | grep -q "error\|ERROR" && fail "B9 MV 새로고침 실패" || ok "B9 MV 새로고침 성공"

echo ""

# ── C. API 무결성 ──
echo "━━ C. API 무결성 ━━"

ENG_T=$(get_token "test1.sinabro@gmail.com")
DRV_T=$(get_token "test5.sinabro@gmail.com")

# C10. 역할별 접근 매트릭스 (핵심 6건)
tests_pass=0; tests_total=0
check_access() {
  local token="$1" table="$2" expect="$3" desc="$4"
  tests_total=$((tests_total+1))
  local c=$(api_code "${table}?select=id&limit=1" "$token")
  if [ "$expect" = "ok" ]; then
    [ "$c" = "200" ] && tests_pass=$((tests_pass+1))
  else
    [ "$c" != "200" ] || [ "$(curl -s "$BASE/${table}?select=id&limit=1" -H "apikey: $APIKEY" -H "Authorization: Bearer $token" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)" = "0" ] && tests_pass=$((tests_pass+1))
  fi
}
check_access "$CEO_T" "salary_settings" "ok" "CEO→salary"
check_access "$ENG_T" "salary_settings" "block" "ENG→salary"
check_access "$CEO_T" "audit_logs" "ok" "CEO→audit"
check_access "$DRV_T" "audit_logs" "block" "DRV→audit"
check_access "$CEO_T" "billings" "ok" "CEO→billing"
check_access "$DRV_T" "billings" "block" "DRV→billing"
[ "$tests_pass" -ge 5 ] && ok "C10 역할 접근 ${tests_pass}/${tests_total}" || fail "C10 역할 접근 ${tests_pass}/${tests_total}"

# C11. 페이지 로드
page_pass=0; page_total=0
for p in / /login /home /attendance /report /salary /leave /advance /expense /billing /equipment /material /safety /schedule /dashboard /multi-site /settings /gallery /defects /quantities /costana /staff /roll_call /tbm /gongmu /chongmu /accounting /quality /history; do
  page_total=$((page_total+1))
  c=$(curl -s -o /dev/null -w "%{http_code}" "${APP}${p}" --max-time 8)
  [ "$c" = "200" ] && page_pass=$((page_pass+1))
done
[ "$page_pass" -ge $((page_total-2)) ] && ok "C11 페이지 ${page_pass}/${page_total} HTTP 200" || fail "C11 페이지 ${page_pass}/${page_total}"

# C12. 상태 전이
transition=$(npx supabase db query --linked "
INSERT INTO expenses (id,project_id,category,item_name,total_amount,expense_date,status,submitted_by)
VALUES ('00000000-0000-0000-0000-000000000f02','7ab80f50-973c-4251-952e-659ebc53e065','t','TR',1,'2099-01-01','draft','940bb795-c0a6-42cc-9eda-6de707bca2c7');
UPDATE expenses SET status='paid' WHERE id='00000000-0000-0000-0000-000000000f02';
" 2>&1)
echo "$transition" | grep -q "상태 전이" && ok "C12 상태전이 차단 (draft→paid)" || fail "C12 상태전이 미차단"
npx supabase db query --linked "DELETE FROM expenses WHERE id='00000000-0000-0000-0000-000000000f02'; DELETE FROM audit_logs WHERE record_id='00000000-0000-0000-0000-000000000f02';" 2>&1 > /dev/null

# C13. 마감 보호
close_test=$(npx supabase db query --linked "
INSERT INTO monthly_closes (project_id,month,closed_by) VALUES ('7ab80f50-973c-4251-952e-659ebc53e065','2098-06','940bb795-c0a6-42cc-9eda-6de707bca2c7');
INSERT INTO employee_attendance (id,user_id,project_id,work_date,check_in) VALUES ('00000000-0000-0000-0000-000000000f03','940bb795-c0a6-42cc-9eda-6de707bca2c7','7ab80f50-973c-4251-952e-659ebc53e065','2098-06-15','2098-06-15T08:00:00Z');
UPDATE employee_attendance SET memo='hack' WHERE id='00000000-0000-0000-0000-000000000f03';
" 2>&1)
echo "$close_test" | grep -q "마감" && ok "C13 마감 보호 작동" || fail "C13 마감 미차단"
npx supabase db query --linked "DELETE FROM monthly_closes WHERE month='2098-06'; DELETE FROM employee_attendance WHERE id='00000000-0000-0000-0000-000000000f03';" 2>&1 > /dev/null

echo ""

# ── D. 운영 안전 ──
echo "━━ D. 운영 안전 ━━"

# D14. 백업
backup_count=$(ls /Users/ihun/erp-backups/*.dump 2>/dev/null | wc -l | tr -d ' ')
[ "$backup_count" -ge 1 ] && ok "D14 백업 ${backup_count}개" || fail "D14 백업 없음"

latest_backup=$(ls -t /Users/ihun/erp-backups/*.dump 2>/dev/null | head -1)
if [ -n "$latest_backup" ]; then
  age_hours=$(( ($(date +%s) - $(stat -f%m "$latest_backup" 2>/dev/null || stat -c%Y "$latest_backup" 2>/dev/null)) / 3600 ))
  [ "$age_hours" -le 48 ] && ok "D14b 최신 백업 ${age_hours}시간 전" || warn "D14b 백업 ${age_hours}시간 경과"
fi

# D15. Vercel
vercel_code=$(curl -s -o /dev/null -w "%{http_code}" "$APP/login" --max-time 10)
[ "$vercel_code" = "200" ] && ok "D15 Vercel 프로덕션 200" || fail "D15 Vercel $vercel_code"

# D16. SSL
ssl_ok=$(curl -sI "$APP" 2>&1 | grep -c "HTTP/2")
[ "$ssl_ok" -ge 1 ] && ok "D16 HTTPS/SSL 정상" || warn "D16 SSL 확인 필요"

# FK 조인 검사 (보너스)
fk=$(grep -rn "select.*users:\|select.*projects:\|select.*approver:" src/ 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
[ "$fk" -eq 0 ] && ok "B+ FK 조인 0건" || warn "B+ FK 조인 ${fk}건"

# /dashboard/ 경로 (보너스)
dash=$(grep -rn "'/dashboard/" src/ 2>/dev/null | grep -v "node_modules\|CLAUDE\|SCHEMA\|verify\|README" | wc -l | tr -d ' ')
[ "$dash" -eq 0 ] && ok "B+ /dashboard/ 경로 0건" || warn "B+ /dashboard/ ${dash}건"

echo ""
echo "═══════════════════════════════════════════════════════════"
printf "  PASS: %d  |  FAIL: %d  |  WARN: %d\n" $PASS $FAIL $WARN
TOTAL=$((PASS+FAIL))
if [ "$FAIL" -eq 0 ]; then
  echo "  GRADE: A+"
elif [ "$FAIL" -le 2 ]; then
  echo "  GRADE: A"
elif [ "$FAIL" -le 5 ]; then
  echo "  GRADE: B"
else
  echo "  GRADE: C"
fi
echo "═══════════════════════════════════════════════════════════"
