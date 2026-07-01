/**
 * Hooks do domínio Controle de Pista (range sessions / shot logging).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { supabase } from "@/lib/supabase";

export interface RangeSession {
  id: string;
  client_id: string;
  clientName: string;
  foto_facial?: string | null;
  entrada_at: string;
  saida_at?: string | null;
  status: "ativo" | "concluido";
  shots: Array<{ weapon_id: string; weaponLabel: string; disparos: number }>;
}

export function useRangeSessions(companyId: string, date?: string) {
  return useQuery({
    queryKey: queryKeys.range.sessions(companyId, date),
    queryFn: async () => {
      const day = date ?? new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("range_sessions")
        .select(
          "*, clients(nome, foto_facial), session_shots(id, disparos, weapons(id, numero_serie, marca, modelo, calibre))"
        )
        .eq("company_id", companyId)
        .gte("entrada_at", `${day}T00:00:00Z`)
        .lte("entrada_at", `${day}T23:59:59Z`)
        .order("entrada_at", { ascending: false });
      if (error) throw error;

      return (data ?? []).map((s) => ({
        id: s.id,
        client_id: s.client_id,
        clientName: (s.clients as { nome: string } | null)?.nome ?? "—",
        foto_facial: (s.clients as { foto_facial?: string } | null)?.foto_facial ?? null,
        entrada_at: s.entrada_at as string,
        saida_at: s.saida_at as string | null,
        status: s.status as "ativo" | "concluido",
        shots: ((s.session_shots as unknown[]) ?? []).map((sh) => {
          const shot = sh as { id: string; disparos: number; weapons: { id: string; numero_serie: string; marca: string; modelo: string; calibre: string } | null };
          return {
            weapon_id: shot.weapons?.id ?? "",
            weaponLabel: shot.weapons
              ? `${shot.weapons.marca} ${shot.weapons.modelo} ${shot.weapons.calibre} — ${shot.weapons.numero_serie}`
              : "—",
            disparos: shot.disparos,
          };
        }),
      })) as RangeSession[];
    },
    enabled: !!companyId,
    refetchInterval: 30_000,
  });
}

export function useRangeReport(companyId: string, from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.range.report(companyId, from, to),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("range_sessions")
        .select(
          "id, entrada_at, saida_at, status, clients(nome), session_shots(disparos, weapons(marca, modelo, calibre, numero_serie))"
        )
        .eq("company_id", companyId)
        .gte("entrada_at", `${from}T00:00:00Z`)
        .lte("entrada_at", `${to}T23:59:59Z`)
        .order("entrada_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId && !!from && !!to,
  });
}

export function useClientDescriptors(companyId: string) {
  return useQuery({
    queryKey: queryKeys.range.descriptors(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, nome, face_descriptor")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .not("face_descriptor", "is", null);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; nome: string; face_descriptor: number[] | null }>;
    },
    enabled: !!companyId,
    staleTime: 5 * 60_000,
  });
}

export function useStartSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ companyId, clientId }: { companyId: string; clientId: string }) => {
      const { data, error } = await supabase
        .from("range_sessions")
        .insert({ company_id: companyId, client_id: clientId, status: "ativo" })
        .select()
        .single();
      if (error) throw error;
      return data as { id: string; company_id: string };
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: queryKeys.range.scope(d.company_id) });
      toast.success("Entrada registrada!");
    },
    onError: (e) => toast.error((e as Error).message),
  });
}

export function useEndSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      companyId,
      shots,
    }: {
      sessionId: string;
      companyId: string;
      shots: Array<{ weapon_id: string; disparos: number }>;
    }) => {
      const { error: sessErr } = await supabase
        .from("range_sessions")
        .update({ saida_at: new Date().toISOString(), status: "concluido" })
        .eq("id", sessionId);
      if (sessErr) throw sessErr;

      if (shots.length > 0) {
        const { error: shotsErr } = await supabase.from("session_shots").insert(
          shots.map((s) => ({ session_id: sessionId, weapon_id: s.weapon_id, disparos: s.disparos }))
        );
        if (shotsErr) throw shotsErr;
      }
      return { sessionId, companyId };
    },
    onSuccess: ({ companyId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.range.scope(companyId) });
      toast.success("Saída registrada com sucesso!");
    },
    onError: (e) => toast.error((e as Error).message),
  });
}

export function useSaveClientFace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      companyId,
      clientId,
      file,
      descriptor,
    }: {
      companyId: string;
      clientId: string;
      file: File;
      descriptor: Float32Array;
    }) => {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${companyId}/faciais/${clientId}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("documentos")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;

      const { error } = await supabase
        .from("clients")
        .update({ foto_facial: path, face_descriptor: Array.from(descriptor) })
        .eq("id", clientId);
      if (error) throw error;
      return { companyId, clientId };
    },
    onSuccess: ({ companyId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.scope(companyId) });
      qc.invalidateQueries({ queryKey: queryKeys.range.descriptors(companyId) });
      toast.success("Foto facial cadastrada!");
    },
    onError: (e) => toast.error((e as Error).message),
  });
}
