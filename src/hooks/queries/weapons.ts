/**
 * Hooks de dados do domínio de Armas (weapons).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { mapWeaponStatus, weaponStatusToDb } from "@/lib/formatters";
import { queryKeys } from "@/lib/query-keys";
import { supabase } from "@/lib/supabase";

interface WeaponListOptions {
  search?: string;
  status?: string;
}

export function useWeapons(companyId: string, opts?: WeaponListOptions) {
  const { search, status } = opts ?? {};
  return useQuery({
    queryKey: queryKeys.weapons.list(companyId, search, status),
    queryFn: async () => {
      let q = supabase
        .from("weapons")
        .select("*, clients(nome)")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("marca");

      if (status) q = q.eq("situacao", weaponStatusToDb[status] ?? status);
      if (search) {
        q = q.or(
          `marca.ilike.%${search}%,modelo.ilike.%${search}%,numero_serie.ilike.%${search}%`,
        );
      }

      const { data, error } = await q;
      if (error) throw error;

      return (data ?? []).map((w) => ({
        id: w.id,
        brand: w.marca,
        model: w.modelo,
        caliber: w.calibre,
        serial: w.numero_serie,
        owner: w.clients?.nome ?? "—",
        status: mapWeaponStatus(w.situacao),
        registeredAt: w.registered_at,
        observacoes: w.observacoes,
        client_id: w.client_id,
      }));
    },
    enabled: !!companyId,
  });
}

export interface CreateWeaponPayload {
  company_id: string;
  client_id?: string;
  marca: string;
  modelo: string;
  calibre: string;
  numero_serie: string;
  observacoes?: string;
}

export function useCreateWeapon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateWeaponPayload) => {
      const { data, error } = await supabase
        .from("weapons")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: queryKeys.weapons.scope(d.company_id) });
      toast.success("Arma cadastrada com sucesso!");
    },
    onError: (e) => toast.error((e as Error).message),
  });
}

export function useUpdateWeapon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      company_id,
      ...data
    }: Record<string, unknown> & { id: string; company_id: string }) => {
      const { error } = await supabase.from("weapons").update(data).eq("id", id);
      if (error) throw error;
      return company_id;
    },
    onSuccess: (company_id) => {
      qc.invalidateQueries({ queryKey: queryKeys.weapons.scope(company_id) });
      toast.success("Arma atualizada.");
    },
    onError: (e) => toast.error((e as Error).message),
  });
}
