-- ============================================================
-- 시나브로 ERP v2 — 역할 계층 기반 RLS 정책
-- 대표 > 관리임원 > 현장임원(재무X) > 사무직 > 현장직
-- ============================================================

-- ── 0. 헬퍼 함수 ──
CREATE OR REPLACE FUNCTION get_my_role() RETURNS text LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION is_top() RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ceo','director_m'))
$$;

CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ceo','director_m','director_f','hr','account'))
$$;

CREATE OR REPLACE FUNCTION is_finance() RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ceo','director_m','account'))
$$;

CREATE OR REPLACE FUNCTION is_office() RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ceo','director_m','director_f','hr','account','qs'))
$$;

CREATE OR REPLACE FUNCTION is_hr() RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ceo','director_m','hr'))
$$;


-- ── 1. 기존 정책 전부 삭제 ──
DO $$
DECLARE t text; p record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      BEGIN
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END LOOP;
  END LOOP;
END $$;


-- ═══════════════════════════════════════════════════
-- 그룹 A: 공통 기반 데이터
-- SELECT/INSERT/UPDATE: 인증 사용자 | DELETE: 관리직
-- ═══════════════════════════════════════════════════
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'projects','users','announcements','announcement_reads','app_settings',
    'project_members','project_shares','site_events','vehicles','vendors',
    'vendor_evaluations','contracts','doc_expiry','approved_devices',
    'delegation_rules','notifications','client_errors','contacts',
    'gallery_photos','schedule_items','monthly_closes','budget_items'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('CREATE POLICY "%s_read"   ON %I FOR SELECT USING (auth.role()=''authenticated'')', t, t);
      EXECUTE format('CREATE POLICY "%s_write"  ON %I FOR INSERT WITH CHECK (auth.role()=''authenticated'')', t, t);
      EXECUTE format('CREATE POLICY "%s_edit"   ON %I FOR UPDATE USING (auth.role()=''authenticated'')', t, t);
      EXECUTE format('CREATE POLICY "%s_remove" ON %I FOR DELETE USING (is_admin())', t, t);
    EXCEPTION WHEN undefined_table THEN NULL;
    END;
  END LOOP;
END $$;


-- ═══════════════════════════════════════════════════
-- 그룹 B: 현장 업무 (일보, 출근, 안전 등)
-- SELECT/INSERT: 전원 | UPDATE: 본인+사무직 | DELETE: 관리직
-- ═══════════════════════════════════════════════════
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'daily_reports','employee_attendance','driver_attendance',
    'gps_logs','login_photos','workforce_photos','site_work_photos',
    'attendance_exceptions','tbm_records','defect_reports','defects',
    'work_orders','site_workers','worker_qualifications',
    'equipment','equipment_items','equipment_repairs','equipment_shares',
    'equipment_transfers','equipment_requests','transfer_requests',
    'safety_inspections','quality_inspections',
    'materials','material_stock','material_orders','material_items','material_transactions',
    'inventory_items','inventory_transactions','schedules'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('CREATE POLICY "%s_read"   ON %I FOR SELECT USING (auth.role()=''authenticated'')', t, t);
      EXECUTE format('CREATE POLICY "%s_write"  ON %I FOR INSERT WITH CHECK (auth.role()=''authenticated'')', t, t);
      EXECUTE format('CREATE POLICY "%s_edit"   ON %I FOR UPDATE USING (is_office() OR auth.uid()=created_by)', t, t);
      EXECUTE format('CREATE POLICY "%s_remove" ON %I FOR DELETE USING (is_admin())', t, t);
    EXCEPTION WHEN undefined_table THEN NULL;
              WHEN undefined_column THEN
      BEGIN
        EXECUTE format('DROP POLICY IF EXISTS "%s_edit" ON %I', t, t);
        EXECUTE format('CREATE POLICY "%s_edit" ON %I FOR UPDATE USING (is_office())', t, t);
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END;
  END LOOP;
END $$;


-- ═══════════════════════════════════════════════════
-- 그룹 C: 전도금/지출 (업무 신청)
-- ═══════════════════════════════════════════════════
DO $$
BEGIN
  -- advances
  ALTER TABLE advances ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "adv_read"   ON advances FOR SELECT USING (auth.role()='authenticated');
  CREATE POLICY "adv_write"  ON advances FOR INSERT WITH CHECK (auth.role()='authenticated');
  CREATE POLICY "adv_edit"   ON advances FOR UPDATE USING (is_office() OR auth.uid()=user_id);
  CREATE POLICY "adv_remove" ON advances FOR DELETE USING (is_admin());
EXCEPTION WHEN undefined_column THEN
  CREATE POLICY "adv_edit"   ON advances FOR UPDATE USING (is_office());
END $$;

DO $$
BEGIN
  ALTER TABLE advance_requests ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "areq_read"   ON advance_requests FOR SELECT USING (auth.role()='authenticated');
  CREATE POLICY "areq_write"  ON advance_requests FOR INSERT WITH CHECK (auth.role()='authenticated');
  CREATE POLICY "areq_edit"   ON advance_requests FOR UPDATE USING (is_office() OR auth.uid()=user_id);
  CREATE POLICY "areq_remove" ON advance_requests FOR DELETE USING (is_admin());
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE advance_deposits ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "adep_read"   ON advance_deposits FOR SELECT USING (auth.role()='authenticated');
  CREATE POLICY "adep_write"  ON advance_deposits FOR INSERT WITH CHECK (is_finance());
  CREATE POLICY "adep_edit"   ON advance_deposits FOR UPDATE USING (is_finance());
  CREATE POLICY "adep_remove" ON advance_deposits FOR DELETE USING (is_top());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "exp_read"   ON expenses FOR SELECT USING (auth.role()='authenticated');
  CREATE POLICY "exp_write"  ON expenses FOR INSERT WITH CHECK (auth.role()='authenticated');
  CREATE POLICY "exp_edit"   ON expenses FOR UPDATE USING (is_office() OR auth.uid()=submitted_by);
  CREATE POLICY "exp_remove" ON expenses FOR DELETE USING (is_admin());
EXCEPTION WHEN undefined_column THEN
  CREATE POLICY "exp_edit"   ON expenses FOR UPDATE USING (is_office());
END $$;

DO $$
BEGIN
  ALTER TABLE vehicle_costs ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "vc_read"   ON vehicle_costs FOR SELECT USING (is_office() OR auth.uid()=created_by);
  CREATE POLICY "vc_write"  ON vehicle_costs FOR INSERT WITH CHECK (auth.role()='authenticated');
  CREATE POLICY "vc_edit"   ON vehicle_costs FOR UPDATE USING (is_finance() OR auth.uid()=created_by);
  CREATE POLICY "vc_remove" ON vehicle_costs FOR DELETE USING (is_admin());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════
-- 그룹 D: 재무 데이터 (현장임원/현장직 접근 제한)
-- SELECT: 재무+QS+HR | INSERT/UPDATE: 재무+QS | DELETE: 대표+관리임원
-- ═══════════════════════════════════════════════════
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'billings','billing_status','costs','cost_budgets',
    'prepayments','price_history','recurring_expenses',
    'subcontract_payments','subcontract_rates',
    'project_quantities','additional_works','project_progress',
    'daily_labor_cost','quantity_items'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('CREATE POLICY "%s_read"   ON %I FOR SELECT USING (is_finance() OR get_my_role() IN (''hr'',''qs''))', t, t);
      EXECUTE format('CREATE POLICY "%s_write"  ON %I FOR INSERT WITH CHECK (is_finance() OR get_my_role()=''qs'')', t, t);
      EXECUTE format('CREATE POLICY "%s_edit"   ON %I FOR UPDATE USING (is_finance() OR get_my_role()=''qs'')', t, t);
      EXECUTE format('CREATE POLICY "%s_remove" ON %I FOR DELETE USING (is_top())', t, t);
    EXCEPTION WHEN undefined_table THEN NULL;
    END;
  END LOOP;
END $$;


-- ═══════════════════════════════════════════════════
-- 그룹 E: 급여/인사 데이터
-- ═══════════════════════════════════════════════════
DO $$
BEGIN
  ALTER TABLE salary_monthly ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "sm_read"   ON salary_monthly FOR SELECT USING (is_hr() OR get_my_role()='account' OR auth.uid()=user_id);
  CREATE POLICY "sm_write"  ON salary_monthly FOR INSERT WITH CHECK (is_hr() OR get_my_role()='account');
  CREATE POLICY "sm_edit"   ON salary_monthly FOR UPDATE USING (is_hr() OR get_my_role()='account');
  CREATE POLICY "sm_remove" ON salary_monthly FOR DELETE USING (is_top());
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE salary_settings ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "ss_read"   ON salary_settings FOR SELECT USING (is_hr() OR get_my_role()='account');
  CREATE POLICY "ss_write"  ON salary_settings FOR INSERT WITH CHECK (is_hr() OR get_my_role()='account');
  CREATE POLICY "ss_edit"   ON salary_settings FOR UPDATE USING (is_hr() OR get_my_role()='account');
  CREATE POLICY "ss_remove" ON salary_settings FOR DELETE USING (is_top());
END $$;

DO $$
BEGIN
  ALTER TABLE labor_rates ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "lr_read"   ON labor_rates FOR SELECT USING (is_office());
  CREATE POLICY "lr_write"  ON labor_rates FOR INSERT WITH CHECK (is_finance() OR get_my_role()='qs');
  CREATE POLICY "lr_edit"   ON labor_rates FOR UPDATE USING (is_finance() OR get_my_role()='qs');
  CREATE POLICY "lr_remove" ON labor_rates FOR DELETE USING (is_top());
END $$;

DO $$
BEGIN
  ALTER TABLE labor_contracts ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "lc_read"   ON labor_contracts FOR SELECT USING (is_office());
  CREATE POLICY "lc_write"  ON labor_contracts FOR INSERT WITH CHECK (is_hr() OR get_my_role()='account');
  CREATE POLICY "lc_edit"   ON labor_contracts FOR UPDATE USING (is_hr() OR get_my_role()='account');
  CREATE POLICY "lc_remove" ON labor_contracts FOR DELETE USING (is_top());
END $$;

DO $$
BEGIN
  ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "lb_read"   ON leave_balances FOR SELECT USING (is_hr() OR auth.uid()=user_id);
  CREATE POLICY "lb_write"  ON leave_balances FOR INSERT WITH CHECK (is_hr());
  CREATE POLICY "lb_edit"   ON leave_balances FOR UPDATE USING (is_hr());
  CREATE POLICY "lb_remove" ON leave_balances FOR DELETE USING (is_top());
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "lreq_read"   ON leave_requests FOR SELECT USING (is_hr() OR auth.uid()=user_id);
  CREATE POLICY "lreq_write"  ON leave_requests FOR INSERT WITH CHECK (auth.role()='authenticated');
  CREATE POLICY "lreq_edit"   ON leave_requests FOR UPDATE USING (is_hr() OR (auth.uid()=user_id AND status='대기'));
  CREATE POLICY "lreq_remove" ON leave_requests FOR DELETE USING (is_hr());
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE driver_expenses ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "de_read"   ON driver_expenses FOR SELECT USING (is_office() OR auth.uid()=user_id);
  CREATE POLICY "de_write"  ON driver_expenses FOR INSERT WITH CHECK (auth.role()='authenticated');
  CREATE POLICY "de_edit"   ON driver_expenses FOR UPDATE USING (is_finance() OR auth.uid()=user_id);
  CREATE POLICY "de_remove" ON driver_expenses FOR DELETE USING (is_admin());
EXCEPTION WHEN undefined_column THEN NULL;
          WHEN undefined_table THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════
-- 그룹 F: 감사/보안 (관리직만 조회)
-- ═══════════════════════════════════════════════════
DO $$
BEGIN
  ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "al_read"   ON audit_logs FOR SELECT USING (is_top());
  CREATE POLICY "al_write"  ON audit_logs FOR INSERT WITH CHECK (auth.role()='authenticated');
  CREATE POLICY "al_edit"   ON audit_logs FOR UPDATE USING (false);
  CREATE POLICY "al_remove" ON audit_logs FOR DELETE USING (false);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
