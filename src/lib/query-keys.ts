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
  admin: {
    kpis: ["admin-kpis"] as const,
    invoices: ["admin-invoices"] as const,
    mrrSeries: ["mrr-series"] as const,
  },
} as const;
