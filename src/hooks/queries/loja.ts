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
