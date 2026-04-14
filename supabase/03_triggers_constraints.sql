-- ============================================================
-- 시나브로 ERP v2 — 트리거 + 제약조건 + MV + 함수
-- SQL-1 ~ SQL-10 통합
-- ============================================================


-- ════════════════════════════════════════════════════
-- SQL-1: 감사 로그 자동 트리거
-- 주요 테이블 INSERT/UPDATE/DELETE 시 audit_logs 자동 기록
-- ════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  u_name TEXT;
BEGIN
  SELECT name INTO u_name FROM public.users WHERE id = auth.uid();

  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (id, table_name, record_id, action, changes, prev_values, changed_by, changed_by_name)
    VALUES (gen_random_uuid(), TG_TABLE_NAME, OLD.id::text, 'DELETE', NULL, to_jsonb(OLD), auth.uid(), u_name);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (id, table_name, record_id, action, changes, prev_values, changed_by, changed_by_name)
    VALUES (gen_random_uuid(), TG_TABLE_NAME, NEW.id::text, 'UPDATE', to_jsonb(NEW), to_jsonb(OLD), auth.uid(), u_name);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (id, table_name, record_id, action, changes, prev_values, changed_by, changed_by_name)
    VALUES (gen_random_uuid(), TG_TABLE_NAME, NEW.id::text, 'INSERT', to_jsonb(NEW), NULL, auth.uid(), u_name);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- 주요 테이블에 감사 트리거 부착
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'expenses', 'billings', 'advances', 'advance_requests',
    'salary_monthly', 'leave_requests', 'daily_reports',
    'prepayments', 'subcontract_payments', 'additional_works',
    'equipment', 'safety_inspections', 'quality_inspections'
  ] LOOP
    BEGIN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%s ON %I', t, t);
      EXECUTE format(
        'CREATE TRIGGER trg_audit_%s AFTER INSERT OR UPDATE OR DELETE ON %I
         FOR EACH ROW EXECUTE FUNCTION fn_audit_log()',
        t, t
      );
    EXCEPTION WHEN undefined_table THEN NULL;
    END;
  END LOOP;
END $$;


-- ════════════════════════════════════════════════════
-- SQL-2: 알림 자동 생성 트리거
-- 신청 시 승인자에게 notifications 자동 INSERT
-- ════════════════════════════════════════════════════

-- 전도금 신청 → HR/회계에게 알림
CREATE OR REPLACE FUNCTION fn_notify_advance_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  req_name TEXT;
  target RECORD;
BEGIN
  SELECT name INTO req_name FROM public.users WHERE id = NEW.user_id;

  FOR target IN
    SELECT id FROM public.users WHERE role IN ('hr', 'account', 'ceo', 'director_m')
  LOOP
    INSERT INTO notifications (id, user_id, title, message, type, is_read, link)
    VALUES (
      gen_random_uuid(), target.id,
      'Yêu cầu tạm ứng mới / 전도금 신청',
      COALESCE(req_name, '—') || ' đã yêu cầu tạm ứng / 전도금을 신청했습니다',
      'info', false, '/dashboard/chongmu'
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_advance ON advance_requests;
CREATE TRIGGER trg_notify_advance
  AFTER INSERT ON advance_requests
  FOR EACH ROW EXECUTE FUNCTION fn_notify_advance_request();

-- 휴가 신청 → HR에게 알림
CREATE OR REPLACE FUNCTION fn_notify_leave_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  req_name TEXT;
  target RECORD;
BEGIN
  SELECT name INTO req_name FROM public.users WHERE id = NEW.user_id;

  FOR target IN
    SELECT id FROM public.users WHERE role IN ('hr', 'ceo', 'director_m')
  LOOP
    INSERT INTO notifications (id, user_id, title, message, type, is_read, link)
    VALUES (
      gen_random_uuid(), target.id,
      'Đơn nghỉ phép mới / 휴가 신청',
      COALESCE(req_name, '—') || ' đã nộp đơn nghỉ phép / 휴가를 신청했습니다',
      'info', false, '/dashboard/leave-mgmt'
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_leave ON leave_requests;
CREATE TRIGGER trg_notify_leave
  AFTER INSERT ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION fn_notify_leave_request();

-- 일보 제출 → QS에게 알림
CREATE OR REPLACE FUNCTION fn_notify_daily_report()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  req_name TEXT;
  target RECORD;
BEGIN
  SELECT name INTO req_name FROM public.users WHERE id = NEW.created_by;

  FOR target IN
    SELECT id FROM public.users WHERE role IN ('qs', 'ceo', 'director_f')
  LOOP
    INSERT INTO notifications (id, user_id, title, message, type, is_read, link)
    VALUES (
      gen_random_uuid(), target.id,
      'Nhật ký mới / 일보 제출',
      COALESCE(req_name, '—') || ' đã nộp nhật ký ngày ' || NEW.date || ' / 일보를 제출했습니다',
      'info', false, '/dashboard/gongmu'
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_report ON daily_reports;
CREATE TRIGGER trg_notify_report
  AFTER INSERT ON daily_reports
  FOR EACH ROW EXECUTE FUNCTION fn_notify_daily_report();

-- 비용 승인 요청 → CEO에게 알림
CREATE OR REPLACE FUNCTION fn_notify_expense_approved()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  target RECORD;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    FOR target IN
      SELECT id FROM public.users WHERE role = 'ceo'
    LOOP
      INSERT INTO notifications (id, user_id, title, message, type, is_read, link)
      VALUES (
        gen_random_uuid(), target.id,
        'Chi phí chờ duyệt / 비용 지급 대기',
        '비용 ' || COALESCE(NEW.description, '') || ' 승인 완료 — 지급 결의 필요',
        'warning', false, '/dashboard/ceo_paid'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_expense_approved ON expenses;
CREATE TRIGGER trg_notify_expense_approved
  AFTER UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION fn_notify_expense_approved();


-- ════════════════════════════════════════════════════
-- SQL-3: 재고 자동 갱신 트리거
-- material_transactions INSERT 시 material_items.stock_qty 증감
-- ════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_update_stock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.transaction_type = 'in' THEN
    UPDATE material_items
    SET stock_qty = stock_qty + COALESCE(NEW.quantity, 0)
    WHERE id = NEW.material_id;
  ELSIF NEW.transaction_type = 'out' THEN
    UPDATE material_items
    SET stock_qty = GREATEST(0, stock_qty - COALESCE(NEW.quantity, 0))
    WHERE id = NEW.material_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_stock ON material_transactions;
CREATE TRIGGER trg_update_stock
  AFTER INSERT ON material_transactions
  FOR EACH ROW EXECUTE FUNCTION fn_update_stock();


-- ════════════════════════════════════════════════════
-- SQL-4: 출퇴근 자동 계산 트리거
-- check_out UPDATE 시 work_hours, overtime, is_night, is_weekend 자동 계산
-- ════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_calc_attendance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  hrs NUMERIC;
  dow INT;
BEGIN
  -- check_out이 새로 설정된 경우만
  IF NEW.check_out IS NOT NULL AND (OLD.check_out IS NULL OR OLD.check_out IS DISTINCT FROM NEW.check_out) THEN
    IF NEW.check_in IS NOT NULL THEN
      hrs := ROUND(EXTRACT(EPOCH FROM (NEW.check_out::timestamptz - NEW.check_in::timestamptz)) / 3600.0, 2);
      NEW.work_hours := GREATEST(0, hrs);
      NEW.overtime_hours := GREATEST(0, hrs - 8);

      -- 야간 판정: 22시 이후 또는 6시 이전 퇴근
      NEW.is_night := EXTRACT(HOUR FROM NEW.check_out::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh') >= 22
                    OR EXTRACT(HOUR FROM NEW.check_out::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh') < 6;

      -- 주말 판정
      dow := EXTRACT(DOW FROM NEW.work_date);
      NEW.is_weekend := (dow = 0 OR dow = 6);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calc_attendance ON employee_attendance;
CREATE TRIGGER trg_calc_attendance
  BEFORE UPDATE ON employee_attendance
  FOR EACH ROW EXECUTE FUNCTION fn_calc_attendance();


-- ════════════════════════════════════════════════════
-- SQL-5: 중복 방지 제약조건
-- ════════════════════════════════════════════════════

-- 같은 날 같은 사용자 급여 중복 방지
DO $$ BEGIN
  ALTER TABLE salary_monthly ADD CONSTRAINT uq_salary_user_month
    UNIQUE (user_id, month);
EXCEPTION WHEN duplicate_table THEN NULL;
          WHEN duplicate_object THEN NULL;
END $$;

-- 같은 날 같은 사용자 휴가 중복 방지 (기존 중복 제거 후)
DO $$ BEGIN
  -- 기존 중복 데이터 정리 (최신 것만 유지)
  DELETE FROM leave_requests a USING leave_requests b
  WHERE a.id < b.id
    AND a.user_id = b.user_id
    AND a.start_date = b.start_date
    AND a.leave_type = b.leave_type;

  ALTER TABLE leave_requests ADD CONSTRAINT uq_leave_user_date
    UNIQUE (user_id, start_date, leave_type);
EXCEPTION WHEN duplicate_table THEN NULL;
          WHEN duplicate_object THEN NULL;
END $$;

-- 공지사항 읽음 중복 방지
DO $$ BEGIN
  ALTER TABLE announcement_reads ADD CONSTRAINT uq_announcement_read
    UNIQUE (announcement_id, user_id);
EXCEPTION WHEN duplicate_table THEN NULL;
          WHEN duplicate_object THEN NULL;
END $$;

-- 월마감 중복 방지
DO $$ BEGIN
  ALTER TABLE monthly_closes ADD CONSTRAINT uq_monthly_close
    UNIQUE (project_id, month);
EXCEPTION WHEN duplicate_table THEN NULL;
          WHEN duplicate_object THEN NULL;
END $$;


-- ════════════════════════════════════════════════════
-- SQL-6: 상태 전이 제약 (역행 방지)
-- ════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_check_expense_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  valid_transitions JSONB := '{
    "draft": ["submitted", "cancelled"],
    "submitted": ["reviewed", "rejected", "draft"],
    "reviewed": ["approved", "rejected"],
    "approved": ["paid", "reviewed"],
    "paid": [],
    "rejected": ["draft"],
    "cancelled": []
  }'::jsonb;
  allowed JSONB;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  allowed := valid_transitions -> OLD.status;
  IF allowed IS NULL OR NOT (allowed ? NEW.status) THEN
    RAISE EXCEPTION '상태 전이 불가: % → % / Không thể chuyển trạng thái', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_expense_status ON expenses;
CREATE TRIGGER trg_expense_status
  BEFORE UPDATE OF status ON expenses
  FOR EACH ROW EXECUTE FUNCTION fn_check_expense_status();

-- 기성 상태 전이
CREATE OR REPLACE FUNCTION fn_check_billing_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  valid_transitions JSONB := '{
    "draft": ["submitted", "cancelled"],
    "submitted": ["reviewed", "rejected", "draft"],
    "reviewed": ["approved", "rejected"],
    "approved": ["invoiced", "reviewed"],
    "invoiced": ["paid"],
    "paid": [],
    "rejected": ["draft"],
    "cancelled": []
  }'::jsonb;
  allowed JSONB;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  allowed := valid_transitions -> OLD.status;
  IF allowed IS NULL OR NOT (allowed ? NEW.status) THEN
    RAISE EXCEPTION '상태 전이 불가: % → % / Không thể chuyển trạng thái', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_billing_status ON billings;
CREATE TRIGGER trg_billing_status
  BEFORE UPDATE OF status ON billings
  FOR EACH ROW EXECUTE FUNCTION fn_check_billing_status();


-- ════════════════════════════════════════════════════
-- SQL-7: 마감 후 수정 방지
-- monthly_closes에 기록된 월의 데이터 수정 차단
-- ════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_block_closed_month()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  rec_month TEXT;
  is_closed BOOLEAN;
BEGIN
  -- 테이블별 월 추출
  IF TG_TABLE_NAME = 'daily_reports' THEN
    rec_month := to_char(COALESCE(NEW.date, OLD.date)::date, 'YYYY-MM');
  ELSIF TG_TABLE_NAME = 'employee_attendance' THEN
    rec_month := to_char(COALESCE(NEW.work_date, OLD.work_date)::date, 'YYYY-MM');
  ELSIF TG_TABLE_NAME = 'expenses' THEN
    rec_month := to_char(COALESCE(NEW.expense_date, OLD.expense_date)::date, 'YYYY-MM');
  ELSIF TG_TABLE_NAME = 'salary_monthly' THEN
    rec_month := COALESCE(NEW.month, OLD.month);
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM monthly_closes
    WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
      AND month = rec_month
  ) INTO is_closed;

  IF is_closed THEN
    RAISE EXCEPTION '해당 월(%)은 마감되었습니다. 수정 불가 / Tháng % đã chốt', rec_month, rec_month;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 마감 보호 대상 테이블에 트리거 부착
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['daily_reports', 'employee_attendance', 'expenses', 'salary_monthly'] LOOP
    BEGIN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_block_closed_%s ON %I', t, t);
      EXECUTE format(
        'CREATE TRIGGER trg_block_closed_%s BEFORE UPDATE OR DELETE ON %I
         FOR EACH ROW EXECUTE FUNCTION fn_block_closed_month()',
        t, t
      );
    EXCEPTION WHEN undefined_table THEN NULL;
    END;
  END LOOP;
END $$;


-- ════════════════════════════════════════════════════
-- SQL-8: Materialized View 집계 캐시
-- ════════════════════════════════════════════════════

-- 프로젝트별 월간 비용 요약
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_expense_summary AS
SELECT
  project_id,
  to_char(expense_date, 'YYYY-MM') AS month,
  category,
  COUNT(*) AS count,
  SUM(COALESCE(total_amount, 0)) AS total
FROM expenses
WHERE status NOT IN ('cancelled', 'rejected')
GROUP BY project_id, to_char(expense_date, 'YYYY-MM'), category
ORDER BY month DESC, project_id;

-- 직원별 월간 근무 요약
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_attendance_summary AS
SELECT
  user_id,
  project_id,
  to_char(work_date, 'YYYY-MM') AS month,
  COUNT(*) AS work_days,
  SUM(COALESCE(work_hours, 0)) AS total_hours,
  SUM(COALESCE(overtime_hours, 0)) AS total_overtime,
  COUNT(*) FILTER (WHERE is_night = true) AS night_days,
  COUNT(*) FILTER (WHERE is_weekend = true) AS weekend_days
FROM employee_attendance
WHERE check_in IS NOT NULL
GROUP BY user_id, project_id, to_char(work_date, 'YYYY-MM')
ORDER BY month DESC;

-- 프로젝트별 기성 요약
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_billing_summary AS
SELECT
  project_id,
  COUNT(*) AS billing_count,
  SUM(COALESCE(claim_amount, 0)) AS total_claimed,
  SUM(COALESCE(received_amount, 0)) AS total_received,
  SUM(COALESCE(claim_amount, 0)) - SUM(COALESCE(received_amount, 0)) AS outstanding
FROM billings
GROUP BY project_id;

-- MV 새로고침 함수
CREATE OR REPLACE FUNCTION refresh_all_mv()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_expense_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_attendance_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_billing_summary;
EXCEPTION WHEN OTHERS THEN
  -- CONCURRENTLY 실패 시 일반 새로고침
  REFRESH MATERIALIZED VIEW mv_monthly_expense_summary;
  REFRESH MATERIALIZED VIEW mv_monthly_attendance_summary;
  REFRESH MATERIALIZED VIEW mv_billing_summary;
END;
$$;

-- MV에 UNIQUE INDEX (CONCURRENTLY refresh 필요)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_exp_pk ON mv_monthly_expense_summary (project_id, month, category);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_att_pk ON mv_monthly_attendance_summary (user_id, project_id, month);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_bill_pk ON mv_billing_summary (project_id);


-- ════════════════════════════════════════════════════
-- SQL-9: DB Function 급여 계산
-- 프론트 부하 감소 + 데이터 정합성 보장
-- ════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION calc_monthly_salary(
  p_project_id UUID,
  p_month TEXT  -- 'YYYY-MM'
)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  work_days INT,
  probation_days INT,
  regular_days INT,
  ot_hours NUMERIC,
  night_days INT,
  weekend_days INT,
  base_pay NUMERIC,
  ot_pay NUMERIC,
  meal_allowance NUMERIC,
  gross_pay NUMERIC,
  insurance_deduct NUMERIC,
  exception_deduct NUMERIC,
  net_pay NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  start_date DATE;
  end_date DATE;
BEGIN
  start_date := (p_month || '-01')::date;
  end_date := (start_date + INTERVAL '1 month' - INTERVAL '1 day')::date;

  RETURN QUERY
  WITH att AS (
    SELECT
      ea.user_id,
      COUNT(*) AS days,
      SUM(COALESCE(ea.overtime_hours, 0)) AS ot_hrs,
      COUNT(*) FILTER (WHERE ea.is_night) AS nights,
      COUNT(*) FILTER (WHERE ea.is_weekend) AS weekends
    FROM employee_attendance ea
    WHERE ea.project_id = p_project_id
      AND ea.work_date BETWEEN start_date AND end_date
      AND ea.check_in IS NOT NULL
    GROUP BY ea.user_id
  ),
  exc AS (
    SELECT
      ae.user_id,
      SUM(COALESCE(ae.absent_hours, 8)) AS absent_hrs
    FROM attendance_exceptions ae
    WHERE ae.project_id = p_project_id
      AND ae.exception_date BETWEEN start_date AND end_date
      AND ae.status = '승인'
    GROUP BY ae.user_id
  ),
  salary AS (
    SELECT
      u.id AS uid,
      u.name AS uname,
      u.probation_end_date,
      COALESCE(ss.base_salary, 0) AS base,
      COALESCE(ss.ot_rate, 0) AS ot_rate,
      COALESCE(ss.meal_allowance, 0) AS meal,
      COALESCE(ss.probation_rate, 85) AS prob_rate,
      COALESCE(ss.insurance_base, ss.base_salary, 0) AS ins_base
    FROM users u
    LEFT JOIN salary_settings ss ON ss.user_id = u.id
    WHERE u.id IN (SELECT user_id FROM att)
  )
  SELECT
    s.uid,
    s.uname,
    COALESCE(a.days, 0)::int,
    -- probation days
    CASE
      WHEN s.probation_end_date IS NULL OR s.probation_end_date < start_date THEN 0
      WHEN s.probation_end_date > end_date THEN COALESCE(a.days, 0)
      ELSE GREATEST(0, (s.probation_end_date - start_date + 1))
    END::int,
    -- regular days
    CASE
      WHEN s.probation_end_date IS NULL OR s.probation_end_date < start_date THEN COALESCE(a.days, 0)
      WHEN s.probation_end_date > end_date THEN 0
      ELSE GREATEST(0, COALESCE(a.days, 0) - (s.probation_end_date - start_date + 1))
    END::int,
    COALESCE(a.ot_hrs, 0),
    COALESCE(a.nights, 0)::int,
    COALESCE(a.weekends, 0)::int,
    -- base_pay (probation * prob_rate% + regular * 100%)
    ROUND(s.base / 26.0 * (
      CASE WHEN s.probation_end_date IS NULL OR s.probation_end_date < start_date THEN COALESCE(a.days, 0)
           WHEN s.probation_end_date > end_date THEN COALESCE(a.days, 0) * s.prob_rate / 100.0
           ELSE (s.probation_end_date - start_date + 1) * s.prob_rate / 100.0
                + GREATEST(0, COALESCE(a.days, 0) - (s.probation_end_date - start_date + 1))
      END
    )),
    -- ot_pay
    ROUND(s.ot_rate * COALESCE(a.ot_hrs, 0)),
    -- meal_allowance
    ROUND(s.meal * COALESCE(a.days, 0)),
    -- gross
    ROUND(s.base / 26.0 * COALESCE(a.days, 0) + s.ot_rate * COALESCE(a.ot_hrs, 0) + s.meal * COALESCE(a.days, 0)),
    -- insurance (BHXH 8% + BHYT 1.5% + BHTN 1% = 10.5%)
    ROUND(s.ins_base * 0.105),
    -- exception deduction
    ROUND(COALESCE(e.absent_hrs, 0) * s.base / 26.0 / 8.0),
    -- net
    ROUND(
      s.base / 26.0 * COALESCE(a.days, 0)
      + s.ot_rate * COALESCE(a.ot_hrs, 0)
      + s.meal * COALESCE(a.days, 0)
      - s.ins_base * 0.105
      - COALESCE(e.absent_hrs, 0) * s.base / 26.0 / 8.0
    )
  FROM salary s
  LEFT JOIN att a ON a.user_id = s.uid
  LEFT JOIN exc e ON e.user_id = s.uid
  ORDER BY s.uname;
END;
$$;


-- ════════════════════════════════════════════════════
-- SQL-10: 만료 알림 함수 (pg_cron 또는 수동 호출)
-- 30일 이내 만료 문서/계약 자동 알림 생성
-- ════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_check_expiry_alerts()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  d RECORD;
  c RECORD;
  target RECORD;
  days_left INT;
BEGIN
  -- 문서 만료 체크
  FOR d IN
    SELECT id, document_name, expiry_date, project_id,
           (expiry_date - CURRENT_DATE) AS remaining
    FROM doc_expiry
    WHERE expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
  LOOP
    days_left := d.remaining;
    -- HR/관리자에게 알림 (하루 1번만 — 중복 방지)
    FOR target IN
      SELECT id FROM users WHERE role IN ('hr', 'ceo', 'director_m')
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE user_id = target.id
          AND link = '/dashboard/doc_expiry'
          AND message LIKE '%' || d.document_name || '%'
          AND created_at > CURRENT_DATE::timestamptz
      ) THEN
        INSERT INTO notifications (id, user_id, title, message, type, is_read, link)
        VALUES (
          gen_random_uuid(), target.id,
          '⚠ Hết hạn / 문서 만료 임박',
          d.document_name || ' — ' || days_left || ' ngày / 일 남음',
          CASE WHEN days_left <= 7 THEN 'error' ELSE 'warning' END,
          false, '/dashboard/doc_expiry'
        );
      END IF;
    END LOOP;
  END LOOP;

  -- 근로계약 만료 체크
  FOR c IN
    SELECT id, worker_name, end_date, project_id,
           (end_date - CURRENT_DATE) AS remaining
    FROM labor_contracts
    WHERE end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
  LOOP
    days_left := c.remaining;
    FOR target IN
      SELECT id FROM users WHERE role IN ('hr', 'ceo')
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE user_id = target.id
          AND link = '/dashboard/contracts'
          AND message LIKE '%' || COALESCE(c.worker_name, '') || '%'
          AND created_at > CURRENT_DATE::timestamptz
      ) THEN
        INSERT INTO notifications (id, user_id, title, message, type, is_read, link)
        VALUES (
          gen_random_uuid(), target.id,
          '⚠ Hợp đồng sắp hết / 계약 만료 임박',
          COALESCE(c.worker_name, '—') || ' — ' || days_left || ' ngày / 일 남음',
          CASE WHEN days_left <= 7 THEN 'error' ELSE 'warning' END,
          false, '/dashboard/contracts'
        );
      END IF;
    END LOOP;
  END LOOP;

  -- 차량 보험/등록 만료 체크
  FOR d IN
    SELECT id, plate_number,
           LEAST(
             COALESCE(registration_expiry, '2099-12-31'::date),
             COALESCE(insurance_expiry, '2099-12-31'::date)
           ) AS nearest_expiry,
           LEAST(
             COALESCE(registration_expiry, '2099-12-31'::date),
             COALESCE(insurance_expiry, '2099-12-31'::date)
           ) - CURRENT_DATE AS remaining
    FROM vehicles
    WHERE LEAST(
      COALESCE(registration_expiry, '2099-12-31'::date),
      COALESCE(insurance_expiry, '2099-12-31'::date)
    ) BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
  LOOP
    days_left := d.remaining;
    FOR target IN
      SELECT id FROM users WHERE role IN ('hr', 'ceo', 'director_m')
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE user_id = target.id
          AND message LIKE '%' || d.plate_number || '%'
          AND created_at > CURRENT_DATE::timestamptz
      ) THEN
        INSERT INTO notifications (id, user_id, title, message, type, is_read, link)
        VALUES (
          gen_random_uuid(), target.id,
          '⚠ Xe hết hạn / 차량 만료 임박',
          d.plate_number || ' — ' || days_left || ' ngày / 일 남음',
          CASE WHEN days_left <= 7 THEN 'error' ELSE 'warning' END,
          false, '/dashboard/vehicle'
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- pg_cron 설정 (Supabase Pro 이상에서 사용 가능)
-- 매일 오전 8시(UTC+7 = UTC 1시) 실행
-- SELECT cron.schedule('daily-expiry-check', '0 1 * * *', 'SELECT fn_check_expiry_alerts()');

-- MV 매일 새벽 2시 새로고침
-- SELECT cron.schedule('daily-mv-refresh', '0 19 * * *', 'SELECT refresh_all_mv()');


-- ════════════════════════════════════════════════════
-- 완료! 요약:
-- - 감사 트리거: 13개 테이블
-- - 알림 트리거: 4개 (전도금/휴가/일보/비용승인)
-- - 재고 트리거: material_transactions
-- - 출퇴근 계산: employee_attendance
-- - 중복 방지: 4개 UNIQUE 제약
-- - 상태 전이: expenses, billings
-- - 마감 보호: 4개 테이블
-- - MV: 3개 (비용/출근/기성 요약)
-- - 급여 함수: calc_monthly_salary()
-- - 만료 알림: fn_check_expiry_alerts()
-- ════════════════════════════════════════════════════
