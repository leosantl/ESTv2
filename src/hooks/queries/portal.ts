import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export function usePortalClient() {
  return useQuery({
    queryKey: ["portal", "client"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*, companies(nome_fantasia)").single();
      if (error) throw error;
      return data;
    },
  });
}

export function usePortalDocuments(clientId: string | undefined) {
  return useQuery({
    queryKey: ["portal", "documents", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("client_id", clientId!)
        .order("vencimento", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId,
  });
}

export function usePortalSchedules(clientId: string | undefined) {
  return useQuery({
    queryKey: ["portal", "schedules", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedules")
        .select("*")
        .eq("client_id", clientId!)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at")
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId,
  });
}

export function usePortalDocUrl() {
  return useMutation({
    mutationFn: async (path: string) => {
      const { data, error } = await supabase.storage
        .from("documentos")
        .createSignedUrl(path, 300);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export function useCreatePortalSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      company_id: string;
      client_id: string;
      titulo: string;
      tipo: string;
      starts_at: string;
    }) => {
      const { data, error } = await supabase
        .from("schedules")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["portal", "schedules", d.client_id] });
      toast.success("Sessão agendada!");
    },
    onError: (e) => toast.error((e as Error).message),
  });
}

export function useSendPortalInvite(companyId: string) {
  return useMutation({
    mutationFn: async ({ clientId, email }: { clientId: string; email: string }) => {
      const { data, error } = await supabase.functions.invoke("send-portal-invite", {
        body: { clientId, email, companyId },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useUploadPortalDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ companyId, clientId, file, tipo, vencimento }: {
      companyId: string; clientId: string; file: File; tipo: string; vencimento: string;
    }) => {
      const ext = file.name.split(".").pop();
      const path = `portal/${clientId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("documentos")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data, error } = await supabase.from("documents").insert({
        company_id: companyId,
        client_id: clientId,
        nome: file.name,
        tipo: tipo.toLowerCase(),
        emissao: new Date().toISOString().split("T")[0],
        vencimento: vencimento || null,
        storage_path: path,
        mime_type: file.type,
        file_size_bytes: file.size,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["portal", "documents", d.client_id] });
      toast.success("Documento enviado!");
    },
    onError: (e) => toast.error((e as Error).message),
  });
}
