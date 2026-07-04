import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const SCOPE = (companyId: string) => ["notifications", companyId] as const;

export function useNotificationSettings(companyId: string) {
  return useQuery({
    queryKey: [...SCOPE(companyId), "settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notification_settings")
        .select("*").eq("company_id", companyId).maybeSingle();
      if (error) throw error;
      return data ?? { company_id: companyId, enabled: true, alert_days: [7, 15, 30] };
    },
    enabled: !!companyId,
  });
}

export function useUpsertNotificationSettings(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: { enabled: boolean; alert_days: number[] }) => {
      const { error } = await supabase.from("notification_settings")
        .upsert({ company_id: companyId, ...patch, updated_at: new Date().toISOString() })
        .eq("company_id", companyId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: SCOPE(companyId) }); toast.success("Configurações de alerta salvas."); },
    onError: (e) => toast.error((e as Error).message),
  });
}

export function useNotificationLog(companyId: string) {
  return useQuery({
    queryKey: [...SCOPE(companyId), "log"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notification_log")
        .select("*").eq("company_id", companyId).order("sent_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });
}

export function useTriggerDocCheck(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada.");
      const res = await supabase.functions.invoke("check-expiring-docs", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.error) throw res.error;
      return res.data as { sent: number; skipped: number; errors: number };
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: SCOPE(companyId) });
      toast.success(`Verificação concluída: ${d.sent} alerta(s) enviado(s).`);
    },
    onError: (e) => toast.error((e as Error).message),
  });
}
