import { createFileRoute, useParams } from "@tanstack/react-router";
import { PageHeader } from "@/components/shell/PageHeader";
import { KpiCard } from "@/components/shell/KpiCard";
import { useLojaKpis, useLojaVendaSerie } from "@/hooks/queries/loja";
import { Loader2, ShoppingBag, TrendingUp, PackageX, AlertTriangle, FileWarning, Users, ShoppingCart, DollarSign, Receipt, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/app/$companyId/loja/")({
  head: () => ({ meta: [{ title: "Loja · Dashboard" }] }),
  component: LojaDashboard,
});

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function LojaDashboard() {
  const { companyId } = useParams({ from: "/app/$companyId/loja/" });
  const { data: kpis, isLoading } = useLojaKpis(companyId);
  const { data: serie } = useLojaVendaSerie(companyId);

  const chartData = (serie ?? []).map((d) => ({
    dia: new Date(d.dia).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    total: Number(d.total),
    qtd: Number(d.qtd),
  }));

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHeader title="Dashboard · Loja" description="Indicadores em tempo real da operação da loja." />

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard title="Faturamento hoje" value={fmt(kpis?.faturamento_dia ?? 0)} icon={DollarSign} color="emerald" />
        <KpiCard title="Vendas do mês" value={fmt(kpis?.vendas_mes ?? 0)} icon={ShoppingBag} color="blue" />
        <KpiCard title="Lucro mensal" value={fmt(kpis?.lucro_mes ?? 0)} icon={TrendingUp} color="violet" />
        <KpiCard title="Ticket médio" value={fmt(kpis?.ticket_medio ?? 0)} icon={Receipt} color="amber" />
        <KpiCard title="Clientes ativos" value={String(kpis?.total_clientes ?? 0)} icon={Users} color="sky" />
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <KpiCard title="Sem estoque" value={String(kpis?.produtos_sem_estoque ?? 0)} icon={PackageX} color="red" />
        <KpiCard title="Estoque mínimo" value={String(kpis?.produtos_min_est ?? 0)} icon={AlertTriangle} color="orange" />
        <KpiCard title="Docs vencendo (90d)" value={String(kpis?.docs_vencendo ?? 0)} icon={FileWarning} color="yellow" />
        <KpiCard title="Compras pendentes" value={String(kpis?.compras_pendentes ?? 0)} icon={ShoppingCart} color="pink" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Vendas — últimos 30 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Nenhuma venda ainda.</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="dia" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [fmt(v), "Total"]} />
                  <Area type="monotone" dataKey="total" stroke="#6366f1" fill="url(#colorTotal)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Quantidade de vendas por dia</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Nenhuma venda ainda.</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorQtd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="dia" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [v, "Vendas"]} />
                  <Area type="monotone" dataKey="qtd" stroke="#10b981" fill="url(#colorQtd)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
        <CardContent className="pt-4">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            <strong>Aviso importante:</strong> Este sistema organiza informações e registra operações. Não toma decisões jurídicas, não aprova nem nega compras automaticamente. O operador é responsável pelas decisões administrativas e pelo cumprimento da legislação vigente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
