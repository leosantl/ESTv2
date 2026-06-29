/**
 * AUTO-GENERATED: Este arquivo é gerado automaticamente pelo Supabase CLI.
 * 
 * Para regenerar com tipos reais do seu banco de dados:
 * 
 *   npm run db:types
 * 
 * Isso requer: SUPABASE_PROJECT_ID configurado nas environment variables.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          razao_social: string;
          nome_fantasia: string;
          cnpj: string | null;
          email: string;
          telefone: string | null;
          cidade: string | null;
          tipo: string;
          logo_initials: string;
          plan_id: "starter" | "professional" | "enterprise";
          status: "trial" | "active" | "overdue" | "suspended" | "cancelled";
          trial_ends_at: string | null;
          members_count: number;
          responsible: string | null;
          last_access_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          company_id: string | null;
          nome: string;
          email: string;
          role: "super_admin" | "company_admin" | "gerente" | "operador" | "financeiro" | "instrutor";
          status: "ativo" | "suspenso";
          mfa_required: boolean;
          last_access_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      clients: {
        Row: {
          id: string;
          company_id: string;
          nome: string;
          cpf: string | null;
          cr: string | null;
          cr_validade: string | null;
          telefone: string | null;
          email: string | null;
          status: "ativo" | "pendente" | "inativo";
          calibre_preferido: string | null;
          joined_at: string;
          observacoes: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          company_id: string;
          plan_id: "starter" | "professional" | "enterprise";
          status: "trial" | "active" | "overdue" | "suspended" | "cancelled";
          trial: boolean;
          trial_ends_at: string | null;
          start_date: string;
          end_date: string | null;
          asaas_sub_id: string | null;
          created_at: string;
          updated_at: string;
          plans?: { name: string; tagline: string } | null;
        };
      };
      invoices: {
        Row: {
          id: string;
          company_id: string;
          valor: number;
          vencimento: string;
          status: "pendente" | "paga" | "atrasada" | "cancelada";
          descricao: string | null;
          asaas_charge_id: string | null;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      [key: string]: {
        Row: Record<string, unknown>;
      };
    };
    Functions: {
      get_company_kpis: {
        Args: { p_company_id: string };
        Returns: {
          clients: Json;
          weapons: Json;
          ammo: Json;
          schedules: Json;
          documents: Json;
          finance: Json;
        }[];
      };
      get_cashflow: {
        Args: { p_company_id: string; p_months?: number };
        Returns: { mes: string; receita: number; despesa: number }[];
      };
      get_admin_kpis: {
        Args: object;
        Returns: {
          empresas_ativas: number;
          empresas_trial: number;
          empresas_suspensas: number;
          empresas_churn: number;
          novos_mes: number;
          mrr: number;
          arr: number;
          inadimplencia: number;
        }[];
      };
      [key: string]: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
    };
  };
}
