import { createFileRoute, useParams } from "@tanstack/react-router";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatusBadge } from "@/components/shell/StatusBadge";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Download, FileText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useRef } from "react";
import { useDocuments, useUploadDocument, useDocumentSignedUrl, useClients, useWeapons } from "@/hooks/useSupabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/app/$companyId/documents")({
  head: () => ({ meta: [{ title: "Documentos · StandControl" }] }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const { companyId } = useParams({ from: "/app/$companyId/documents" });
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const { data: documents = [], isLoading } = useDocuments(companyId, { status: statusFilter });
  const { data: clientsData } = useClients(companyId);
  const { data: weapons = [] } = useWeapons(companyId);
  const upload = useUploadDocument();
  const getUrl = useDocumentSignedUrl();
  const [open, setOpen] = useState(false);

  async function handleDownload(path?: string) {
    if (!path) { toast.error("Arquivo não disponível."); return; }
    const url = await getUrl.mutateAsync(path);
    if (url) window.open(url, "_blank");
    else toast.error("Não foi possível gerar o link de download.");
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Documentos" description="CR, CRAF, certificados e contratos com vencimento monitorado."
        actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1 h-3.5 w-3.5" /> Enviar documento</Button>} />
      <div className="space-y-4 p-4 sm:p-6 lg:p-8">
        <div className="flex gap-2">
          {["Válido", "Vence em breve", "Vencido"].map((s) => (
            <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(statusFilter === s ? undefined : s)}>{s}</Button>
          ))}
        </div>
        <div className="rounded-lg border bg-card">
          {isLoading ? <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Documento</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Tipo</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Vinculado a</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Emissão</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Vencimento</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {documents.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="flex items-center gap-2 font-medium"><FileText className="h-3.5 w-3.5 text-muted-foreground" />{d.name}</TableCell>
                    <TableCell className="text-xs uppercase text-muted-foreground">{d.type}</TableCell>
                    <TableCell className="text-xs">{d.owner !== "—" ? d.owner : d.weaponSerial}</TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">{d.issuedAt}</TableCell>
                    <TableCell className="font-mono text-[11px]">{d.expiresAt}</TableCell>
                    <TableCell><StatusBadge status={d.status} /></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => handleDownload(d.storage_path)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!documents.length && <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">Nenhum documento.</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <UploadDialog open={open} onClose={() => setOpen(false)} clients={clientsData?.data ?? []} weapons={weapons}
        onSave={async (file, meta) => { await upload.mutateAsync({ companyId, file, ...meta }); setOpen(false); }} />
    </div>
  );
}

function UploadDialog({ open, onClose, clients, weapons, onSave }: {
  open: boolean; onClose: () => void;
  clients: Array<{ id: string; name: string }>;
  weapons: Array<{ id: string; serial: string }>;
  onSave: (file: File, meta: { nome: string; tipo: string; emissao: string; vencimento: string; clientId?: string; weaponId?: string }) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ nome: "", tipo: "cr", emissao: "", vencimento: "", clientId: "", weaponId: "" });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || !form.nome || !form.vencimento) { toast.error("Selecione um arquivo e preencha nome/vencimento."); return; }
    setSaving(true);
    try {
      await onSave(file, { nome: form.nome, tipo: form.tipo, emissao: form.emissao || new Date().toISOString().slice(0, 10), vencimento: form.vencimento, clientId: form.clientId || undefined, weaponId: form.weaponId || undefined });
      setForm({ nome: "", tipo: "cr", emissao: "", vencimento: "", clientId: "", weaponId: "" });
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Enviar documento</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Arquivo (PDF, JPG, PNG) *</label>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" className="block w-full text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nome do documento *</label>
            <input value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} placeholder="CR — Ricardo S. Almeida" className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo</label>
            <select value={form.tipo} onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))} className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none">
              <option value="cr">CR</option><option value="craf">CRAF</option><option value="certificado">Certificado</option>
              <option value="contrato">Contrato</option><option value="outro">Outro</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Vencimento *</label>
            <input type="date" value={form.vencimento} onChange={(e) => setForm((p) => ({ ...p, vencimento: e.target.value }))} className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Vincular a cliente</label>
            <select value={form.clientId} onChange={(e) => setForm((p) => ({ ...p, clientId: e.target.value }))} className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none">
              <option value="">Nenhum</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Vincular a arma</label>
            <select value={form.weaponId} onChange={(e) => setForm((p) => ({ ...p, weaponId: e.target.value }))} className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none">
              <option value="">Nenhuma</option>{weapons.map((w) => <option key={w.id} value={w.id}>{w.serial}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={saving}>{saving ? "Enviando..." : "Enviar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
