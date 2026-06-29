/**
 * Hooks de dados do domínio de Munições (ammo_stock / ammo_movements).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { formatDate } from "@/lib/formatters";
import { queryKeys } from "@/lib/query-keys";
import { supabase } from "@/lib/supabase";

export function useAmmoStock(companyId: string) {
  return useQuery({
    queryKey: queryKeys.ammo.stock(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ammo_stock")
        .select("*")
        .eq("company_id", companyId)
        .order("calibre");
      if (error) throw error;
      return (data ?? []).map((s) => ({
        id: s.id,
        caliber: s.calibre,
        brand: s.marca,
        stock: s.estoque,
        min: s.estoque_minimo,
        lastEntry: s.last_entry_at ?? "—",
        abaixoMinimo: s.estoque < s.estoque_minimo,
      }));
    },
    enabled: !!companyId,
  });
}

export function useAmmoMovements(companyId: string) {
  return useQuery({
    queryKey: queryKeys.ammo.movements(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ammo_movements")
        .select("*, ammo_stock(marca)")
        .eq("company_id", companyId)
        .order("moved_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map((m) => ({
        id: m.id,
        type: m.tipo === "entrada" ? "Entrada" : "Saída",
        caliber: m.calibre,
        qty: m.quantidade,
        responsible: m.responsavel,
        date: formatDate(m.moved_at),
        brand: m.ammo_stock?.marca,
      }));
    },
    enabled: !!companyId,
  });
}

export interface CreateAmmoMovementPayload {
  company_id: string;
  ammo_stock_id: string;
  tipo: "entrada" | "saida";
  calibre: string;
  quantidade: number;
  responsavel: string;
  observacoes?: string;
}

export function useCreateAmmoMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateAmmoMovementPayload) => {
      const { data, error } = await supabase
        .from("ammo_movements")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: queryKeys.ammo.stock(d.company_id) });
      qc.invalidateQueries({ queryKey: queryKeys.ammo.movements(d.company_id) });
      toast.success("Movimentação registrada!");
    },
    onError: (e) => toast.error((e as Error).message),
  });
}

export interface CreateAmmoStockPayload {
  company_id: string;
  calibre: string;
  marca: string;
  estoque: number;
  estoque_minimo: number;
}

export function useCreateAmmoStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateAmmoStockPayload) => {
      const { data, error } = await supabase
        .from("ammo_stock")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: queryKeys.ammo.stock(d.company_id) });
      toast.success("Calibre adicionado ao estoque!");
    },
    onError: (e) => toast.error((e as Error).message),
  });
}
