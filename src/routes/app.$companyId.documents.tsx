import { createFileRoute, useParams } from "@tanstack/react-router";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatusBadge } from "@/components/shell/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  FileText, ShieldCheck, FileSignature, ScrollText, FolderOpen,
  Upload, Eye, Trash2, Loader2, ChevronDown, ChevronUp, Plus,
} from "lucide-react";
import { useState, useRef } from "react";
import { useDocuments, useUploadDocument, useDocumentSignedUrl, useClients, useWeapons } from "@/hooks/useSupabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export const Route = createFileRoute("/app/$companyId/documents")({
  head: () => ({ meta: [{ title: "Documentos · StandControl" }] }),
  component: DocumentsPage,
});

const DOC_TYPES = [
  { key: "cr",          label: "CR",           desc: "Certificado de Registro",              icon: ShieldCheck,    color: "text-blue-500",   bg: "bg-blue-500/10" },
  { key: "craf",        label: "CRAF",          desc: "Certificado de Registro de Arma de Fogo", icon: FileText,    color: "text-violet-500", bg: "bg-violet-500/10" },
  { key: "certificado", label: "Certificado",   desc: "Capacitação, curso técnico ou similar", icon: ScrollText,   color: "text-emerald-500",bg: "bg-emerald-500/10" },
  { key: "contrato",    label: "Contrato",      desc: "Contrato de prestação de serviços",    icon: FileSignature,  color: "text-amber-500",  bg: "bg-amber-500/10" },
  { key: "outro",       label: "Outro",         desc: "Alvarás, licenças e demais documentos",icon: FolderOpen,    color: "text-rose-500",   bg: "bg-rose-500/10" },
] as const;

type DocTypeKey = typeof DOC_TYPES[number]["key"];

function DocumentsPage() {
  const { companyId } = useParams({ from: "/app/$companyId/documents" });
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [uploadFor, setUploadFor] = useState<DocTypeKey | null>(null);
  const [expanded, setExpanded] = useState<Set<DocTypeKey>>(new Set(["cr", "craf", "certificado", "contrato", "outro"]));
  const { data: documents = [], isLoading } = useDocuments(companyId, { status: statusFilter });
  const { data: clientsData } = useClients(companyId);
  const { data: weapons = [] } = useWeapons(companyId);
  const upload = useUploadDocument();
  const getUrl = useDocumentSignedUrl();
  const qc = useQueryClient();

  function toggleExpand(key: DocTypeKey) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function handleView(path?: string) {
    if (!path) { toast.error("Arquivo não disponível."); return; }
    const url = await getUrl.mutateAsync(path);
    if (url) window.open(url, "_blank");
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este documento?")) return;
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: queryKeys.documents.scope(companyId) });
    toast.success("Documento removido.");
  }

  const counts = { valido: 0, vence_em_breve: 0, vencido: 0 };
  documents.forEach((d) => {
    const s = d.status.toLowerCase().replace(/ /g, "_");
    if (s in counts) (counts as Record<string, number>)[s]++;
  });

  const statCards = [
    { label: "Válidos",        value: counts.valido,          color: "text-emerald-600", bg: "bg-emerald-500/10" },
    { label: "Vence em breve", value: counts.vence_em_breve,  color: "text-amber-600",   bg: "bg-amber-500/10" },
    { label: "Vencidos",       value: counts.vencido,         color: "text-rose-600",    bg: "bg-rose-500/10" },
    { label: "Total",          value: documents.length,       color: "text-foreground",  bg: "bg-muted" },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Documentos" description="CR, CRAF, certificados e contratos com vencimento monitorado." />
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statCards.map((c) => (
            <div key={c.label} className={`rounded-xl border p-4 ${c.bg}`}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{c.label}</p>
              <p className={`mt-1 text-2xl font-bold tabular-nums ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {[undefined, "Válido", "Vence em breve", "Vencido"].map((s) => (
            <Button key={s ?? "todos"} size="sm" variant={statusFilter === s ? "default" : "outline"}
              onClick={() => setStatusFilter(s)}>
              {s ?? "Todos"}
            </Button>
          ))}
        </div>
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {DOC_TYPES.map((dtype) => {
              const Icon = dtype.icon;
              const rows = documents.filter((d) => d.type === dtype.key);
              const isOpen = expanded.has(dtype.key);
              return (
                <div key={dtype.key} className="rounded-xl border bg-card overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-muted/40 transition-colors"
                    onClick={() => toggleExpand(dtype.key)}>
                    <div className={`grid size-9 shrink-0 place-items-center rounded-lg ${dtype.bg}`}>
                      <Icon className={`h-4 w-4 ${dtype.color}`} strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{dtype.label}</span>
                        {rows.length > 0 && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono font-semibold text-muted-foreground">{rows.length}</span>
                        )}
                        {rows.some((d) => d.status === "Vencido") && (
                          <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-600">vencido</span>
                        )}
                        {rows.some((d) => d.status === "Vence em breve") && !rows.some((d) => d.status === "Vencido") && (
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600">atenção</span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{dtype.desc}</p>
                    </div>
                    <Button size="sm" variant="outline" className="shrink-0 gap-1.5 text-xs"
                      onClick={(e) => { e.stopPropagation(); setUploadFor(dtype.key); }}>
                      <Plus className="h-3.5 w-3.5" /> Adicionar
                    </Button>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </div>
                  {isOpen && (
                    <div className="border-t">
                      {rows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
                          <Upload className="h-6 w-6 opacity-40" />
                          <p className="text-xs">Nenhum documento de {dtype.label} cadastrado</p>
                          <Button size="sm" variant="outline" className="mt-1 text-xs" onClick={() => setUploadFor(dtype.key)}>
                            <Plus className="mr-1 h-3 w-3" /> Adicionar primeiro
                          </Button>
                        </div>
                      ) : (
                        <div className="divide-y">
                          {rows.map((d) => (
                            <div key={d.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <div className="flex-1 min-w-0">
                                <p className="truncate text-sm font-medium">{d.name}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {d.owner !== "—" ? `Atirador: ${d.owner}` : d.weaponSerial !== "—" ? `Arma: ${d.weaponSerial}` : "Empresa"}
                                  {d.expiresAt && ` · Vence ${d.expiresAt}`}
                                </p>
                              </div>
                              <StatusBadge status={d.status} />
                              <div className="flex items-center gap-1 shrink-0">
                                <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground"
                                  title="Visualizar" onClick={() => handleView(d.storage_path)}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive"
                                  title="Remover" onClick={() => handleDelete(d.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {uploadFor && (
        <UploadDialog open tipoFixed={uploadFor} onClose={() => setUploadFor(null)}
          clients={clientsData?.data ?? []} weapons={weapons}
          onSave={async (file, meta) => { await upload.mutateAsync({ companyId, file, ...meta }); setUploadFor(null); }} />
      )}
    </div>
  );
}

function UploadDialog({ open, tipoFixed, onClose, clients, weapons, onSave }: {
  open: boolean; tipoFixed: DocTypeKey; onClose: () => void;
  clients: Array<{ id: string; name: string }>;
  weapons: Array<{ id: string; serial: string }>;
  onSave: (file: File, meta: { nome: string; tipo: string; emissao: string; vencimento: string; clientId?: string; weaponId?: string }) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ nome: "", emissao: "", vencimento: "", clientId: "", weaponId: "" });
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const dtype = DOC_TYPES.find((d) => d.key === tipoFixed)!;
  const Icon = dtype.icon;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Arquivo muito grande (máx 10 MB)."); e.target.value = ""; return; }
    if (file.type.startsWith("image/")) setPreview(URL.createObjectURL(file));
    else setPreview(null);
    if (!form.nome) setForm((p) => ({ ...p, nome: file.name.replace(/\.[^.]+$/, "") }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { toast.error("Selecione um arquivo."); return; }
    if (!form.nome || !form.vencimento) { toast.error("Preencha nome e vencimento."); return; }
    setSaving(true);
    try {
      await onSave(file, { nome: form.nome, tipo: tipoFixed, emissao: form.emissao || new Date().toISOString().slice(0, 10), vencimento: form.vencimento, clientId: form.clientId || undefined, weaponId: form.weaponId || undefined });
      setForm({ nome: "", emissao: "", vencimento: "", clientId: "", weaponId: "" }); setPreview(null);
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`grid size-8 place-items-center rounded-lg ${dtype.bg}`}>
              <Icon className={`h-4 w-4 ${dtype.color}`} strokeWidth={1.75} />
            </div>
            Adicionar {dtype.label}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <label className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-colors hover:bg-muted/40 ${preview ? "border-foreground/20" : "border-border"}`}>
            {preview ? <img src={preview} alt="preview" className="max-h-32 rounded-lg object-contain" /> : (
              <><Upload className="h-8 w-8 text-muted-foreground opacity-60" />
              <p className="text-sm font-medium">Clique para selecionar o arquivo</p>
              <p className="text-[11px] text-muted-foreground">PDF, JPG ou PNG — máx. 10 MB</p></>
            )}
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={handleFile} />
          </label>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nome / identificação *</label>
            <input value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
              placeholder={`${dtype.label} — Ricardo S. Almeida`}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-foreground/60" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Emissão</label>
              <input type="date" value={form.emissao} onChange={(e) => setForm((p) => ({ ...p, emissao: e.target.value }))}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Vencimento *</label>
              <input type="date" value={form.vencimento} onChange={(e) => setForm((p) => ({ ...p, vencimento: e.target.value }))}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none" />
            </div>
          </div>
          {clients.length > 0 && (
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Vincular a atirador (opcional)</label>
              <select value={form.clientId} onChange={(e) => setForm((p) => ({ ...p, clientId: e.target.value }))}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none">
                <option value="">— Documento da empresa —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          {weapons.length > 0 && (
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Vincular a arma (opcional)</label>
              <select value={form.weaponId} onChange={(e) => setForm((p) => ({ ...p, weaponId: e.target.value }))}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none">
                <option value="">— Nenhuma —</option>
                {weapons.map((w) => <option key={w.id} value={w.id}>{w.serial}</option>)}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Enviando..." : "Salvar documento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
