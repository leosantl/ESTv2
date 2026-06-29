/**
 * Hooks de dados do domínio Financeiro (finance_entries / cashflow).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { FINANCE_SERIES_MONTHS } from "@/lib/constants";
import { centsToCurrency, financeStatusToDb, formatDate, mapFinanceStatus } from "@/lib/formatters";
import { queryKeys } from "@/lib/query-keys";
import { supabase } from "@/lib/supabase";

interface FinanceListOptions {
  tipo?: string;
  status?: string;
}

export function useFinanceEntries(companyId: string, opts?: FinanceListOptions) {
  const { tipo, status } = opts ?? {};
  return useQuery({
    queryKey: queryKeys.finance.entries(companyId, tipo, status),
    queryFn: async () => {
      let q = supabase
        .from("finance_entries")
        .select("*, finance_categories(nome)")
        .eq("company_id", companyId)
        .order("vencimento", { ascending: false });

      if (tipo) q = q.eq("tipo", tipo === "Receita" ? "receita" : "despesa");
      if (status) q = q.eq("status", financeStatusToDb[status] ?? status);

      const { data, error } = await q;
      if (error) throw error;

      return (data ?? []).map((f) => ({
        id: f.id,
        date: f.vencimento ? formatDate(f.vencimento) : "—",
        description: f.descricao,
        category: f.finance_categories?.nome ?? f.category_id ?? "Geral",
        type: f.tipo === "receita" ? "Receita" : "Despesa",
        amount: centsToCurrency(f.valor),
        status: mapFinanceStatus(f.status),
      }));
    },
    enabled: !!companyId,
  });
}

export function useCashflow(companyId: string) {
  return useQuery({
    queryKey: queryKeys.finance.cashflow(companyId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_cashflow", {
        p_company_id: companyId,
        p_months: FINANCE_SERIES_MONTHS,
      });
      if (error) throw error;
      return (data ?? []).map((r: { mes: string; receita: number; despesa: number }) => ({
        month: r.mes,
        in: centsToCurrency(Number(r.receita)),
        out: centsToCurrency(Number(r.despesa)),
      }));
    },
    enabled: !!companyId,
  });
}

export interface CreateFinanceEntryPayload {
  company_id: string;
  descricao: string;
  tipo: "receita" | "despesa";
  valor: number;
  status?: string;
  vencimento?: string;
  category_id?: string;
}

export function useCreateFinanceEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateFinanceEntryPayload) => {
      const { data, error } = await supabase
        .from("finance_entries")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: queryKeys.finance.scope(d.company_id) });
      qc.invalidateQueries({ queryKey: queryKeys.companies.kpis(d.company_id) });
      toast.success("Lançamento criado!");
    },
    onError: (e) => toast.error((e as Error).message),
  });
}

export function useFinanceCategories(companyId: string) {
  return useQuery({
    queryKey: queryKeys.finance.categories(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_categories")
        .select("*")
        .eq("company_id", companyId)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });
}
