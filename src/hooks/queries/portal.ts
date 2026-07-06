import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function usePortalClient() {
  return useQuery({
    queryKey: ["portal", "client"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .single();
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
        .order("created_at", { ascending: false });
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
        .gte("data", new Date().toISOString().split("T")[0])
        .order("data")
        .limit(10);
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
        .from("documents")
        .createSignedUrl(path, 300);
      if (error) throw error;
      return data.signedUrl;
    },
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
