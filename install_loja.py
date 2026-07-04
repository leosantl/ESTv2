"""
Instala o modulo Loja completo no ESTv2.
Execute: python3 install_loja.py
"""
import os, subprocess
BASE = os.path.expanduser("~/Downloads/ESTv2")

def w(rel, content):
    p = os.path.join(BASE, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f: f.write(content)
    print(f"  OK: {rel}")

w('supabase/migrations/006_loja.sql', """\
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
""")

w('src/lib/query-keys.ts', """\
/**
 * Fábrica central de chaves do React Query.
 *
 * Antes, as chaves eram strings soltas espalhadas pelos hooks ("clients",
 * "company-kpis", ...). Centralizar evita erros de digitação e garante que
 * uma invalidação feita em um domínio (ex.: criar cliente → invalidar KPIs)
 * use exatamente a mesma chave consultada em outro.
 */

export const queryKeys = {
  companies: {
    all: ["companies"] as const,
    detail: (companyId: string) => ["company", companyId] as const,
    kpis: (companyId: string) => ["company-kpis", companyId] as const,
  },
  clients: {
    list: (companyId: string, search?: string, status?: string, page?: number) =>
      ["clients", companyId, search ?? "", status ?? "", page ?? 1] as const,
    scope: (companyId: string) => ["clients", companyId] as const,
  },
  weapons: {
    list: (companyId: string, search?: string, status?: string) =>
      ["weapons", companyId, search, status] as const,
    scope: (companyId: string) => ["weapons", companyId] as const,
  },
  ammo: {
    stock: (companyId: string) => ["ammo-stock", companyId] as const,
    movements: (companyId: string) => ["ammo-movements", companyId] as const,
  },
  schedules: {
    list: (companyId: string, date?: string, status?: string) =>
      ["schedules", companyId, date, status] as const,
    scope: (companyId: string) => ["schedules", companyId] as const,
    weekSummary: (companyId: string) => ["week-schedule-summary", companyId] as const,
    lanes: (companyId: string) => ["lanes", companyId] as const,
  },
  finance: {
    entries: (companyId: string, tipo?: string, status?: string) =>
      ["finance", companyId, tipo, status] as const,
    scope: (companyId: string) => ["finance", companyId] as const,
    cashflow: (companyId: string) => ["cashflow", companyId] as const,
    categories: (companyId: string) => ["finance-categories", companyId] as const,
  },
  documents: {
    list: (companyId: string, status?: string, tipo?: string, clientId?: string) =>
      ["documents", companyId, status, tipo, clientId] as const,
    scope: (companyId: string) => ["documents", companyId] as const,
  },
  users: {
    scope: (companyId: string) => ["users", companyId] as const,
  },
  billing: {
    plans: ["plans"] as const,
    subscription: (companyId: string) => ["subscription", companyId] as const,
    invoices: (companyId: string) => ["invoices", companyId] as const,
  },
  range: {
    sessions: (companyId: string, date?: string) =>
      ["range-sessions", companyId, date ?? "today"] as const,
    scope: (companyId: string) => ["range-sessions", companyId] as const,
    descriptors: (companyId: string) => ["face-descriptors", companyId] as const,
    activeSession: (companyId: string, clientId?: string) =>
      ["active-session", companyId, clientId ?? ""] as const,
    report: (companyId: string, from: string, to: string) =>
      ["range-report", companyId, from, to] as const,
  },
  admin: {
    kpis: ["admin-kpis"] as const,
    invoices: ["admin-invoices"] as const,
    mrrSeries: ["mrr-series"] as const,
  },
  loja: {
    kpis: (companyId: string) => ["loja-kpis", companyId] as const,
    vendaSerie: (companyId: string) => ["loja-venda-serie", companyId] as const,
    produtos: (companyId: string, search?: string, tipo?: string, catId?: string) =>
      ["loja-produtos", companyId, search ?? "", tipo ?? "", catId ?? ""] as const,
    produto: (id: string) => ["loja-produto", id] as const,
    categorias: (companyId: string) => ["loja-categorias", companyId] as const,
    fornecedores: (companyId: string, search?: string) =>
      ["loja-fornecedores", companyId, search ?? ""] as const,
    estoque: (companyId: string, produtoId?: string) =>
      ["loja-estoque", companyId, produtoId ?? ""] as const,
    clientes: (companyId: string, search?: string, tipo?: string, status?: string) =>
      ["loja-clientes", companyId, search ?? "", tipo ?? "", status ?? ""] as const,
    clienteDocs: (clienteId: string) => ["loja-cliente-docs", clienteId] as const,
    vendas: (companyId: string, status?: string, page?: number) =>
      ["loja-vendas", companyId, status ?? "", page ?? 1] as const,
    compras: (companyId: string, status?: string) =>
      ["loja-compras", companyId, status ?? ""] as const,
    financeiro: (companyId: string, tipo?: string, status?: string) =>
      ["loja-financeiro", companyId, tipo ?? "", status ?? ""] as const,
    auditoria: (companyId: string) => ["loja-auditoria", companyId] as const,
  },
} as const;
""")

w('src/hooks/queries/loja.ts', """\
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { supabase } from "@/lib/supabase";

// ── KPIs ─────────────────────────────────────────────────────────────
export function useLojaKpis(companyId: string) {
  return useQuery({
    queryKey: queryKeys.loja.kpis(companyId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_loja_kpis", { p_company_id: companyId });
      if (error) throw error;
      return data as {
        faturamento_dia: number; vendas_mes: number; produtos_sem_estoque: number;
        produtos_min_est: number; docs_vencendo: number; total_clientes: number;
        compras_pendentes: number; lucro_mes: number; ticket_medio: number;
      };
    },
    enabled: !!companyId,
    refetchInterval: 60_000,
  });
}

export function useLojaVendaSerie(companyId: string) {
  return useQuery({
    queryKey: queryKeys.loja.vendaSerie(companyId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_loja_vendas_serie", { p_company_id: companyId });
      if (error) throw error;
      return (data ?? []) as { dia: string; total: number; qtd: number }[];
    },
    enabled: !!companyId,
  });
}

// ── Categorias ───────────────────────────────────────────────────────
export function useLojaCategorias(companyId: string) {
  return useQuery({
    queryKey: queryKeys.loja.categorias(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loja_categorias")
        .select("*")
        .eq("company_id", companyId)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });
}

export function useCreateLojaCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const { error } = await supabase.from("loja_categorias").insert(data);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["loja-categorias"] }); toast.success("Categoria criada."); },
    onError: (e) => toast.error((e as Error).message),
  });
}

export function useDeleteLojaCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("loja_categorias").update({ ativo: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["loja-categorias"] }); toast.success("Categoria removida."); },
    onError: (e) => toast.error((e as Error).message),
  });
}

// ── Produtos ─────────────────────────────────────────────────────────
export type LojaProduto = {
  id: string; nome: string; tipo: string; categoria_id: string | null; fornecedor_id: string | null;
  codigo_interno: string | null; codigo_barras: string | null; sku: string | null;
  marca: string | null; fabricante: string | null; modelo: string | null; descricao: string | null;
  peso_g: number | null; unidade: string; foto_url: string | null;
  valor_compra: number; valor_venda: number; margem_lucro: number;
  estoque_atual: number; estoque_minimo: number; estoque_maximo: number | null;
  pce_numero_serie: string | null; pce_calibre: string | null; pce_tipo: string | null;
  pce_pais_origem: string | null; pce_ano_fabr: number | null; pce_registro: string | null;
  ativo: boolean; created_at: string;
  loja_categorias?: { nome: string } | null;
};

export function useLojaProdutos(companyId: string, search?: string, tipo?: string, catId?: string) {
  return useQuery({
    queryKey: queryKeys.loja.produtos(companyId, search, tipo, catId),
    queryFn: async () => {
      let q = supabase
        .from("loja_produtos")
        .select("*, loja_categorias(nome)")
        .eq("company_id", companyId)
        .eq("ativo", true)
        .order("nome");
      if (search) q = q.ilike("nome", `%${search}%`);
      if (tipo) q = q.eq("tipo", tipo);
      if (catId) q = q.eq("categoria_id", catId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as LojaProduto[];
    },
    enabled: !!companyId,
  });
}

export function useCreateLojaProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const { error } = await supabase.from("loja_produtos").insert(data);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["loja-produtos"] }); toast.success("Produto criado."); },
    onError: (e) => toast.error((e as Error).message),
  });
}

export function useUpdateLojaProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Record<string, unknown> & { id: string }) => {
      const { error } = await supabase.from("loja_produtos").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["loja-produtos"] }); toast.success("Produto atualizado."); },
    onError: (e) => toast.error((e as Error).message),
  });
}

export function useDeleteLojaProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("loja_produtos").update({ ativo: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["loja-produtos"] }); toast.success("Produto removido."); },
    onError: (e) => toast.error((e as Error).message),
  });
}

// ── Estoque ──────────────────────────────────────────────────────────
export function useLojaEstoqueMovimentos(companyId: string, produtoId?: string) {
  return useQuery({
    queryKey: queryKeys.loja.estoque(companyId, produtoId),
    queryFn: async () => {
      let q = supabase
        .from("loja_estoque_movimentos")
        .select("*, loja_produtos(nome, unidade), profiles(nome)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (produtoId) q = q.eq("produto_id", produtoId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });
}

export function useCreateLojaMovimento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const { error } = await supabase.from("loja_estoque_movimentos").insert(data);
      if (error) throw error;
      // Atualizar estoque_atual no produto
      const delta = data.tipo === "saida" ? -(data.quantidade as number) : (data.quantidade as number);
      const { error: e2 } = await supabase.rpc("increment_loja_estoque", {
        p_produto_id: data.produto_id,
        p_delta: delta,
      });
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loja-estoque"] });
      qc.invalidateQueries({ queryKey: ["loja-produtos"] });
      qc.invalidateQueries({ queryKey: ["loja-kpis"] });
      toast.success("Movimentação registrada.");
    },
    onError: (e) => toast.error((e as Error).message),
  });
}

// ── Fornecedores ─────────────────────────────────────────────────────
export function useLojaFornecedores(companyId: string, search?: string) {
  return useQuery({
    queryKey: queryKeys.loja.fornecedores(companyId, search),
    queryFn: async () => {
      let q = supabase
        .from("loja_fornecedores")
        .select("*")
        .eq("company_id", companyId)
        .eq("ativo", true)
        .order("razao_social");
      if (search) q = q.ilike("razao_social", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });
}

export function useCreateLojaFornecedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const { error } = await supabase.from("loja_fornecedores").insert(data);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["loja-fornecedores"] }); toast.success("Fornecedor cadastrado."); },
    onError: (e) => toast.error((e as Error).message),
  });
}

export function useUpdateLojaFornecedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Record<string, unknown> & { id: string }) => {
      const { error } = await supabase.from("loja_fornecedores").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["loja-fornecedores"] }); toast.success("Fornecedor atualizado."); },
    onError: (e) => toast.error((e as Error).message),
  });
}

// ── Clientes ─────────────────────────────────────────────────────────
export type LojaCliente = {
  id: string; nome: string; tipo: string; status: string; cpf: string | null; rg: string | null;
  data_nascimento: string | null; sexo: string | null; telefone: string | null; email: string | null;
  endereco: string | null; cidade: string | null; estado: string | null; foto_url: string | null;
  mil_organizacao: string | null; mil_forca: string | null; mil_posto: string | null;
  mil_situacao: string | null; mil_matricula: string | null; mil_doc_func: string | null;
  observacoes: string | null; created_at: string;
};

export function useLojaClientes(companyId: string, search?: string, tipo?: string, status?: string) {
  return useQuery({
    queryKey: queryKeys.loja.clientes(companyId, search, tipo, status),
    queryFn: async () => {
      let q = supabase
        .from("loja_clientes")
        .select("*")
        .eq("company_id", companyId)
        .order("nome");
      if (search) q = q.ilike("nome", `%${search}%`);
      if (tipo) q = q.eq("tipo", tipo);
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as LojaCliente[];
    },
    enabled: !!companyId,
  });
}

export function useCreateLojaCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const { error } = await supabase.from("loja_clientes").insert(data);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["loja-clientes"] }); qc.invalidateQueries({ queryKey: ["loja-kpis"] }); toast.success("Cliente cadastrado."); },
    onError: (e) => toast.error((e as Error).message),
  });
}

export function useUpdateLojaCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Record<string, unknown> & { id: string }) => {
      const { error } = await supabase.from("loja_clientes").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["loja-clientes"] }); toast.success("Cliente atualizado."); },
    onError: (e) => toast.error((e as Error).message),
  });
}

export function useLojaClienteDocs(clienteId: string) {
  return useQuery({
    queryKey: queryKeys.loja.clienteDocs(clienteId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loja_clientes_docs")
        .select("*")
        .eq("cliente_id", clienteId)
        .order("data_validade");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clienteId,
  });
}

export function useCreateLojaClienteDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const { error } = await supabase.from("loja_clientes_docs").insert(data);
      if (error) throw error;
    },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: queryKeys.loja.clienteDocs(v.cliente_id as string) }); toast.success("Documento salvo."); },
    onError: (e) => toast.error((e as Error).message),
  });
}

// ── Vendas ───────────────────────────────────────────────────────────
export type LojaVenda = {
  id: string; status: string; forma_pagamento: string | null; numero_venda: string | null;
  data_venda: string; subtotal: number; desconto: number; total: number;
  observacoes: string | null; cliente_id: string | null;
  loja_clientes?: { nome: string } | null;
  loja_vendas_itens?: { id: string; quantidade: number; preco_unit: number; subtotal: number; produto_id: string; loja_produtos?: { nome: string } | null }[];
};

export function useLojaVendas(companyId: string, status?: string, page = 1) {
  return useQuery({
    queryKey: queryKeys.loja.vendas(companyId, status, page),
    queryFn: async () => {
      const from = (page - 1) * 50;
      let q = supabase
        .from("loja_vendas")
        .select("*, loja_clientes(nome)", { count: "exact" })
        .eq("company_id", companyId)
        .order("data_venda", { ascending: false })
        .range(from, from + 49);
      if (status) q = q.eq("status", status);
      const { data, error, count } = await q;
      if (error) throw error;
      return { data: (data ?? []) as LojaVenda[], total: count ?? 0 };
    },
    enabled: !!companyId,
  });
}

export function useLojaVendaDetalhes(vendaId: string) {
  return useQuery({
    queryKey: ["loja-venda-detalhes", vendaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loja_vendas")
        .select("*, loja_clientes(*), loja_vendas_itens(*, loja_produtos(nome, unidade, valor_compra))")
        .eq("id", vendaId)
        .single();
      if (error) throw error;
      return data as LojaVenda & { loja_clientes: LojaCliente | null };
    },
    enabled: !!vendaId,
  });
}

export function useCreateLojaVenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      venda,
      itens,
    }: {
      venda: Record<string, unknown>;
      itens: { produto_id: string; quantidade: number; preco_unit: number; desconto?: number }[];
    }) => {
      const { data: v, error } = await supabase.from("loja_vendas").insert(venda).select().single();
      if (error) throw error;
      const { error: ei } = await supabase.from("loja_vendas_itens").insert(
        itens.map((i) => ({ ...i, venda_id: v.id, desconto: i.desconto ?? 0 }))
      );
      if (ei) throw ei;
      return v;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loja-vendas"] });
      qc.invalidateQueries({ queryKey: ["loja-kpis"] });
      toast.success("Venda registrada com sucesso.");
    },
    onError: (e) => toast.error((e as Error).message),
  });
}

export function useUpdateLojaVendaStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("loja_vendas").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["loja-vendas"] }); qc.invalidateQueries({ queryKey: ["loja-kpis"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
}

// ── Compras ──────────────────────────────────────────────────────────
export function useLojaCompras(companyId: string, status?: string) {
  return useQuery({
    queryKey: queryKeys.loja.compras(companyId, status),
    queryFn: async () => {
      let q = supabase
        .from("loja_compras")
        .select("*, loja_fornecedores(razao_social, nome_fantasia)")
        .eq("company_id", companyId)
        .order("data_pedido", { ascending: false });
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });
}

export function useCreateLojaCompra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      compra,
      itens,
    }: {
      compra: Record<string, unknown>;
      itens: { produto_id: string; quantidade: number; custo_unit: number }[];
    }) => {
      const { data: c, error } = await supabase.from("loja_compras").insert(compra).select().single();
      if (error) throw error;
      const { error: ei } = await supabase.from("loja_compras_itens").insert(
        itens.map((i) => ({ ...i, compra_id: c.id }))
      );
      if (ei) throw ei;
      return c;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["loja-compras"] }); qc.invalidateQueries({ queryKey: ["loja-kpis"] }); toast.success("Compra registrada."); },
    onError: (e) => toast.error((e as Error).message),
  });
}

export function useUpdateLojaCompraStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("loja_compras").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["loja-compras"] }); toast.success("Status atualizado."); },
    onError: (e) => toast.error((e as Error).message),
  });
}

// ── Financeiro ───────────────────────────────────────────────────────
export function useLojaFinanceiro(companyId: string, tipo?: string, status?: string) {
  return useQuery({
    queryKey: queryKeys.loja.financeiro(companyId, tipo, status),
    queryFn: async () => {
      let q = supabase
        .from("loja_financeiro")
        .select("*")
        .eq("company_id", companyId)
        .order("vencimento");
      if (tipo) q = q.eq("tipo", tipo);
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });
}

export function useCreateLojaFinanceiro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const { error } = await supabase.from("loja_financeiro").insert(data);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["loja-financeiro"] }); toast.success("Lançamento criado."); },
    onError: (e) => toast.error((e as Error).message),
  });
}

export function useUpdateLojaFinanceiro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Record<string, unknown> & { id: string }) => {
      const { error } = await supabase.from("loja_financeiro").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["loja-financeiro"] }); toast.success("Lançamento atualizado."); },
    onError: (e) => toast.error((e as Error).message),
  });
}

// ── Auditoria ────────────────────────────────────────────────────────
export function useLojaAuditoria(companyId: string) {
  return useQuery({
    queryKey: queryKeys.loja.auditoria(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loja_auditoria")
        .select("*, profiles(nome)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });
}

export async function registrarAuditoria(companyId: string, payload: {
  tela: string; acao: string; entidade?: string; entidade_id?: string;
  valor_ant?: unknown; valor_novo?: unknown;
}) {
  await supabase.from("loja_auditoria").insert({ company_id: companyId, ...payload });
}
""")

w('src/routes/app.$companyId.tsx', """\
import { createFileRoute, Outlet, useParams, useNavigate } from "@tanstack/react-router";
import { AppShell, type NavGroup } from "@/components/shell/AppShell";
import {
  LayoutDashboard, Users, Crosshair, Package, FileText,
  CalendarDays, Wallet, UserCog, CreditCard, ArrowLeftRight, ScanFace, Store,
} from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/hooks/useSupabase";
import { Loader2, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/app/$companyId")({ component: CompanyLayout });

function CompanyLayout() {
  const { companyId } = useParams({ from: "/app/$companyId" });
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const { data: company, isLoading: loadingCompany, error } = useCompany(companyId);

  // Guard: não autenticado
  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  // Guard: usuário não pertence a esta empresa (e não é super_admin)
  useEffect(() => {
    if (!authLoading && profile && profile.role !== "super_admin" && profile.company_id !== companyId) {
      navigate({ to: "/" });
    }
  }, [authLoading, profile, companyId, navigate]);

  if (authLoading || loadingCompany) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (error || !company) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Empresa não encontrada ou sem acesso.</p>
      </div>
    );
  }

  // Bloqueio: assinatura suspensa/cancelada (exceto super_admin)
  const blocked = profile?.role !== "super_admin" && (company.status === "Suspensa" || company.status === "Cancelada");
  if (blocked) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Acesso suspenso</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            O acesso da empresa <strong>{company.name}</strong> está temporariamente suspenso, geralmente por pendência financeira.
            Entre em contato com o suporte ou regularize a assinatura para continuar.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <a href={`/app/${companyId}/billing`} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90">Ver faturas</a>
            <button onClick={() => signOut().then(() => navigate({ to: "/login" }))} className="rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted">Sair</button>
          </div>
        </div>
      </div>
    );
  }

  const base = `/app/${companyId}`;

  const groups: NavGroup[] = [
    {
      label: "Operação",
      items: [
        { title: "Dashboard", url: base, icon: LayoutDashboard },
        { title: "Atiradores", url: `${base}/clients`, icon: Users },
        { title: "Acervo", url: `${base}/weapons`, icon: Crosshair },
        { title: "Munições", url: `${base}/ammo`, icon: Package },
        { title: "Pista", url: `${base}/range`, icon: ScanFace },
      ],
    },
    {
      label: "Gestão",
      items: [
        { title: "Documentos", url: `${base}/documents`, icon: FileText },
        { title: "Agenda", url: `${base}/schedule`, icon: CalendarDays },
        { title: "Financeiro", url: `${base}/finance`, icon: Wallet },
        { title: "Loja", url: `${base}/loja`, icon: Store },
      ],
    },
    {
      label: "Conta",
      items: [
        { title: "Usuários", url: `${base}/users`, icon: UserCog },
        { title: "Assinatura", url: `${base}/billing`, icon: CreditCard },
        { title: "Trocar workspace", url: "/", icon: ArrowLeftRight },
      ],
    },
  ];

  const roleLabel: Record<string, string> = {
    super_admin: "Super Admin", company_admin: "Administrador", gerente: "Gerente",
    operador: "Operador", financeiro: "Financeiro", instrutor: "Instrutor",
  };

  return (
    <AppShell
      groups={groups}
      brandLabel="StandControl"
      brandSub={company.name}
      brandInitials={company.logoInitials}
      brandHref={base}
      userInitials={(profile?.nome ?? "U").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
      userName={profile?.nome ?? company.responsible}
      userRole={roleLabel[profile?.role ?? ""] ?? "Usuário"}
      onSignOut={() => signOut().then(() => navigate({ to: "/login" }))}
    >
      <Outlet />
    </AppShell>
  );
}
""")

w('src/routes/app.$companyId.loja.tsx', """\
import { createFileRoute, Outlet, useParams, Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Package, Layers, ArchiveX, Truck, ShoppingCart,
  Users, FileText, ShoppingBag, Wallet, BarChart3, Shield, Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/$companyId/loja")({ component: LojaLayout });

const NAV_ITEMS = [
  { label: "Dashboard",    icon: LayoutDashboard, path: "" },
  { label: "Produtos",     icon: Package,         path: "/produtos" },
  { label: "Categorias",   icon: Layers,          path: "/categorias" },
  { label: "Estoque",      icon: ArchiveX,        path: "/estoque" },
  { label: "Fornecedores", icon: Truck,           path: "/fornecedores" },
  { label: "Compras",      icon: ShoppingCart,    path: "/compras" },
  { label: "Clientes",     icon: Users,           path: "/clientes" },
  { label: "Documentos",   icon: FileText,        path: "/documentos" },
  { label: "Vendas",       icon: ShoppingBag,     path: "/vendas" },
  { label: "Financeiro",   icon: Wallet,          path: "/financeiro" },
  { label: "Relatórios",   icon: BarChart3,       path: "/relatorios" },
  { label: "Auditoria",    icon: Shield,          path: "/auditoria" },
  { label: "Config.",      icon: Settings2,       path: "/config" },
];

function LojaLayout() {
  const { companyId } = useParams({ from: "/app/$companyId/loja" });
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const base = `/app/${companyId}/loja`;

  return (
    <div className="flex flex-col h-full">
      {/* Sub-nav horizontal */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="flex overflow-x-auto px-4 sm:px-6 lg:px-8 gap-0 scrollbar-none">
          {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
            const url = base + path;
            const isActive = path === ""
              ? pathname === base || pathname === base + "/"
              : pathname.startsWith(url);
            return (
              <Link
                key={path}
                to={url}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-3 text-[11px] font-medium whitespace-nowrap border-b-2 transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
""")

w('src/routes/app.$companyId.loja.index.tsx', """\
import { createFileRoute, useParams } from "@tanstack/react-router";
import { PageHeader } from "@/components/shell/PageHeader";
import { KpiCard } from "@/components/shell/KpiCard";
import { useLojaKpis, useLojaVendaSerie } from "@/hooks/queries/loja";
import { Loader2, ShoppingBag, TrendingUp, PackageX, AlertTriangle, FileWarning, Users, ShoppingCart, DollarSign, Receipt, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/app/$companyId/loja/")({
  head: () => ({ meta: [{ title: "Loja · Dashboard" }] }),
  component: LojaDashboard,
});

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function LojaDashboard() {
  const { companyId } = useParams({ from: "/app/$companyId/loja/" });
  const { data: kpis, isLoading } = useLojaKpis(companyId);
  const { data: serie } = useLojaVendaSerie(companyId);

  const chartData = (serie ?? []).map((d) => ({
    dia: new Date(d.dia).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    total: Number(d.total),
    qtd: Number(d.qtd),
  }));

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHeader title="Dashboard · Loja" description="Indicadores em tempo real da operação da loja." />

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard title="Faturamento hoje" value={fmt(kpis?.faturamento_dia ?? 0)} icon={DollarSign} color="emerald" />
        <KpiCard title="Vendas do mês" value={fmt(kpis?.vendas_mes ?? 0)} icon={ShoppingBag} color="blue" />
        <KpiCard title="Lucro mensal" value={fmt(kpis?.lucro_mes ?? 0)} icon={TrendingUp} color="violet" />
        <KpiCard title="Ticket médio" value={fmt(kpis?.ticket_medio ?? 0)} icon={Receipt} color="amber" />
        <KpiCard title="Clientes ativos" value={String(kpis?.total_clientes ?? 0)} icon={Users} color="sky" />
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <KpiCard title="Sem estoque" value={String(kpis?.produtos_sem_estoque ?? 0)} icon={PackageX} color="red" />
        <KpiCard title="Estoque mínimo" value={String(kpis?.produtos_min_est ?? 0)} icon={AlertTriangle} color="orange" />
        <KpiCard title="Docs vencendo (90d)" value={String(kpis?.docs_vencendo ?? 0)} icon={FileWarning} color="yellow" />
        <KpiCard title="Compras pendentes" value={String(kpis?.compras_pendentes ?? 0)} icon={ShoppingCart} color="pink" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Vendas — últimos 30 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Nenhuma venda ainda.</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="dia" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [fmt(v), "Total"]} />
                  <Area type="monotone" dataKey="total" stroke="#6366f1" fill="url(#colorTotal)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Quantidade de vendas por dia</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Nenhuma venda ainda.</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorQtd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="dia" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [v, "Vendas"]} />
                  <Area type="monotone" dataKey="qtd" stroke="#10b981" fill="url(#colorQtd)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
        <CardContent className="pt-4">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            <strong>Aviso importante:</strong> Este sistema organiza informações e registra operações. Não toma decisões jurídicas, não aprova nem nega compras automaticamente. O operador é responsável pelas decisões administrativas e pelo cumprimento da legislação vigente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
""")

w('src/routes/app.$companyId.loja.produtos.tsx', """\
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Search, Loader2, Pencil, Trash2, AlertTriangle, PackageX } from "lucide-react";
import {
  useLojaProdutos, useLojaCategorias, useLojaFornecedores,
  useCreateLojaProduto, useUpdateLojaProduto, useDeleteLojaProduto,
  type LojaProduto,
} from "@/hooks/queries/loja";

export const Route = createFileRoute("/app/$companyId/loja/produtos")({
  head: () => ({ meta: [{ title: "Produtos · Loja" }] }),
  component: ProdutosPage,
});

const TIPOS = [
  { value: "produto",     label: "Produto comum" },
  { value: "controlado",  label: "Controlado (PCE)" },
  { value: "equipamento", label: "Equipamento" },
  { value: "vestuario",   label: "Vestuário" },
  { value: "acessorio",   label: "Acessório" },
  { value: "epi",         label: "EPI" },
  { value: "servico",     label: "Serviço" },
];

const TIPO_COLOR: Record<string, string> = {
  produto: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  controlado: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  equipamento: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  vestuario: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
  acessorio: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  epi: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  servico: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
};

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function ProdutosPage() {
  const { companyId } = useParams({ from: "/app/$companyId/loja/produtos" });
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string | undefined>();
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<LojaProduto | null>(null);

  const { data: produtos = [], isLoading } = useLojaProdutos(companyId, search, tipoFilter);
  const { data: categorias = [] } = useLojaCategorias(companyId);
  const { data: fornecedores = [] } = useLojaFornecedores(companyId);
  const criar = useCreateLojaProduto();
  const atualizar = useUpdateLojaProduto();
  const deletar = useDeleteLojaProduto();

  function openNew() { setEditing(null); setOpenForm(true); }
  function openEdit(p: LojaProduto) { setEditing(p); setOpenForm(true); }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      company_id: companyId,
      nome: fd.get("nome"),
      tipo: fd.get("tipo"),
      categoria_id: fd.get("categoria_id") || null,
      fornecedor_id: fd.get("fornecedor_id") || null,
      codigo_interno: fd.get("codigo_interno") || null,
      codigo_barras: fd.get("codigo_barras") || null,
      sku: fd.get("sku") || null,
      marca: fd.get("marca") || null,
      fabricante: fd.get("fabricante") || null,
      modelo: fd.get("modelo") || null,
      descricao: fd.get("descricao") || null,
      unidade: fd.get("unidade") || "un",
      valor_compra: Number(fd.get("valor_compra")) || 0,
      valor_venda: Number(fd.get("valor_venda")) || 0,
      estoque_minimo: Number(fd.get("estoque_minimo")) || 0,
      estoque_maximo: Number(fd.get("estoque_maximo")) || null,
    };
    const tipo = payload.tipo as string;
    if (tipo === "controlado") {
      payload.pce_numero_serie = fd.get("pce_numero_serie") || null;
      payload.pce_calibre = fd.get("pce_calibre") || null;
      payload.pce_tipo = fd.get("pce_tipo") || null;
      payload.pce_pais_origem = fd.get("pce_pais_origem") || null;
      payload.pce_ano_fabr = Number(fd.get("pce_ano_fabr")) || null;
      payload.pce_registro = fd.get("pce_registro") || null;
    }
    if (editing) {
      await atualizar.mutateAsync({ id: editing.id, ...payload });
    } else {
      await criar.mutateAsync(payload);
    }
    setOpenForm(false);
  }

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 space-y-4">
      <PageHeader
        title="Produtos"
        description="Catálogo de produtos da loja com controle de estoque e preços."
        actions={<Button size="sm" onClick={openNew}><Plus className="mr-1.5 h-3.5 w-3.5" /> Novo produto</Button>}
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nome..." className="h-9 pl-8 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {TIPOS.map((t) => (
            <Button key={t.value} size="sm" variant={tipoFilter === t.value ? "default" : "outline"}
              onClick={() => setTipoFilter(tipoFilter === t.value ? undefined : t.value)}>
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : produtos.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Nenhum produto cadastrado.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Nome</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Tipo</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Categoria</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Compra</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Venda</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Margem</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Estoque</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {produtos.map((p) => (
                <TableRow key={p.id} className="text-sm">
                  <TableCell className="font-medium">
                    <div>{p.nome}</div>
                    {p.codigo_interno && <div className="text-[10px] text-muted-foreground">{p.codigo_interno}</div>}
                  </TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TIPO_COLOR[p.tipo] ?? ""}`}>
                      {TIPOS.find((t) => t.value === p.tipo)?.label ?? p.tipo}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{p.loja_categorias?.nome ?? "—"}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{fmt(p.valor_compra)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums font-medium">{fmt(p.valor_venda)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    <span className={p.margem_lucro >= 20 ? "text-emerald-600" : p.margem_lucro >= 10 ? "text-amber-600" : "text-red-600"}>
                      {p.margem_lucro.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`text-sm font-semibold ${p.estoque_atual === 0 ? "text-red-600" : p.estoque_atual <= p.estoque_minimo ? "text-amber-600" : "text-foreground"}`}>
                      {p.estoque_atual === 0 ? <PackageX className="inline h-3.5 w-3.5 mr-0.5" /> : p.estoque_atual <= p.estoque_minimo ? <AlertTriangle className="inline h-3.5 w-3.5 mr-0.5" /> : null}
                      {p.estoque_atual} {p.unidade}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Remover produto?")) deletar.mutate(p.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Nome *</Label>
                <Input name="nome" defaultValue={editing?.nome} required />
              </div>
              <div>
                <Label>Tipo *</Label>
                <select name="tipo" defaultValue={editing?.tipo ?? "produto"} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring" required>
                  {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Categoria</Label>
                <select name="categoria_id" defaultValue={editing?.categoria_id ?? ""} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="">— Sem categoria —</option>
                  {categorias.map((c: { id: string; nome: string }) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <Label>Código interno</Label>
                <Input name="codigo_interno" defaultValue={editing?.codigo_interno ?? ""} />
              </div>
              <div>
                <Label>Código de barras</Label>
                <Input name="codigo_barras" defaultValue={editing?.codigo_barras ?? ""} />
              </div>
              <div>
                <Label>SKU</Label>
                <Input name="sku" defaultValue={editing?.sku ?? ""} />
              </div>
              <div>
                <Label>Marca</Label>
                <Input name="marca" defaultValue={editing?.marca ?? ""} />
              </div>
              <div>
                <Label>Fabricante</Label>
                <Input name="fabricante" defaultValue={editing?.fabricante ?? ""} />
              </div>
              <div>
                <Label>Modelo</Label>
                <Input name="modelo" defaultValue={editing?.modelo ?? ""} />
              </div>
              <div>
                <Label>Unidade</Label>
                <Input name="unidade" defaultValue={editing?.unidade ?? "un"} />
              </div>
              <div>
                <Label>Fornecedor</Label>
                <select name="fornecedor_id" defaultValue={editing?.fornecedor_id ?? ""} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="">— Sem fornecedor —</option>
                  {fornecedores.map((f: { id: string; razao_social: string; nome_fantasia?: string }) => <option key={f.id} value={f.id}>{f.nome_fantasia || f.razao_social}</option>)}
                </select>
              </div>
              <div>
                <Label>Valor de compra (R$)</Label>
                <Input name="valor_compra" type="number" step="0.01" min="0" defaultValue={editing?.valor_compra ?? 0} />
              </div>
              <div>
                <Label>Valor de venda (R$)</Label>
                <Input name="valor_venda" type="number" step="0.01" min="0" defaultValue={editing?.valor_venda ?? 0} />
              </div>
              <div>
                <Label>Estoque mínimo</Label>
                <Input name="estoque_minimo" type="number" min="0" defaultValue={editing?.estoque_minimo ?? 0} />
              </div>
              <div>
                <Label>Estoque máximo</Label>
                <Input name="estoque_maximo" type="number" min="0" defaultValue={editing?.estoque_maximo ?? ""} />
              </div>
              <div className="col-span-2">
                <Label>Descrição</Label>
                <Textarea name="descricao" rows={3} defaultValue={editing?.descricao ?? ""} />
              </div>
            </div>

            {/* Campos PCE — mostrados via JS simplificado, ficam ocultos por padrão */}
            <div id="pce-fields" className="space-y-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20 p-4">
              <p className="text-xs font-semibold text-red-700 dark:text-red-300 uppercase tracking-wider">Produto Controlado (PCE) — campos adicionais</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Número de série</Label><Input name="pce_numero_serie" defaultValue={editing?.pce_numero_serie ?? ""} /></div>
                <div><Label>Calibre</Label><Input name="pce_calibre" defaultValue={editing?.pce_calibre ?? ""} /></div>
                <div><Label>Tipo PCE</Label><Input name="pce_tipo" defaultValue={editing?.pce_tipo ?? ""} /></div>
                <div><Label>País de origem</Label><Input name="pce_pais_origem" defaultValue={editing?.pce_pais_origem ?? ""} /></div>
                <div><Label>Ano fabricação</Label><Input name="pce_ano_fabr" type="number" defaultValue={editing?.pce_ano_fabr ?? ""} /></div>
                <div><Label>Registro interno</Label><Input name="pce_registro" defaultValue={editing?.pce_registro ?? ""} /></div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpenForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={criar.isPending || atualizar.isPending}>
                {(criar.isPending || atualizar.isPending) && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {editing ? "Salvar alterações" : "Criar produto"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
""")

w('src/routes/app.$companyId.loja.categorias.tsx', """\
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Tag } from "lucide-react";
import { useLojaCategorias, useCreateLojaCategoria, useDeleteLojaCategoria } from "@/hooks/queries/loja";

export const Route = createFileRoute("/app/$companyId/loja/categorias")({
  head: () => ({ meta: [{ title: "Categorias · Loja" }] }),
  component: CategoriasPage,
});

function CategoriasPage() {
  const { companyId } = useParams({ from: "/app/$companyId/loja/categorias" });
  const [open, setOpen] = useState(false);
  const { data: cats = [], isLoading } = useLojaCategorias(companyId);
  const criar = useCreateLojaCategoria();
  const deletar = useDeleteLojaCategoria();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await criar.mutateAsync({ company_id: companyId, nome: fd.get("nome"), descricao: fd.get("descricao") || null, cor: fd.get("cor") || "#6366f1" });
    setOpen(false);
  }

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 space-y-4">
      <PageHeader title="Categorias" description="Organize os produtos por categorias." actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" /> Nova categoria</Button>} />
      {isLoading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cats.length === 0 ? (
            <p className="col-span-3 text-center text-sm text-muted-foreground py-10">Nenhuma categoria cadastrada.</p>
          ) : cats.map((c: { id: string; nome: string; descricao?: string; cor: string }) => (
            <div key={c.id} className="flex items-center gap-3 rounded-lg border bg-card p-4">
              <div className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center" style={{ background: c.cor + "33" }}>
                <Tag className="h-4 w-4" style={{ color: c.cor }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{c.nome}</p>
                {c.descricao && <p className="text-xs text-muted-foreground truncate">{c.descricao}</p>}
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive shrink-0"
                onClick={() => { if (confirm("Remover categoria?")) deletar.mutate(c.id); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova categoria</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Nome *</Label><Input name="nome" required /></div>
            <div><Label>Descrição</Label><Input name="descricao" /></div>
            <div><Label>Cor</Label><input name="cor" type="color" defaultValue="#6366f1" className="h-9 w-full rounded-md border border-input cursor-pointer" /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={criar.isPending}>{criar.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Criar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
""")

w('src/routes/app.$companyId.loja.estoque.tsx', """\
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, ArrowDown, ArrowUp, RefreshCw } from "lucide-react";
import { useLojaEstoqueMovimentos, useCreateLojaMovimento, useLojaProdutos } from "@/hooks/queries/loja";

export const Route = createFileRoute("/app/$companyId/loja/estoque")({
  head: () => ({ meta: [{ title: "Estoque · Loja" }] }),
  component: EstoquePage,
});

const TIPOS_MOV = [
  { value: "entrada",       label: "Entrada",       icon: ArrowDown, color: "text-emerald-600" },
  { value: "saida",         label: "Saída",         icon: ArrowUp,   color: "text-red-600" },
  { value: "ajuste",        label: "Ajuste",        icon: RefreshCw, color: "text-blue-600" },
  { value: "inventario",    label: "Inventário",    icon: RefreshCw, color: "text-violet-600" },
  { value: "transferencia", label: "Transferência", icon: RefreshCw, color: "text-amber-600" },
];

function EstoquePage() {
  const { companyId } = useParams({ from: "/app/$companyId/loja/estoque" });
  const [open, setOpen] = useState(false);
  const { data: movs = [], isLoading } = useLojaEstoqueMovimentos(companyId);
  const { data: produtos = [] } = useLojaProdutos(companyId);
  const criar = useCreateLojaMovimento();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await criar.mutateAsync({
      company_id: companyId,
      produto_id: fd.get("produto_id"),
      tipo: fd.get("tipo"),
      quantidade: Number(fd.get("quantidade")),
      custo_unit: Number(fd.get("custo_unit")) || null,
      motivo: fd.get("motivo") || null,
      documento_ref: fd.get("documento_ref") || null,
    });
    setOpen(false);
  }

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 space-y-4">
      <PageHeader
        title="Estoque"
        description="Controle de movimentações — entradas, saídas, ajustes e inventário."
        actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" /> Registrar movimento</Button>}
      />

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : movs.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Nenhuma movimentação registrada.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Data/Hora</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Produto</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Tipo</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Qtd</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Motivo</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Operador</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movs.map((m: Record<string, unknown>) => {
                const t = TIPOS_MOV.find((x) => x.value === m.tipo);
                const Icon = t?.icon ?? RefreshCw;
                return (
                  <TableRow key={m.id as string} className="text-sm">
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(m.created_at as string).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {(m.loja_produtos as { nome: string } | null)?.nome ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span className={`flex items-center gap-1 text-xs font-medium ${t?.color ?? ""}`}>
                        <Icon className="h-3.5 w-3.5" /> {t?.label ?? m.tipo as string}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {m.tipo === "saida" ? <span className="text-red-600">-{m.quantidade as number}</span> : <span className="text-emerald-600">+{m.quantidade as number}</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.motivo as string ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {(m.profiles as { nome: string } | null)?.nome ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar movimentação</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Produto *</Label>
              <select name="produto_id" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" required>
                <option value="">Selecione...</option>
                {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome} (estoque: {p.estoque_atual})</option>)}
              </select>
            </div>
            <div>
              <Label>Tipo *</Label>
              <select name="tipo" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" required>
                {TIPOS_MOV.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Quantidade *</Label>
              <Input name="quantidade" type="number" min="1" required />
            </div>
            <div>
              <Label>Custo unitário (R$)</Label>
              <Input name="custo_unit" type="number" step="0.01" min="0" placeholder="Opcional" />
            </div>
            <div>
              <Label>Motivo</Label>
              <Input name="motivo" placeholder="Ex: compra, venda, ajuste de inventário..." />
            </div>
            <div>
              <Label>Documento de referência</Label>
              <Input name="documento_ref" placeholder="NF, pedido, contrato..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={criar.isPending}>{criar.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Registrar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
""")

w('src/routes/app.$companyId.loja.fornecedores.tsx', """\
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Search, Pencil } from "lucide-react";
import { useLojaFornecedores, useCreateLojaFornecedor, useUpdateLojaFornecedor } from "@/hooks/queries/loja";

export const Route = createFileRoute("/app/$companyId/loja/fornecedores")({
  head: () => ({ meta: [{ title: "Fornecedores · Loja" }] }),
  component: FornecedoresPage,
});

type Forn = {
  id: string; razao_social: string; nome_fantasia: string | null; cpf_cnpj: string | null;
  telefone: string | null; email: string | null; cidade: string | null; estado: string | null;
  responsavel: string | null; inscricao_est: string | null; endereco: string | null; observacoes: string | null;
};

function FornecedoresPage() {
  const { companyId } = useParams({ from: "/app/$companyId/loja/fornecedores" });
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Forn | null>(null);
  const { data: forn = [], isLoading } = useLojaFornecedores(companyId, search);
  const criar = useCreateLojaFornecedor();
  const atualizar = useUpdateLojaFornecedor();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      company_id: companyId,
      razao_social: fd.get("razao_social"),
      nome_fantasia: fd.get("nome_fantasia") || null,
      cpf_cnpj: fd.get("cpf_cnpj") || null,
      inscricao_est: fd.get("inscricao_est") || null,
      telefone: fd.get("telefone") || null,
      email: fd.get("email") || null,
      endereco: fd.get("endereco") || null,
      cidade: fd.get("cidade") || null,
      estado: fd.get("estado") || null,
      responsavel: fd.get("responsavel") || null,
      observacoes: fd.get("observacoes") || null,
    };
    if (editing) await atualizar.mutateAsync({ id: editing.id, ...payload });
    else await criar.mutateAsync(payload);
    setOpen(false);
  }

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 space-y-4">
      <PageHeader
        title="Fornecedores"
        description="Cadastro de fornecedores com histórico de compras."
        actions={<Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="mr-1.5 h-3.5 w-3.5" /> Novo fornecedor</Button>}
      />
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar fornecedor..." className="h-9 pl-8 text-sm max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (forn as Forn[]).length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Nenhum fornecedor cadastrado.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Razão Social</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">CNPJ/CPF</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Cidade</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Contato</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Responsável</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(forn as Forn[]).map((f) => (
                <TableRow key={f.id} className="text-sm">
                  <TableCell>
                    <div className="font-medium">{f.razao_social}</div>
                    {f.nome_fantasia && <div className="text-xs text-muted-foreground">{f.nome_fantasia}</div>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{f.cpf_cnpj ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{f.cidade}{f.estado ? `/${f.estado}` : ""}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{f.telefone ?? f.email ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{f.responsavel ?? "—"}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(f); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Razão Social *</Label><Input name="razao_social" defaultValue={editing?.razao_social} required /></div>
              <div><Label>Nome Fantasia</Label><Input name="nome_fantasia" defaultValue={editing?.nome_fantasia ?? ""} /></div>
              <div><Label>CPF/CNPJ</Label><Input name="cpf_cnpj" defaultValue={editing?.cpf_cnpj ?? ""} /></div>
              <div><Label>Inscrição Estadual</Label><Input name="inscricao_est" defaultValue={editing?.inscricao_est ?? ""} /></div>
              <div><Label>Telefone</Label><Input name="telefone" defaultValue={editing?.telefone ?? ""} /></div>
              <div className="col-span-2"><Label>E-mail</Label><Input name="email" type="email" defaultValue={editing?.email ?? ""} /></div>
              <div className="col-span-2"><Label>Endereço</Label><Input name="endereco" defaultValue={editing?.endereco ?? ""} /></div>
              <div><Label>Cidade</Label><Input name="cidade" defaultValue={editing?.cidade ?? ""} /></div>
              <div><Label>Estado</Label><Input name="estado" maxLength={2} defaultValue={editing?.estado ?? ""} /></div>
              <div className="col-span-2"><Label>Responsável</Label><Input name="responsavel" defaultValue={editing?.responsavel ?? ""} /></div>
              <div className="col-span-2"><Label>Observações</Label><Input name="observacoes" defaultValue={editing?.observacoes ?? ""} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={criar.isPending || atualizar.isPending}>{(criar.isPending || atualizar.isPending) && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}{editing ? "Salvar" : "Criar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
""")

w('src/routes/app.$companyId.loja.compras.tsx', """\
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, ChevronRight } from "lucide-react";
import { useLojaCompras, useCreateLojaCompra, useUpdateLojaCompraStatus, useLojaFornecedores, useLojaProdutos } from "@/hooks/queries/loja";

export const Route = createFileRoute("/app/$companyId/loja/compras")({
  head: () => ({ meta: [{ title: "Compras · Loja" }] }),
  component: ComprasPage,
});

const STATUS_FLOW = ["pedido", "recebimento", "conferencia", "estoque", "financeiro", "concluida"];
const STATUS_COLOR: Record<string, string> = {
  pedido: "bg-blue-100 text-blue-700",
  recebimento: "bg-amber-100 text-amber-700",
  conferencia: "bg-orange-100 text-orange-700",
  estoque: "bg-violet-100 text-violet-700",
  financeiro: "bg-teal-100 text-teal-700",
  concluida: "bg-emerald-100 text-emerald-700",
  cancelada: "bg-red-100 text-red-700",
};

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

type Item = { produto_id: string; quantidade: number; custo_unit: number };

function ComprasPage() {
  const { companyId } = useParams({ from: "/app/$companyId/loja/compras" });
  const [open, setOpen] = useState(false);
  const [itens, setItens] = useState<Item[]>([{ produto_id: "", quantidade: 1, custo_unit: 0 }]);
  const { data: compras = [], isLoading } = useLojaCompras(companyId);
  const { data: fornecedores = [] } = useLojaFornecedores(companyId);
  const { data: produtos = [] } = useLojaProdutos(companyId);
  const criar = useCreateLojaCompra();
  const atualizarStatus = useUpdateLojaCompraStatus();

  const total = itens.reduce((s, i) => s + i.quantidade * i.custo_unit, 0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const validItens = itens.filter((i) => i.produto_id && i.quantidade > 0);
    if (!validItens.length) return;
    await criar.mutateAsync({
      compra: {
        company_id: companyId,
        fornecedor_id: fd.get("fornecedor_id") || null,
        numero_pedido: fd.get("numero_pedido") || null,
        data_pedido: fd.get("data_pedido"),
        observacoes: fd.get("observacoes") || null,
        valor_total: total,
      },
      itens: validItens,
    });
    setOpen(false);
    setItens([{ produto_id: "", quantidade: 1, custo_unit: 0 }]);
  }

  function nextStatus(current: string) {
    const idx = STATUS_FLOW.indexOf(current);
    return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
  }

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 space-y-4">
      <PageHeader
        title="Compras"
        description="Gerenciar pedidos de compra com fluxo: Pedido → Recebimento → Conferência → Estoque → Financeiro."
        actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" /> Nova compra</Button>}
      />
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (compras as Record<string, unknown>[]).length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Nenhuma compra registrada.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Data</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Pedido</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Fornecedor</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Total</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(compras as Record<string, unknown>[]).map((c) => {
                const forn = c.loja_fornecedores as { razao_social: string; nome_fantasia?: string } | null;
                const next = nextStatus(c.status as string);
                return (
                  <TableRow key={c.id as string} className="text-sm">
                    <TableCell className="text-xs text-muted-foreground">{new Date(c.data_pedido as string).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="font-medium text-xs">{c.numero_pedido as string ?? "—"}</TableCell>
                    <TableCell className="text-xs">{forn?.nome_fantasia || forn?.razao_social || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-xs">{fmt(c.valor_total as number)}</TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${STATUS_COLOR[c.status as string] ?? ""}`}>
                        {c.status as string}
                      </span>
                    </TableCell>
                    <TableCell>
                      {next && (
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => atualizarStatus.mutate({ id: c.id as string, status: next })}>
                          → {next} <ChevronRight className="h-3 w-3 ml-0.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova compra</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fornecedor</Label>
                <select name="fornecedor_id" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                  <option value="">— Sem fornecedor —</option>
                  {(fornecedores as { id: string; razao_social: string; nome_fantasia?: string }[]).map((f) => <option key={f.id} value={f.id}>{f.nome_fantasia || f.razao_social}</option>)}
                </select>
              </div>
              <div><Label>Nº do Pedido</Label><Input name="numero_pedido" /></div>
              <div><Label>Data do pedido</Label><Input name="data_pedido" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></div>
              <div><Label>Observações</Label><Input name="observacoes" /></div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Itens</p>
              <div className="space-y-2">
                {itens.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <select value={item.produto_id}
                        onChange={(e) => { const n = [...itens]; n[idx].produto_id = e.target.value; setItens(n); }}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm">
                        <option value="">Produto...</option>
                        {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <Input type="number" min="1" placeholder="Qtd" value={item.quantidade}
                        onChange={(e) => { const n = [...itens]; n[idx].quantidade = Number(e.target.value); setItens(n); }} />
                    </div>
                    <div className="col-span-3">
                      <Input type="number" step="0.01" placeholder="R$ unit" value={item.custo_unit || ""}
                        onChange={(e) => { const n = [...itens]; n[idx].custo_unit = Number(e.target.value); setItens(n); }} />
                    </div>
                    <div className="col-span-2 text-xs text-right text-muted-foreground tabular-nums">
                      {fmt(item.quantidade * item.custo_unit)}
                    </div>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-2"
                onClick={() => setItens([...itens, { produto_id: "", quantidade: 1, custo_unit: 0 }])}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar item
              </Button>
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <p className="font-semibold">Total: {fmt(total)}</p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={criar.isPending}>{criar.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Registrar compra</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
""")

w('src/routes/app.$companyId.loja.clientes.tsx', """\
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Search, Pencil, FileText, AlertTriangle } from "lucide-react";
import {
  useLojaClientes, useCreateLojaCliente, useUpdateLojaCliente,
  useLojaClienteDocs, useCreateLojaClienteDoc, type LojaCliente,
} from "@/hooks/queries/loja";

export const Route = createFileRoute("/app/$companyId/loja/clientes")({
  head: () => ({ meta: [{ title: "Clientes · Loja" }] }),
  component: ClientesPage,
});

const TIPOS = ["associado", "cac", "militar", "policia", "civil", "empresa"];
const STATUS = ["ativo", "inativo", "bloqueado"];
const STATUS_COLOR: Record<string, string> = {
  ativo: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  inativo: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  bloqueado: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};
const TIPO_DOC = ["RG/CNH", "CPF", "CR", "CRAF", "Guia de Tráfego", "Cert. Capacidade Técnica", "Laudo Psicológico", "Comprovante de Residência", "Outro"];

function docStatus(validade?: string) {
  if (!validade) return null;
  const diff = Math.ceil((new Date(validade).getTime() - Date.now()) / 86400000);
  if (diff < 0) return { label: "Vencido", color: "text-red-600" };
  if (diff <= 30) return { label: "Vence em 30d", color: "text-red-500" };
  if (diff <= 60) return { label: "Vence em 60d", color: "text-orange-500" };
  if (diff <= 90) return { label: "Vence em 90d", color: "text-amber-500" };
  return null;
}

function ClientesPage() {
  const { companyId } = useParams({ from: "/app/$companyId/loja/clientes" });
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<LojaCliente | null>(null);
  const [openDocs, setOpenDocs] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<LojaCliente | null>(null);
  const [openDocForm, setOpenDocForm] = useState(false);

  const { data: clientes = [], isLoading } = useLojaClientes(companyId, search, tipoFilter, statusFilter);
  const criar = useCreateLojaCliente();
  const atualizar = useUpdateLojaCliente();
  const { data: docs = [] } = useLojaClienteDocs(selectedCliente?.id ?? "");
  const criarDoc = useCreateLojaClienteDoc();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      company_id: companyId,
      nome: fd.get("nome"),
      tipo: fd.get("tipo"),
      status: fd.get("status") || "ativo",
      cpf: fd.get("cpf") || null,
      rg: fd.get("rg") || null,
      data_nascimento: fd.get("data_nascimento") || null,
      sexo: fd.get("sexo") || null,
      telefone: fd.get("telefone") || null,
      email: fd.get("email") || null,
      endereco: fd.get("endereco") || null,
      cidade: fd.get("cidade") || null,
      estado: fd.get("estado") || null,
      observacoes: fd.get("observacoes") || null,
    };
    const tipo = payload.tipo as string;
    if (tipo === "militar") {
      payload.mil_organizacao = fd.get("mil_organizacao") || null;
      payload.mil_forca = fd.get("mil_forca") || null;
      payload.mil_posto = fd.get("mil_posto") || null;
      payload.mil_situacao = fd.get("mil_situacao") || null;
      payload.mil_matricula = fd.get("mil_matricula") || null;
      payload.mil_doc_func = fd.get("mil_doc_func") || null;
    }
    if (editing) await atualizar.mutateAsync({ id: editing.id, ...payload });
    else await criar.mutateAsync(payload);
    setOpenForm(false);
  }

  async function handleDocSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await criarDoc.mutateAsync({
      company_id: companyId,
      cliente_id: selectedCliente?.id,
      tipo: fd.get("tipo"),
      numero: fd.get("numero") || null,
      orgao_emissor: fd.get("orgao_emissor") || null,
      data_emissao: fd.get("data_emissao") || null,
      data_validade: fd.get("data_validade") || null,
      observacoes: fd.get("observacoes") || null,
    });
    setOpenDocForm(false);
  }

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 space-y-4">
      <PageHeader
        title="Clientes"
        description="Cadastro completo de clientes com documentação e alertas de vencimento."
        actions={<Button size="sm" onClick={() => { setEditing(null); setOpenForm(true); }}><Plus className="mr-1.5 h-3.5 w-3.5" /> Novo cliente</Button>}
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nome..." className="h-9 pl-8 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {TIPOS.map((t) => (
            <Button key={t} size="sm" variant={tipoFilter === t ? "default" : "outline"} className="capitalize h-8 text-xs"
              onClick={() => setTipoFilter(tipoFilter === t ? undefined : t)}>{t}</Button>
          ))}
          {STATUS.map((s) => (
            <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} className="capitalize h-8 text-xs"
              onClick={() => setStatusFilter(statusFilter === s ? undefined : s)}>{s}</Button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : clientes.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Nenhum cliente cadastrado.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Nome</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Tipo</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">CPF</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Contato</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((c) => (
                <TableRow key={c.id} className="text-sm">
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="capitalize text-xs text-muted-foreground">{c.tipo}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.cpf ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.telefone ?? c.email ?? "—"}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${STATUS_COLOR[c.status] ?? ""}`}>{c.status}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Documentos"
                        onClick={() => { setSelectedCliente(c); setOpenDocs(true); }}>
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => { setEditing(c); setOpenForm(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Form de cliente */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Tabs defaultValue="dados">
              <TabsList>
                <TabsTrigger value="dados">Dados</TabsTrigger>
                {(editing?.tipo === "militar" || !editing) && <TabsTrigger value="militar">Militar</TabsTrigger>}
              </TabsList>
              <TabsContent value="dados" className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Label>Nome *</Label><Input name="nome" defaultValue={editing?.nome} required /></div>
                  <div>
                    <Label>Tipo *</Label>
                    <select name="tipo" defaultValue={editing?.tipo ?? "civil"} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" required>
                      {TIPOS.map((t) => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <select name="status" defaultValue={editing?.status ?? "ativo"} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                      {STATUS.map((s) => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </div>
                  <div><Label>CPF</Label><Input name="cpf" defaultValue={editing?.cpf ?? ""} /></div>
                  <div><Label>RG</Label><Input name="rg" defaultValue={editing?.rg ?? ""} /></div>
                  <div><Label>Data de nascimento</Label><Input name="data_nascimento" type="date" defaultValue={editing?.data_nascimento ?? ""} /></div>
                  <div>
                    <Label>Sexo</Label>
                    <select name="sexo" defaultValue={editing?.sexo ?? ""} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                      <option value="">—</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                    </select>
                  </div>
                  <div><Label>Telefone</Label><Input name="telefone" defaultValue={editing?.telefone ?? ""} /></div>
                  <div><Label>E-mail</Label><Input name="email" type="email" defaultValue={editing?.email ?? ""} /></div>
                  <div className="col-span-2"><Label>Endereço</Label><Input name="endereco" defaultValue={editing?.endereco ?? ""} /></div>
                  <div><Label>Cidade</Label><Input name="cidade" defaultValue={editing?.cidade ?? ""} /></div>
                  <div><Label>Estado</Label><Input name="estado" maxLength={2} defaultValue={editing?.estado ?? ""} /></div>
                  <div className="col-span-2"><Label>Observações</Label><Textarea name="observacoes" rows={2} defaultValue={editing?.observacoes ?? ""} /></div>
                </div>
              </TabsContent>
              <TabsContent value="militar" className="space-y-3 mt-3">
                <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-3 text-xs text-amber-800 dark:text-amber-200">
                  Apenas armazenar informações. O sistema não infere nem valida direitos legais.
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Organização Militar</Label><Input name="mil_organizacao" defaultValue={editing?.mil_organizacao ?? ""} /></div>
                  <div><Label>Força</Label><Input name="mil_forca" placeholder="Ex: EB, FAB, Marinha" defaultValue={editing?.mil_forca ?? ""} /></div>
                  <div><Label>Posto/Graduação</Label><Input name="mil_posto" defaultValue={editing?.mil_posto ?? ""} /></div>
                  <div><Label>Situação</Label><Input name="mil_situacao" placeholder="Ex: Ativo, Reserva, Reformado" defaultValue={editing?.mil_situacao ?? ""} /></div>
                  <div><Label>Matrícula</Label><Input name="mil_matricula" defaultValue={editing?.mil_matricula ?? ""} /></div>
                  <div><Label>Documento funcional</Label><Input name="mil_doc_func" defaultValue={editing?.mil_doc_func ?? ""} /></div>
                </div>
              </TabsContent>
            </Tabs>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpenForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={criar.isPending || atualizar.isPending}>{(criar.isPending || atualizar.isPending) && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}{editing ? "Salvar" : "Criar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Documentos do cliente */}
      <Dialog open={openDocs} onOpenChange={setOpenDocs}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Documentos — {selectedCliente?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {docs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum documento cadastrado.</p>
            ) : docs.map((d: Record<string, unknown>) => {
              const st = docStatus(d.data_validade as string | undefined);
              return (
                <div key={d.id as string} className={`rounded-lg border p-3 ${st?.color ? "border-amber-200" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{d.tipo as string}</p>
                      {d.numero && <p className="text-xs text-muted-foreground">Nº {d.numero as string}</p>}
                      {d.orgao_emissor && <p className="text-xs text-muted-foreground">Emissor: {d.orgao_emissor as string}</p>}
                      {d.data_validade && <p className="text-xs text-muted-foreground">Validade: {new Date(d.data_validade as string).toLocaleDateString("pt-BR")}</p>}
                    </div>
                    {st && (
                      <span className={`flex items-center gap-1 text-[10px] font-medium ${st.color}`}>
                        <AlertTriangle className="h-3 w-3" />{st.label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            <Button size="sm" onClick={() => setOpenDocForm(true)}><Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar documento</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openDocForm} onOpenChange={setOpenDocForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo documento</DialogTitle></DialogHeader>
          <form onSubmit={handleDocSubmit} className="space-y-3">
            <div>
              <Label>Tipo *</Label>
              <select name="tipo" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" required>
                {TIPO_DOC.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><Label>Número</Label><Input name="numero" /></div>
            <div><Label>Órgão emissor</Label><Input name="orgao_emissor" /></div>
            <div><Label>Data de emissão</Label><Input name="data_emissao" type="date" /></div>
            <div><Label>Data de validade</Label><Input name="data_validade" type="date" /></div>
            <div><Label>Observações</Label><Input name="observacoes" /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpenDocForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={criarDoc.isPending}>{criarDoc.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
""")

w('src/routes/app.$companyId.loja.documentos.tsx', """\
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useLojaClientes, useLojaClienteDocs } from "@/hooks/queries/loja";

export const Route = createFileRoute("/app/$companyId/loja/documentos")({
  head: () => ({ meta: [{ title: "Documentos · Loja" }] }),
  component: DocumentosPage,
});

function docAlert(validade?: string) {
  if (!validade) return null;
  const diff = Math.ceil((new Date(validade).getTime() - Date.now()) / 86400000);
  if (diff < 0) return { label: "Vencido", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" };
  if (diff <= 30) return { label: `Vence em ${diff}d`, icon: Clock, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20" };
  if (diff <= 60) return { label: `Vence em ${diff}d`, icon: Clock, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/20" };
  if (diff <= 90) return { label: `Vence em ${diff}d`, icon: Clock, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20" };
  return { label: "Válido", icon: CheckCircle2, color: "text-emerald-600", bg: "" };
}

function AllDocs({ companyId, search }: { companyId: string; search: string }) {
  const { data: clientes = [] } = useLojaClientes(companyId, search);
  return (
    <>
      {clientes.map((c) => (
        <ClienteDocsRow key={c.id} clienteId={c.id} clienteNome={c.nome} />
      ))}
    </>
  );
}

function ClienteDocsRow({ clienteId, clienteNome }: { clienteId: string; clienteNome: string }) {
  const { data: docs = [] } = useLojaClienteDocs(clienteId);
  if (!docs.length) return null;
  return (
    <>
      {docs.map((d: Record<string, unknown>) => {
        const al = docAlert(d.data_validade as string | undefined);
        const Icon = al?.icon ?? CheckCircle2;
        return (
          <TableRow key={d.id as string} className={`text-sm ${al?.bg ?? ""}`}>
            <TableCell className="font-medium">{clienteNome}</TableCell>
            <TableCell className="text-xs">{d.tipo as string}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{d.numero as string ?? "—"}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{d.orgao_emissor as string ?? "—"}</TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {d.data_validade ? new Date(d.data_validade as string).toLocaleDateString("pt-BR") : "—"}
            </TableCell>
            <TableCell>
              {al && (
                <span className={`flex items-center gap-1 text-[10px] font-medium ${al.color}`}>
                  <Icon className="h-3 w-3" />{al.label}
                </span>
              )}
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}

function DocumentosPage() {
  const { companyId } = useParams({ from: "/app/$companyId/loja/documentos" });
  const [search, setSearch] = useState("");

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 space-y-4">
      <PageHeader
        title="Documentos"
        description="Visão consolidada de todos os documentos dos clientes com alertas de vencimento."
      />
      <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-3 text-xs text-amber-800 dark:text-amber-200">
        <strong>Aviso:</strong> O sistema apenas exibe alertas e registra documentos. Não realiza validação jurídica. A decisão de prosseguir ou não com qualquer operação é sempre do operador.
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Filtrar por cliente..." className="h-9 pl-8 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider">Cliente</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider">Tipo</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider">Nº</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider">Emissor</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider">Validade</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider">Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AllDocs companyId={companyId} search={search} />
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
""")

w('src/routes/app.$companyId.loja.vendas.tsx', """\
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Eye, AlertTriangle, CheckCircle2, Clock, ShoppingBag } from "lucide-react";
import {
  useLojaVendas, useCreateLojaVenda, useUpdateLojaVendaStatus,
  useLojaClientes, useLojaProdutos, useLojaClienteDocs,
} from "@/hooks/queries/loja";

export const Route = createFileRoute("/app/$companyId/loja/vendas")({
  head: () => ({ meta: [{ title: "Vendas · Loja" }] }),
  component: VendasPage,
});

const FORMAS = [
  { value: "pix", label: "PIX" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "cartao_debito", label: "Cartão de Débito" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "boleto", label: "Boleto" },
  { value: "parcelado", label: "Parcelado" },
  { value: "credito_interno", label: "Crédito Interno" },
];

const STATUS_COLOR: Record<string, string> = {
  rascunho: "bg-gray-100 text-gray-600",
  aguardando_pagamento: "bg-amber-100 text-amber-700",
  paga: "bg-emerald-100 text-emerald-700",
  cancelada: "bg-red-100 text-red-700",
  devolvida: "bg-violet-100 text-violet-700",
};

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho", aguardando_pagamento: "Aguardando pag.", paga: "Paga", cancelada: "Cancelada", devolvida: "Devolvida",
};

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function docStatus(validade?: string) {
  if (!validade) return null;
  const diff = Math.ceil((new Date(validade).getTime() - Date.now()) / 86400000);
  if (diff < 0) return { label: "Vencido", icon: AlertTriangle, color: "text-red-600" };
  if (diff <= 90) return { label: `Vence em ${diff}d`, icon: Clock, color: "text-amber-600" };
  return null;
}

type Item = { produto_id: string; quantidade: number; preco_unit: number; desconto: number };

function ChecklistDocs({ clienteId }: { clienteId: string }) {
  const { data: docs = [] } = useLojaClienteDocs(clienteId);
  if (!docs.length) return <p className="text-xs text-muted-foreground">Nenhum documento cadastrado para este cliente.</p>;
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Checklist de documentos</p>
      {docs.map((d: Record<string, unknown>) => {
        const st = docStatus(d.data_validade as string | undefined);
        const Icon = st?.icon ?? CheckCircle2;
        return (
          <div key={d.id as string} className="flex items-center justify-between rounded border p-2">
            <div className="flex items-center gap-2 text-xs">
              {st ? <Icon className={`h-3.5 w-3.5 ${st.color}`} /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
              <span>{d.tipo as string}</span>
              {d.numero && <span className="text-muted-foreground">#{d.numero as string}</span>}
            </div>
            {st && <span className={`text-[10px] font-medium ${st.color}`}>{st.label}</span>}
          </div>
        );
      })}
      <p className="text-[10px] text-muted-foreground pt-1">
        ⚠️ O operador é responsável pela decisão de prosseguir. O sistema apenas informa.
      </p>
    </div>
  );
}

function VendasPage() {
  const { companyId } = useParams({ from: "/app/$companyId/loja/vendas" });
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"cliente" | "itens" | "pagamento">("cliente");
  const [clienteId, setClienteId] = useState("");
  const [itens, setItens] = useState<Item[]>([{ produto_id: "", quantidade: 1, preco_unit: 0, desconto: 0 }]);
  const [forma, setForma] = useState("pix");

  const { data: vendasData, isLoading } = useLojaVendas(companyId, statusFilter);
  const { data: clientes = [] } = useLojaClientes(companyId);
  const { data: produtos = [] } = useLojaProdutos(companyId);
  const criar = useCreateLojaVenda();
  const atualizarStatus = useUpdateLojaVendaStatus();

  const subtotal = itens.reduce((s, i) => s + (i.preco_unit - i.desconto) * i.quantidade, 0);

  function resetForm() {
    setStep("cliente"); setClienteId(""); setItens([{ produto_id: "", quantidade: 1, preco_unit: 0, desconto: 0 }]); setForma("pix");
  }

  async function handleFinish() {
    const validItens = itens.filter((i) => i.produto_id && i.quantidade > 0);
    if (!validItens.length) return;
    const numero = `VND-${Date.now().toString().slice(-6)}`;
    await criar.mutateAsync({
      venda: {
        company_id: companyId, cliente_id: clienteId || null,
        status: "paga", forma_pagamento: forma, numero_venda: numero,
        subtotal, desconto: 0, total: subtotal,
      },
      itens: validItens,
    });
    setOpen(false); resetForm();
  }

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 space-y-4">
      <PageHeader
        title="Vendas"
        description="Registrar e gerenciar vendas com checklist de documentação e controle de pagamento."
        actions={<Button size="sm" onClick={() => { resetForm(); setOpen(true); }}><Plus className="mr-1.5 h-3.5 w-3.5" /> Nova venda</Button>}
      />

      <div className="flex gap-2 flex-wrap">
        {Object.entries(STATUS_LABEL).map(([v, l]) => (
          <Button key={v} size="sm" variant={statusFilter === v ? "default" : "outline"} className="h-8 text-xs"
            onClick={() => setStatusFilter(statusFilter === v ? undefined : v)}>{l}</Button>
        ))}
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : !vendasData?.data?.length ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Nenhuma venda registrada.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Data</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Nº</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Cliente</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Pagamento</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Total</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendasData.data.map((v) => (
                <TableRow key={v.id} className="text-sm">
                  <TableCell className="text-xs text-muted-foreground">{new Date(v.data_venda).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-xs font-mono">{v.numero_venda ?? "—"}</TableCell>
                  <TableCell className="text-xs">{v.loja_clientes?.nome ?? <span className="text-muted-foreground">Sem cliente</span>}</TableCell>
                  <TableCell className="text-xs capitalize">{FORMAS.find((f) => f.value === v.forma_pagamento)?.label ?? v.forma_pagamento ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-sm">{fmt(v.total)}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[v.status] ?? ""}`}>{STATUS_LABEL[v.status] ?? v.status}</span>
                  </TableCell>
                  <TableCell>
                    {v.status === "aguardando_pagamento" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => atualizarStatus.mutate({ id: v.id, status: "paga" })}>Confirmar</Button>
                    )}
                    {v.status === "paga" && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive"
                        onClick={() => { if (confirm("Cancelar venda?")) atualizarStatus.mutate({ id: v.id, status: "cancelada" }); }}>Cancelar</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Wizard de nova venda */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" /> Nova venda
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {step === "cliente" ? "1/3 · Cliente" : step === "itens" ? "2/3 · Produtos" : "3/3 · Pagamento"}
              </span>
            </DialogTitle>
          </DialogHeader>

          {step === "cliente" && (
            <div className="space-y-4">
              <div>
                <Label>Cliente</Label>
                <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                  <option value="">— Venda sem cliente —</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome} ({c.cpf ?? c.tipo})</option>)}
                </select>
              </div>
              {clienteId && <ChecklistDocs clienteId={clienteId} />}
              <div className="flex justify-end">
                <Button onClick={() => setStep("itens")}>Próximo →</Button>
              </div>
            </div>
          )}

          {step === "itens" && (
            <div className="space-y-4">
              <div className="space-y-2">
                {itens.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <select value={item.produto_id}
                        onChange={(e) => {
                          const prod = produtos.find((p) => p.id === e.target.value);
                          const n = [...itens]; n[idx].produto_id = e.target.value; n[idx].preco_unit = prod?.valor_venda ?? 0; setItens(n);
                        }}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm">
                        <option value="">Produto...</option>
                        {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome} — {fmt(p.valor_venda)}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2"><Input type="number" min="1" placeholder="Qtd" value={item.quantidade} onChange={(e) => { const n = [...itens]; n[idx].quantidade = Number(e.target.value); setItens(n); }} /></div>
                    <div className="col-span-2"><Input type="number" step="0.01" placeholder="R$ unit" value={item.preco_unit || ""} onChange={(e) => { const n = [...itens]; n[idx].preco_unit = Number(e.target.value); setItens(n); }} /></div>
                    <div className="col-span-2"><Input type="number" step="0.01" placeholder="Desc." value={item.desconto || ""} onChange={(e) => { const n = [...itens]; n[idx].desconto = Number(e.target.value); setItens(n); }} /></div>
                    <div className="col-span-2 text-xs text-right tabular-nums">{fmt((item.preco_unit - item.desconto) * item.quantidade)}</div>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setItens([...itens, { produto_id: "", quantidade: 1, preco_unit: 0, desconto: 0 }])}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Item
              </Button>
              <div className="flex items-center justify-between border-t pt-3">
                <p className="font-semibold">Subtotal: {fmt(subtotal)}</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep("cliente")}>← Voltar</Button>
                  <Button onClick={() => setStep("pagamento")} disabled={!itens.some((i) => i.produto_id)}>Próximo →</Button>
                </div>
              </div>
            </div>
          )}

          {step === "pagamento" && (
            <div className="space-y-4">
              <div>
                <Label>Forma de pagamento *</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {FORMAS.map((f) => (
                    <button key={f.value} type="button"
                      onClick={() => setForma(f.value)}
                      className={`rounded-lg border p-2.5 text-sm text-left transition-colors ${forma === f.value ? "border-primary bg-primary/10 font-semibold" : "hover:border-muted-foreground"}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border bg-muted/40 p-4 space-y-1">
                <div className="flex justify-between text-sm"><span>Subtotal</span><span className="tabular-nums">{fmt(subtotal)}</span></div>
                <div className="flex justify-between text-sm font-bold border-t pt-1 mt-1"><span>Total</span><span className="tabular-nums">{fmt(subtotal)}</span></div>
              </div>
              <div className="flex gap-2 justify-between">
                <Button variant="outline" onClick={() => setStep("itens")}>← Voltar</Button>
                <Button onClick={handleFinish} disabled={criar.isPending}>
                  {criar.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Confirmar venda
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
""")

w('src/routes/app.$companyId.loja.financeiro.tsx', """\
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, ArrowDown, ArrowUp, Check } from "lucide-react";
import { useLojaFinanceiro, useCreateLojaFinanceiro, useUpdateLojaFinanceiro } from "@/hooks/queries/loja";

export const Route = createFileRoute("/app/$companyId/loja/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro · Loja" }] }),
  component: FinanceiroPage,
});

const FORMAS = ["pix", "cartao_credito", "cartao_debito", "dinheiro", "boleto", "parcelado", "credito_interno"];
const STATUS_COLOR: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-700",
  pago: "bg-emerald-100 text-emerald-700",
  atrasado: "bg-red-100 text-red-700",
  cancelado: "bg-gray-100 text-gray-600",
};

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function FinanceiroPage() {
  const { companyId } = useParams({ from: "/app/$companyId/loja/financeiro" });
  const [tipoFilter, setTipoFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [open, setOpen] = useState(false);

  const { data: lancamentos = [], isLoading } = useLojaFinanceiro(companyId, tipoFilter, statusFilter);
  const criar = useCreateLojaFinanceiro();
  const atualizar = useUpdateLojaFinanceiro();

  const totalReceber = (lancamentos as Record<string, unknown>[]).filter((l) => l.tipo === "receber" && l.status !== "cancelado").reduce((s, l) => s + Number(l.valor), 0);
  const totalPagar = (lancamentos as Record<string, unknown>[]).filter((l) => l.tipo === "pagar" && l.status !== "cancelado").reduce((s, l) => s + Number(l.valor), 0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await criar.mutateAsync({
      company_id: companyId,
      tipo: fd.get("tipo"),
      descricao: fd.get("descricao"),
      valor: Number(fd.get("valor")),
      vencimento: fd.get("vencimento"),
      forma: fd.get("forma") || null,
      observacoes: fd.get("observacoes") || null,
    });
    setOpen(false);
  }

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 space-y-4">
      <PageHeader
        title="Financeiro"
        description="Contas a receber e a pagar da loja."
        actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" /> Novo lançamento</Button>}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 p-4">
          <p className="text-xs text-muted-foreground">A Receber</p>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{fmt(totalReceber)}</p>
        </div>
        <div className="rounded-lg border bg-red-50 dark:bg-red-950/30 p-4">
          <p className="text-xs text-muted-foreground">A Pagar</p>
          <p className="text-xl font-bold text-red-700 dark:text-red-400 tabular-nums">{fmt(totalPagar)}</p>
        </div>
        <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 p-4">
          <p className="text-xs text-muted-foreground">Saldo previsto</p>
          <p className={`text-xl font-bold tabular-nums ${totalReceber - totalPagar >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>{fmt(totalReceber - totalPagar)}</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["receber", "pagar"].map((t) => (
          <Button key={t} size="sm" variant={tipoFilter === t ? "default" : "outline"} className="capitalize h-8 text-xs"
            onClick={() => setTipoFilter(tipoFilter === t ? undefined : t)}>
            {t === "receber" ? <ArrowDown className="h-3 w-3 mr-1 text-emerald-600" /> : <ArrowUp className="h-3 w-3 mr-1 text-red-600" />}
            {t === "receber" ? "A Receber" : "A Pagar"}
          </Button>
        ))}
        {["pendente", "pago", "atrasado"].map((s) => (
          <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} className="capitalize h-8 text-xs"
            onClick={() => setStatusFilter(statusFilter === s ? undefined : s)}>{s}</Button>
        ))}
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (lancamentos as Record<string, unknown>[]).length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Nenhum lançamento.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Vencimento</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Descrição</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Tipo</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Valor</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(lancamentos as Record<string, unknown>[]).map((l) => (
                <TableRow key={l.id as string} className="text-sm">
                  <TableCell className="text-xs text-muted-foreground">{new Date(l.vencimento as string).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="font-medium text-sm">{l.descricao as string}</TableCell>
                  <TableCell>
                    <span className={`flex items-center gap-1 text-xs font-medium ${l.tipo === "receber" ? "text-emerald-600" : "text-red-600"}`}>
                      {l.tipo === "receber" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                      {l.tipo === "receber" ? "Receber" : "Pagar"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{fmt(l.valor as number)}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${STATUS_COLOR[l.status as string] ?? ""}`}>{l.status as string}</span>
                  </TableCell>
                  <TableCell>
                    {l.status === "pendente" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => atualizar.mutate({ id: l.id as string, status: "pago", pago_em: new Date().toISOString().slice(0, 10) })}>
                        <Check className="h-3 w-3 mr-1" /> Baixar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo lançamento</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label>Tipo *</Label>
              <select name="tipo" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" required>
                <option value="receber">A Receber</option>
                <option value="pagar">A Pagar</option>
              </select>
            </div>
            <div><Label>Descrição *</Label><Input name="descricao" required /></div>
            <div><Label>Valor (R$) *</Label><Input name="valor" type="number" step="0.01" min="0.01" required /></div>
            <div><Label>Vencimento *</Label><Input name="vencimento" type="date" required /></div>
            <div>
              <Label>Forma</Label>
              <select name="forma" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                <option value="">— Não especificado —</option>
                {FORMAS.map((f) => <option key={f} value={f} className="capitalize">{f.replace("_", " ")}</option>)}
              </select>
            </div>
            <div><Label>Observações</Label><Input name="observacoes" /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={criar.isPending}>{criar.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
""")

w('src/routes/app.$companyId.loja.relatorios.tsx', """\
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Download } from "lucide-react";
import { useLojaProdutos, useLojaVendas, useLojaClientes, useLojaFinanceiro } from "@/hooks/queries/loja";

export const Route = createFileRoute("/app/$companyId/loja/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios · Loja" }] }),
  component: RelatoriosPage,
});

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function RelatoriosPage() {
  const { companyId } = useParams({ from: "/app/$companyId/loja/relatorios" });
  const { data: produtos = [] } = useLojaProdutos(companyId);
  const { data: vendasData } = useLojaVendas(companyId, "paga");
  const { data: clientes = [] } = useLojaClientes(companyId);
  const { data: lancamentos = [] } = useLojaFinanceiro(companyId);

  const vendas = vendasData?.data ?? [];
  const totalReceita = (lancamentos as Record<string, unknown>[]).filter((l) => l.tipo === "receber" && l.status === "pago").reduce((s, l) => s + Number(l.valor), 0);
  const totalDespesa = (lancamentos as Record<string, unknown>[]).filter((l) => l.tipo === "pagar" && l.status === "pago").reduce((s, l) => s + Number(l.valor), 0);

  const prodSemEstoque = produtos.filter((p) => p.estoque_atual === 0);
  const prodMinimo = produtos.filter((p) => p.estoque_atual > 0 && p.estoque_atual <= p.estoque_minimo);

  function exportCSV(headers: string[], rows: string[][], filename: string) {
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))].join("\\n");
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })),
      download: filename,
    });
    a.click();
  }

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 space-y-4">
      <PageHeader title="Relatórios" description="Visão analítica de produtos, clientes, vendas e financeiro." />
      <Tabs defaultValue="produtos">
        <TabsList>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="produtos" className="space-y-4 mt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Total de produtos</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{produtos.length}</p></CardContent></Card>
            <Card className="border-red-200"><CardHeader className="pb-1"><CardTitle className="text-sm text-red-600">Sem estoque</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{prodSemEstoque.length}</p></CardContent></Card>
            <Card className="border-amber-200"><CardHeader className="pb-1"><CardTitle className="text-sm text-amber-600">Estoque mínimo</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-600">{prodMinimo.length}</p></CardContent></Card>
          </div>
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between p-4 border-b">
              <p className="text-sm font-semibold">Inventário de produtos</p>
              <Button size="sm" variant="outline" onClick={() => exportCSV(
                ["Nome", "Tipo", "Unidade", "Estoque Atual", "Mínimo", "Compra (R$)", "Venda (R$)", "Margem (%)"],
                produtos.map((p) => [p.nome, p.tipo, p.unidade, String(p.estoque_atual), String(p.estoque_minimo), String(p.valor_compra), String(p.valor_venda), String(p.margem_lucro)]),
                "inventario.csv"
              )}><Download className="h-3.5 w-3.5 mr-1" /> CSV</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Produto</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Estoque</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Venda</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...produtos].sort((a, b) => a.estoque_atual - b.estoque_atual).slice(0, 20).map((p) => (
                  <TableRow key={p.id} className="text-sm">
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell className={`text-right tabular-nums ${p.estoque_atual === 0 ? "text-red-600 font-bold" : p.estoque_atual <= p.estoque_minimo ? "text-amber-600" : ""}`}>{p.estoque_atual} {p.unidade}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{fmt(p.valor_venda)}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{p.margem_lucro.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="vendas" className="space-y-4 mt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Total de vendas pagas</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{vendas.length}</p></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Faturamento total</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold tabular-nums">{fmt(vendas.reduce((s, v) => s + v.total, 0))}</p></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Ticket médio</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold tabular-nums">{fmt(vendas.length ? vendas.reduce((s, v) => s + v.total, 0) / vendas.length : 0)}</p></CardContent></Card>
          </div>
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between p-4 border-b">
              <p className="text-sm font-semibold">Últimas vendas</p>
              <Button size="sm" variant="outline" onClick={() => exportCSV(
                ["Data", "Nº", "Cliente", "Forma Pagamento", "Total (R$)"],
                vendas.map((v) => [new Date(v.data_venda).toLocaleDateString("pt-BR"), v.numero_venda ?? "", v.loja_clientes?.nome ?? "", v.forma_pagamento ?? "", String(v.total)]),
                "vendas.csv"
              )}><Download className="h-3.5 w-3.5 mr-1" /> CSV</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Data</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Nº</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Cliente</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendas.slice(0, 20).map((v) => (
                  <TableRow key={v.id} className="text-sm">
                    <TableCell className="text-xs text-muted-foreground">{new Date(v.data_venda).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-xs font-mono">{v.numero_venda ?? "—"}</TableCell>
                    <TableCell className="text-xs">{v.loja_clientes?.nome ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{fmt(v.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="clientes" className="space-y-4 mt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Total de clientes</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{clientes.length}</p></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Ativos</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-emerald-600">{clientes.filter((c) => c.status === "ativo").length}</p></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Bloqueados</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{clientes.filter((c) => c.status === "bloqueado").length}</p></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="financeiro" className="space-y-4 mt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-emerald-200"><CardHeader className="pb-1"><CardTitle className="text-sm text-emerald-700">Receitas pagas</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-emerald-700 tabular-nums">{fmt(totalReceita)}</p></CardContent></Card>
            <Card className="border-red-200"><CardHeader className="pb-1"><CardTitle className="text-sm text-red-700">Despesas pagas</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-700 tabular-nums">{fmt(totalDespesa)}</p></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Lucro líquido</CardTitle></CardHeader><CardContent><p className={`text-2xl font-bold tabular-nums ${totalReceita - totalDespesa >= 0 ? "text-emerald-700" : "text-red-700"}`}>{fmt(totalReceita - totalDespesa)}</p></CardContent></Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
""")

w('src/routes/app.$companyId.loja.auditoria.tsx', """\
import { createFileRoute, useParams } from "@tanstack/react-router";
import { PageHeader } from "@/components/shell/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Shield } from "lucide-react";
import { useLojaAuditoria } from "@/hooks/queries/loja";

export const Route = createFileRoute("/app/$companyId/loja/auditoria")({
  head: () => ({ meta: [{ title: "Auditoria · Loja" }] }),
  component: AuditoriaPage,
});

function AuditoriaPage() {
  const { companyId } = useParams({ from: "/app/$companyId/loja/auditoria" });
  const { data: logs = [], isLoading } = useLojaAuditoria(companyId);

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 space-y-4">
      <PageHeader
        title="Auditoria"
        description="Registro imutável de todas as ações realizadas no módulo Loja."
        actions={
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="h-4 w-4 text-emerald-600" />
            Registros não podem ser excluídos
          </div>
        }
      />
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (logs as Record<string, unknown>[]).length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Nenhum registro de auditoria.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Data/Hora</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Usuário</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Tela</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Ação</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Entidade</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Anterior</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Novo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(logs as Record<string, unknown>[]).map((l) => (
                <TableRow key={l.id as string} className="text-xs align-top">
                  <TableCell className="text-muted-foreground whitespace-nowrap">{new Date(l.created_at as string).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{(l.profiles as { nome: string } | null)?.nome ?? "—"}</TableCell>
                  <TableCell className="capitalize">{l.tela as string}</TableCell>
                  <TableCell><span className="font-mono bg-muted rounded px-1 py-0.5">{l.acao as string}</span></TableCell>
                  <TableCell className="text-muted-foreground">{l.entidade as string ?? "—"}</TableCell>
                  <TableCell className="max-w-[120px] truncate text-muted-foreground">
                    {l.valor_ant ? JSON.stringify(l.valor_ant).slice(0, 60) : "—"}
                  </TableCell>
                  <TableCell className="max-w-[120px] truncate text-muted-foreground">
                    {l.valor_novo ? JSON.stringify(l.valor_novo).slice(0, 60) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
""")

w('src/routes/app.$companyId.loja.config.tsx', """\
import { createFileRoute, useParams } from "@tanstack/react-router";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings2, Shield, Bell, Database } from "lucide-react";

export const Route = createFileRoute("/app/$companyId/loja/config")({
  head: () => ({ meta: [{ title: "Configurações · Loja" }] }),
  component: ConfigPage,
});

function ConfigPage() {
  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 space-y-4">
      <PageHeader title="Configurações" description="Configurações do módulo Loja." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Bell className="h-4 w-4 text-amber-500" /> Alertas</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>• Documentos vencidos: alerta imediato</p>
            <p>• Documentos vencendo em 30d: alerta</p>
            <p>• Documentos vencendo em 60d: aviso</p>
            <p>• Documentos vencendo em 90d: informativo</p>
            <p>• Estoque mínimo atingido: alerta no dashboard</p>
            <p>• Sem estoque: alerta crítico</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4 text-emerald-500" /> Segurança</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>• RLS ativo: dados isolados por empresa</p>
            <p>• Auditoria: todos os acessos registrados</p>
            <p>• Histórico imutável: nenhum log pode ser excluído</p>
            <p>• Backup automático: gerenciado pelo Supabase</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Database className="h-4 w-4 text-blue-500" /> Integrações</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>• Clientes da Loja independentes dos atiradores do Clube</p>
            <p>• Financeiro da Loja separado do financeiro do Clube</p>
            <p>• KPIs da Loja integrados ao Dashboard principal</p>
            <p>• Auditoria centralizada por empresa</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Settings2 className="h-4 w-4 text-violet-500" /> Aviso legal</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>Este sistema <strong>não toma decisões jurídicas</strong>.</p>
            <p>Sua função é organizar informações, registrar operações, validar campos obrigatórios, emitir alertas e gerar auditoria.</p>
            <p>O operador é responsável pelas decisões administrativas.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
""")


files = [
    "supabase/migrations/006_loja.sql",
    "src/lib/query-keys.ts",
    "src/hooks/queries/loja.ts",
    "src/routes/app.$companyId.tsx",
    "src/routes/app.$companyId.loja.tsx",
    "src/routes/app.$companyId.loja.index.tsx",
    "src/routes/app.$companyId.loja.produtos.tsx",
    "src/routes/app.$companyId.loja.categorias.tsx",
    "src/routes/app.$companyId.loja.estoque.tsx",
    "src/routes/app.$companyId.loja.fornecedores.tsx",
    "src/routes/app.$companyId.loja.compras.tsx",
    "src/routes/app.$companyId.loja.clientes.tsx",
    "src/routes/app.$companyId.loja.documentos.tsx",
    "src/routes/app.$companyId.loja.vendas.tsx",
    "src/routes/app.$companyId.loja.financeiro.tsx",
    "src/routes/app.$companyId.loja.relatorios.tsx",
    "src/routes/app.$companyId.loja.auditoria.tsx",
    "src/routes/app.$companyId.loja.config.tsx",
]
subprocess.run(["git", "add"] + files, cwd=BASE)
r = subprocess.run(["git", "commit", "-m", "feat: modulo Loja completo — produtos, estoque, vendas, clientes, financeiro, auditoria"], cwd=BASE, capture_output=True, text=True)
print(r.stdout.strip() or r.stderr.strip())
r2 = subprocess.run(["git", "push", "-u", "origin", "claude/saas-evaluation-gaps-gqhbgj"], cwd=BASE, capture_output=True, text=True)
print(r2.stdout.strip() or r2.stderr.strip())
if r2.returncode == 0:
    print("Pronto! Deploy em 1-2 min.")
else:
    print("Push falhou:", r2.stderr)
