import { createFileRoute, useParams } from "@tanstack/react-router";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, RefreshCw, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useNotificationSettings, useUpsertNotificationSettings, useNotificationLog, useTriggerDocCheck } from "@/hooks/useSupabase";

export const Route = createFileRoute("/app/$companyId/notifications")({
  head: () => ({ meta: [{ title: "Alertas · StandControl" }] }),
  component: NotificationsPage,
});

const PRESET_DAYS = [3, 7, 15, 30, 60];
const DOC_TYPE_LABEL: Record<string, string> = { cr:"CR", craf:"CRAF", certificado:"Certificado", contrato:"Contrato", outro:"Outro" };

function NotificationsPage() {
  const { companyId } = useParams({ from: "/app/$companyId/notifications" });
  const { data: settings, isLoading } = useNotificationSettings(companyId);
  const { data: log = [] } = useNotificationLog(companyId);
  const upsert = useUpsertNotificationSettings(companyId);
  const trigger = useTriggerDocCheck(companyId);
  const [enabled, setEnabled] = useState(true);
  const [alertDays, setAlertDays] = useState<number[]>([7, 15, 30]);

  useEffect(() => {
    if (settings) { setEnabled(settings.enabled); setAlertDays(settings.alert_days ?? [7, 15, 30]); }
  }, [settings]);

  function toggleDay(day: number) {
    setAlertDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b));
  }

  const fmtDate = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" });

  return (
    <div className="animate-fade-in">
      <PageHeader title="Alertas de Vencimento" description="Configure quando receber alertas por email sobre documentos próximos do vencimento." />
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`grid size-10 shrink-0 place-items-center rounded-full ${enabled ? "bg-emerald-500/10" : "bg-muted"}`}>
                {enabled ? <Bell className="h-5 w-5 text-emerald-600" /> : <BellOff className="h-5 w-5 text-muted-foreground" />}
              </div>
              <div>
                <p className="text-sm font-semibold">Alertas por email</p>
                <p className="text-xs text-muted-foreground">{enabled ? "Ativo — você receberá emails nos dias configurados abaixo." : "Desativado — nenhum email será enviado."}</p>
              </div>
            </div>
            <button onClick={() => setEnabled(v => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${enabled ? "bg-emerald-500" : "bg-muted"}`}
              role="switch" aria-checked={enabled}>
              <span className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow-lg transition-transform ${enabled ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Alertar com quantos dias de antecedência</p>
          <p className="mt-1 text-xs text-muted-foreground">Selecione um ou mais. O email é enviado uma vez por documento em cada threshold.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {PRESET_DAYS.map((day) => {
              const active = alertDays.includes(day);
              return (
                <button key={day} onClick={() => toggleDay(day)}
                  className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${active ? "border-foreground bg-accent text-accent-foreground" : "border-border bg-background text-muted-foreground hover:border-foreground/40"}`}>
                  {day} {day === 1 ? "dia" : "dias"}
                </button>
              );
            })}
          </div>
          {alertDays.length === 0 && <p className="mt-3 text-xs text-destructive">Selecione ao menos um dia.</p>}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => upsert.mutate({ enabled, alert_days: alertDays })} disabled={upsert.isPending || alertDays.length === 0}>
            {upsert.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Salvar configurações
          </Button>
          <Button variant="outline" onClick={() => trigger.mutate()} disabled={trigger.isPending}>
            {trigger.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />} Verificar agora
          </Button>
          <p className="text-xs text-muted-foreground">A verificação automática roda todo dia às 08h.</p>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="border-b p-4"><h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Histórico de alertas</h2></div>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : log.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 opacity-20" /><p className="text-sm">Nenhum alerta enviado ainda.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {log.map((entry: Record<string, string>) => (
                <li key={entry.id} className="flex items-start gap-3 p-3.5">
                  <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-amber-500/10">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {DOC_TYPE_LABEL[entry.doc_type?.toLowerCase()] ?? entry.doc_type}
                      {entry.client_name && entry.client_name !== "—" && <span className="font-normal text-muted-foreground"> · {entry.client_name}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{entry.doc_name}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700">{entry.days_remaining}d antes</span>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">{fmtDate(entry.sent_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
