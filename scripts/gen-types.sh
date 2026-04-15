#!/bin/bash
# DB 스키마에서 TypeScript 타입 자동 생성
# 사용: bash scripts/gen-types.sh
# DB 변경 후 반드시 실행!

echo "Generating TypeScript types from Supabase..."
npx supabase gen types typescript --linked > src/types/database.ts 2>/dev/null

lines=$(wc -l < src/types/database.ts)
echo "Done: src/types/database.ts ($lines lines)"
echo ""
echo "이제 잘못된 컬럼명을 쓰면 빌드 시 TypeScript 에러가 발생합니다."
echo "예: supabase.from('billings').select('amount')  ← 에러! claim_amount여야 함"
