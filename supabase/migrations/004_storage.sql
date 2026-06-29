-- ====================================================================
-- 004_storage.sql
-- Storage bucket para documentos (CR, CRAF, certifs, etc)
-- ====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('documentos', 'documentos', false, 10485760)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY documentos_read ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documentos' AND
    (auth.role() = 'authenticated' AND
     (storage.foldername(name))[1]::UUID = (
       SELECT company_id FROM profiles WHERE id = auth.uid()
     ))
  );

CREATE POLICY documentos_upload ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documentos' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1]::UUID = (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE company_id = (storage.foldername(name))[1]::UUID
        AND status IN ('active', 'trial')
    )
  );

CREATE POLICY documentos_update ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'documentos' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM profiles p
        INNER JOIN companies c ON p.company_id = c.id
      WHERE p.id = auth.uid()
        AND c.id = (storage.foldername(name))[1]::UUID
        AND p.role IN ('company_admin', 'gerente')
    )
  );

CREATE POLICY documentos_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documentos' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM profiles p
        INNER JOIN companies c ON p.company_id = c.id
      WHERE p.id = auth.uid()
        AND c.id = (storage.foldername(name))[1]::UUID
        AND p.role IN ('company_admin', 'gerente')
    )
  );
