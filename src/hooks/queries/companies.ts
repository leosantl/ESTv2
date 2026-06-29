/**
 * Hooks de dados do domínio de Empresas (companies).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { REFETCH_INTERVAL } from "@/lib/constants";
import { formatDate, formatRelative, mapCompanyStatus } from "@/lib/formatters";
import { queryKeys } from "@/lib/query-keys";
import { supabase } from "@/lib/supabase";

type CompanyType = "Clube" | "Estande" | "Empresa";

export function useCompanies() {
  return useQuery({
    queryKey: queryKeys.companies.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*, plans(name, monthly_price)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((c) => ({
        id: c.id,
        name: c.nome_fantasia,
        type: c.tipo as CompanyType,
        responsible: c.responsible ?? "",
        email: c.email,
        plan: c.plans?.name ?? c.plan_id,
        status: mapCompanyStatus(c.status),
        createdAt: formatDate(c.created_at),
        lastAccess: c.last_access_at ? formatRelative(c.last_access_at) : "—",
        members: c.members_count ?? 0,
        city: c.cidade ?? "",
        logoInitials: c.logo_initials,
      }));
    },
  });
}

export function useCompany(companyId: string) {
  return useQuery({
    queryKey: queryKeys.companies.detail(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*, plans(*), subscriptions(*)")
        .eq("id", companyId)
        .single();
      if (error) throw error;
      return {
        id: data.id,
        name: data.nome_fantasia,
        type: data.tipo as CompanyType,
        responsible: data.responsible ?? data.nome_fantasia,
        email: data.email,
        plan: data.plans?.name ?? data.plan_id,
        status: mapCompanyStatus(data.status),
        members: data.members_count ?? 0,
        city: data.cidade ?? "",
        logoInitials: data.logo_initials,
        subscription: data.subscriptions,
        planData: data.plans,
      };
    },
    enabled: !!companyId,
  });
}

export interface CompanyKpis {
  clients: { total: number; ativos: number; novos_mes: number };
  weapons: { total: number; operacionais: number };
  ammo: { total_estoque: number; abaixo_minimo: number };
  schedules: { hoje: number; semana: number };
  documents: { total: number; vencendo: number; vencidos: number };
  finance: { receita_mes: number; despesa_mes: number; inadimplencia: number };
}

export function useCompanyKpis(companyId: string) {
  return useQuery({
    queryKey: queryKeys.companies.kpis(companyId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_company_kpis", {
        p_company_id: companyId,
      });
      if (error) throw error;
      return data as CompanyKpis;
    },
    enabled: !!companyId,
    refetchInterval: REFETCH_INTERVAL.companyKpis,
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Record<string, unknown> & { id: string }) => {
      const { error } = await supabase.from("companies").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.companies.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.companies.all });
      toast.success("Empresa atualizada.");
    },
    onError: (e) => toast.error((e as Error).message),
  });
}
