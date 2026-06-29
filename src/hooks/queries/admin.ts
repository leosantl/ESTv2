/**
 * Hooks de dados do painel administrativo global (super admin).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { REFETCH_INTERVAL } from "@/lib/constants";
import {
  centsToCurrency,
  formatDate,
  invoiceStatusToDb,
  mapInvoiceStatus,
} from "@/lib/formatters";
import { queryKeys } from "@/lib/query-keys";
import { supabase } from "@/lib/supabase";

interface AdminKpisRpc {
  empresas_ativas: number;
  empresas_trial: number;
  empresas_suspensas: number;
  empresas_churn: number;
  novos_mes: number;
  mrr: number;
  arr: number;
  inadimplencia: number;
}

export function useAdminKpis() {
  return useQuery({
    queryKey: queryKeys.admin.kpis,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_kpis");
      if (error) throw error;
      const d = data as AdminKpisRpc;
      return {
        activeCompanies: d.empresas_ativas,
        trialCompanies: d.empresas_trial,
        suspended: d.empresas_suspensas,
        mrr: centsToCurrency(d.mrr),
        arr: centsToCurrency(d.arr),
        newCustomers: d.novos_mes,
      };
    },
    refetchInterval: REFETCH_INTERVAL.adminKpis,
  });
}

export function useAdminInvoices() {
  return useQuery({
    queryKey: queryKeys.admin.invoices,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, companies(nome_fantasia)")
        .order("vencimento", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map((i) => ({
        id: `INV-${i.id.slice(0, 8).toUpperCase()}`,
        company: i.companies?.nome_fantasia ?? "—",
        amount: Number(i.valor),
        status: mapInvoiceStatus(i.status),
        date: formatDate(i.vencimento),
      }));
    },
  });
}

export function useMrrSeries() {
  return useQuery({
    queryKey: queryKeys.admin.mrrSeries,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_mrr_series", { p_months: 6 });
      if (error) throw error;
      return (data ?? []).map((r: { mes: string; value: number }) => ({
        month: r.mes,
        value: centsToCurrency(Number(r.value)),
      }));
    },
  });
}

export function useAdminUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const dbStatus = invoiceStatusToDb[status] ?? status;
      const { error } = await supabase
        .from("invoices")
        .update({
          status: dbStatus,
          paid_at: dbStatus === "paga" ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.invoices });
      qc.invalidateQueries({ queryKey: queryKeys.admin.kpis });
      toast.success("Fatura atualizada.");
    },
    onError: (e) => toast.error((e as Error).message),
  });
}
