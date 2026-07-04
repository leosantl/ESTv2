-- 009_notifications.sql

CREATE TABLE IF NOT EXISTS notification_settings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  enabled     BOOLEAN     NOT NULL DEFAULT true,
  alert_days  INTEGER[]   NOT NULL DEFAULT ARRAY[7, 15, 30],
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY notif_settings_select ON notification_settings FOR SELECT USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
);
CREATE POLICY notif_settings_upsert ON notification_settings FOR ALL USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('company_admin','gerente','super_admin')
);
INSERT INTO notification_settings (company_id)
SELECT id FROM companies ON CONFLICT (company_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS notification_log (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  doc_id         UUID        REFERENCES documents(id) ON DELETE SET NULL,
  doc_type       TEXT        NOT NULL,
  doc_name       TEXT        NOT NULL,
  client_name    TEXT        NOT NULL DEFAULT '—',
  to_email       TEXT        NOT NULL,
  days_remaining INTEGER     NOT NULL,
  sent_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_log_company ON notification_log(company_id);
CREATE INDEX IF NOT EXISTS idx_notif_log_dedup   ON notification_log(company_id, doc_id, days_remaining, sent_at);
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY notif_log_select ON notification_log FOR SELECT USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
);
