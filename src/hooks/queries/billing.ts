/**
 * Hooks de dados do domínio de Cobrança/Planos (plans / subscriptions / invoices).
 */

import { useQuery } from "@tanstack/react-query";

import { STALE_TIME } from "@/lib/constants";
import { centsToCurrency, formatDate, mapInvoiceStatus } from "@/lib/formatters";
import { queryKeys } from "@/lib/query-keys";
import { supabase } from "@/lib/supabase";

export function usePlans() {
  return useQuery({
    queryKey: queryKeys.billing.plans,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("active", true)
        .order("monthly_price");
      if (error) throw error;
      return (data ?? []).map((p) => ({
        id: p.id,
        name: p.name as "Starter" | "Professional" | "Enterprise",
        tagline: p.tagline,
        monthly: centsToCurrency(p.monthly_price),
        annual: centsToCurrency(p.annual_price),
        maxClients: p.max_clients ?? "Ilimitado",
        maxUsers: p.max_users ?? "Ilimitado",
        features: p.features ?? [],
        highlighted: p.highlighted,
      }));
    },
    staleTime: STALE_TIME.plans,
  });
}

export function useSubscription(companyId: string) {
  return useQuery({
    queryKey: queryKeys.billing.subscription(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, plans(*)")
        .eq("company_id", companyId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useInvoices(companyId: string) {
  return useQuery({
    queryKey: queryKeys.billing.invoices(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("company_id", companyId)
        .order("vencimento", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((i) => ({
        id: i.id,
        amount: Number(i.valor),
        status: mapInvoiceStatus(i.status),
        date: formatDate(i.vencimento),
        company: "",
        descricao: i.descricao,
      }));
    },
    enabled: !!companyId,
  });
}
