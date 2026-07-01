-- ============================================================
-- R&R Auth Setup & Role-Based Access Control
-- RUN THIS AFTER creating all 3 auth accounts in Supabase dashboard
-- ============================================================
-- Accounts needed (Authentication → Users → Add user):
--   rohan.rahman.2307@gmail.com   → owner
--   afeef.zarraf2006@gmail.com    → employee
--   sheikhfaizaan387@gmail.com    → employee
-- ============================================================

-- ── STEP 1: Schema additions ─────────────────────────────────
-- Link employees to the clients and projects they own

ALTER TABLE clients  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES employees(id) ON DELETE SET NULL;

-- ── STEP 2: Add role column to user_organizations ────────────
-- Default 'employee' so any new sign-ups are restricted by default

ALTER TABLE user_organizations
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'employee'
  CHECK (role IN ('owner', 'employee'));

-- ── STEP 3: Set Rohan as owner ───────────────────────────────

UPDATE user_organizations
SET role = 'owner'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'rohan.rahman.2307@gmail.com');

-- ── STEP 4: Link Afeef + Faizaan auth accounts → employee records

UPDATE employees
SET user_id = (SELECT id FROM auth.users WHERE email = 'afeef.zarraf2006@gmail.com')
WHERE id = 'b8726cb7-6aca-4b29-aa8b-022cd00f7424';

UPDATE employees
SET user_id = (SELECT id FROM auth.users WHERE email = 'sheikhfaizaan387@gmail.com')
WHERE id = 'b55b177c-3dc8-47a8-b63a-dde4c98da7c7';

-- ── STEP 5: Role-aware RLS ───────────────────────────────────

-- ── CRM LEADS ────────────────────────────────────────────────
-- Owner: full access
-- Employee: SELECT all org leads (collaborate on pipeline)
--           INSERT/UPDATE only their own leads (commission tracking)

DROP POLICY IF EXISTS "org_crm_leads_select" ON crm_leads;
DROP POLICY IF EXISTS "org_crm_leads_insert" ON crm_leads;
DROP POLICY IF EXISTS "org_crm_leads_update" ON crm_leads;
DROP POLICY IF EXISTS "org_crm_leads_delete" ON crm_leads;

CREATE POLICY "crm_leads_owner" ON crm_leads FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = auth.uid() AND role = 'owner' AND organization_id = crm_leads.organization_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = auth.uid() AND role = 'owner' AND organization_id = crm_leads.organization_id
  ));

CREATE POLICY "crm_leads_employee_select" ON crm_leads FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
  ));

CREATE POLICY "crm_leads_employee_insert" ON crm_leads FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid())
    AND employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

CREATE POLICY "crm_leads_employee_update" ON crm_leads FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid())
    AND employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- ── CLIENTS ──────────────────────────────────────────────────
-- Owner: full access
-- Employee: only clients assigned to them (assigned_to = their employee record)

DROP POLICY IF EXISTS "org_clients_select" ON clients;
DROP POLICY IF EXISTS "org_clients_insert" ON clients;
DROP POLICY IF EXISTS "org_clients_update" ON clients;
DROP POLICY IF EXISTS "org_clients_delete" ON clients;

CREATE POLICY "clients_owner" ON clients FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = auth.uid() AND role = 'owner' AND organization_id = clients.organization_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = auth.uid() AND role = 'owner' AND organization_id = clients.organization_id
  ));

CREATE POLICY "clients_employee_select" ON clients FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid())
    AND assigned_to IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- ── PROJECTS ─────────────────────────────────────────────────
-- Owner: full access
-- Employee: only projects assigned to them

DROP POLICY IF EXISTS "org_projects_select" ON projects;
DROP POLICY IF EXISTS "org_projects_insert" ON projects;
DROP POLICY IF EXISTS "org_projects_update" ON projects;
DROP POLICY IF EXISTS "org_projects_delete" ON projects;

CREATE POLICY "projects_owner" ON projects FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = auth.uid() AND role = 'owner' AND organization_id = projects.organization_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = auth.uid() AND role = 'owner' AND organization_id = projects.organization_id
  ));

CREATE POLICY "projects_employee_select" ON projects FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid())
    AND assigned_to IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- ── TRANSACTIONS ─────────────────────────────────────────────
-- Owner only — employees have zero access to financial data

DROP POLICY IF EXISTS "org_transactions_select" ON transactions;
DROP POLICY IF EXISTS "org_transactions_insert" ON transactions;
DROP POLICY IF EXISTS "org_transactions_update" ON transactions;
DROP POLICY IF EXISTS "org_transactions_delete" ON transactions;

CREATE POLICY "transactions_owner" ON transactions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = auth.uid() AND role = 'owner' AND organization_id = transactions.organization_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = auth.uid() AND role = 'owner' AND organization_id = transactions.organization_id
  ));

-- ── INVOICES ─────────────────────────────────────────────────
-- Owner only — employees have zero access

DROP POLICY IF EXISTS "org_invoices_select" ON invoices;
DROP POLICY IF EXISTS "org_invoices_insert" ON invoices;
DROP POLICY IF EXISTS "org_invoices_update" ON invoices;
DROP POLICY IF EXISTS "org_invoices_delete" ON invoices;

CREATE POLICY "invoices_owner" ON invoices FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = auth.uid() AND role = 'owner' AND organization_id = invoices.organization_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = auth.uid() AND role = 'owner' AND organization_id = invoices.organization_id
  ));

-- ── EMPLOYEES ────────────────────────────────────────────────
-- Owner: full access. Employees: own record only

DROP POLICY IF EXISTS "org_employees_select" ON employees;
DROP POLICY IF EXISTS "org_employees_insert" ON employees;
DROP POLICY IF EXISTS "org_employees_update" ON employees;
DROP POLICY IF EXISTS "org_employees_delete" ON employees;

CREATE POLICY "employees_owner" ON employees FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = auth.uid() AND role = 'owner' AND organization_id = employees.organization_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = auth.uid() AND role = 'owner' AND organization_id = employees.organization_id
  ));

CREATE POLICY "employees_self_select" ON employees FOR SELECT
  USING (user_id = auth.uid());

-- ── TASKS ────────────────────────────────────────────────────
-- Owner: full access. Employees: see + update tasks assigned to them

DROP POLICY IF EXISTS "org_tasks_select" ON tasks;
DROP POLICY IF EXISTS "org_tasks_insert" ON tasks;
DROP POLICY IF EXISTS "org_tasks_update" ON tasks;
DROP POLICY IF EXISTS "org_tasks_delete" ON tasks;

CREATE POLICY "tasks_owner" ON tasks FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = auth.uid() AND role = 'owner' AND organization_id = tasks.organization_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = auth.uid() AND role = 'owner' AND organization_id = tasks.organization_id
  ));

CREATE POLICY "tasks_employee_select" ON tasks FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid())
    AND assigned_to IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

CREATE POLICY "tasks_employee_update" ON tasks FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid())
    AND assigned_to IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- ── MESSAGES ─────────────────────────────────────────────────
-- Owner: full access. Employees: own thread only

DROP POLICY IF EXISTS "org_messages_select" ON messages;
DROP POLICY IF EXISTS "org_messages_insert" ON messages;
DROP POLICY IF EXISTS "org_messages_update" ON messages;
DROP POLICY IF EXISTS "org_messages_delete" ON messages;

CREATE POLICY "messages_owner" ON messages FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = auth.uid() AND role = 'owner' AND organization_id = messages.organization_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = auth.uid() AND role = 'owner' AND organization_id = messages.organization_id
  ));

CREATE POLICY "messages_employee_select" ON messages FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid())
    AND employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

CREATE POLICY "messages_employee_insert" ON messages FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid())
    AND employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- ============================================================
-- VERIFY after running:
-- SELECT u.email, uo.role FROM auth.users u JOIN user_organizations uo ON u.id = uo.user_id;
-- SELECT name, email, user_id FROM employees ORDER BY name;
-- SELECT id, name, assigned_to FROM clients LIMIT 5;
-- ============================================================
