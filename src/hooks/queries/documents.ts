/**
 * Hooks de dados do domínio de Documentos (documents / storage).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { SIGNED_URL_TTL_SECONDS } from "@/lib/constants";
import { mapDocStatus } from "@/lib/formatters";
import { queryKeys } from "@/lib/query-keys";
import { supabase } from "@/lib/supabase";
import { getPlanStorageBytes } from "@/lib/plan-features";

interface DocumentListOptions {
  status?: string;
  tipo?: string;
  clientId?: string;
}

const DOC_STATUS_FILTER: Record<string, string> = {
  "Vence em breve": "vence_em_breve",
  Vencido: "vencido",
  Válido: "valido",
};

export function useDocuments(companyId: string, opts?: DocumentListOptions) {
  const { status, tipo, clientId } = opts ?? {};
  return useQuery({
    queryKey: queryKeys.documents.list(companyId, status, tipo, clientId),
    queryFn: async () => {
      let q = supabase
        .from("documents_with_status")
        .select("*, clients(nome), weapons(numero_serie)")
        .eq("company_id", companyId)
        .order("vencimento");

      if (tipo) q = q.eq("tipo", tipo.toLowerCase());
      if (clientId) q = q.eq("client_id", clientId);
      if (clientId) q = q.eq("client_id", clientId);
      if (status && DOC_STATUS_FILTER[status]) {
        q = q.eq("doc_status", DOC_STATUS_FILTER[status]);
      }

      const { data, error } = await q;
      if (error) throw error;

      return (data ?? []).map((d) => ({
        id: d.id,
        name: d.nome,
        type: d.tipo,
        owner: d.clients?.nome ?? "—",
        weaponSerial: d.weapons?.numero_serie ?? "—",
        expiresAt: d.vencimento,
        issuedAt: d.emissao,
        status: mapDocStatus(d.doc_status),
        storage_path: d.storage_path,
        client_id: d.client_id,
        weapon_id: d.weapon_id,
      }));
    },
    enabled: !!companyId,
  });
}

export interface UploadDocumentPayload {
  companyId: string;
  file: File;
  nome: string;
  tipo: string;
  emissao: string;
  vencimento: string;
  clientId?: string;
  weaponId?: string;
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      companyId,
      file,
      nome,
      tipo,
      emissao,
      vencimento,
      clientId,
      weaponId,
    }: UploadDocumentPayload) => {
      const [{ data: usageData }, { data: subData }] = await Promise.all([
        supabase.from("documents").select("file_size_bytes").eq("company_id", companyId),
        supabase.from("subscriptions").select("plan_id").eq("company_id", companyId).single(),
      ]);
      const usedBytes = (usageData ?? []).reduce((s: number, d: { file_size_bytes: number | null }) => s + (d.file_size_bytes ?? 0), 0);
      const limitBytes = getPlanStorageBytes(subData?.plan_id);
      if (usedBytes + file.size > limitBytes) {
        throw new Error(`Limite de armazenamento atingido. Limite do plano: ${(limitBytes / (1024 ** 3)).toFixed(0)} GB. Faça upgrade para continuar.`);
      }
      const ext = file.name.split(".").pop();
      const path = `${companyId}/documentos/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("documentos")
        .upload(path, file, { contentType: file.type });
      if (uploadErr) throw uploadErr;

      const { data, error } = await supabase
        .from("documents")
        .insert({
          company_id: companyId,
          client_id: clientId,
          weapon_id: weaponId,
          nome,
          tipo: tipo.toLowerCase(),
          emissao,
          vencimento,
          storage_path: path,
          mime_type: file.type,
          file_size_bytes: file.size,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: queryKeys.documents.scope(d.company_id) });
      toast.success("Documento enviado!");
    },
    onError: (e) => toast.error((e as Error).message),
  });
}

export function useDocumentSignedUrl() {
  return useMutation({
    mutationFn: async (storagePath: string) => {
      const { data } = await supabase.storage
        .from("documentos")
        .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
      return data?.signedUrl ?? null;
    },
  });
}
