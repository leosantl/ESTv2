-- ====================================================================
-- 007_units.sql
-- Multi-unidade: unidades por empresa (Enterprise)
-- ====================================================================

CREATE TABLE IF NOT EXISTS units (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nome        TEXT        NOT NULL,
  cidade      TEXT,
  estado      CHAR(2),
  telefone    TEXT,
  email       TEXT,
  endereco    TEXT,
  responsavel TEXT,
  ativo       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_units_upd ON units;
CREATE TRIGGER trg_units_upd BEFORE UPDATE ON units
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_units_company ON units(company_id);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id) ON DELETE SET NULL;

ALTER TABLE units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "units_company" ON units;
CREATE POLICY "units_company" ON units
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1)
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  )
  WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1)
  );
