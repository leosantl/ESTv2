import { createFileRoute, useParams } from "@tanstack/react-router";
import { PageHeader } from "@/components/shell/PageHeader";
import { KpiCard } from "@/components/shell/KpiCard";
import { MiniArea } from "@/components/charts/MiniArea";
import { MiniBars } from "@/components/charts/MiniBars";
import { StatusBadge } from "@/components/shell/StatusBadge";
import { AlertTriangle, ArrowUpRight, Loader2 } from "lucide-react";
import { useCompany, useCompanyKpis, useClients, useDocuments, useSchedules, useWeekScheduleSummary, useCashflow, useUsers } from "@/hooks/useSupabase";
import { OnboardingChecklist } from "@/components/shell/OnboardingChecklist";

export const Route = createFileRoute("/app/$companyId/")({ component: CompanyDashboard });

const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function CompanyDashboard() {
  const { companyId } = useParams({ from: "/app/$companyId/" });
  const today = new Date().toISOString().split("T")[0];

  const { data: company, isLoading: loadingCo } = useCompany(companyId);
  const { data: kpis } = useCompanyKpis(companyId);
  const { data: clientsData } = useClients(companyId, { limit: 5 } as never);
  const { data: documents = [] } = useDocuments(companyId);
  const { data: todaySchedule = [] } = useSchedules(companyId, { date: today });
  const { data: weekSchedule = [] } = useWeekScheduleSummary(companyId);
  const { data: cashflow = [] } = useCashflow(companyId);
  const { data: usersData } = useUsers(companyId);

  if (loadingCo) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!company) return null;

  const expiringSoon = kpis?.documents?.vencendo ?? 0;
  const revenueMonth = kpis?.finance?.receita_mes ? kpis.finance.receita_mes / 100 : (cashflow[cashflow.length - 1]?.in ?? 0);
  const revenueYear = cashflow.reduce((a, b) => a + b.in, 0);
  const chartData = cashflow.map((c) => ({ month: c.month, in: c.in, out: c.out }));
  const weekData = weekSchedule.map((w) => ({ day: w.dia, count: w.count }));

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow={company.type}
        title={`Bom dia, ${company.responsible.split(" ")[0]}`}
        description={`Visão geral operacional do ${company.name}.`}
      />
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <OnboardingChecklist companyId={companyId} kpis={kpis} userCount={usersData?.length ?? 1} />

        {expiringSoon > 0 && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-6 shrink-0 place-items-center rounded-full bg-destructive text-[11px] font-bold text-white">
                <AlertTriangle className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-tight text-destructive">Documentos Vencendo</p>
                <p className="truncate text-xs text-destructive/80">{expiringSoon} documento{expiringSoon > 1 ? "s" : ""} expiram em até 30 dias</p>
              </div>
            </div>
            <a href={`/app/${companyId}/documents`} className="shrink-0 font-mono text-[10px] font-bold text-destructive underline underline-offset-4">VER TODOS</a>
          </div>
        )}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Atiradores" value={(kpis?.clients?.total ?? 0).toLocaleString("pt-BR")} hint={`+${kpis?.clients?.novos_mes ?? 0} este mês`} hintTone="positive" />
          <KpiCard label="Acervo Total" value={(kpis?.weapons?.total ?? 0).toLocaleString("pt-BR")} hint="Armas registradas" hintTone="muted" />
          <KpiCard label="Munição" value={(kpis?.ammo?.total_estoque ?? 0).toLocaleString("pt-BR")} hint={kpis?.ammo?.abaixo_minimo ? "Reposição pendente" : "Estoque ok"} hintTone={kpis?.ammo?.abaixo_minimo ? "warning" : "muted"} />
          <KpiCard label="Agendamentos" value={kpis?.schedules?.hoje ?? 0} hint="Hoje" hintTone="muted" />
          <KpiCard label="Documentos" value={kpis?.documents?.total ?? documents.length} hint={`${expiringSoon} vencendo`} hintTone="warning" />
          <KpiCard label="Receita Mensal" value={fmt(revenueMonth)} hint="Mês corrente" hintTone="positive" />
          <KpiCard label="Receita Anual" value={fmt(revenueYear)} hint="YTD 2026" hintTone="positive" />
          <KpiCard label="Inadimplência" value={fmt((kpis?.finance?.inadimplencia ?? 0) / 100)} hint="Em atraso" hintTone="danger" />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border bg-card lg:col-span-2">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Fluxo Financeiro</h2>
                <p className="mt-1 font-mono text-xl font-medium tabular-nums">{fmt(revenueMonth)}</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                <ArrowUpRight className="h-3 w-3" /> +7.4%
              </span>
            </div>
            <div className="p-4">
              {chartData.length > 0
                ? <MiniBars data={chartData} keys={[{ key: "in", label: "Entradas", color: "var(--foreground)" }, { key: "out", label: "Saídas", color: "var(--muted-foreground)" }]} />
                : <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">Sem dados financeiros</div>}
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="border-b p-4"><h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Agendamentos semana</h2></div>
            <div className="p-4">
              {weekData.length > 0
                ? <MiniArea data={weekData} dataKey="count" xKey="day" format={(n) => `${n}`} height={200} />
                : <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">Sem agendamentos</div>}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Check-in Recente</h2>
              <a href={`/app/${companyId}/clients`} className="text-[10px] font-bold">VER LISTA</a>
            </div>
            <ul className="divide-y">
              {(clientsData?.data ?? []).slice(0, 5).map((c) => (
                <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{c.name}</p>
                    <p className="truncate font-mono text-[10px] text-muted-foreground">CR: {c.cr} · {c.caliber}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusBadge status={c.status} />
                    <span className="font-mono text-[10px] text-muted-foreground">{c.joinedAt}</span>
                  </div>
                </li>
              ))}
              {!clientsData?.data?.length && <li className="p-4 text-center text-xs text-muted-foreground">Nenhum cliente cadastrado</li>}
            </ul>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Agenda de Hoje</h2>
              <span className="font-mono text-[10px] text-muted-foreground">{new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
            </div>
            <ul className="divide-y">
              {todaySchedule.slice(0, 5).map((s) => (
                <li key={s.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3">
                  <span className="font-mono text-xs font-bold tabular-nums">{s.time}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{s.title}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{s.client} · {s.lane}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </li>
              ))}
              {!todaySchedule.length && <li className="p-4 text-center text-xs text-muted-foreground">Sem agendamentos hoje</li>}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
