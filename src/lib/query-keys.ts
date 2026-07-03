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
