/**
 * Hooks de dados do domínio de Agenda (schedules / lanes).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { formatTime, mapScheduleStatus } from "@/lib/formatters";
import { queryKeys } from "@/lib/query-keys";
import { supabase } from "@/lib/supabase";

interface ScheduleListOptions {
  date?: string;
  status?: string;
}

export function useSchedules(companyId: string, opts?: ScheduleListOptions) {
  const { date, status } = opts ?? {};
  return useQuery({
    queryKey: queryKeys.schedules.list(companyId, date, status),
    queryFn: async () => {
      let q = supabase
        .from("schedules")
        .select("*, clients(nome), profiles(nome), lanes(nome)")
        .eq("company_id", companyId)
        .order("starts_at");

      if (date) {
        q = q.gte("starts_at", `${date}T00:00:00`).lte("starts_at", `${date}T23:59:59`);
      }
      if (status) q = q.eq("status", status);

      const { data, error } = await q;
      if (error) throw error;

      return (data ?? []).map((s) => ({
        id: s.id,
        time: formatTime(s.starts_at),
        title: s.titulo,
        client: s.clients?.nome ?? "—",
        lane: s.lanes?.nome ?? "—",
        instructor: s.profiles?.nome ?? "—",
        durationMin: s.duration_min,
        status: mapScheduleStatus(s.status),
        tipo: s.tipo,
        starts_at: s.starts_at,
      }));
    },
    enabled: !!companyId,
  });
}

export function useWeekScheduleSummary(companyId: string) {
  return useQuery({
    queryKey: queryKeys.schedules.weekSummary(companyId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_week_schedule_summary", {
        p_company_id: companyId,
      });
      if (error) throw error;
      return (data ?? []) as Array<{ dia: string; count: number }>;
    },
    enabled: !!companyId,
  });
}

export interface CreateSchedulePayload {
  company_id: string;
  titulo: string;
  tipo: string;
  starts_at: string;
  duration_min?: number;
  client_id?: string;
  lane_id?: string;
  instructor_id?: string;
  observacoes?: string;
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSchedulePayload) => {
      const { data, error } = await supabase
        .from("schedules")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: queryKeys.schedules.scope(d.company_id) });
      toast.success("Agendamento criado!");
    },
    onError: (e) => toast.error((e as Error).message),
  });
}

export function useUpdateScheduleStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      company_id,
    }: {
      id: string;
      status: string;
      company_id: string;
    }) => {
      const { error } = await supabase.from("schedules").update({ status }).eq("id", id);
      if (error) throw error;
      return company_id;
    },
    onSuccess: (company_id) => {
      qc.invalidateQueries({ queryKey: queryKeys.schedules.scope(company_id) });
      toast.success("Status atualizado.");
    },
    onError: (e) => toast.error((e as Error).message),
  });
}

export function useLanes(companyId: string) {
  return useQuery({
    queryKey: queryKeys.schedules.lanes(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lanes")
        .select("*")
        .eq("company_id", companyId)
        .eq("ativa", true)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });
}
