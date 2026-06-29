-- ====================================================================
-- 002_operational.sql
-- Clientes · Armas · Munições · Pistas · Agenda · Financeiro · Docs
-- ====================================================================

CREATE TABLE IF NOT EXISTS clients (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID           NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nome              TEXT           NOT NULL,
  cpf               TEXT,
  cr                TEXT,
  cr_validade       DATE,
  telefone          TEXT,
  email             TEXT,
  status            client_status_t NOT NULL DEFAULT 'pendente',
  calibre_preferido TEXT,
  joined_at         DATE           NOT NULL DEFAULT CURRENT_DATE,
  observacoes       TEXT,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clients_company  ON clients(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clients_status   ON clients(company_id,status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clients_cr       ON clients(company_id,cr) WHERE cr IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clients_nome     ON clients USING gin(nome gin_trgm_ops);

DROP TRIGGER IF EXISTS trg_clients_upd   ON clients;
DROP TRIGGER IF EXISTS trg_clients_audit ON clients;
CREATE TRIGGER trg_clients_upd   BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_clients_audit AFTER INSERT OR UPDATE OR DELETE ON clients FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TABLE IF NOT EXISTS weapons (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID           NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id       UUID           REFERENCES clients(id) ON DELETE SET NULL,
  marca           TEXT           NOT NULL,
  modelo          TEXT           NOT NULL,
  calibre         TEXT           NOT NULL,
  numero_serie    TEXT           NOT NULL,
  situacao        weapon_status_t NOT NULL DEFAULT 'operacional',
  registered_at   DATE           NOT NULL DEFAULT CURRENT_DATE,
  observacoes     TEXT,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, numero_serie)
);
CREATE INDEX IF NOT EXISTS idx_weapons_company ON weapons(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_weapons_client  ON weapons(client_id)  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_weapons_upd   ON weapons;
DROP TRIGGER IF EXISTS trg_weapons_audit ON weapons;
CREATE TRIGGER trg_weapons_upd   BEFORE UPDATE ON weapons FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_weapons_audit AFTER INSERT OR UPDATE OR DELETE ON weapons FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TABLE IF NOT EXISTS ammo_stock (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  calibre         TEXT        NOT NULL,
  marca           TEXT        NOT NULL,
  estoque         INTEGER     NOT NULL DEFAULT 0 CHECK (estoque >= 0),
  estoque_minimo  INTEGER     NOT NULL DEFAULT 0,
  last_entry_at   DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, calibre, marca)
);
CREATE INDEX IF NOT EXISTS idx_ammo_stock_company ON ammo_stock(company_id);
DROP TRIGGER IF EXISTS trg_ammo_upd ON ammo_stock;
CREATE TRIGGER trg_ammo_upd BEFORE UPDATE ON ammo_stock FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS ammo_movements (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  ammo_stock_id   UUID          NOT NULL REFERENCES ammo_stock(id),
  tipo            ammo_move_t   NOT NULL,
  calibre         TEXT          NOT NULL,
  quantidade      INTEGER       NOT NULL CHECK (quantidade > 0),
  responsavel     TEXT          NOT NULL,
  observacoes     TEXT,
  moved_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ammo_mov_company ON ammo_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_ammo_mov_stock   ON ammo_movements(ammo_stock_id);
CREATE INDEX IF NOT EXISTS idx_ammo_mov_date    ON ammo_movements(company_id, moved_at DESC);

CREATE OR REPLACE FUNCTION update_ammo_balance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_atual INTEGER;
BEGIN
  SELECT estoque INTO v_atual FROM ammo_stock WHERE id = NEW.ammo_stock_id FOR UPDATE;
  IF NEW.tipo IN ('saida','ajuste') AND v_atual < NEW.quantidade THEN
    RAISE EXCEPTION 'Estoque insuficiente. Disponível: % cartuchos.', v_atual;
  END IF;
  IF NEW.tipo = 'entrada' THEN
    UPDATE ammo_stock SET estoque = estoque + NEW.quantidade, last_entry_at = CURRENT_DATE WHERE id = NEW.ammo_stock_id;
  ELSE
    UPDATE ammo_stock SET estoque = estoque - NEW.quantidade WHERE id = NEW.ammo_stock_id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_ammo_balance ON ammo_movements;
CREATE TRIGGER trg_ammo_balance BEFORE INSERT ON ammo_movements FOR EACH ROW EXECUTE FUNCTION update_ammo_balance();

CREATE TABLE IF NOT EXISTS lanes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nome        TEXT        NOT NULL,
  descricao   TEXT,
  ativa       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, nome)
);
CREATE INDEX IF NOT EXISTS idx_lanes_company ON lanes(company_id);
DROP TRIGGER IF EXISTS trg_lanes_upd ON lanes;
CREATE TRIGGER trg_lanes_upd BEFORE UPDATE ON lanes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS schedules (
  id              UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID              NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id       UUID              REFERENCES clients(id) ON DELETE SET NULL,
  instructor_id   UUID              REFERENCES profiles(id) ON DELETE SET NULL,
  lane_id         UUID              REFERENCES lanes(id) ON DELETE SET NULL,
  titulo          TEXT              NOT NULL,
  tipo            schedule_type_t   NOT NULL,
  starts_at       TIMESTAMPTZ       NOT NULL,
  duration_min    INTEGER           NOT NULL DEFAULT 60,
  status          schedule_status_t NOT NULL DEFAULT 'confirmado',
  observacoes     TEXT,
  created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_schedules_company ON schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_schedules_starts  ON schedules(company_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_schedules_lane    ON schedules(lane_id, starts_at);

DROP TRIGGER IF EXISTS trg_schedules_upd   ON schedules;
DROP TRIGGER IF EXISTS trg_schedules_audit ON schedules;
CREATE TRIGGER trg_schedules_upd   BEFORE UPDATE ON schedules FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_schedules_audit AFTER INSERT OR UPDATE OR DELETE ON schedules FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE OR REPLACE FUNCTION check_schedule_conflict()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.lane_id IS NULL OR NEW.status = 'cancelado' THEN RETURN NEW; END IF;
  IF EXISTS (
    SELECT 1 FROM schedules
    WHERE lane_id = NEW.lane_id
      AND id <> COALESCE(NEW.id, gen_random_uuid())
      AND status NOT IN ('cancelado')
      AND tstzrange(starts_at, starts_at + (duration_min||' minutes')::INTERVAL, '[)')
       && tstzrange(NEW.starts_at, NEW.starts_at + (NEW.duration_min||' minutes')::INTERVAL, '[)')
  ) THEN
    RAISE EXCEPTION 'Conflito de horário nesta pista.';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_schedule_conflict ON schedules;
CREATE TRIGGER trg_schedule_conflict BEFORE INSERT OR UPDATE ON schedules FOR EACH ROW EXECUTE FUNCTION check_schedule_conflict();

CREATE TABLE IF NOT EXISTS finance_categories (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID           NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nome        TEXT           NOT NULL,
  tipo        finance_type_t NOT NULL,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, nome, tipo)
);
CREATE INDEX IF NOT EXISTS idx_fin_cat_company ON finance_categories(company_id);

CREATE TABLE IF NOT EXISTS finance_entries (
  id              UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID             NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category_id     UUID             REFERENCES finance_categories(id) ON DELETE SET NULL,
  descricao       TEXT             NOT NULL,
  tipo            finance_type_t   NOT NULL,
  valor           INTEGER          NOT NULL CHECK (valor > 0),
  status          finance_status_t NOT NULL DEFAULT 'previsto',
  vencimento      DATE,
  compensado_em   TIMESTAMPTZ,
  observacoes     TEXT,
  created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_finance_company  ON finance_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_finance_venc     ON finance_entries(company_id, vencimento);
CREATE INDEX IF NOT EXISTS idx_finance_tipo     ON finance_entries(company_id, tipo);

DROP TRIGGER IF EXISTS trg_finance_upd   ON finance_entries;
DROP TRIGGER IF EXISTS trg_finance_audit ON finance_entries;
CREATE TRIGGER trg_finance_upd   BEFORE UPDATE ON finance_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_finance_audit AFTER INSERT OR UPDATE OR DELETE ON finance_entries FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TABLE IF NOT EXISTS documents (
  id               UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID       NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id        UUID       REFERENCES clients(id) ON DELETE SET NULL,
  weapon_id        UUID       REFERENCES weapons(id) ON DELETE SET NULL,
  nome             TEXT       NOT NULL,
  tipo             doc_type_t NOT NULL,
  emissao          DATE       NOT NULL,
  vencimento       DATE       NOT NULL,
  storage_path     TEXT,
  mime_type        TEXT,
  file_size_bytes  INTEGER,
  observacoes      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_docs_company   ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_docs_venc      ON documents(vencimento);
CREATE INDEX IF NOT EXISTS idx_docs_client    ON documents(client_id);

DROP TRIGGER IF EXISTS trg_docs_upd   ON documents;
DROP TRIGGER IF EXISTS trg_docs_audit ON documents;
CREATE TRIGGER trg_docs_upd   BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_docs_audit AFTER INSERT OR UPDATE OR DELETE ON documents FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE OR REPLACE VIEW documents_with_status AS
SELECT *,
  CASE
    WHEN vencimento < CURRENT_DATE THEN 'vencido'
    WHEN vencimento < CURRENT_DATE + INTERVAL '30 days' THEN 'vence_em_breve'
    ELSE 'valido'
  END AS doc_status
FROM documents;
