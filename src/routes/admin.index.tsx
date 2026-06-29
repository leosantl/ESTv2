import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shell/PageHeader";
import { KpiCard } from "@/components/shell/KpiCard";
import { MiniArea } from "@/components/charts/MiniArea";
import { StatusBadge } from "@/components/shell/StatusBadge";
import { Loader2 } from "lucide-react";
import { useAdminKpis, useMrrSeries, useAdminInvoices, useCompanies } from "@/hooks/useSupabase";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin · StandControl" }] }),
  component: AdminDashboard,
});

const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function AdminDashboard() {
  const { data: kpis, isLoading } = useAdminKpis();
  const { data: mrrSeries = [] } = useMrrSeries();
  const { data: invoices = [] } = useAdminInvoices();
  const { data: companies = [] } = useCompanies();

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="animate-fade-in">
      <PageHeader eyebrow="Super Admin" title="Visão geral da plataforma" description="Métricas globais de todas as empresas clientes." />
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Empresas ativas" value={kpis?.activeCompanies ?? 0} hint="clientes pagantes" hintTone="positive" />
          <KpiCard label="Em trial" value={kpis?.trialCompanies ?? 0} hint="período gratuito" hintTone="muted" />
          <KpiCard label="Suspensas" value={kpis?.suspended ?? 0} hint="inadimplência" hintTone="danger" />
          <KpiCard label="Novos no mês" value={kpis?.newCustomers ?? 0} hint="cadastros" hintTone="positive" />
          <KpiCard label="MRR" value={fmt(kpis?.mrr ?? 0)} hint="receita mensal" hintTone="positive" />
          <KpiCard label="ARR" value={fmt(kpis?.arr ?? 0)} hint="receita anual" hintTone="positive" />
        </section>

        <div className="rounded-lg border bg-card">
          <div className="border-b p-4"><h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">MRR — últimos 6 meses</h2></div>
          <div className="p-4">
            {mrrSeries.length > 0
              ? <MiniArea data={mrrSeries} dataKey="value" xKey="month" format={(n) => fmt(n)} height={220} />
              : <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">Sem faturas pagas ainda</div>}
          </div>
        </div>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border bg-card">
            <div className="border-b p-4"><h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Faturas recentes</h2></div>
            <ul className="divide-y">
              {invoices.slice(0, 6).map((i) => (
                <li key={i.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 p-3">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold">{i.company}</p><p className="font-mono text-[10px] text-muted-foreground">{i.id}</p></div>
                  <span className="font-mono text-xs tabular-nums">{fmt(i.amount)}</span>
                  <StatusBadge status={i.status} />
                </li>
              ))}
              {!invoices.length && <li className="p-4 text-center text-xs text-muted-foreground">Nenhuma fatura.</li>}
            </ul>
          </div>
          <div className="rounded-lg border bg-card">
            <div className="border-b p-4"><h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Empresas recentes</h2></div>
            <ul className="divide-y">
              {companies.slice(0, 6).map((c) => (
                <li key={c.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3">
                  <div className="grid size-7 place-items-center rounded bg-accent text-[10px] font-bold text-accent-foreground">{c.logoInitials}</div>
                  <div className="min-w-0"><p className="truncate text-sm font-semibold">{c.name}</p><p className="text-[10px] text-muted-foreground">{c.plan}</p></div>
                  <StatusBadge status={c.status} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
