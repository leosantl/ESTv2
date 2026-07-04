import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type Unit = {
  id: string;
  company_id: string;
  nome: string;
  cidade?: string | null;
  estado?: string | null;
  telefone?: string | null;
  email?: string | null;
  endereco?: string | null;
  responsavel?: string | null;
  ativo: boolean;
  created_at: string;
};

export function useUnits(companyId: string) {
  return useQuery({
    queryKey: ["units", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("*")
        .eq("company_id", companyId)
        .order("nome");
      if (error) throw error;
      return data as Unit[];
    },
    enabled: !!companyId,
  });
}

export function useCreateUnit(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Unit, "id" | "created_at" | "ativo"> & { ativo?: boolean }) => {
      const { error } = await supabase.from("units").insert({ ...payload, company_id: companyId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["units", companyId] }),
  });
}

export function useUpdateUnit(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Unit> & { id: string }) => {
      const { error } = await supabase.from("units").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["units", companyId] }),
  });
}

export function useDeleteUnit(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("units").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["units", companyId] }),
  });
}
