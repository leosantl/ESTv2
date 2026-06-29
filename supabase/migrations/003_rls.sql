-- ====================================================================
-- 003_rls.sql
-- Row-Level Security (RLS) - Multi-tenant isolation
-- ====================================================================

ALTER TABLE companies           ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices            ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients             ENABLE ROW LEVEL SECURITY;
ALTER TABLE weapons             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ammo_stock          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ammo_movements      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lanes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules           ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents           ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION my_company_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT role = 'super_admin' FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION has_role(required_role user_role)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT role = required_role OR role = 'company_admin' OR role = 'super_admin'
  FROM profiles WHERE id = auth.uid()
$$;

-- Plans: public read
CREATE POLICY plans_public_read ON plans
  FOR SELECT USING (active = TRUE);

-- Companies: super_admin all, own company read, admin update
CREATE POLICY companies_super_admin ON companies
  FOR ALL USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY companies_own_read ON companies
  FOR SELECT USING (id = my_company_id());

CREATE POLICY companies_own_update ON companies
  FOR UPDATE USING (id = my_company_id() AND has_role('company_admin'))
  WITH CHECK (id = my_company_id());

-- Profiles: read own + company, update own
CREATE POLICY profiles_read ON profiles
  FOR SELECT USING (
    id = auth.uid() OR
    company_id = my_company_id() OR
    is_super_admin()
  );

CREATE POLICY profiles_update ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Subscriptions: read own, super_admin all
CREATE POLICY subs_read ON subscriptions
  FOR SELECT USING (
    company_id = my_company_id() OR is_super_admin()
  );

CREATE POLICY subs_update ON subscriptions
  FOR UPDATE USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Invoices
CREATE POLICY invoices_read ON invoices
  FOR SELECT USING (
    company_id = my_company_id() OR is_super_admin()
  );

-- Payments
CREATE POLICY payments_read ON payments
  FOR SELECT USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE company_id = my_company_id()
    ) OR is_super_admin()
  );

-- Audit logs
CREATE POLICY audit_read ON audit_logs
  FOR SELECT USING (
    company_id = my_company_id() OR is_super_admin()
  );

-- Macro: standard 5-policy set for company data tables
-- SELECT, INSERT (with company_id), UPDATE, DELETE, own company
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'clients', 'weapons', 'ammo_stock', 'ammo_movements',
    'lanes', 'schedules', 'finance_categories', 'finance_entries', 'documents'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- SELECT
    EXECUTE format('CREATE POLICY %I_select ON %I FOR SELECT USING (company_id = my_company_id())',
                   tbl||'_rls', tbl);
    -- INSERT
    EXECUTE format('CREATE POLICY %I_insert ON %I FOR INSERT WITH CHECK (company_id = my_company_id())',
                   tbl||'_rls', tbl);
    -- UPDATE
    EXECUTE format('CREATE POLICY %I_update ON %I FOR UPDATE USING (company_id = my_company_id()) WITH CHECK (company_id = my_company_id())',
                   tbl||'_rls', tbl);
    -- DELETE
    EXECUTE format('CREATE POLICY %I_delete ON %I FOR DELETE USING (company_id = my_company_id())',
                   tbl||'_rls', tbl);
  END LOOP;
END $$;
