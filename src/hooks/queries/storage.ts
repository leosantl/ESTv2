import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import JSZip from "jszip";

export function useStorageUsage(companyId: string) {
  return useQuery({
    queryKey: [...queryKeys.documents.scope(companyId), "storage-usage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents").select("file_size_bytes").eq("company_id", companyId);
      if (error) throw error;
      const totalBytes = (data ?? []).reduce((sum, d) => sum + (d.file_size_bytes ?? 0), 0);
      return { totalBytes, count: (data ?? []).length };
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });
}

async function downloadAsZip(
  docs: Array<{ nome: string; tipo: string; storage_path: string | null }>,
  zipName: string,
) {
  if (!docs.length) { toast.info("Nenhum documento para exportar."); return; }
  const zip = new JSZip();
  const folder = zip.folder(zipName) ?? zip;
  let downloaded = 0;
  await Promise.all(docs.map(async (doc) => {
    if (!doc.storage_path) return;
    const { data: urlData } = await supabase.storage
      .from("documentos").createSignedUrl(doc.storage_path, 300);
    if (!urlData?.signedUrl) return;
    const res = await fetch(urlData.signedUrl);
    if (!res.ok) return;
    const blob = await res.blob();
    const ext = doc.storage_path.split(".").pop() ?? "pdf";
    const filename = `${doc.tipo}_${doc.nome.replace(/[^a-zA-Z0-9]/g, "_")}.${ext}`;
    folder.file(filename, blob);
    downloaded++;
  }));
  if (!downloaded) { toast.error("Não foi possível baixar os arquivos."); return; }
  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url; a.download = `${zipName}.zip`; a.click();
  URL.revokeObjectURL(url);
  toast.success(`Backup gerado: ${downloaded} arquivo(s).`);
}

export function useClientBackup(companyId: string) {
  return useMutation({
    mutationFn: async ({ clientId, clientName }: { clientId: string; clientName: string }) => {
      const { data, error } = await supabase.from("documents")
        .select("nome, tipo, storage_path").eq("company_id", companyId).eq("client_id", clientId);
      if (error) throw error;
      await downloadAsZip(data ?? [], `backup_${clientName.replace(/\s+/g, "_")}`);
    },
    onError: (e) => toast.error((e as Error).message || "Erro ao gerar backup."),
  });
}

export function useCompanyBackup(companyId: string) {
  return useMutation({
    mutationFn: async ({ companyName }: { companyName: string }) => {
      const { data, error } = await supabase.from("documents")
        .select("nome, tipo, storage_path").eq("company_id", companyId);
      if (error) throw error;
      await downloadAsZip(data ?? [], `backup_completo_${companyName.replace(/\s+/g, "_")}`);
    },
    onError: (e) => toast.error((e as Error).message || "Erro ao gerar backup."),
  });
}
