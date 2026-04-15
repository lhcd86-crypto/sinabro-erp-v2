#!/bin/bash
# DB 스키마 vs 코드 자동 검증 스크립트
# 사용: bash scripts/verify-schema.sh

echo "=== 코드-DB 컬럼 일치 검증 ==="

APIKEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0Zmpqd2t0cWVmY2hsc2hibHZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzOTU1NjEsImV4cCI6MjA4OTk3MTU2MX0.z45lBB8DVolT8CEmcSwuSwz7m_Bb4rMM75PtyivIbZs"
TOKEN=$(curl -s -X POST "https://ltfjjwktqefchlshblve.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: $APIKEY" -H "Content-Type: application/json" \
  -d '{"email":"hun.sinabro@gmail.com","password":"sinabro1234"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

pass=0; fail=0
tables=(
  "employee_attendance:id,user_id,work_date,check_in"
  "daily_reports:id,report_date,user_id,work_type"
  "expenses:id,category,item_name,total_amount,status"
  "billings:id,billing_date,claim_amount,status"
  "leave_requests:id,user_id,leave_type,start_date,leave_days"
  "leave_balances:id,user_id,total_days,used_days"
  "equipment_items:id,name,category,status,photo_url"
  "vehicles:id,plate_no,assigned_driver_id,status"
  "site_workers:id,worker_name,worker_type"
  "prepayments:id,recv_date,amount,deducted"
  "audit_logs:id,changed_by,changed_by_name,action"
  "notifications:id,target_user_id,title,is_read"
  "material_orders:id,item_name,quantity,status"
  "advance_requests:id,amount,needed_date,status"
)

for entry in "${tables[@]}"; do
  table="${entry%%:*}"
  cols="${entry#*:}"
  code=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://ltfjjwktqefchlshblve.supabase.co/rest/v1/${table}?select=${cols}&limit=1" \
    -H "apikey: $APIKEY" -H "Authorization: Bearer $TOKEN" --max-time 5)
  if [ "$code" = "200" ]; then
    printf "  ✓ %-25s %s\n" "$table" "OK"
    pass=$((pass+1))
  else
    printf "  ✗ %-25s HTTP %s\n" "$table" "$code"
    fail=$((fail+1))
  fi
done

echo ""
echo "결과: $pass/$((pass+fail)) PASS, $fail FAIL"

echo ""
echo "=== FK 조인 사용 검사 ==="
fk_count=$(grep -rn "select.*users:\|select.*projects:\|select.*approver:" src/ 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
if [ "$fk_count" -gt 0 ]; then
  echo "  ⚠ FK 조인 $fk_count건:"
  grep -rn "select.*users:\|select.*projects:\|select.*approver:" src/ 2>/dev/null | grep -v node_modules
else
  echo "  ✓ FK 조인 없음"
fi

echo ""
echo "=== /dashboard/ 경로 검사 ==="
dash_count=$(grep -rn "'/dashboard/" src/ 2>/dev/null | grep -v "node_modules\|CLAUDE.md" | wc -l | tr -d ' ')
if [ "$dash_count" -gt 0 ]; then
  echo "  ⚠ /dashboard/ 경로 $dash_count건"
else
  echo "  ✓ 없음"
fi

echo ""
echo "=== 상대경로 사진 URL 검사 ==="
rel_photo=$(grep -rn "photo_url.*=.*'" src/ 2>/dev/null | grep -v "http\|supabase\|null\|node_modules\|CLAUDE" | wc -l | tr -d ' ')
echo "  의심 건수: $rel_photo"
