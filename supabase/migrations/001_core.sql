-- ====================================================================
-- 001_core.sql
-- Extensões · ENUMs · Planos · Empresas · Perfis · Assinaturas · Audit
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

DO $$ BEGIN
  CREATE TYPE company_status  AS ENUM ('trial','active','overdue','suspended','cancelled');
  CREATE TYPE user_role       AS ENUM ('super_admin','company_admin','gerente','operador','financeiro','instrutor');
  CREATE TYPE user_status_t   AS ENUM ('ativo','suspenso');
  CREATE TYPE plan_id_t       AS ENUM ('starter','professional','enterprise');
  CREATE TYPE sub_status_t    AS ENUM ('trial','active','overdue','suspended','cancelled');
  CREATE TYPE invoice_status_t AS ENUM ('pendente','paga','atrasada','cancelada');
  CREATE TYPE client_status_t AS ENUM ('ativo','pendente','inativo');
  CREATE TYPE weapon_status_t AS ENUM ('operacional','manutencao','recolhida');
  CREATE TYPE ammo_move_t     AS ENUM ('entrada','saida','ajuste');
  CREATE TYPE schedule_type_t AS ENUM ('treino','avaliacao','curso','reserva','evento');
  CREATE TYPE schedule_status_t AS ENUM ('confirmado','em_espera','concluido','cancelado');
  CREATE TYPE finance_type_t  AS ENUM ('receita','despesa');
  CREATE TYPE finance_status_t AS ENUM ('compensado','previsto','atrasado');
  CREATE TYPE doc_type_t      AS ENUM ('cr','craf','certificado','contrato','outro');
  CREATE TYPE audit_action_t  AS ENUM (
    'login','logout','create','update','delete',
    'plan_change','permission_change','upload','download'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TABLE IF NOT EXISTS plans (
  id            plan_id_t   PRIMARY KEY,
  name          TEXT        NOT NULL,
  tagline       TEXT        NOT NULL,
  monthly_price INTEGER     NOT NULL DEFAULT 0,
  annual_price  INTEGER     NOT NULL DEFAULT 0,
  max_clients   INTEGER,
  max_users     INTEGER,
  features      TEXT[]      NOT NULL DEFAULT '{}',
  highlighted   BOOLEAN     NOT NULL DEFAULT FALSE,
  active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_plans_upd ON plans;
CREATE TRIGGER trg_plans_upd BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO plans (id,name,tagline,monthly_price,annual_price,max_clients,max_users,features,highlighted) VALUES
  ('starter',      'Starter',      'Para clubes em estruturação',        19900,  199000,  500,  5,    ARRAY['Cadastro de atiradores','Controle de acervo','Agenda básica','Suporte por e-mail'], FALSE),
  ('professional', 'Professional', 'Operação consolidada e crescimento', 59900,  599000,  5000, 20,   ARRAY['Tudo do Starter','Gestão documental','Financeiro completo','Relatórios avançados','Suporte prioritário'], TRUE),
  ('enterprise',   'Enterprise',   'Operações em larga escala',          149900, 1499000, NULL, NULL, ARRAY['Tudo do Professional','Multi-unidade','API privada','Gestor dedicado','SLA 99,9%'], FALSE)
ON CONFLICT (id) DO UPDATE
  SET name=EXCLUDED.name, monthly_price=EXCLUDED.monthly_price, annual_price=EXCLUDED.annual_price,
      max_clients=EXCLUDED.max_clients, max_users=EXCLUDED.max_users,
      features=EXCLUDED.features, highlighted=EXCLUDED.highlighted;

CREATE TABLE IF NOT EXISTS companies (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social    TEXT          NOT NULL,
  nome_fantasia   TEXT          NOT NULL,
  cnpj            TEXT,
  email           TEXT          NOT NULL,
  telefone        TEXT,
  cidade          TEXT,
  tipo            TEXT          NOT NULL DEFAULT 'Clube',
  logo_initials   TEXT          NOT NULL DEFAULT '??',
  plan_id         plan_id_t     NOT NULL REFERENCES plans(id) DEFAULT 'starter',
  status          company_status NOT NULL DEFAULT 'trial',
  trial_ends_at   TIMESTAMPTZ   DEFAULT NOW() + INTERVAL '14 days',
  members_count   INTEGER       NOT NULL DEFAULT 0,
  responsible     TEXT,
  last_access_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_companies_status  ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_plan    ON companies(plan_id);
DROP TRIGGER IF EXISTS trg_companies_upd ON companies;
CREATE TRIGGER trg_companies_upd BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS profiles (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id      UUID        REFERENCES companies(id) ON DELETE CASCADE,
  nome            TEXT        NOT NULL,
  email           TEXT        NOT NULL,
  role            user_role   NOT NULL DEFAULT 'operador',
  status          user_status_t NOT NULL DEFAULT 'ativo',
  mfa_required    BOOLEAN     NOT NULL DEFAULT FALSE,
  last_access_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profiles_company ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email   ON profiles(email);
DROP TRIGGER IF EXISTS trg_profiles_upd ON profiles;
CREATE TRIGGER trg_profiles_upd BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, email, nome, company_id, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)),
    NULLIF(NEW.raw_user_meta_data->>'company_id','')::UUID,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'operador')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

CREATE TABLE IF NOT EXISTS subscriptions (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  plan_id         plan_id_t     NOT NULL REFERENCES plans(id),
  status          sub_status_t  NOT NULL DEFAULT 'trial',
  trial           BOOLEAN       NOT NULL DEFAULT TRUE,
  start_date      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  end_date        TIMESTAMPTZ,
  asaas_sub_id    TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subs_company ON subscriptions(company_id);
DROP TRIGGER IF EXISTS trg_subs_upd ON subscriptions;
CREATE TRIGGER trg_subs_upd BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS invoices (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  valor           NUMERIC(10,2) NOT NULL,
  vencimento      DATE          NOT NULL,
  status          invoice_status_t NOT NULL DEFAULT 'pendente',
  descricao       TEXT,
  asaas_charge_id TEXT,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status  ON invoices(status);
DROP TRIGGER IF EXISTS trg_invoices_upd ON invoices;
CREATE TRIGGER trg_invoices_upd BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS payments (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id       UUID          NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  valor            NUMERIC(10,2) NOT NULL,
  forma_pagamento  TEXT          NOT NULL,
  data_pagamento   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  asaas_payment_id TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID          REFERENCES companies(id) ON DELETE SET NULL,
  user_id     UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  action      audit_action_t NOT NULL,
  table_name  TEXT,
  record_id   TEXT,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_company    ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_user       ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created    ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action     ON audit_logs(action);

CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_action audit_action_t; v_cid UUID; v_rid TEXT;
BEGIN
  IF TG_OP='INSERT' THEN v_action:='create';
  ELSIF TG_OP='UPDATE' THEN v_action:='update';
  ELSE v_action:='delete'; END IF;

  v_cid := CASE WHEN TG_OP='DELETE' THEN OLD.company_id ELSE NEW.company_id END;
  v_rid := CASE WHEN TG_OP='DELETE' THEN OLD.id::TEXT ELSE NEW.id::TEXT END;

  INSERT INTO audit_logs(company_id,user_id,action,table_name,record_id,old_data,new_data)
  VALUES(
    v_cid, auth.uid(), v_action, TG_TABLE_NAME, v_rid,
    CASE WHEN TG_OP IN('UPDATE','DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN('INSERT','UPDATE') THEN to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END; $$;
