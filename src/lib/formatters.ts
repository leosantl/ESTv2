/**
 * Formatação e mapeamento de enums do banco → rótulos da UI.
 *
 * Centraliza o que antes estava espalhado em `useSupabase.ts`. Toda conversão
 * entre o vocabulário do banco (snake_case em português) e o vocabulário da
 * interface (rótulos legíveis) vive aqui, num só lugar.
 */

const MS_PER_DAY = 86_400_000;

/** `2026-06-29T...` → `29/06/2026` */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** `2026-06-29T14:30...` → `14:30` */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Datas recentes como "Hoje, 14:30" / "Ontem" / "Há 3 dias". */
export function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diffDays = Math.floor((Date.now() - date.getTime()) / MS_PER_DAY);
  if (diffDays === 0) return `Hoje, ${formatTime(iso)}`;
  if (diffDays === 1) return "Ontem";
  return `Há ${diffDays} dias`;
}

/** Valor em centavos (inteiro no banco) → reais (número). */
export function centsToCurrency(cents: number): number {
  return cents / 100;
}

// ─── Mapeamento de enums ─────────────────────────────────────────────────────
//
// Pequeno utilitário para construir um tradutor com fallback no valor original.
// Evita repetir o padrão `(map[x] ?? x)` em cada lugar.

function createEnumMapper<T extends string>(map: Record<string, T>) {
  return (value: string): T => map[value] ?? (value as T);
}

export type CompanyStatusLabel = "Ativa" | "Trial" | "Suspensa" | "Cancelada";
export const mapCompanyStatus = createEnumMapper<CompanyStatusLabel>({
  active: "Ativa",
  trial: "Trial",
  suspended: "Suspensa",
  cancelled: "Cancelada",
  overdue: "Suspensa",
});

export type ClientStatusLabel = "Ativo" | "Pendente" | "Inativo";
export const mapClientStatus = createEnumMapper<ClientStatusLabel>({
  ativo: "Ativo",
  pendente: "Pendente",
  inativo: "Inativo",
});
/** UI → banco (para filtros). */
export const clientStatusToDb: Record<string, string> = {
  Ativo: "ativo",
  Pendente: "pendente",
  Inativo: "inativo",
};

export const mapWeaponStatus = createEnumMapper({
  operacional: "Operacional",
  manutencao: "Manutenção",
  recolhida: "Recolhida",
});
export const weaponStatusToDb: Record<string, string> = {
  Operacional: "operacional",
  Manutenção: "manutencao",
  Recolhida: "recolhida",
};

export const mapScheduleStatus = createEnumMapper({
  confirmado: "Confirmado",
  em_espera: "Em espera",
  concluido: "Concluído",
  cancelado: "Cancelado",
});

export const mapFinanceStatus = createEnumMapper({
  compensado: "Compensado",
  previsto: "Previsto",
  atrasado: "Atrasado",
});
export const financeStatusToDb: Record<string, string> = {
  Compensado: "compensado",
  Previsto: "previsto",
  Atrasado: "atrasado",
};

export const mapDocStatus = createEnumMapper({
  valido: "Válido",
  vence_em_breve: "Vence em breve",
  vencido: "Vencido",
});

export const mapInvoiceStatus = createEnumMapper({
  paga: "Paga",
  pendente: "Pendente",
  atrasada: "Atrasada",
  cancelada: "Cancelada",
});
export const invoiceStatusToDb: Record<string, string> = {
  Paga: "paga",
  Pendente: "pendente",
  Atrasada: "atrasada",
};

export const mapRole = createEnumMapper({
  super_admin: "Super Admin",
  company_admin: "Administrador",
  gerente: "Gerente",
  operador: "Operador",
  financeiro: "Financeiro",
  instrutor: "Instrutor",
});
