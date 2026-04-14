-- ============================================================
-- 시나브로 ERP v2 — 보안 뷰 (SECURITY INVOKER)
-- RLS + auth context가 호출자에게 적용됨
-- ============================================================

-- v_billings: 재무만
DO $$ BEGIN
  EXECUTE 'CREATE OR REPLACE VIEW public.v_billings
    WITH (security_invoker = true)
    AS SELECT * FROM public.billings WHERE is_finance()';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'v_billings: %', SQLERRM;
END $$;

-- v_billing_status
DO $$ BEGIN
  EXECUTE 'CREATE OR REPLACE VIEW public.v_billing_status
    WITH (security_invoker = true)
    AS SELECT * FROM public.billing_status WHERE is_finance()';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'v_billing_status: %', SQLERRM;
END $$;

-- v_costs
DO $$ BEGIN
  EXECUTE 'CREATE OR REPLACE VIEW public.v_costs
    WITH (security_invoker = true)
    AS SELECT * FROM public.costs WHERE is_finance()';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'v_costs: %', SQLERRM;
END $$;

-- v_cost_budgets
DO $$ BEGIN
  EXECUTE 'CREATE OR REPLACE VIEW public.v_cost_budgets
    WITH (security_invoker = true)
    AS SELECT * FROM public.cost_budgets WHERE is_finance()';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'v_cost_budgets: %', SQLERRM;
END $$;

-- v_salary_monthly: HR/회계 + 본인 급여
DO $$ BEGIN
  EXECUTE 'CREATE OR REPLACE VIEW public.v_salary_monthly
    WITH (security_invoker = true)
    AS SELECT * FROM public.salary_monthly
       WHERE is_hr() OR get_my_role() = ''account'' OR auth.uid() = user_id';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'v_salary_monthly: %', SQLERRM;
END $$;

-- v_salary_settings: HR/회계만
DO $$ BEGIN
  EXECUTE 'CREATE OR REPLACE VIEW public.v_salary_settings
    WITH (security_invoker = true)
    AS SELECT * FROM public.salary_settings
       WHERE is_hr() OR get_my_role() = ''account''';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'v_salary_settings: %', SQLERRM;
END $$;

-- v_prepayments
DO $$ BEGIN
  EXECUTE 'CREATE OR REPLACE VIEW public.v_prepayments
    WITH (security_invoker = true)
    AS SELECT * FROM public.prepayments WHERE is_finance()';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'v_prepayments: %', SQLERRM;
END $$;

-- v_subcontract_payments
DO $$ BEGIN
  EXECUTE 'CREATE OR REPLACE VIEW public.v_subcontract_payments
    WITH (security_invoker = true)
    AS SELECT * FROM public.subcontract_payments WHERE is_finance()';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'v_subcontract_payments: %', SQLERRM;
END $$;

-- v_daily_labor_cost: 재무 + QS
DO $$ BEGIN
  EXECUTE 'CREATE OR REPLACE VIEW public.v_daily_labor_cost
    WITH (security_invoker = true)
    AS SELECT * FROM public.daily_labor_cost
       WHERE is_finance() OR get_my_role() = ''qs''';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'v_daily_labor_cost: %', SQLERRM;
END $$;

-- v_price_history
DO $$ BEGIN
  EXECUTE 'CREATE OR REPLACE VIEW public.v_price_history
    WITH (security_invoker = true)
    AS SELECT * FROM public.price_history WHERE is_finance()';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'v_price_history: %', SQLERRM;
END $$;

-- v_recurring_expenses
DO $$ BEGIN
  EXECUTE 'CREATE OR REPLACE VIEW public.v_recurring_expenses
    WITH (security_invoker = true)
    AS SELECT * FROM public.recurring_expenses WHERE is_finance()';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'v_recurring_expenses: %', SQLERRM;
END $$;
