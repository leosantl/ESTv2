-- ====================================================================
-- 006_loja.sql
-- Módulo Loja: produtos, estoque, clientes, vendas, financeiro, auditoria
-- ====================================================================

DO $$ BEGIN
  CREATE TYPE loja_produto_tipo_t AS ENUM (
    'produto','controlado','equipamento','vestuario','acessorio','epi','servico'
  );
  CREATE TYPE loja_estoque_move_t AS ENUM (
    'entrada','saida','ajuste','inventario','transferencia'
  );
  CREATE TYPE loja_compra_status_t AS ENUM (
    'pedido','recebimento','conferencia','estoque','financeiro','concluida','cancelada'
  );
  CREATE TYPE loja_cliente_tipo_t AS ENUM (
    'associado','cac','militar','policia','civil','empresa'
  );
  CREATE TYPE loja_cliente_status_t AS ENUM (
    'ativo','inativo','bloqueado'
  );
  CREATE TYPE loja_doc_status_t AS ENUM (
    'valido','vencendo','vencido','pendente'
  );
  CREATE TYPE loja_venda_status_t AS ENUM (
    'rascunho','aguardando_pagamento','paga','cancelada','devolvida'
  );
  CREATE TYPE loja_pagamento_t AS ENUM (
    'pix','cartao_credito','cartao_debito','dinheiro','boleto','parcelado','credito_interno'
  );
  CREATE TYPE loja_fin_tipo_t AS ENUM ('receber','pagar');
  CREATE TYPE loja_fin_status_t AS ENUM ('pendente','pago','atrasado','cancelado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Categorias ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loja_categorias (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nome        TEXT        NOT NULL,
  descricao   TEXT,
  cor         TEXT        DEFAULT '#6366f1',
  ativo       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_loja_cat_upd ON loja_categorias;
CREATE TRIGGER trg_loja_cat_upd BEFORE UPDATE ON loja_categorias
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Fornecedores ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loja_fornecedores (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  razao_social     TEXT        NOT NULL,
  nome_fantasia    TEXT,
  cpf_cnpj         TEXT,
  inscricao_est    TEXT,
  telefone         TEXT,
  email            TEXT,
  endereco         TEXT,
  cidade           TEXT,
  estado           CHAR(2),
  responsavel      TEXT,
  observacoes      TEXT,
  ativo            BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_loja_forn_upd ON loja_fornecedores;
CREATE TRIGGER trg_loja_forn_upd BEFORE UPDATE ON loja_fornecedores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Produtos ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loja_produtos (
  id               UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID                 NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  categoria_id     UUID                 REFERENCES loja_categorias(id) ON DELETE SET NULL,
  fornecedor_id    UUID                 REFERENCES loja_fornecedores(id) ON DELETE SET NULL,
  tipo             loja_produto_tipo_t  NOT NULL DEFAULT 'produto',
  nome             TEXT                 NOT NULL,
  codigo_interno   TEXT,
  codigo_barras    TEXT,
  sku              TEXT,
  marca            TEXT,
  fabricante       TEXT,
  modelo           TEXT,
  descricao        TEXT,
  peso_g           NUMERIC(10,2),
  unidade          TEXT                 NOT NULL DEFAULT 'un',
  foto_url         TEXT,
  valor_compra     NUMERIC(10,2)        NOT NULL DEFAULT 0,
  valor_venda      NUMERIC(10,2)        NOT NULL DEFAULT 0,
  margem_lucro     NUMERIC(5,2)         GENERATED ALWAYS AS (
    CASE WHEN valor_compra > 0 THEN ROUND(((valor_venda - valor_compra) / valor_compra) * 100, 2) ELSE 0 END
  ) STORED,
  estoque_atual    INTEGER              NOT NULL DEFAULT 0,
  estoque_minimo   INTEGER              NOT NULL DEFAULT 0,
  estoque_maximo   INTEGER,
  -- Campos PCE (produto controlado para estande)
  pce_numero_serie TEXT,
  pce_calibre      TEXT,
  pce_tipo         TEXT,
  pce_pais_origem  TEXT,
  pce_ano_fabr     INTEGER,
  pce_registro     TEXT,
  ativo            BOOLEAN              NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_loja_prod_upd ON loja_produtos;
CREATE TRIGGER trg_loja_prod_upd BEFORE UPDATE ON loja_produtos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Estoque — movimentações ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loja_estoque_movimentos (
  id            UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID                 NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  produto_id    UUID                 NOT NULL REFERENCES loja_produtos(id) ON DELETE CASCADE,
  tipo          loja_estoque_move_t  NOT NULL,
  quantidade    INTEGER              NOT NULL,
  custo_unit    NUMERIC(10,2),
  motivo        TEXT,
  documento_ref TEXT,
  usuario_id    UUID                 REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

-- ── Compras ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loja_compras (
  id              UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID                  NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  fornecedor_id   UUID                  REFERENCES loja_fornecedores(id) ON DELETE SET NULL,
  status          loja_compra_status_t  NOT NULL DEFAULT 'pedido',
  numero_pedido   TEXT,
  data_pedido     DATE                  NOT NULL DEFAULT CURRENT_DATE,
  data_entrega    DATE,
  valor_total     NUMERIC(10,2)         NOT NULL DEFAULT 0,
  observacoes     TEXT,
  usuario_id      UUID                  REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_loja_comp_upd ON loja_compras;
CREATE TRIGGER trg_loja_comp_upd BEFORE UPDATE ON loja_compras
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS loja_compras_itens (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id    UUID        NOT NULL REFERENCES loja_compras(id) ON DELETE CASCADE,
  produto_id   UUID        NOT NULL REFERENCES loja_produtos(id) ON DELETE CASCADE,
  quantidade   INTEGER     NOT NULL,
  custo_unit   NUMERIC(10,2) NOT NULL,
  subtotal     NUMERIC(10,2) GENERATED ALWAYS AS (quantidade * custo_unit) STORED
);

-- ── Clientes da Loja ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loja_clientes (
  id               UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID                  NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tipo             loja_cliente_tipo_t   NOT NULL DEFAULT 'civil',
  status           loja_cliente_status_t NOT NULL DEFAULT 'ativo',
  nome             TEXT                  NOT NULL,
  cpf              TEXT,
  rg               TEXT,
  data_nascimento  DATE,
  sexo             CHAR(1),
  telefone         TEXT,
  email            TEXT,
  endereco         TEXT,
  cidade           TEXT,
  estado           CHAR(2),
  foto_url         TEXT,
  -- Militares
  mil_organizacao  TEXT,
  mil_forca        TEXT,
  mil_posto        TEXT,
  mil_situacao     TEXT,
  mil_matricula    TEXT,
  mil_doc_func     TEXT,
  observacoes      TEXT,
  created_at       TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_loja_cli_upd ON loja_clientes;
CREATE TRIGGER trg_loja_cli_upd BEFORE UPDATE ON loja_clientes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Documentos dos Clientes ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loja_clientes_docs (
  id             UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID               NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cliente_id     UUID               NOT NULL REFERENCES loja_clientes(id) ON DELETE CASCADE,
  tipo           TEXT               NOT NULL,
  numero         TEXT,
  orgao_emissor  TEXT,
  data_emissao   DATE,
  data_validade  DATE,
  arquivo_url    TEXT,
  status         loja_doc_status_t  NOT NULL DEFAULT 'valido',
  observacoes    TEXT,
  created_at     TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_loja_cdoc_upd ON loja_clientes_docs;
CREATE TRIGGER trg_loja_cdoc_upd BEFORE UPDATE ON loja_clientes_docs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Vendas ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loja_vendas (
  id              UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID               NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cliente_id      UUID               REFERENCES loja_clientes(id) ON DELETE SET NULL,
  status          loja_venda_status_t NOT NULL DEFAULT 'rascunho',
  forma_pagamento loja_pagamento_t,
  numero_venda    TEXT,
  data_venda      TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  subtotal        NUMERIC(10,2)      NOT NULL DEFAULT 0,
  desconto        NUMERIC(10,2)      NOT NULL DEFAULT 0,
  total           NUMERIC(10,2)      NOT NULL DEFAULT 0,
  observacoes     TEXT,
  operador_id     UUID               REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_loja_venda_upd ON loja_vendas;
CREATE TRIGGER trg_loja_venda_upd BEFORE UPDATE ON loja_vendas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS loja_vendas_itens (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id     UUID        NOT NULL REFERENCES loja_vendas(id) ON DELETE CASCADE,
  produto_id   UUID        NOT NULL REFERENCES loja_produtos(id) ON DELETE CASCADE,
  quantidade   INTEGER     NOT NULL,
  preco_unit   NUMERIC(10,2) NOT NULL,
  desconto     NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal     NUMERIC(10,2) GENERATED ALWAYS AS ((preco_unit - desconto) * quantidade) STORED
);

-- ── Financeiro da Loja ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loja_financeiro (
  id           UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID             NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  venda_id     UUID             REFERENCES loja_vendas(id) ON DELETE SET NULL,
  compra_id    UUID             REFERENCES loja_compras(id) ON DELETE SET NULL,
  tipo         loja_fin_tipo_t  NOT NULL,
  status       loja_fin_status_t NOT NULL DEFAULT 'pendente',
  descricao    TEXT             NOT NULL,
  valor        NUMERIC(10,2)    NOT NULL,
  vencimento   DATE             NOT NULL,
  pago_em      DATE,
  forma        loja_pagamento_t,
  observacoes  TEXT,
  created_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_loja_fin_upd ON loja_financeiro;
CREATE TRIGGER trg_loja_fin_upd BEFORE UPDATE ON loja_financeiro
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Auditoria da Loja ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loja_auditoria (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  usuario_id UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  tela       TEXT        NOT NULL,
  acao       TEXT        NOT NULL,
  entidade   TEXT,
  entidade_id UUID,
  valor_ant  JSONB,
  valor_novo JSONB,
  ip         TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Índices ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_loja_prod_company    ON loja_produtos(company_id);
CREATE INDEX IF NOT EXISTS idx_loja_prod_cat        ON loja_produtos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_loja_prod_tipo       ON loja_produtos(tipo);
CREATE INDEX IF NOT EXISTS idx_loja_emov_produto    ON loja_estoque_movimentos(produto_id);
CREATE INDEX IF NOT EXISTS idx_loja_emov_company    ON loja_estoque_movimentos(company_id);
CREATE INDEX IF NOT EXISTS idx_loja_cli_company     ON loja_clientes(company_id);
CREATE INDEX IF NOT EXISTS idx_loja_cdoc_cliente    ON loja_clientes_docs(cliente_id);
CREATE INDEX IF NOT EXISTS idx_loja_venda_company   ON loja_vendas(company_id);
CREATE INDEX IF NOT EXISTS idx_loja_venda_cliente   ON loja_vendas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_loja_vitens_venda    ON loja_vendas_itens(venda_id);
CREATE INDEX IF NOT EXISTS idx_loja_fin_company     ON loja_financeiro(company_id);
CREATE INDEX IF NOT EXISTS idx_loja_audit_company   ON loja_auditoria(company_id);

-- ── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE loja_categorias         ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_fornecedores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_produtos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_estoque_movimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_compras            ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_compras_itens      ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_clientes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_clientes_docs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_vendas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_vendas_itens       ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_financeiro         ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_auditoria          ENABLE ROW LEVEL SECURITY;

-- Helper: company_id do usuário logado
CREATE OR REPLACE FUNCTION loja_my_company()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Políticas genéricas: membros da empresa leem/escrevem suas tabelas
DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'loja_categorias','loja_fornecedores','loja_produtos',
    'loja_estoque_movimentos','loja_compras','loja_clientes',
    'loja_clientes_docs','loja_vendas','loja_financeiro','loja_auditoria'
  ] LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "%s_company" ON %s;
      CREATE POLICY "%s_company" ON %s
        USING (company_id = loja_my_company() OR
               (SELECT role FROM profiles WHERE id=auth.uid())=''super_admin'')
        WITH CHECK (company_id = loja_my_company());
    ', t, t, t, t);
  END LOOP;
END $$;

-- Itens de compra/venda herdados via JOIN
DROP POLICY IF EXISTS "loja_compras_itens_policy" ON loja_compras_itens;
CREATE POLICY "loja_compras_itens_policy" ON loja_compras_itens
  USING (EXISTS (SELECT 1 FROM loja_compras c WHERE c.id = compra_id AND c.company_id = loja_my_company()));

DROP POLICY IF EXISTS "loja_vendas_itens_policy" ON loja_vendas_itens;
CREATE POLICY "loja_vendas_itens_policy" ON loja_vendas_itens
  USING (EXISTS (SELECT 1 FROM loja_vendas v WHERE v.id = venda_id AND v.company_id = loja_my_company()));

-- ── Function: KPIs da Loja ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_loja_kpis(p_company_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  res JSONB;
BEGIN
  SELECT jsonb_build_object(
    'faturamento_dia',    COALESCE((SELECT SUM(total) FROM loja_vendas
                            WHERE company_id=p_company_id AND status='paga'
                            AND DATE(data_venda)=CURRENT_DATE), 0),
    'vendas_mes',         COALESCE((SELECT SUM(total) FROM loja_vendas
                            WHERE company_id=p_company_id AND status='paga'
                            AND date_trunc('month',data_venda)=date_trunc('month',NOW())), 0),
    'produtos_sem_estoque', (SELECT COUNT(*) FROM loja_produtos
                            WHERE company_id=p_company_id AND ativo AND estoque_atual=0),
    'produtos_min_est',   (SELECT COUNT(*) FROM loja_produtos
                            WHERE company_id=p_company_id AND ativo AND estoque_atual>0
                            AND estoque_atual<=estoque_minimo),
    'docs_vencendo',      (SELECT COUNT(*) FROM loja_clientes_docs
                            WHERE company_id=p_company_id AND data_validade
                            BETWEEN CURRENT_DATE AND CURRENT_DATE+90),
    'total_clientes',     (SELECT COUNT(*) FROM loja_clientes
                            WHERE company_id=p_company_id AND status='ativo'),
    'compras_pendentes',  (SELECT COUNT(*) FROM loja_compras
                            WHERE company_id=p_company_id AND status NOT IN ('concluida','cancelada')),
    'lucro_mes',          COALESCE((
                            SELECT SUM((vi.preco_unit - p.valor_compra) * vi.quantidade)
                            FROM loja_vendas v
                            JOIN loja_vendas_itens vi ON vi.venda_id=v.id
                            JOIN loja_produtos p ON p.id=vi.produto_id
                            WHERE v.company_id=p_company_id AND v.status='paga'
                            AND date_trunc('month',v.data_venda)=date_trunc('month',NOW())
                          ), 0),
    'ticket_medio',       COALESCE((SELECT AVG(total) FROM loja_vendas
                            WHERE company_id=p_company_id AND status='paga'
                            AND date_trunc('month',data_venda)=date_trunc('month',NOW())), 0)
  ) INTO res;
  RETURN res;
END;
$$;

-- ── Function: incrementar estoque_atual ─────────────────────────────
CREATE OR REPLACE FUNCTION increment_loja_estoque(p_produto_id UUID, p_delta INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE loja_produtos SET estoque_atual = GREATEST(0, estoque_atual + p_delta) WHERE id = p_produto_id;
END;
$$;

-- ── Function: Série de vendas dos últimos 30 dias ────────────────────
CREATE OR REPLACE FUNCTION get_loja_vendas_serie(p_company_id UUID)
RETURNS TABLE(dia DATE, total NUMERIC, qtd BIGINT) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT DATE(data_venda) AS dia, SUM(loja_vendas.total), COUNT(*)
  FROM loja_vendas
  WHERE company_id = p_company_id AND status = 'paga'
    AND data_venda >= NOW() - INTERVAL '30 days'
  GROUP BY DATE(data_venda)
  ORDER BY dia;
$$;
