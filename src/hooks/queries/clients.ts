/**
 * Hooks de dados do domínio de Clientes / Atiradores (clients).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { PAGE_SIZE } from "@/lib/constants";
import { clientStatusToDb, mapClientStatus } from "@/lib/formatters";
import { queryKeys } from "@/lib/query-keys";
import { supabase } from "@/lib/supabase";

interface ClientListOptions {
  search?: string;
  status?: string;
  page?: number;
}

export function useClients(companyId: string, opts?: ClientListOptions) {
  const { search = "", status, page = 1 } = opts ?? {};
  return useQuery({
    queryKey: queryKeys.clients.list(companyId, search, status, page),
    queryFn: async () => {
      let q = supabase
        .from("clients")
        .select("*", { count: "exact" })
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("nome")
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (status) q = q.eq("status", clientStatusToDb[status] ?? status);
      if (search) {
        q = q.or(
          `nome.ilike.%${search}%,cr.ilike.%${search}%,cpf.ilike.%${search}%,email.ilike.%${search}%`,
        );
      }

      const { data, error, count } = await q;
      if (error) throw error;

      const mapped = (data ?? []).map((c) => ({
        id: c.id,
        name: c.nome,
        cpf: c.cpf ?? "",
        cr: c.cr ?? "",
        phone: c.telefone ?? "",
        email: c.email ?? "",
        status: mapClientStatus(c.status),
        caliber: c.calibre_preferido ?? "",
        joinedAt: c.joined_at,
        crValidade: c.cr_validade,
        observacoes: c.observacoes,
      }));

      return { data: mapped, total: count ?? 0 };
    },
    enabled: !!companyId,
  });
}

export interface CreateClientPayload {
  company_id: string;
  nome: string;
  cpf?: string;
  cr?: string;
  cr_validade?: string;
  telefone?: string;
  email?: string;
  calibre_preferido?: string;
  observacoes?: string;
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateClientPayload) => {
      const { data, error } = await supabase
        .from("clients")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.scope(d.company_id) });
      qc.invalidateQueries({ queryKey: queryKeys.companies.kpis(d.company_id) });
      toast.success("Atirador cadastrado com sucesso!");
    },
    onError: (e) => toast.error((e as Error).message),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      company_id,
      ...data
    }: Record<string, unknown> & { id: string; company_id: string }) => {
      const { error } = await supabase.from("clients").update(data).eq("id", id);
      if (error) throw error;
      return { id, company_id };
    },
    onSuccess: ({ company_id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.scope(company_id) });
      toast.success("Atirador atualizado.");
    },
    onError: (e) => toast.error((e as Error).message),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, company_id }: { id: string; company_id: string }) => {
      const { error } = await supabase
        .from("clients")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      return company_id;
    },
    onSuccess: (company_id) => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.scope(company_id) });
      toast.success("Atirador removido.");
    },
    onError: (e) => toast.error((e as Error).message),
  });
}
