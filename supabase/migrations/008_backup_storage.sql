-- 008_backup_storage.sql

ALTER TABLE plans ADD COLUMN IF NOT EXISTS storage_gb INTEGER NOT NULL DEFAULT 1;
UPDATE plans SET storage_gb = 1   WHERE id = 'starter';
UPDATE plans SET storage_gb = 10  WHERE id = 'professional';
UPDATE plans SET storage_gb = 100 WHERE id = 'enterprise';

CREATE OR REPLACE VIEW company_storage_usage AS
SELECT company_id,
       COUNT(*) AS document_count,
       COALESCE(SUM(file_size_bytes), 0) AS total_bytes,
       ROUND(COALESCE(SUM(file_size_bytes), 0)::NUMERIC / (1024*1024*1024), 4) AS total_gb
FROM documents GROUP BY company_id;

CREATE TABLE IF NOT EXISTS backup_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by  UUID REFERENCES auth.users(id),
  scope       TEXT NOT NULL CHECK (scope IN ('company','client')),
  client_id   UUID REFERENCES clients(id) ON DELETE SET NULL,
  file_count  INTEGER NOT NULL DEFAULT 0,
  total_bytes BIGINT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE backup_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY backup_log_select ON backup_log FOR SELECT USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
);
CREATE POLICY backup_log_insert ON backup_log FOR INSERT WITH CHECK (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
);
