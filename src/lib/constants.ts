/**
 * Constantes da aplicação.
 *
 * Reúne os "números mágicos" que estavam embutidos nos hooks (tamanhos de
 * página, intervalos de refetch, limites de consulta) num único ponto de
 * ajuste.
 */

/** Itens por página em listagens paginadas (ex.: clientes). */
export const PAGE_SIZE = 50;

/** Limite padrão para consultas de histórico não paginadas. */
export const HISTORY_LIMIT = 50;

/** Intervalos de auto-refetch do React Query, em milissegundos. */
export const REFETCH_INTERVAL = {
  /** KPIs operacionais de uma empresa. */
  companyKpis: 60_000,
  /** KPIs administrativos (visão global). */
  adminKpis: 120_000,
} as const;

/** Tempo de vida de dados pouco voláteis (ex.: planos), em milissegundos. */
export const STALE_TIME = {
  plans: 5 * 60_000,
} as const;

/** Validade (em segundos) das URLs assinadas geradas para documentos. */
export const SIGNED_URL_TTL_SECONDS = 300;

/** Janela padrão (em meses) para séries temporais financeiras. */
export const FINANCE_SERIES_MONTHS = 6;
