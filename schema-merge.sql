-- ============================================================
-- R&R Unified Business Hub — Schema Migration
-- Run this in the LEAD GEN Supabase project SQL Editor
-- ============================================================
-- This adds all Business Hub tables to the Lead Gen Supabase,
-- scoped to organization_id with proper RLS.
-- The Business Hub's 'leads' table is named 'crm_leads' here
-- to avoid collision with the Lead Gen's 'leads' table.
-- ============================================================

-- CRM Leads (Business Hub's 'leads', renamed)
CREATE TABLE IF NOT EXISTS crm_leads (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id         UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  company_name            TEXT NOT NULL,
  industry                TEXT,
  contact_person          TEXT,
  contact_email           TEXT,
  contact_phone           TEXT,
  contact_socials         TEXT,
  employee_id             UUID,
  employee_name           TEXT,
  outreach_status         TEXT NOT NULL DEFAULT 'not_contacted'
    CHECK (outreach_status IN (
      'not_contacted','contacted','responded',
      'meeting_booked','proposal_sent','negotiating',
      'closed_won','closed_lost'
    )),
  date_contacted          DATE,
  follow_up_date          DATE,
  lead_temperature        TEXT DEFAULT 'cold'
    CHECK (lead_temperature IN ('cold','warm','hot')),
  notes                   TEXT,
  services_pitched        TEXT,
  deal_status             TEXT DEFAULT 'new'
    CHECK (deal_status IN ('new','in_progress','proposal','closed_won','closed_lost')),
  is_signed               BOOLEAN DEFAULT FALSE,
  contract_value          DECIMAL(10,2) DEFAULT 0,
  monthly_recurring_revenue DECIMAL(10,2) DEFAULT 0,
  commission_amount       DECIMAL(10,2) DEFAULT 0,
  next_action             TEXT,
  close_probability       INTEGER DEFAULT 0
    CHECK (close_probability >= 0 AND close_probability <= 100),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id  UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name             TEXT NOT NULL,
  email            TEXT,
  phone            TEXT,
  company          TEXT,
  service_type     TEXT NOT NULL DEFAULT 'other',
  acquisition_source TEXT DEFAULT 'other',
  status           TEXT NOT NULL DEFAULT 'lead',
  monthly_value    DECIMAL(10,2) DEFAULT 0,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Finance / Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount          DECIMAL(10,2) NOT NULL,
  category        TEXT NOT NULL,
  description     TEXT,
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name            TEXT NOT NULL,
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  service_type    TEXT NOT NULL DEFAULT 'other',
  status          TEXT NOT NULL DEFAULT 'planning',
  start_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date        DATE,
  value           DECIMAL(10,2) DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Employees (team members with auth linkage)
CREATE TABLE IF NOT EXISTS employees (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id  UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name             TEXT NOT NULL,
  email            TEXT,
  phone            TEXT,
  role             TEXT DEFAULT 'Sales Rep',
  commission_rate  DECIMAL(5,2) DEFAULT 10.0,
  active           BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  invoice_number  TEXT NOT NULL,
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name     TEXT,
  amount          DECIMAL(10,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'paid', 'overdue')),
  due_date        DATE,
  issued_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  assigned_to     UUID REFERENCES employees(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in-progress', 'done')),
  priority        TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('high', 'medium', 'low')),
  due_date        DATE,
  ai_generated    BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Messages (team <-> employee)
CREATE TABLE IF NOT EXISTS messages (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  employee_id     UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  sender          TEXT NOT NULL DEFAULT 'admin' CHECK (sender IN ('admin', 'employee')),
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── auto-update updated_at on crm_leads ─────────────────────

CREATE OR REPLACE FUNCTION update_crm_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER crm_leads_updated_at
  BEFORE UPDATE ON crm_leads
  FOR EACH ROW EXECUTE FUNCTION update_crm_leads_updated_at();

-- ── Row Level Security ───────────────────────────────────────

ALTER TABLE crm_leads    ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects     ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees    ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages     ENABLE ROW LEVEL SECURITY;

-- Shared org-scope helper (re-used in all policies)
-- All policies check that the row's organization_id matches
-- an org the authenticated user belongs to.

CREATE POLICY "org_crm_leads_select"    ON crm_leads    FOR SELECT USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));
CREATE POLICY "org_crm_leads_insert"    ON crm_leads    FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));
CREATE POLICY "org_crm_leads_update"    ON crm_leads    FOR UPDATE USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));
CREATE POLICY "org_crm_leads_delete"    ON crm_leads    FOR DELETE USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));

CREATE POLICY "org_clients_select"      ON clients      FOR SELECT USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));
CREATE POLICY "org_clients_insert"      ON clients      FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));
CREATE POLICY "org_clients_update"      ON clients      FOR UPDATE USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));
CREATE POLICY "org_clients_delete"      ON clients      FOR DELETE USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));

CREATE POLICY "org_transactions_select" ON transactions FOR SELECT USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));
CREATE POLICY "org_transactions_insert" ON transactions FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));
CREATE POLICY "org_transactions_update" ON transactions FOR UPDATE USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));
CREATE POLICY "org_transactions_delete" ON transactions FOR DELETE USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));

CREATE POLICY "org_projects_select"     ON projects     FOR SELECT USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));
CREATE POLICY "org_projects_insert"     ON projects     FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));
CREATE POLICY "org_projects_update"     ON projects     FOR UPDATE USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));
CREATE POLICY "org_projects_delete"     ON projects     FOR DELETE USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));

CREATE POLICY "org_employees_select"    ON employees    FOR SELECT USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));
CREATE POLICY "org_employees_insert"    ON employees    FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));
CREATE POLICY "org_employees_update"    ON employees    FOR UPDATE USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));
CREATE POLICY "org_employees_delete"    ON employees    FOR DELETE USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));

CREATE POLICY "org_invoices_select"     ON invoices     FOR SELECT USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));
CREATE POLICY "org_invoices_insert"     ON invoices     FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));
CREATE POLICY "org_invoices_update"     ON invoices     FOR UPDATE USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));
CREATE POLICY "org_invoices_delete"     ON invoices     FOR DELETE USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));

CREATE POLICY "org_tasks_select"        ON tasks        FOR SELECT USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));
CREATE POLICY "org_tasks_insert"        ON tasks        FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));
CREATE POLICY "org_tasks_update"        ON tasks        FOR UPDATE USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));
CREATE POLICY "org_tasks_delete"        ON tasks        FOR DELETE USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));

CREATE POLICY "org_messages_select"     ON messages     FOR SELECT USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));
CREATE POLICY "org_messages_insert"     ON messages     FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));
CREATE POLICY "org_messages_update"     ON messages     FOR UPDATE USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));
CREATE POLICY "org_messages_delete"     ON messages     FOR DELETE USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));
