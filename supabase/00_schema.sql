-- ============================================================
-- 시나브로 ERP v2 — 전체 스키마 정의
-- 누락 테이블 + 컬럼 보강 (멱등 실행 가능)
-- ============================================================

-- projects 확장 컬럼
ALTER TABLE projects ADD COLUMN IF NOT EXISTS site_lat NUMERIC;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS site_lng NUMERIC;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS site_radius INT DEFAULT 500;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS contract_amount NUMERIC DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS contractor TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS contract_name TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS contract_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS commence_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS complete_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress_rate NUMERIC DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS remarks TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS settlement_amount NUMERIC DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_no INTEGER;

-- workforce_photos 확장
ALTER TABLE workforce_photos ADD COLUMN IF NOT EXISTS checked_worker_ids UUID[] DEFAULT '{}';
ALTER TABLE workforce_photos ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}';

-- site_workers 확장
ALTER TABLE site_workers ADD COLUMN IF NOT EXISTS trade TEXT;

-- leave_requests 상태 확장
DO $$ BEGIN
  ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_status_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_status_check
  CHECK (status IN ('대기', '승인', '반려', '거절', '취소'));
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS cancelled_by UUID;

-- ── 신규 테이블 (IF NOT EXISTS) ──

CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID, name TEXT NOT NULL, role TEXT, phone TEXT, email TEXT,
  organization TEXT, contact_type TEXT DEFAULT 'company',
  created_by UUID, created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS defects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID, title TEXT NOT NULL, location TEXT,
  severity TEXT DEFAULT 'minor', description TEXT,
  photo_urls TEXT[] DEFAULT '{}', status TEXT DEFAULT 'open',
  assigned_to UUID, resolved_at TIMESTAMPTZ,
  created_by UUID, created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS equipment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID, name TEXT NOT NULL, category TEXT DEFAULT 'tool',
  status TEXT DEFAULT 'active', serial_number TEXT, location TEXT, notes TEXT,
  created_by UUID, created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gallery_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID, photo_url TEXT NOT NULL, caption TEXT,
  category TEXT DEFAULT 'general',
  created_by UUID, created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS material_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID, name TEXT NOT NULL, unit TEXT DEFAULT 'kg',
  stock_qty NUMERIC DEFAULT 0, min_qty NUMERIC DEFAULT 0,
  unit_price NUMERIC DEFAULT 0, vendor TEXT, notes TEXT,
  created_by UUID, created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS material_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID, project_id UUID,
  transaction_type TEXT DEFAULT 'in', quantity NUMERIC DEFAULT 0,
  unit_price NUMERIC DEFAULT 0, vendor TEXT, notes TEXT,
  transaction_date DATE DEFAULT CURRENT_DATE,
  created_by UUID, created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monthly_closes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID, month TEXT NOT NULL,
  closed_by UUID, closed_at TIMESTAMPTZ DEFAULT now(),
  checklist JSONB DEFAULT '{}', notes TEXT
);

CREATE TABLE IF NOT EXISTS announcement_reads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID, user_id UUID,
  read_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schedule_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID, title TEXT NOT NULL,
  start_date DATE, end_date DATE, progress INT DEFAULT 0,
  status TEXT DEFAULT 'pending', assignee TEXT, notes TEXT,
  created_by UUID, created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quantity_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID, item_name TEXT NOT NULL, unit TEXT DEFAULT 'm',
  contract_qty NUMERIC DEFAULT 0, executed_qty NUMERIC DEFAULT 0,
  unit_price NUMERIC DEFAULT 0, notes TEXT,
  created_by UUID, created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS budget_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID, category TEXT NOT NULL,
  budget_amount NUMERIC DEFAULT 0, actual_amount NUMERIC DEFAULT 0,
  notes TEXT, created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicle_costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID, vehicle_id UUID,
  cost_type TEXT DEFAULT 'fuel', amount NUMERIC DEFAULT 0,
  date DATE NOT NULL, receipt_url TEXT, notes TEXT,
  created_by UUID, created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 인덱스 ──
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
CREATE INDEX IF NOT EXISTS idx_site_workers_trade ON site_workers(project_id, trade);
CREATE INDEX IF NOT EXISTS idx_emp_att_user_date ON employee_attendance(user_id, work_date);
