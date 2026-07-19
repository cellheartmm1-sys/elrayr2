-- ============================================================
-- الرايق للمقاولات الكهروميكانيكية - Database Schema
-- Al-Rayeq Electromechanical Contracting ERP
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CORE TABLES
-- ============================================================

-- Company info
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar TEXT NOT NULL,
  name_en TEXT,
  cr_number TEXT,
  vat_number TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','manager','engineer','supervisor','store_keeper','hr','accountant')),
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROJECT MANAGEMENT MODULE
-- ============================================================

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  client_contact TEXT,
  location TEXT,
  start_date DATE,
  end_date DATE,
  contract_value NUMERIC(15,2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','suspended','tender')),
  project_manager_id UUID REFERENCES users(id),
  site_engineer_id UUID REFERENCES users(id),
  description TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Work phases per project (شبكات، صواعد، تركيبات)
CREATE TABLE IF NOT EXISTS project_phases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_name TEXT NOT NULL,
  phase_type TEXT CHECK (phase_type IN ('networks','risers','fixtures','testing','commissioning','other')),
  description TEXT,
  planned_start DATE,
  planned_end DATE,
  actual_start DATE,
  actual_end DATE,
  planned_progress NUMERIC(5,2) DEFAULT 0,
  actual_progress NUMERIC(5,2) DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weekly progress updates
CREATE TABLE IF NOT EXISTS project_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES project_phases(id),
  report_date DATE NOT NULL,
  planned_percentage NUMERIC(5,2),
  actual_percentage NUMERIC(5,2),
  notes TEXT,
  reported_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ENGINEERING & ESTIMATION MODULE
-- ============================================================

-- Items catalog (مواد وأعمال)
CREATE TABLE IF NOT EXISTS items_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  category TEXT CHECK (category IN ('pipe','fitting','valve','pump','sprinkler','cable','panel','equipment','labor','other')),
  unit TEXT NOT NULL,
  standard_cost NUMERIC(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Estimations (عروض أسعار)
CREATE TABLE IF NOT EXISTS estimations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id),
  tender_name TEXT NOT NULL,
  tender_number TEXT,
  client_name TEXT,
  submission_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','submitted','won','lost','cancelled')),
  total_material_cost NUMERIC(15,2) DEFAULT 0,
  total_labor_cost NUMERIC(15,2) DEFAULT 0,
  overhead_percentage NUMERIC(5,2) DEFAULT 15,
  profit_percentage NUMERIC(5,2) DEFAULT 10,
  total_price NUMERIC(15,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BOQ Items per estimation
CREATE TABLE IF NOT EXISTS boq_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimation_id UUID NOT NULL REFERENCES estimations(id) ON DELETE CASCADE,
  item_catalog_id UUID REFERENCES items_catalog(id),
  description TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity NUMERIC(12,3) DEFAULT 0,
  material_unit_cost NUMERIC(12,2) DEFAULT 0,
  labor_unit_cost NUMERIC(12,2) DEFAULT 0,
  total_material_cost NUMERIC(15,2) GENERATED ALWAYS AS (quantity * material_unit_cost) STORED,
  total_labor_cost NUMERIC(15,2) GENERATED ALWAYS AS (quantity * labor_unit_cost) STORED,
  section TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROCUREMENT & INVENTORY MODULE
-- ============================================================

-- Warehouses (مخازن المواقع)
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  project_id UUID REFERENCES projects(id),
  location TEXT,
  keeper_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Material requests (طلبات المواد)
CREATE TABLE IF NOT EXISTS material_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_number TEXT UNIQUE NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id),
  warehouse_id UUID REFERENCES warehouses(id),
  requested_by UUID REFERENCES users(id),
  request_date DATE DEFAULT CURRENT_DATE,
  required_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','purchased','received')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('urgent','high','normal','low')),
  approved_by UUID REFERENCES users(id),
  approval_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Material request items
CREATE TABLE IF NOT EXISTS material_request_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES material_requests(id) ON DELETE CASCADE,
  item_catalog_id UUID REFERENCES items_catalog(id),
  description TEXT NOT NULL,
  unit TEXT NOT NULL,
  requested_quantity NUMERIC(12,3) DEFAULT 0,
  approved_quantity NUMERIC(12,3),
  unit_cost NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Material submittals (اعتمادات الاستشاري)
CREATE TABLE IF NOT EXISTS material_submittals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submittal_number TEXT UNIQUE NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id),
  item_description TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  origin TEXT,
  submitted_date DATE,
  consultant_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','approved_as_noted','rejected','resubmit')),
  response_date DATE,
  comments TEXT,
  submitted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory items in warehouse
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  item_catalog_id UUID REFERENCES items_catalog(id),
  item_code TEXT,
  description TEXT NOT NULL,
  unit TEXT NOT NULL,
  current_quantity NUMERIC(12,3) DEFAULT 0,
  min_quantity NUMERIC(12,3) DEFAULT 0,
  unit_cost NUMERIC(12,2) DEFAULT 0,
  location_in_warehouse TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory transactions (حركات المخزن)
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('in','out','transfer','adjustment')),
  quantity NUMERIC(12,3) NOT NULL,
  unit_cost NUMERIC(12,2),
  reference_type TEXT CHECK (reference_type IN ('material_request','purchase_order','return','manual')),
  reference_id UUID,
  notes TEXT,
  transaction_date DATE DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SUBCONTRACTORS & LABOR MODULE
-- ============================================================

-- Subcontractors
CREATE TABLE IF NOT EXISTS subcontractors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  specialty TEXT CHECK (specialty IN ('installation','welding','electrical','plumbing','testing','painting','civil','other')),
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  cr_number TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subcontractor contracts per project
CREATE TABLE IF NOT EXISTS subcontractor_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  contract_number TEXT,
  scope_of_work TEXT,
  contract_value NUMERIC(15,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  payment_terms TEXT,
  retention_percentage NUMERIC(5,2) DEFAULT 10,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','suspended','cancelled')),
  signed_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subcontractor IPCs (مستخلصات مقاولي الباطن)
CREATE TABLE IF NOT EXISTS subcontractor_ipc (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ipc_number TEXT NOT NULL,
  contract_id UUID NOT NULL REFERENCES subcontractor_contracts(id),
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  ipc_date DATE DEFAULT CURRENT_DATE,
  period_from DATE,
  period_to DATE,
  items_total NUMERIC(15,2) DEFAULT 0,
  retention_amount NUMERIC(15,2) DEFAULT 0,
  previous_payments NUMERIC(15,2) DEFAULT 0,
  net_payable NUMERIC(15,2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','paid','rejected')),
  approved_by UUID REFERENCES users(id),
  payment_date DATE,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- IPC line items
CREATE TABLE IF NOT EXISTS subcontractor_ipc_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ipc_id UUID NOT NULL REFERENCES subcontractor_ipc(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  unit TEXT NOT NULL,
  contract_quantity NUMERIC(12,3),
  executed_quantity NUMERIC(12,3) DEFAULT 0,
  unit_rate NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(15,2) GENERATED ALWAYS AS (executed_quantity * unit_rate) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily labor workers
CREATE TABLE IF NOT EXISTS daily_labor (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  nationality TEXT,
  skill TEXT CHECK (skill IN ('welder','installer','helper','driver','supervisor','technician','other')),
  id_number TEXT,
  phone TEXT,
  daily_rate NUMERIC(8,2) DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Labor attendance per day
CREATE TABLE IF NOT EXISTS labor_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID NOT NULL REFERENCES daily_labor(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  attendance_date DATE NOT NULL,
  is_present BOOLEAN DEFAULT TRUE,
  hours_worked NUMERIC(4,1) DEFAULT 8,
  overtime_hours NUMERIC(4,1) DEFAULT 0,
  daily_rate NUMERIC(8,2),
  overtime_rate NUMERIC(8,2),
  total_pay NUMERIC(10,2),
  notes TEXT,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(worker_id, attendance_date, project_id)
);

-- ============================================================
-- FINANCE & INVOICING MODULE
-- ============================================================

-- Client IPC (مستخلصات العميل)
CREATE TABLE IF NOT EXISTS client_ipc (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ipc_number TEXT NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id),
  ipc_date DATE DEFAULT CURRENT_DATE,
  period_from DATE,
  period_to DATE,
  items_total NUMERIC(15,2) DEFAULT 0,
  vat_percentage NUMERIC(5,2) DEFAULT 15,
  vat_amount NUMERIC(15,2) DEFAULT 0,
  retention_percentage NUMERIC(5,2) DEFAULT 10,
  retention_amount NUMERIC(15,2) DEFAULT 0,
  previous_payments NUMERIC(15,2) DEFAULT 0,
  net_payable NUMERIC(15,2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','submitted','consultant_approved','client_approved','paid','rejected')),
  submitted_date DATE,
  consultant_approval_date DATE,
  client_approval_date DATE,
  payment_received_date DATE,
  payment_amount NUMERIC(15,2),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client IPC items
CREATE TABLE IF NOT EXISTS client_ipc_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ipc_id UUID NOT NULL REFERENCES client_ipc(id) ON DELETE CASCADE,
  boq_item_id UUID REFERENCES boq_items(id),
  description TEXT NOT NULL,
  unit TEXT NOT NULL,
  contract_quantity NUMERIC(12,3),
  previous_quantity NUMERIC(12,3) DEFAULT 0,
  current_quantity NUMERIC(12,3) DEFAULT 0,
  total_quantity NUMERIC(12,3) GENERATED ALWAYS AS (previous_quantity + current_quantity) STORED,
  unit_rate NUMERIC(12,2) DEFAULT 0,
  current_amount NUMERIC(15,2) GENERATED ALWAYS AS (current_quantity * unit_rate) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project expenses
CREATE TABLE IF NOT EXISTS project_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id),
  expense_date DATE DEFAULT CURRENT_DATE,
  category TEXT CHECK (category IN ('material','labor','subcontractor','equipment','transport','overhead','other')),
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  supplier TEXT,
  invoice_number TEXT,
  approved_by UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MAINTENANCE MODULE
-- ============================================================

-- Maintenance contracts
CREATE TABLE IF NOT EXISTS maintenance_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_number TEXT UNIQUE NOT NULL,
  project_id UUID REFERENCES projects(id),
  client_name TEXT NOT NULL,
  client_contact TEXT,
  client_phone TEXT,
  site_address TEXT,
  system_type TEXT CHECK (system_type IN ('fire_pump','fire_network','sprinkler','alarm','all')),
  start_date DATE,
  end_date DATE,
  annual_value NUMERIC(12,2),
  visit_frequency TEXT CHECK (visit_frequency IN ('monthly','quarterly','biannual','annual')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','expired','cancelled','renewal_pending')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance visits
CREATE TABLE IF NOT EXISTS maintenance_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES maintenance_contracts(id),
  scheduled_date DATE NOT NULL,
  actual_date DATE,
  technician_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','missed','rescheduled')),
  findings TEXT,
  work_done TEXT,
  spare_parts_used TEXT,
  client_signature BOOLEAN DEFAULT FALSE,
  next_visit_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fault tickets (بلاغات الأعطال)
CREATE TABLE IF NOT EXISTS fault_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number TEXT UNIQUE NOT NULL,
  contract_id UUID REFERENCES maintenance_contracts(id),
  client_name TEXT NOT NULL,
  site_address TEXT,
  reported_by TEXT,
  phone TEXT,
  report_date TIMESTAMPTZ DEFAULT NOW(),
  fault_description TEXT NOT NULL,
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('emergency','urgent','normal')),
  assigned_technician_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'open' CHECK (status IN ('open','assigned','in_progress','resolved','closed')),
  resolution_notes TEXT,
  resolved_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HR MODULE
-- ============================================================

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  manager_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_number TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  full_name_en TEXT,
  nationality TEXT,
  id_number TEXT,
  iqama_number TEXT,
  iqama_expiry DATE,
  passport_number TEXT,
  passport_expiry DATE,
  date_of_birth DATE,
  hire_date DATE,
  job_title TEXT,
  department_id UUID REFERENCES departments(id),
  employment_type TEXT DEFAULT 'full_time' CHECK (employment_type IN ('full_time','part_time','contract','daily')),
  base_salary NUMERIC(10,2) DEFAULT 0,
  housing_allowance NUMERIC(10,2) DEFAULT 0,
  transport_allowance NUMERIC(10,2) DEFAULT 0,
  other_allowances NUMERIC(10,2) DEFAULT 0,
  bank_account TEXT,
  bank_name TEXT,
  iban TEXT,
  phone TEXT,
  email TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','on_leave','terminated')),
  user_id UUID REFERENCES users(id),
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project-based salary allocations
CREATE TABLE IF NOT EXISTS salary_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  allocation_percentage NUMERIC(5,2) NOT NULL,
  allocated_amount NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, project_id, month, year)
);

-- Attendance records (GPS/Biometric)
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  project_id UUID REFERENCES projects(id),
  attendance_date DATE NOT NULL,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  check_in_latitude NUMERIC(10,7),
  check_in_longitude NUMERIC(10,7),
  check_out_latitude NUMERIC(10,7),
  check_out_longitude NUMERIC(10,7),
  attendance_type TEXT DEFAULT 'present' CHECK (attendance_type IN ('present','absent','late','half_day','leave','holiday')),
  overtime_hours NUMERIC(4,1) DEFAULT 0,
  source TEXT DEFAULT 'manual' CHECK (source IN ('gps','biometric','manual')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, attendance_date)
);

-- Monthly payroll
CREATE TABLE IF NOT EXISTS payroll (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  working_days INTEGER DEFAULT 30,
  actual_days INTEGER DEFAULT 30,
  absent_days INTEGER DEFAULT 0,
  base_salary NUMERIC(10,2),
  housing_allowance NUMERIC(10,2),
  transport_allowance NUMERIC(10,2),
  other_allowances NUMERIC(10,2),
  overtime_amount NUMERIC(10,2) DEFAULT 0,
  deductions NUMERIC(10,2) DEFAULT 0,
  net_salary NUMERIC(10,2),
  gosi_employee NUMERIC(10,2) DEFAULT 0,
  gosi_employer NUMERIC(10,2) DEFAULT 0,
  payment_date DATE,
  payment_method TEXT CHECK (payment_method IN ('bank','cash','check')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','approved','paid')),
  approved_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, month, year)
);

-- Overtime requests
CREATE TABLE IF NOT EXISTS overtime_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  project_id UUID REFERENCES projects(id),
  request_date DATE DEFAULT CURRENT_DATE,
  overtime_date DATE NOT NULL,
  hours_requested NUMERIC(4,1) NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  requested_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approval_date DATE,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Personal assets (العهد الشخصية)
CREATE TABLE IF NOT EXISTS personal_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_code TEXT UNIQUE NOT NULL,
  asset_name TEXT NOT NULL,
  asset_type TEXT CHECK (asset_type IN ('tool','vehicle','laptop','phone','equipment','key','other')),
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  purchase_date DATE,
  purchase_cost NUMERIC(10,2),
  assigned_to UUID REFERENCES employees(id),
  project_id UUID REFERENCES projects(id),
  assignment_date DATE,
  expected_return_date DATE,
  condition TEXT CHECK (condition IN ('new','good','fair','poor','damaged')),
  status TEXT DEFAULT 'available' CHECK (status IN ('available','assigned','maintenance','lost','retired')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employee documents (وثائق وتراخيص)
CREATE TABLE IF NOT EXISTS employee_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  document_type TEXT CHECK (document_type IN ('iqama','passport','osha','driving_license','vehicle_license','health_card','contract','other')),
  document_number TEXT,
  issue_date DATE,
  expiry_date DATE,
  issuing_authority TEXT,
  file_url TEXT,
  status TEXT DEFAULT 'valid' CHECK (status IN ('valid','expired','expiring_soon')),
  alert_days_before INTEGER DEFAULT 30,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment documents (تراخيص المعدات)
CREATE TABLE IF NOT EXISTS equipment_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_name TEXT NOT NULL,
  asset_id UUID REFERENCES personal_assets(id),
  document_type TEXT CHECK (document_type IN ('vehicle_registration','insurance','inspection','permit','other')),
  document_number TEXT,
  issue_date DATE,
  expiry_date DATE,
  file_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS / ALERTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  message TEXT,
  type TEXT CHECK (type IN ('alert','info','warning','success','error')),
  module TEXT CHECK (module IN ('projects','hr','finance','procurement','maintenance','subcontractors')),
  reference_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employee Loans (سلفيات الموظفين)
CREATE TABLE IF NOT EXISTS employee_loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  loan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(10,2) NOT NULL,
  monthly_deduction NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  repayment_method TEXT DEFAULT 'salary_deduction' CHECK (repayment_method IN ('salary_deduction','cash','other')),
  status TEXT DEFAULT 'active' CHECK (status IN ('pending','active','paid')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company Debts & Project Financing (مديونيات الشركة وتمويل المشاريع)
CREATE TABLE IF NOT EXISTS company_debts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creditor_name TEXT NOT NULL,
  debt_type TEXT NOT NULL DEFAULT 'other' CHECK (debt_type IN ('project_finance','subcontractor_ipc','supplier_invoice','other')),
  subcontractor_id UUID REFERENCES subcontractors(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE,
  paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid','partially_paid','paid')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VIEWS (Useful aggregated views)
-- ============================================================

-- Project summary view
CREATE OR REPLACE VIEW project_summary AS
SELECT 
  p.id,
  p.name,
  p.code,
  p.client_name,
  p.status,
  p.contract_value,
  p.start_date,
  p.end_date,
  COALESCE(AVG(pp.actual_percentage), 0) AS avg_actual_progress,
  COALESCE(AVG(pp.planned_percentage), 0) AS avg_planned_progress,
  COALESCE(SUM(pe.amount), 0) AS total_expenses,
  COALESCE(SUM(ci.net_payable), 0) AS total_invoiced
FROM projects p
LEFT JOIN project_progress pp ON pp.project_id = p.id
LEFT JOIN project_expenses pe ON pe.project_id = p.id
LEFT JOIN client_ipc ci ON ci.project_id = p.id AND ci.status IN ('client_approved','paid')
GROUP BY p.id, p.name, p.code, p.client_name, p.status, p.contract_value, p.start_date, p.end_date;

-- Document expiry alerts view
CREATE OR REPLACE VIEW document_expiry_alerts AS
SELECT 
  e.full_name,
  e.employee_number,
  d.document_type,
  d.document_number,
  d.expiry_date,
  (d.expiry_date - CURRENT_DATE) AS days_remaining,
  CASE 
    WHEN d.expiry_date < CURRENT_DATE THEN 'expired'
    WHEN d.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE 'valid'
  END AS alert_status
FROM employee_documents d
JOIN employees e ON e.id = d.employee_id
WHERE d.expiry_date IS NOT NULL
ORDER BY d.expiry_date ASC;

-- Labor cost by project view
CREATE OR REPLACE VIEW labor_cost_by_project AS
SELECT 
  p.id AS project_id,
  p.name AS project_name,
  COALESCE(SUM(la.total_pay), 0) AS daily_labor_total,
  COALESCE(SUM(sa.allocated_amount), 0) AS salary_allocated_total,
  COUNT(DISTINCT la.worker_id) AS daily_workers_count
FROM projects p
LEFT JOIN labor_attendance la ON la.project_id = p.id
LEFT JOIN salary_allocations sa ON sa.project_id = p.id
GROUP BY p.id, p.name;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Insert sample company
INSERT INTO companies (name_ar, name_en, cr_number, phone, email)
VALUES ('الرايق للمقاولات الكهروميكانيكية', 'Al-Rayeq Electromechanical Contracting', '1010123456', '+966-11-000-0000', 'info@alrayeq.com')
ON CONFLICT DO NOTHING;

-- Insert sample departments
INSERT INTO departments (name) VALUES
('الإدارة العليا'),
('الهندسة والتصميم'),
('إدارة المشاريع'),
('المشتريات والمخازن'),
('الموارد البشرية'),
('المالية والحسابات'),
('الصيانة')
ON CONFLICT DO NOTHING;

-- Insert admin user
INSERT INTO users (full_name, email, role) VALUES
('مدير النظام', 'admin@alrayeq.com', 'admin'),
('محمد العمري', 'manager@alrayeq.com', 'manager'),
('أحمد الزهراني', 'engineer1@alrayeq.com', 'engineer'),
('سالم الغامدي', 'supervisor1@alrayeq.com', 'supervisor'),
('خالد المطيري', 'store1@alrayeq.com', 'store_keeper'),
('نورة السهلي', 'hr@alrayeq.com', 'hr'),
('ريم الحربي', 'accountant@alrayeq.com', 'accountant')
ON CONFLICT DO NOTHING;

-- Sample items catalog
INSERT INTO items_catalog (code, name_ar, name_en, category, unit, standard_cost) VALUES
('PIPE-SCH40-2', 'ماسورة حريق 2 بوصة جدول 40', 'Fire Pipe 2" Sch40', 'pipe', 'م.ط', 85),
('PIPE-SCH40-3', 'ماسورة حريق 3 بوصة جدول 40', 'Fire Pipe 3" Sch40', 'pipe', 'م.ط', 125),
('PIPE-SCH40-4', 'ماسورة حريق 4 بوصة جدول 40', 'Fire Pipe 4" Sch40', 'pipe', 'م.ط', 180),
('PIPE-SCH40-6', 'ماسورة حريق 6 بوصة جدول 40', 'Fire Pipe 6" Sch40', 'pipe', 'م.ط', 280),
('SPR-PND-UP-K5', 'رشاش رأسي معلق K=5.6', 'Pendant Sprinkler K5.6', 'sprinkler', 'قطعة', 35),
('SPR-UPR-K5', 'رشاش رأسي علوي K=5.6', 'Upright Sprinkler K5.6', 'sprinkler', 'قطعة', 32),
('PUMP-FIRE-50HP', 'مضخة حريق رئيسية 50 HP', 'Fire Pump 50 HP', 'pump', 'مجموعة', 45000),
('PUMP-JOCKEY-5HP', 'مضخة ضغط 5 HP', 'Jockey Pump 5 HP', 'pump', 'مجموعة', 8500),
('VALVE-OS&Y-2', 'صمام عزل 2 بوصة OS&Y', 'OS&Y Gate Valve 2"', 'valve', 'قطعة', 350),
('VALVE-BFV-4', 'صمام فراشة 4 بوصة', 'Butterfly Valve 4"', 'valve', 'قطعة', 420),
('HANGER-2', 'معلق ماسورة 2 بوصة', 'Pipe Hanger 2"', 'fitting', 'قطعة', 25),
('FBX-INSTALL', 'مصنعية تركيب', 'Installation Labor', 'labor', 'م.ط', 15),
('FBX-WELD', 'مصنعية لحام', 'Welding Labor', 'labor', 'نقطة', 45)
ON CONFLICT DO NOTHING;

-- Sample projects
INSERT INTO projects (name, code, client_name, location, start_date, end_date, contract_value, status)
VALUES
('مشروع مجمع الأمير فيصل السكني - شبكات الحريق', 'PRJ-2024-001', 'مجموعة التطوير العقاري', 'الرياض - حي العليا', '2024-01-15', '2024-12-31', 2850000, 'active'),
('مشروع مستشفى الشرق الطبي - نظام الإطفاء', 'PRJ-2024-002', 'مستشفى الشرق الطبي', 'جدة - حي الروضة', '2024-03-01', '2025-03-01', 1750000, 'active'),
('مشروع برج التجارة - رشاشات وشبكة حريق', 'PRJ-2024-003', 'شركة الأبراج التجارية', 'الرياض - طريق الملك فهد', '2024-06-01', '2025-06-01', 3200000, 'active'),
('مشروع مجمع الواجهة التجارية - مضخات الحريق', 'PRJ-2023-005', 'مجموعة الواجهة', 'الدمام - الكورنيش', '2023-09-01', '2024-09-01', 980000, 'completed')
ON CONFLICT DO NOTHING;

-- Sample subcontractors
INSERT INTO subcontractors (name, specialty, contact_person, phone, rating) VALUES
('شركة النجوم للتركيبات', 'installation', 'عبدالله الشمري', '0555000111', 4),
('مؤسسة الخليج للحام', 'welding', 'محمد العتيبي', '0555000222', 5),
('شركة التقنية للكهرباء', 'electrical', 'سعد الدوسري', '0555000333', 4),
('مؤسسة الحرفي للصيانة', 'testing', 'فهد القحطاني', '0555000444', 3)
-- ============================================================
-- USER PERMISSIONS & APPROVAL WORKFLOW MODULE
-- ============================================================

-- User permissions table for secondary users
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  can_view BOOLEAN DEFAULT TRUE,
  can_create BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  requires_approval BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module)
);

-- Pending approvals queue for actions requiring admin confirmation
CREATE TABLE IF NOT EXISTS pending_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID REFERENCES users(id),
  requester_name TEXT NOT NULL,
  requester_role TEXT DEFAULT 'secondary',
  module TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('CREATE', 'UPDATE', 'DELETE')),
  entity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  details JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMIT;

