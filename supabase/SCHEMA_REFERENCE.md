# Supabase DB Schema Reference
> 자동 생성 — 코드에서 컬럼명 참조 시 반드시 이 문서 확인
> 생성일: 2026-04-15

## 규칙
1. **새 페이지 추가 시 이 문서에서 컬럼명 확인 필수**
2. **FK 조인 사용 금지** — `select("*")` 후 프론트에서 매핑
3. **`(dashboard)` 라우트 그룹** — URL에 `/dashboard/` 안 붙음
4. **사진 URL** — 반드시 전체 URL 저장 (상대경로 금지)

### additional_works
```
id, project_id, user_id, work_date, category, work_type, description, location, quantity, unit, unit_price, total_amount, note, status, approved_by, approved_at, created_at, photos
```

### advance_deposits
```
id, project_id, amount, date, method, depositor, notes, created_by, created_at, deposit_date, note, processed_by
```

### advance_requests
```
id, project_id, user_id, amount, needed_date, purpose, reason, status, approved_by, approved_at, reject_reason, deposited_at, created_at, current_step, approval_chain
```

### advances
```
id, project_id, user_id, requester_name, request_date, category, amount, detail, actual_amount, refund_amount, status, approved_by, approved_at, admin_note, settled_at, created_at, receipt_type, receipt_url, settled_amount, current_step, approval_chain
```

### announcement_reads
```
id, announcement_id, user_id, read_at
```

### announcements
```
id, title, content, ann_type, target, expire_date, created_by, created_by_name, created_at
```

### app_settings
```
id, key, value, created_at, updated_at
```

### approved_devices
```
id, user_id, device_fp, device_name, user_agent, status, approved_by, approved_at, last_login_at, created_at
```

### attendance_exceptions
```
id, user_id, project_id, exception_type, exception_date, absent_hours, time_from, time_to, reason, status, approved_by, approved_at, created_at
```

### audit_logs
```
id, table_name, record_id, action, changes, prev_values, changed_by, changed_by_name, created_at
```

### billing_status
```
id, project_id, round, period, request_amount, approved_amount, paid_amount, stages, note, created_by, created_at
```

### billings
```
id, project_id, billing_no, billing_date, period_from, period_to, claim_amount, received_amount, received_date, status, note, created_at, expected_payment_date
```

### budget_items
```
id, project_id, category, budget_amount, actual_amount, notes, created_at
```

### client_errors
```
id, user_id, user_name, message, stack, url, user_agent, created_at
```

### contacts
```
id, project_id, name, role, phone, email, organization, contact_type, created_by, created_at
```

### contracts
```
id, project_id, contract_no, contract_date, contract_amount, scope, payment_terms, status, doc_url, note, created_at
```

### cost_budgets
```
id, project_id, total_budget, mat_budget, labor_budget, etc_budget, updated_by, updated_at, indirect_rate
```

### costs
```
id, project_id, user_id, cost_date, cost_type, item_name, amount, paid_status, vendor, note, created_at
```

### daily_labor_cost
```
id, project_id, report_date, total_labor_cost, updated_at
```

### daily_reports
```
id, project_id, user_id, report_date, work_type, work_desc, location, weather, vn_engineer_am, vn_engineer_pm, vn_engineer_ni, direct_worker_am, direct_worker_pm, direct_worker_ni, indirect_worker_am, indirect_worker_pm, indirect_worker_ni, vn_engineer, direct_worker, direct_ot, indirect_worker, indirect_ot, qty_v250, qty_sv250, qty_hlm, qty_m230, qty_db2015, qty_other, note, photo_urls, confirmed, confirmed_by, confirmed_at, created_at, extra_materials, revision_requested, revision_comment, revision_by, revision_by_name, revision_at
```

### defect_reports
```
id, project_id, location, symptom, severity, detail, photo_urls, stage, created_by, created_by_name, updated_by, updated_at, created_at
```

### defects
```
id, project_id, title, location, severity, description, photo_urls, status, assigned_to, resolved_at, created_by, created_at
```

### delegation_rules
```
id, delegator_id, delegator_name, delegate_id, delegate_name, start_date, end_date, is_active, created_at
```

### doc_expiry
```
id, title, doc_type, expiry_date, project_id, person, note, created_at
```

### driver_attendance
```
id, driver_id, work_date, check_in, check_out, memo, photo_url, checkout_memo, checkout_photo_url, created_at, user_id, check_in_photo, check_out_photo, checkin_lat, checkin_lng, checkout_lat, checkout_lng
```

### driver_expenses
```
id, submitted_by, vehicle_id, category, amount, expense_date, receipt_type, receipt_url, memo, status, approved_by, approved_at, created_at, user_id
```

### employee_attendance
```
id, user_id, project_id, work_date, check_in, check_out, photo_url, memo, checkout_photo_url, checkout_memo, checkin_lat, checkin_lng, checkout_lat, checkout_lng, created_at, check_method, work_hours, overtime_hours, is_night, is_weekend
```

### equipment
```
id, project_id, name, category, status, serial_number, location, notes, created_by, created_at
```

### equipment_items
```
id, name, category, qty, current_location, status, note, last_moved_at, created_at, photo_url, project_id, product_code, manufacturer, purchase_date, current_project_id, registered_by, registered_by_name
```

### equipment_repairs
```
id, project_id, equipment_id, equipment_name, repair_date, repair_type, cost, vendor, result, detail, photo_url, registered_by, registered_by_name, created_at, completed_date, vendor_phone
```

### equipment_requests
```
id, project_id, item_name, category, qty, reason, desired_date, note, status, requested_by, approved_by, approved_at, reject_reason, delivery_date, delivery_note, received_photo, received_at, received_by, created_at, updated_at, approval_chain, current_step
```

### equipment_shares
```
id, item_name, from_project_id, to_project_id, reason, status, requested_by, requested_by_name, approved_by, created_at, received_at, received_by
```

### equipment_transfers
```
id, equipment_id, equipment_name, from_location, to_location, transferred_by, transfer_date, note, created_at
```

### expenses
```
id, project_id, category, item_name, vendor, quantity, unit, unit_price, total_amount, description, expense_date, submitted_by, status, approved_by, approved_at, reject_reason, receipt_url, created_at, updated_at, approval_chain, current_step, submitted_role, qty, note, doc_url, vat_rate, vat_amount, grand_total, invoice_type, invoice_number
```

### gallery_photos
```
id, project_id, photo_url, caption, category, created_by, created_at
```

### gps_logs
```
id, user_id, lat, lng, logged_at, page
```

### inventory_items
```
id, name, unit, location, current_stock, min_stock, created_at
```

### inventory_transactions
```
id, item_name, txn_type, qty, unit, from_location, to_location, unit_price, note, slip_no, txn_date, created_by, created_at
```

### labor_contracts
```
id, project_id, worker_name, position, daily_rate, start_date, end_date, signature_url, created_by, created_by_name, created_at
```

### labor_rates
```
id, project_id, worker_type, daily_rate, ot_hourly, effective_from, note, created_at
```

### leave_balances
```
id, user_id, total_days, used_days, updated_at
```

### leave_requests
```
id, user_id, project_id, leave_type, start_date, end_date, reason, status, approved_by, approved_at, reject_reason, created_at, cancelled_at, cancelled_by, half_day, leave_days
```

### login_photos
```
id, user_id, photo_url, logged_at, created_at, face_match
```

### material_items
```
id, project_id, name, unit, stock_qty, min_qty, unit_price, vendor, notes, created_by, created_at
```

### material_orders
```
id, project_id, requested_by, item_name, quantity, unit, install_location, need_date, urgency, reason, status, stages, eta, vendor, received_photo_url, received_at, reject_reason, created_at, updated_at, current_step, approval_chain, order_date, expected_date, created_by
```

### material_stock
```
id, project_id, material_name, unit, total_in, total_out, balance, updated_at
```

### material_transactions
```
id, material_id, project_id, transaction_type, quantity, unit_price, vendor, notes, transaction_date, created_by, created_at
```

### materials
```
id, project_id, user_id, tx_date, tx_type, material_name, quantity, unit, unit_price, total_amount, vendor, note, created_at
```

### monthly_closes
```
id, project_id, month, closed_by, closed_at, checklist, notes
```

### notifications
```
id, type, user_id, user_name, message, target_roles, read, created_at, target_user_id, title, is_read, link
```

### prepayment_balance
```
project_id, total_prepayment, balance
```

### prepayments
```
id, project_id, recv_date, amount, deducted, description, status, note, created_at
```

### price_history
```
id, item_name, category, vendor, unit_price, unit, quantity, purchase_date, project_id, source, notes, created_at, qty
```

### progress_rate
```
project_id, work_type, unit, contract_qty, actual_qty, progress_rate, remain_qty
```

### project_cost_summary
```
project_id, code, name, status, contract_amount, end_date, total_cost, gross_profit
```

### project_members
```
id, project_id, user_id
```

### project_progress
```
id, project_id, overall_progress, breakdown, updated_at
```

### project_quantities
```
id, project_id, work_type, unit, contract_qty, unit_price, note, created_at, settlement_qty
```

### project_shares
```
id, project_id, token, created_by, expires_at, active, created_at
```

### projects
```
id, code, name, client, location, start_date, end_date, status, contract_amount, created_at, gps_lat, gps_lng, manager_id, manager2_id, ld_rate, geo_lat, geo_lng, geo_radius, contractor, contract_name, contract_date, commence_date, complete_date, progress_rate, paid_amount, remarks, settlement_amount, project_no, warranty_start, warranty_months, completion_date, site_lat, site_lng, site_radius
```

### quality_inspections
```
id, project_id, location, stages, created_by, created_at
```

### quantity_items
```
id, project_id, item_name, unit, contract_qty, executed_qty, unit_price, notes, created_by, created_at
```

### recurring_expenses
```
id, description, amount, cycle, project_id, category, next_run, is_active, created_by, created_at
```

### safety_inspections
```
id, project_id, inspector_id, inspection_date, checklist, unchecked_items, photo_urls, notes, created_at
```

### salary_monthly
```
id, user_id, month, probation_days, regular_days, ot_hours, probation_pay, regular_pay, meal_total, allowances, ot_pay, other_bonus, insurance_deduction, tax, exception_deduction, other_deduction, net_total, confirmed_by, confirmed_at
```

### salary_settings
```
id, user_id, salary_type, base_amount, overtime_rate, created_at, updated_at, probation_salary, meal_allowance, responsibility_allowance, female_allowance, site_allowance, bhxh_rate, bhyt_rate, bhtn_rate, probation_rate, insurance_base_amount
```

### schedule_items
```
id, project_id, title, start_date, end_date, progress, status, assignee, notes, created_by, created_at
```

### schedules
```
id, project_id, user_id, work_type, task_name, location, plan_start, plan_end, planned_qty, unit, actual_start, actual_end, progress, status, note, sort_order, approved, approved_by, approved_at, created_at, updated_at, zone
```

### site_events
```
id, project_id, title, category, priority, start_date, end_date, repeat_type, progress, status, assignee, location, memo, created_by, created_at, updated_at, attendees
```

### site_work_photos
```
id, project_id, photo_date, work_category, purpose, location, memo, photo_urls, created_by, created_at
```

### site_workers
```
id, project_id, worker_name, worker_type, phone, memo, is_active, created_by, created_at, updated_at, trade, daily_rate, worker_category
```

### subcontract_payments
```
id, vendor_id, billing_id, amount, due_date, status, paid_date, project_id, created_at
```

### subcontract_rates
```
id, vendor_id, vendor_name, work_type, unit_rate, project_id, created_by, created_at
```

### tbm_records
```
id, project_id, tbm_date, tbm_time, hazards, safety_measures, work_description, attendee_ids, attendee_count, photo_urls, created_by, created_by_name, created_at, safety_checklist, safety_unchecked, signatures
```

### transfer_requests
```
id, item_name, qty, unit, from_location, to_location, reason, requested_by, approved_by, approved_at, reject_reason, status, created_at
```

### users
```
id, name, role, email, phone, is_active, created_at, face_photo_url, face_descriptor, probation_end_date, hire_date
```

### v_billing_status
```
id, project_id, round, period, request_amount, approved_amount, paid_amount, stages, note, created_by, created_at
```

### v_billings
```
id, project_id, billing_no, billing_date, period_from, period_to, claim_amount, received_amount, received_date, status, note, created_at, expected_payment_date
```

### v_cost_budgets
```
id, project_id, total_budget, mat_budget, labor_budget, etc_budget, updated_by, updated_at, indirect_rate
```

### v_costs
```
id, project_id, user_id, cost_date, cost_type, item_name, amount, paid_status, vendor, note, created_at
```

### v_daily_labor_cost
```
id, project_id, report_date, total_labor_cost, updated_at
```

### v_prepayments
```
id, project_id, recv_date, amount, deducted, description, status, note, created_at
```

### v_price_history
```
id, item_name, category, vendor, unit_price, unit, quantity, purchase_date, project_id, source, notes, created_at, qty
```

### v_recurring_expenses
```
id, description, amount, cycle, project_id, category, next_run, is_active, created_by, created_at
```

### v_salary_monthly
```
id, user_id, month, probation_days, regular_days, ot_hours, probation_pay, regular_pay, meal_total, allowances, ot_pay, other_bonus, insurance_deduction, tax, exception_deduction, other_deduction, net_total, confirmed_by, confirmed_at
```

### v_salary_settings
```
id, user_id, salary_type, base_amount, overtime_rate, created_at, updated_at, probation_salary, meal_allowance, responsibility_allowance, female_allowance, site_allowance, bhxh_rate, bhyt_rate, bhtn_rate, probation_rate, insurance_base_amount
```

### v_subcontract_payments
```
id, vendor_id, billing_id, amount, due_date, status, paid_date, project_id, created_at
```

### vehicle_costs
```
id, project_id, vehicle_id, cost_type, amount, date, receipt_url, notes, created_by, created_at
```

### vehicles
```
id, plate_no, vehicle_type, assigned_driver_id, status, insurance_expiry, inspection_expiry, notes, created_at
```

### vendor_evaluations
```
id, vendor_id, project_id, delivery, quality, price, cooperation, safety, evaluator_id, created_at
```

### vendors
```
id, name, vendor_type, representative, phone, email, bank_account, address, note, rating, created_at
```

### work_orders
```
id, project_id, location, work_type, qty, content, caution, assignee_id, assignee_name, status, created_by, created_by_name, updated_at, created_at
```

### worker_qualifications
```
id, worker_id, worker_name, qualification_type, expiry_date, project_id, created_by, created_at
```

### workforce_photos
```
id, project_id, photo_date, slot, photo_url, headcount, memo, created_by, created_at, checked_worker_ids, photo_urls, time_am_in, time_am_out, time_pm_in, time_pm_out, time_ot_in, time_ot_out
```

