import { createFileRoute, useParams } from "@tanstack/react-router";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatusBadge } from "@/components/shell/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Loader2, Download, FileText, Trash2, Eye, Upload, CheckCircle2, ShieldCheck, ScrollText, FileSignature, FolderOpen, Camera, ScanFace, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useRef } from "react";
import { useClients, useCreateClient, useDeleteClient, useDocuments, useUploadDocument, useDocumentSignedUrl, useSaveClientFace } from "@/hooks/useSupabase";
import { getDescriptor } from "@/lib/face-recognition";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/app/$companyId/clients")({
  head: () => ({ meta: [{ title: "Atiradores · StandControl" }] }),
  component: ClientsPage,
});

type Client = { id: string; name: string; cpf?: string; cr?: string; phone?: string; email?: string; caliber?: string; status: string };

function ClientsPage() {
  const { companyId } = useParams({ from: "/app/$companyId/clients" });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<Client | null>(null);
  const { data, isLoading } = useClients(companyId, { search, status: statusFilter });
  const createClient = useCreateClient();
  const deleteClient = useDeleteClient();

  function exportCsv() {
    const rows = data?.data ?? [];
    if (!rows.length) return;
    const header = ["Nome", "CPF", "CR", "Calibre", "Telefone", "E-mail", "Status"];
    const lines = rows.map((c) =>
      [c.name, c.cpf ?? "", c.cr ?? "", c.caliber ?? "", c.phone ?? "", c.email ?? "", c.status]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    );
    const blob = new Blob(["\uFEFF" + [header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `atiradores-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click();
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Atiradores" description="Cadastro completo de CACs com CR, calibre principal e status."
        actions={<>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!data?.data?.length}><Download className="mr-1 h-3.5 w-3.5" /> Exportar CSV</Button>
          <Button size="sm" onClick={() => setNewOpen(true)}><Plus className="mr-1 h-3.5 w-3.5" /> Novo atirador</Button>
        </>} />
      <div className="space-y-4 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nome, CPF, CR..." className="h-9 pl-8 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            {["Ativo", "Pendente", "Inativo"].map((s) => (
              <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(statusFilter === s ? undefined : s)}>{s}</Button>
            ))}
          </div>
        </div>
        <div className="rounded-lg border bg-card">
          {isLoading ? <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Nome</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">CPF</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">CR</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Calibre</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Contato</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(data?.data ?? []).map((c) => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(c)}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">{c.cpf}</TableCell>
                    <TableCell className="font-mono text-[11px]">{c.cr}</TableCell>
                    <TableCell className="font-mono text-[11px]">{c.caliber}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.phone}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => { if (confirm(`Remover ${c.name}?`)) deleteClient.mutate({ id: c.id, company_id: companyId }); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!data?.data?.length && <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">Nenhum atirador encontrado.</TableCell></TableRow>}
              </TableBody>
            </Table>
            </div>
          )}
        </div>
        {data && <p className="text-right text-[11px] text-muted-foreground">{data.total} registro{data.total !== 1 ? "s" : ""}</p>}
      </div>
      <NewClientDialog open={newOpen} onClose={() => setNewOpen(false)} companyId={companyId}
        onSave={async (payload) => { const r = await createClient.mutateAsync({ ...payload, company_id: companyId }); return r as { id: string }; }} />
      {selected && <ClientDetailDialog client={selected} companyId={companyId} onClose={() => setSelected(null)} />}
    </div>
  );
}

function ClientDetailDialog({ client, companyId, onClose }: { client: Client; companyId: string; onClose: () => void }) {
  const [tab, setTab] = useState<"dados" | "documentos">("dados");
  const [uploadOpen, setUploadOpen] = useState(false);
  const { data: docs = [], isLoading: loadingDocs } = useDocuments(companyId, { clientId: client.id } as any);
  const getUrl = useDocumentSignedUrl();
  const upload = useUploadDocument();

  async function handleView(path?: string) {
    if (!path) { toast.error("Arquivo não disponível."); return; }
    const url = await getUrl.mutateAsync(path);
    if (url) window.open(url, "_blank");
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-full bg-muted font-mono text-[11px] font-bold">
              {client.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            {client.name}
            <StatusBadge status={client.status} />
          </DialogTitle>
        </DialogHeader>
        <div className="flex gap-1 border-b">
          {(["dados", "documentos"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={"px-4 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors " +
                (tab === t ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
              {t === "dados" ? "Dados" : "Documentos"}
            </button>
          ))}
        </div>
        {tab === "dados" && (
          <div className="grid gap-3 sm:grid-cols-2 py-2">
            {[{ label: "CPF", value: client.cpf }, { label: "CR", value: client.cr },
              { label: "Calibre", value: client.caliber }, { label: "Telefone", value: client.phone },
              { label: "E-mail", value: client.email }].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="mt-0.5 text-sm">{value || "—"}</p>
              </div>
            ))}
          </div>
        )}
        {tab === "documentos" && (
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Documentos vinculados a este atirador</p>
              <Button size="sm" onClick={() => setUploadOpen(true)}><Upload className="mr-1 h-3.5 w-3.5" /> Anexar</Button>
            </div>
            {loadingDocs ? (
              <div className="flex h-24 items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : (docs as any[]).length === 0 ? (
              <div className="flex h-24 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-muted-foreground">
                <FileText className="h-6 w-6" /><p className="text-xs">Nenhum documento anexado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(docs as any[]).map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{d.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{d.type} · Vence {d.expiresAt}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <StatusBadge status={d.status} />
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => handleView(d.storage_path)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {uploadOpen && (
              <UploadDocDialog open={uploadOpen} onClose={() => setUploadOpen(false)}
                onSave={async (file, meta) => { await upload.mutateAsync({ companyId, file, ...meta, clientId: client.id }); setUploadOpen(false); }} />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function UploadDocDialog({ open, onClose, onSave }: {
  open: boolean; onClose: () => void;
  onSave: (file: File, meta: { nome: string; tipo: string; emissao: string; vencimento: string }) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ nome: "", tipo: "cr", emissao: "", vencimento: "" });
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
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
      await onSave(file, { nome: form.nome, tipo: form.tipo, emissao: form.emissao || new Date().toISOString().slice(0, 10), vencimento: form.vencimento });
      setForm({ nome: "", tipo: "cr", emissao: "", vencimento: "" }); setPreview(null);
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Anexar documento</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <label className={"flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer hover:bg-muted/40 " + (preview ? "border-foreground/30" : "border-border")}>
            {preview ? <img src={preview} alt="preview" className="max-h-32 rounded object-contain" /> : (
              <><Upload className="h-8 w-8 text-muted-foreground" /><p className="text-sm font-medium">Clique para selecionar</p><p className="text-[11px] text-muted-foreground">PDF, JPG, PNG — máx. 10 MB</p></>
            )}
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={handleFileChange} />
          </label>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nome do documento *</label>
            <input value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
              placeholder="CR — Ricardo S. Almeida" className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo</label>
              <select value={form.tipo} onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none">
                <option value="cr">CR</option><option value="craf">CRAF</option>
                <option value="certificado">Certificado</option><option value="contrato">Contrato</option><option value="outro">Outro</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Vencimento *</label>
              <input type="date" value={form.vencimento} onChange={(e) => setForm((p) => ({ ...p, vencimento: e.target.value }))}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={saving}>{saving ? "Enviando..." : "Anexar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const DOC_SLOTS = [
  { key: "cr",          label: "CR",         desc: "Certificado de Registro",                icon: ShieldCheck,    color: "text-blue-500",    bg: "bg-blue-500/10" },
  { key: "craf",        label: "CRAF",        desc: "Certificado de Registro de Arma de Fogo", icon: FileText,      color: "text-violet-500",  bg: "bg-violet-500/10" },
  { key: "certificado", label: "Certificado", desc: "Curso, capacitação técnica",              icon: ScrollText,    color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { key: "contrato",    label: "Contrato",    desc: "Contrato de associado",                   icon: FileSignature, color: "text-amber-500",   bg: "bg-amber-500/10" },
  { key: "outro",       label: "Outro",       desc: "Demais documentos",                       icon: FolderOpen,    color: "text-rose-500",    bg: "bg-rose-500/10" },
] as const;

type SlotKey = typeof DOC_SLOTS[number]["key"];
type PendingDoc = { slotKey: SlotKey; file: File | null; nome: string; vencimento: string; preview: string | null };

function NewClientDialog({ open, onClose, companyId, onSave }: {
  open: boolean; onClose: () => void; companyId: string;
  onSave: (p: Record<string, string>) => Promise<{ id: string } | void>;
}) {
  const upload = useUploadDocument();
  const saveFace = useSaveClientFace();
  const [step, setStep] = useState<"dados" | "foto" | "documentos">("dados");
  const [createdClient, setCreatedClient] = useState<{ id: string; nome: string } | null>(null);
  const [form, setForm] = useState({ nome: "", cpf: "", cr: "", cr_validade: "", telefone: "", email: "", calibre_preferido: "" });
  const [saving, setSaving] = useState(false);
  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [streamRef, setStreamRef] = useState<MediaStream | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [savingFace, setSavingFace] = useState(false);

  function resetAndClose() {
    setStep("dados");
    setCreatedClient(null);
    setForm({ nome: "", cpf: "", cr: "", cr_validade: "", telefone: "", email: "", calibre_preferido: "" });
    setPendingDocs([]);
    stopCamera();
    setCapturedFile(null);
    setCapturedPreview(null);
    onClose();
  }

  function stopCamera() {
    streamRef?.getTracks().forEach((t) => t.stop());
    setStreamRef(null);
    setCameraOn(false);
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } });
      setStreamRef(stream);
      setCameraOn(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch { toast.error("Câmera não disponível."); }
  }

  function capturePhoto() {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")!.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "facial.jpg", { type: "image/jpeg" });
      setCapturedFile(file);
      setCapturedPreview(URL.createObjectURL(blob));
      stopCamera();
    }, "image/jpeg", 0.9);
  }

  function selectPhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCapturedFile(file);
    setCapturedPreview(URL.createObjectURL(file));
  }

  async function saveFacePhoto() {
    if (!capturedFile || !createdClient?.id) { setStep("documentos"); return; }
    setSavingFace(true);
    try {
      const img = new Image();
      img.src = capturedPreview!;
      await new Promise((r) => { img.onload = r; });
      const descriptor = await getDescriptor(img).catch(() => null);
      await saveFace.mutateAsync({ companyId, clientId: createdClient.id, file: capturedFile, descriptor: descriptor ?? new Float32Array(128) });
      setStep("documentos");
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setSavingFace(false); }
  }

  async function submitDados(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome) { toast.error("Nome obrigatório."); return; }
    setSaving(true);
    try {
      const result = await onSave(form) as { id: string } | void;
      const clientId = (result as { id: string })?.id;
      setCreatedClient({ id: clientId ?? "", nome: form.nome });
      setStep("foto");
    } finally { setSaving(false); }
  }

  function setSlotFile(slotKey: SlotKey, file: File | null) {
    setPendingDocs((prev) => {
      const existing = prev.find((d) => d.slotKey === slotKey);
      const preview = file?.type.startsWith("image/") ? URL.createObjectURL(file!) : null;
      const nome = file?.name.replace(/\.[^.]+$/, "") ?? "";
      if (existing) return prev.map((d) => d.slotKey === slotKey ? { ...d, file, preview, nome: d.nome || nome } : d);
      return [...prev, { slotKey, file, nome, vencimento: "", preview }];
    });
  }

  function updateSlot(slotKey: SlotKey, field: "nome" | "vencimento", value: string) {
    setPendingDocs((prev) => prev.map((d) => d.slotKey === slotKey ? { ...d, [field]: value } : d));
  }

  function removeSlot(slotKey: SlotKey) {
    setPendingDocs((prev) => prev.filter((d) => d.slotKey !== slotKey));
  }

  async function finishWithDocs() {
    const toUpload = pendingDocs.filter((d) => d.file);
    if (toUpload.length === 0) { resetAndClose(); return; }
    for (const d of toUpload) {
      if (!d.vencimento) { toast.error(`Informe o vencimento de ${d.slotKey.toUpperCase()}.`); return; }
    }
    if (!createdClient?.id) { resetAndClose(); return; }
    setUploadingDocs(true);
    try {
      for (const d of toUpload) {
        await upload.mutateAsync({
          companyId, file: d.file!, nome: d.nome || d.slotKey.toUpperCase(),
          tipo: d.slotKey, emissao: new Date().toISOString().slice(0, 10),
          vencimento: d.vencimento, clientId: createdClient.id,
        });
      }
      toast.success(`${toUpload.length} documento(s) anexado(s)!`);
      resetAndClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setUploadingDocs(false); }
  }

  const fields = [
    { key: "nome", label: "Nome completo *", placeholder: "Ricardo S. Almeida", span: true },
    { key: "cpf", label: "CPF", placeholder: "154.***.**9-22" },
    { key: "cr", label: "CR", placeholder: "SP-154329" },
    { key: "cr_validade", label: "Validade do CR", placeholder: "", type: "date" },
    { key: "telefone", label: "Telefone", placeholder: "(11) 98421-3320" },
    { key: "email", label: "E-mail", placeholder: "ricardo@cac.br" },
    { key: "calibre_preferido", label: "Calibre principal", placeholder: "9mm" },
  ];

  const STEPS = ["dados", "foto", "documentos"] as const;

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-1">
          {STEPS.map((s, i) => {
            const past = STEPS.indexOf(step) > i;
            const active = step === s;
            return (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className={`h-px w-8 ${STEPS.indexOf(step) >= i ? "bg-foreground" : "bg-border"}`} />}
                <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${active ? "bg-foreground text-background" : past ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                  {past ? <CheckCircle2 className="h-3 w-3" /> : <span>{i + 1}</span>}
                  {s === "dados" ? "Dados" : s === "foto" ? "Foto facial" : "Documentos"}
                </div>
              </div>
            );
          })}
        </div>

        <DialogHeader>
          <DialogTitle>
            {step === "dados" ? "Novo atirador" : step === "foto" ? `Foto facial — ${createdClient?.nome ?? ""}` : `Documentos — ${createdClient?.nome ?? ""}`}
          </DialogTitle>
        </DialogHeader>

        {step === "dados" && (
          <form onSubmit={submitDados} className="grid gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className={f.span ? "sm:col-span-2" : ""}>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{f.label}</label>
                <input type={f.type ?? "text"} placeholder={f.placeholder} value={(form as Record<string, string>)[f.key]}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-foreground/60" />
              </div>
            ))}
            <div className="sm:col-span-2 flex justify-end gap-2 border-t pt-3">
              <Button type="button" variant="outline" size="sm" onClick={resetAndClose}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />Salvando...</> : "Próximo → Foto facial"}
              </Button>
            </div>
          </form>
        )}

        {step === "foto" && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              A foto facial é usada para reconhecimento automático na entrada e saída da pista.
              Você pode pular esta etapa e cadastrar depois.
            </p>
            {capturedPreview ? (
              <div className="relative">
                <img src={capturedPreview} alt="Foto facial" className="w-full max-h-64 rounded-xl object-cover" />
                <button onClick={() => { setCapturedFile(null); setCapturedPreview(null); }}
                  className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : cameraOn ? (
              <div className="relative">
                <video ref={videoRef} className="w-full rounded-xl" autoPlay muted playsInline />
                <div className="absolute inset-0 flex items-end justify-center pb-4 gap-2">
                  <Button size="sm" onClick={capturePhoto} className="bg-white text-black hover:bg-white/90 shadow-lg">
                    <Camera className="mr-1.5 h-3.5 w-3.5" /> Capturar
                  </Button>
                  <Button size="sm" variant="outline" onClick={stopCamera} className="bg-black/40 text-white border-white/30 hover:bg-black/60">
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed py-10 text-muted-foreground">
                <ScanFace className="h-12 w-12 opacity-30" />
                <p className="text-sm">Nenhuma foto capturada</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={startCamera}>
                    <Camera className="mr-1.5 h-3.5 w-3.5" /> Usar câmera
                  </Button>
                  <label>
                    <span className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-muted transition-colors">
                      <Upload className="h-3 w-3" /> Enviar foto
                    </span>
                    <input type="file" accept="image/*" className="sr-only" onChange={selectPhotoFile} />
                  </label>
                </div>
              </div>
            )}
            <div className="flex justify-between gap-2 border-t pt-3">
              <Button type="button" variant="ghost" size="sm" className="text-muted-foreground"
                onClick={() => { stopCamera(); setStep("documentos"); }}>
                Pular — fazer depois
              </Button>
              <Button size="sm" onClick={saveFacePhoto} disabled={savingFace || !capturedFile}>
                {savingFace ? <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />Salvando...</> : "Salvar foto → Documentos"}
              </Button>
            </div>
          </div>
        )}

        {step === "documentos" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Adicione os documentos agora ou clique em "Concluir" para fazer depois.
            </p>
            {DOC_SLOTS.map((slot) => {
              const Icon = slot.icon;
              const pending = pendingDocs.find((d) => d.slotKey === slot.key);
              const hasFile = !!pending?.file;
              return (
                <div key={slot.key} className={`rounded-xl border overflow-hidden transition-colors ${hasFile ? "border-foreground/20 bg-muted/20" : "bg-card"}`}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className={`grid size-9 shrink-0 place-items-center rounded-lg ${slot.bg}`}>
                      <Icon className={`h-4 w-4 ${slot.color}`} strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{slot.label}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{slot.desc}</p>
                    </div>
                    {hasFile ? (
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7" onClick={() => removeSlot(slot.key)}>remover</Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <span className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                          <Upload className="h-3 w-3" /> Anexar
                        </span>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) setSlotFile(slot.key, f); }} />
                      </label>
                    )}
                  </div>
                  {hasFile && (
                    <div className="border-t px-4 pb-3 pt-2 grid grid-cols-2 gap-3">
                      {pending?.preview && (
                        <div className="col-span-2"><img src={pending.preview} alt="preview" className="max-h-20 rounded object-contain" /></div>
                      )}
                      <div className="col-span-2">
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nome do arquivo</label>
                        <input value={pending?.nome ?? ""} onChange={(e) => updateSlot(slot.key, "nome", e.target.value)}
                          placeholder={`${slot.label} — ${createdClient?.nome ?? ""}`}
                          className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Vencimento *</label>
                        <input type="date" value={pending?.vencimento ?? ""} onChange={(e) => updateSlot(slot.key, "vencimento", e.target.value)}
                          className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none" />
                      </div>
                      <div className="flex items-end">
                        <p className="text-[10px] text-muted-foreground">{pending?.file?.name}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="flex justify-between gap-2 border-t pt-3">
              <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={resetAndClose}>
                Pular — fazer depois
              </Button>
              <Button size="sm" onClick={finishWithDocs} disabled={uploadingDocs}>
                {uploadingDocs ? <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />Enviando...</> :
                  pendingDocs.filter((d) => d.file).length > 0
                    ? `Salvar ${pendingDocs.filter((d) => d.file).length} documento(s) e concluir`
                    : "Concluir cadastro"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
