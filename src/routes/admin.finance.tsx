import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shell/PageHeader";
import { KpiCard } from "@/components/shell/KpiCard";
import { StatusBadge } from "@/components/shell/StatusBadge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminKpis, useAdminInvoices, useAdminUpdateInvoice, useMrrSeries } from "@/hooks/useSupabase";
import { MiniArea } from "@/components/charts/MiniArea";

export const Route = createFileRoute("/admin/finance")({
  head: () => ({ meta: [{ title: "Financeiro · Admin StandControl" }] }),
  component: AdminFinancePage,
});

const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function AdminFinancePage() {
  const { data: kpis, isLoading } = useAdminKpis();
  const { data: invoices = [] } = useAdminInvoices();
  const { data: mrrSeries = [] } = useMrrSeries();
  const updateInvoice = useAdminUpdateInvoice();

  return (
    <div className="animate-fade-in">
      <PageHeader eyebrow="Super Admin" title="Financeiro da plataforma" description="MRR, ARR, inadimplência e faturas de todos os tenants." />
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        {isLoading ? <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : (
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="MRR" value={fmt(kpis?.mrr ?? 0)} hint="receita mensal recorrente" hintTone="positive" />
            <KpiCard label="ARR" value={fmt(kpis?.arr ?? 0)} hint="receita anual recorrente" hintTone="positive" />
            <KpiCard label="Inadimplência" value={fmt((kpis as { inadimplencia?: number })?.inadimplencia ?? 0)} hint="faturas atrasadas" hintTone="danger" />
            <KpiCard label="Empresas suspensas" value={kpis?.suspended ?? 0} hint="bloqueadas" hintTone="danger" />
          </section>
        )}

        <div className="rounded-lg border bg-card">
          <div className="border-b p-4"><h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Evolução do MRR</h2></div>
          <div className="p-4">
            {mrrSeries.length > 0
              ? <MiniArea data={mrrSeries} dataKey="value" xKey="month" format={(n) => fmt(n)} height={220} />
              : <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">Sem dados</div>}
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="border-b p-4"><h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Todas as faturas</h2></div>
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider">ID</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider">Empresa</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider">Vencimento</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Valor</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider">Status</TableHead>
              <TableHead className="w-32"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {invoices.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">{i.id}</TableCell>
                  <TableCell className="text-sm">{i.company}</TableCell>
                  <TableCell className="font-mono text-[11px]">{i.date}</TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums">{fmt(i.amount)}</TableCell>
                  <TableCell><StatusBadge status={i.status} /></TableCell>
                  <TableCell>
                    {i.status !== "Paga" && (
                      <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => {
                        const realId = invoices.find(x => x.id === i.id);
                        if (realId) updateInvoice.mutate({ id: i.id.replace("INV-", "").toLowerCase(), status: "Paga" });
                      }}>Marcar paga</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!invoices.length && <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">Nenhuma fatura.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
