import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, CalendarDays, FileText, LogOut, User } from "lucide-react";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { usePortalClient, usePortalDocuments, usePortalSchedules, usePortalDocUrl, useCreatePortalSchedule, useUploadPortalDoc } from "@/hooks/queries/portal";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/dashboard")({
  head: () => ({ meta: [{ title: "Portal do Atirador — Meu Painel" }] }),
  component: PortalDashboard,
});

function daysUntil(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

function PortalDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = usePortalAuth();
  const { data: client, isLoading } = usePortalClient();
  const { data: docs = [] } = usePortalDocuments(client?.id);
  const { data: schedules = [] } = usePortalSchedules(client?.id);
  const docUrl = usePortalDocUrl();
  const createSched = useCreatePortalSchedule();
  const uploadDoc = useUploadPortalDoc();
  const [showSched, setShowSched] = useState(false);
  const [schedForm, setSchedForm] = useState({ data: "", hora: "", tipo: "treino", titulo: "" });
  const [showUpload, setShowUpload] = useState(false);
  const [upForm, setUpForm] = useState<{ tipo: string; vencimento: string; file: File | null }>({ tipo: "cr", vencimento: "", file: null });

  if (!user) {
    navigate({ to: "/portal/login" });
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div>
          <h2 className="text-lg font-semibold">Cadastro não encontrado</h2>
          <p className="mt-2 text-sm text-muted-foreground">Sua conta ainda não está vinculada a um atirador. Fale com o seu clube.</p>
          <button onClick={signOut} className="mt-4 text-sm text-foreground hover:underline">Sair</button>
        </div>
      </div>
    );
  }

  const crDays = daysUntil(client.cr_validade);
  const crExpiring = crDays !== null && crDays <= 60;

  async function openDoc(path: string) {
    try {
      const url = await docUrl.mutateAsync(path);
      window.open(url, "_blank");
    } catch {
      toast.error("Não foi possível abrir o documento.");
    }
  }

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!client) return;
    if (!schedForm.data || !schedForm.hora) { toast.error("Informe data e hora."); return; }
    try {
      await createSched.mutateAsync({
        company_id: client.company_id,
        client_id: client.id,
        titulo: schedForm.titulo || "Treino livre",
        tipo: schedForm.tipo,
        starts_at: `${schedForm.data}T${schedForm.hora}:00`,
      });
      setShowSched(false);
      setSchedForm({ data: "", hora: "", tipo: "treino", titulo: "" });
    } catch { /* toast tratado no hook */ }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!client) return;
    if (!upForm.file) { toast.error("Selecione um arquivo."); return; }
    try {
      await uploadDoc.mutateAsync({
        companyId: client.company_id,
        clientId: client.id,
        file: upForm.file,
        tipo: upForm.tipo,
        vencimento: upForm.vencimento,
      });
      setShowUpload(false);
      setUpForm({ tipo: "cr", vencimento: "", file: null });
    } catch { /* toast tratado no hook */ }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid size-7 place-items-center rounded bg-accent text-[10px] font-bold text-accent-foreground">PA</div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{client.companies?.nome_fantasia ?? "Portal do Atirador"}</p>
              <p className="text-sm font-semibold leading-tight">{client.nome}</p>
            </div>
          </div>
          <button onClick={() => { signOut(); navigate({ to: "/portal/login" }); }}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
        {crExpiring && (
          <div className={`flex items-start gap-3 rounded-lg border p-4 ${crDays! <= 30 ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300" : "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-300"}`}>
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-sm font-semibold">
                {crDays! <= 0 ? "CR vencido!" : `CR vence em ${crDays} dia${crDays === 1 ? "" : "s"}`}
              </p>
              <p className="mt-0.5 text-xs opacity-80">Providencie a renovação junto ao clube para manter seu cadastro ativo.</p>
            </div>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          <section className="rounded-xl border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-foreground" />
              <h2 className="text-sm font-semibold">Meu Perfil</h2>
            </div>
            <dl className="space-y-2 text-sm">
              {[
                { l: "Nome", v: client.nome },
                { l: "CPF", v: client.cpf ?? "—" },
                { l: "CR", v: client.cr ?? "—" },
                { l: "Validade CR", v: client.cr_validade ? new Date(client.cr_validade).toLocaleDateString("pt-BR") : "—" },
                { l: "Calibre preferido", v: client.calibre_preferido ?? "—" },
                { l: "Telefone", v: client.telefone ?? "—" },
                { l: "E-mail", v: client.email ?? "—" },
              ].map(({ l, v }) => (
                <div key={l} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{l}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-xl border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-foreground" />
                <h2 className="text-sm font-semibold">Próximas Sessões</h2>
              </div>
              <button onClick={() => setShowSched((s) => !s)}
                className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-muted">
                {showSched ? "Cancelar" : "Agendar"}
              </button>
            </div>

            {showSched && (
              <form onSubmit={handleSchedule} className="mb-4 space-y-3 rounded-lg border bg-background p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Data</label>
                    <input type="date" required value={schedForm.data} onChange={(e) => setSchedForm((p) => ({ ...p, data: e.target.value }))}
                      className="h-9 w-full rounded-md border bg-card px-2 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Hora</label>
                    <input type="time" required value={schedForm.hora} onChange={(e) => setSchedForm((p) => ({ ...p, hora: e.target.value }))}
                      className="h-9 w-full rounded-md border bg-card px-2 text-sm outline-none" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo</label>
                  <select value={schedForm.tipo} onChange={(e) => setSchedForm((p) => ({ ...p, tipo: e.target.value }))}
                    className="h-9 w-full rounded-md border bg-card px-2 text-sm outline-none">
                    <option value="treino">Treino</option>
                    <option value="avaliacao">Avaliação</option>
                    <option value="curso">Curso</option>
                    <option value="reserva">Reserva</option>
                    <option value="evento">Evento</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Observação</label>
                  <input value={schedForm.titulo} onChange={(e) => setSchedForm((p) => ({ ...p, titulo: e.target.value }))} placeholder="Treino livre"
                    className="h-9 w-full rounded-md border bg-card px-2 text-sm outline-none" />
                </div>
                <button type="submit" disabled={createSched.isPending}
                  className="inline-flex h-9 w-full items-center justify-center rounded-md bg-accent text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-60">
                  {createSched.isPending ? "Agendando..." : "Confirmar agendamento"}
                </button>
              </form>
            )}

            {schedules.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma sessão agendada.</p>
            ) : (
              <ul className="space-y-2">
                {schedules.map((s: any) => (
                  <li key={s.id} className="rounded-lg border px-3 py-2 text-sm">
                    <p className="font-medium">
                      {new Date(s.starts_at).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}
                      {" · "}
                      {new Date(s.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.titulo ?? ""} {s.tipo ? `· ${s.tipo}` : ""}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-foreground" />
              <h2 className="text-sm font-semibold">Meus Documentos</h2>
            </div>
            <button onClick={() => setShowUpload((s) => !s)}
              className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-muted">
              {showUpload ? "Cancelar" : "Adicionar"}
            </button>
          </div>

          {showUpload && (
            <form onSubmit={handleUpload} className="mb-4 space-y-3 rounded-lg border bg-background p-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo</label>
                  <select value={upForm.tipo} onChange={(e) => setUpForm((p) => ({ ...p, tipo: e.target.value }))}
                    className="h-9 w-full rounded-md border bg-card px-2 text-sm outline-none">
                    <option value="cr">CR</option>
                    <option value="craf">CRAF</option>
                    <option value="certificado">Certificado</option>
                    <option value="contrato">Contrato</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Validade</label>
                  <input type="date" value={upForm.vencimento} onChange={(e) => setUpForm((p) => ({ ...p, vencimento: e.target.value }))}
                    className="h-9 w-full rounded-md border bg-card px-2 text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Arquivo</label>
                <input type="file" onChange={(e) => setUpForm((p) => ({ ...p, file: e.target.files?.[0] ?? null }))}
                  className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-accent-foreground" />
              </div>
              <button type="submit" disabled={uploadDoc.isPending}
                className="inline-flex h-9 w-full items-center justify-center rounded-md bg-accent text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-60">
                {uploadDoc.isPending ? "Enviando..." : "Enviar documento"}
              </button>
            </form>
          )}

          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum documento disponível.</p>
          ) : (
            <ul className="divide-y">
              {docs.map((d: any) => (
                <li key={d.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{d.nome ?? d.tipo ?? "Documento"}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.tipo ? d.tipo : ""}
                      {d.vencimento ? ` · Validade: ${new Date(d.vencimento).toLocaleDateString("pt-BR")}` : ""}
                    </p>
                  </div>
                  {d.storage_path && (
                    <button onClick={() => openDoc(d.storage_path)}
                      className="shrink-0 rounded-md border px-3 py-1 text-xs font-medium hover:bg-muted">
                      Visualizar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
