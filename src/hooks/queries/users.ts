/**
 * Hooks de dados do domínio de Usuários da empresa (profiles / convites).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { formatRelative, mapRole } from "@/lib/formatters";
import { queryKeys } from "@/lib/query-keys";
import { supabase } from "@/lib/supabase";

export function useUsers(companyId: string) {
  return useQuery({
    queryKey: queryKeys.users.scope(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("company_id", companyId)
        .order("nome");
      if (error) throw error;
      return (data ?? []).map((u) => ({
        id: u.id,
        name: u.nome,
        email: u.email,
        role: mapRole(u.role),
        status: u.status === "ativo" ? "Ativo" : "Suspenso",
        lastAccess: u.last_access_at ? formatRelative(u.last_access_at) : "Nunca",
      }));
    },
    enabled: !!companyId,
  });
}

export interface InviteUserPayload {
  email: string;
  nome: string;
  role: string;
  company_id: string;
}

export function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: InviteUserPayload) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("invite-user", {
        body: payload,
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: queryKeys.users.scope(v.company_id) });
      toast.success(`Convite enviado para ${v.email}!`);
    },
    onError: (e) => toast.error((e as Error).message),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      company_id,
      ...data
    }: Record<string, unknown> & { id: string; company_id: string }) => {
      const { error } = await supabase.from("profiles").update(data).eq("id", id);
      if (error) throw error;
      return company_id;
    },
    onSuccess: (company_id) => {
      qc.invalidateQueries({ queryKey: queryKeys.users.scope(company_id) });
      toast.success("Usuário atualizado.");
    },
    onError: (e) => toast.error((e as Error).message),
  });
}
