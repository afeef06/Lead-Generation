-- ============================================================
-- Patch: broaden employees SELECT policy from self-only to org-wide
-- ============================================================
-- auth-setup.sql's original "employees_self_select" policy only let
-- an employee read their own row. But assign-to dropdowns (clients,
-- projects pages) and the messages page all need the full active
-- roster, not just the caller's own record. Run this once in the
-- Supabase SQL Editor to swap the policy.
-- ============================================================

DROP POLICY IF EXISTS "employees_self_select" ON employees;

CREATE POLICY "employees_org_select" ON employees FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
  ));

-- ============================================================
-- VERIFY after running:
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'employees';
-- Should show: employees_owner (ALL), employees_org_select (SELECT)
-- ============================================================
