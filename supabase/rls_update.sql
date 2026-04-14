-- ============================================================
-- 시나브로 ERP v2 — 누락 테이블 생성 + 전체 RLS 정책
-- ============================================================

-- PART 1: 누락 테이블 13개 생성

CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID,
  name TEXT NOT NULL,
  role TEXT,
  phone TEXT,
  email TEXT,
  organization TEXT,
  contact_type TEXT DEFAULT 'company',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS defects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID,
  title TEXT NOT NULL,
  location TEXT,
  severity TEXT DEFAULT 'minor',
  description TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'open',
  assigned_to UUID,
  resolved_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS equipment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'tool',
  status TEXT DEFAULT 'active',
  serial_number TEXT,
  location TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gallery_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID,
  photo_url TEXT NOT NULL,
  caption TEXT,
  category TEXT DEFAULT 'general',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS material_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID,
  name TEXT NOT NULL,
  unit TEXT DEFAULT 'kg',
  stock_qty NUMERIC DEFAULT 0,
  min_qty NUMERIC DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  vendor TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS material_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID,
  project_id UUID,
  transaction_type TEXT DEFAULT 'in',
  quantity NUMERIC DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  vendor TEXT,
  notes TEXT,
  transaction_date DATE DEFAULT CURRENT_DATE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monthly_closes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID,
  month TEXT NOT NULL,
  closed_by UUID,
  closed_at TIMESTAMPTZ DEFAULT now(),
  checklist JSONB DEFAULT '{}',
  notes TEXT
);

CREATE TABLE IF NOT EXISTS announcement_reads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID,
  user_id UUID,
  read_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schedule_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID,
  title TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  progress INT DEFAULT 0,
  status TEXT DEFAULT 'pending',
  assignee TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quantity_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID,
  item_name TEXT NOT NULL,
  unit TEXT DEFAULT 'm',
  contract_qty NUMERIC DEFAULT 0,
  executed_qty NUMERIC DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS budget_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID,
  category TEXT NOT NULL,
  budget_amount NUMERIC DEFAULT 0,
  actual_amount NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicle_costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID,
  vehicle_id UUID,
  cost_type TEXT DEFAULT 'fuel',
  amount NUMERIC DEFAULT 0,
  date DATE NOT NULL,
  receipt_url TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- projects 테이블에 GPS/계약 컬럼 추가
ALTER TABLE projects ADD COLUMN IF NOT EXISTS site_lat NUMERIC;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS site_lng NUMERIC;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS site_radius INT DEFAULT 500;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS contract_amount NUMERIC DEFAULT 0;


-- ============================================================
-- PART 2: 전체 테이블 RLS 활성화 + 전체 허용 정책
-- ============================================================

DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'users', 'projects', 'project_members',
    'employee_attendance', 'attendance_exceptions',
    'daily_reports', 'workforce_photos', 'site_work_photos',
    'leave_requests', 'leave_balances',
    'expenses', 'costs', 'price_history', 'recurring_expenses',
    'advances', 'advance_deposits', 'advance_requests',
    'billings', 'billing_status', 'prepayments',
    'salary_settings', 'salary_monthly',
    'material_items', 'material_transactions', 'material_stock', 'material_orders',
    'inventory_items', 'inventory_transactions',
    'equipment', 'equipment_items', 'equipment_repairs', 'equipment_transfers',
    'equipment_requests', 'equipment_shares',
    'safety_inspections', 'tbm_records',
    'quality_inspections', 'defects', 'defect_reports',
    'notifications', 'audit_logs', 'approved_devices', 'login_photos',
    'announcements', 'announcement_reads',
    'site_workers', 'site_events',
    'contacts', 'vehicles', 'vehicle_costs',
    'doc_expiry', 'vendors', 'vendor_evaluations',
    'labor_contracts', 'labor_rates', 'contracts',
    'additional_works', 'work_orders',
    'subcontract_payments', 'subcontract_rates',
    'gallery_photos', 'schedule_items', 'quantity_items', 'budget_items',
    'monthly_closes', 'cost_budgets',
    'project_progress', 'project_quantities', 'project_shares',
    'schedules', 'delegation_rules',
    'driver_attendance', 'driver_expenses',
    'gps_logs', 'client_errors', 'app_settings',
    'worker_qualifications', 'transfer_requests', 'daily_labor_cost'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=tbl) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
      BEGIN
        EXECUTE format('DROP POLICY IF EXISTS "%s_all" ON %I', tbl, tbl);
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
      EXECUTE format(
        'CREATE POLICY "%s_all" ON %I FOR ALL USING (true) WITH CHECK (true)',
        tbl, tbl
      );
      RAISE NOTICE 'RLS OK: %', tbl;
    ELSE
      RAISE NOTICE 'SKIP (not found): %', tbl;
    END IF;
  END LOOP;
END $$;


-- PART 3: 인덱스
CREATE INDEX IF NOT EXISTS idx_contacts_proj ON contacts(project_id);
CREATE INDEX IF NOT EXISTS idx_defects_proj ON defects(project_id, status);
CREATE INDEX IF NOT EXISTS idx_equipment_proj ON equipment(project_id);
CREATE INDEX IF NOT EXISTS idx_gallery_proj ON gallery_photos(project_id);
CREATE INDEX IF NOT EXISTS idx_mat_items_proj ON material_items(project_id);
CREATE INDEX IF NOT EXISTS idx_mat_txn_proj ON material_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_monthly_proj ON monthly_closes(project_id, month);
CREATE INDEX IF NOT EXISTS idx_ann_reads_user ON announcement_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_proj ON schedule_items(project_id);
CREATE INDEX IF NOT EXISTS idx_qty_proj ON quantity_items(project_id);
CREATE INDEX IF NOT EXISTS idx_budget_proj ON budget_items(project_id);
CREATE INDEX IF NOT EXISTS idx_vcosts_proj ON vehicle_costs(project_id, date);
