import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, CalendarDays, FileText, LogOut, Target, User } from "lucide-react";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { usePortalClient, usePortalDocuments, usePortalSchedules, usePortalDocUrl } from "@/hooks/queries/portal";
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid size-7 place-items-center rounded bg-accent text-[10px] font-bold text-accent-foreground">PA</div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Portal do Atirador</p>
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
            <div className="mb-4 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-foreground" />
              <h2 className="text-sm font-semibold">Próximas Sessões</h2>
            </div>
            {schedules.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma sessão agendada.</p>
            ) : (
              <ul className="space-y-2">
                {schedules.map((s: any) => (
                  <li key={s.id} className="rounded-lg border px-3 py-2 text-sm">
                    <p className="font-medium">{new Date(s.data).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}</p>
                    <p className="text-xs text-muted-foreground">{s.horario ?? ""} {s.modalidade ? `· ${s.modalidade}` : ""}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-foreground" />
            <h2 className="text-sm font-semibold">Meus Documentos</h2>
          </div>
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum documento disponível.</p>
          ) : (
            <ul className="divide-y">
              {docs.map((d: any) => (
                <li key={d.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{d.tipo ?? d.nome ?? "Documento"}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.created_at ? new Date(d.created_at).toLocaleDateString("pt-BR") : ""}
                      {d.validade ? ` · Validade: ${new Date(d.validade).toLocaleDateString("pt-BR")}` : ""}
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
