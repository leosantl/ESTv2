/**
 * Barrel de compatibilidade.
 *
 * Os hooks de dados foram divididos por domínio em `src/hooks/queries/*`.
 * Este arquivo reexporta tudo para que os imports existentes
 * (`import { useClients } from "@/hooks/useSupabase"`) continuem válidos.
 *
 * Em código novo, prefira importar do domínio específico, ex.:
 *   import { useClients } from "@/hooks/queries/clients";
 */

export * from "./queries/companies";
export * from "./queries/clients";
export * from "./queries/weapons";
export * from "./queries/ammo";
export * from "./queries/schedules";
export * from "./queries/finance";
export * from "./queries/documents";
export * from "./queries/users";
export * from "./queries/billing";
export * from "./queries/admin";
export * from "./queries/range";
export * from "./queries/storage";
