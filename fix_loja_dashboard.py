import os, subprocess
BASE = os.path.expanduser("~/Downloads/ESTv2")
path = os.path.join(BASE, "src/routes/app.$companyId.loja.index.tsx")
os.makedirs(os.path.dirname(path), exist_ok=True)
with open(path, "w", encoding="utf-8") as f:
    f.write('''import { createFileRoute, useParams } from "@tanstack/react-router";
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
    total: Number(d.total), qtd: Number(d.qtd),
  }));
  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHeader title="Dashboard · Loja" description="Indicadores em tempo real da operação da loja." />
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Faturamento hoje" value={fmt(kpis?.faturamento_dia ?? 0)} icon={<DollarSign className="h-4 w-4" />} />
        <KpiCard label="Vendas do mês" value={fmt(kpis?.vendas_mes ?? 0)} icon={<ShoppingBag className="h-4 w-4" />} />
        <KpiCard label="Lucro mensal" value={fmt(kpis?.lucro_mes ?? 0)} icon={<TrendingUp className="h-4 w-4" />} />
        <KpiCard label="Ticket médio" value={fmt(kpis?.ticket_medio ?? 0)} icon={<Receipt className="h-4 w-4" />} />
        <KpiCard label="Clientes ativos" value={String(kpis?.total_clientes ?? 0)} icon={<Users className="h-4 w-4" />} />
      </div>
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <KpiCard label="Sem estoque" value={String(kpis?.produtos_sem_estoque ?? 0)} icon={<PackageX className="h-4 w-4 text-red-500" />} />
        <KpiCard label="Estoque mínimo" value={String(kpis?.produtos_min_est ?? 0)} icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} />
        <KpiCard label="Docs vencendo (90d)" value={String(kpis?.docs_vencendo ?? 0)} icon={<FileWarning className="h-4 w-4 text-amber-500" />} />
        <KpiCard label="Compras pendentes" value={String(kpis?.compras_pendentes ?? 0)} icon={<ShoppingCart className="h-4 w-4" />} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Vendas — últimos 30 dias</CardTitle></CardHeader>
          <CardContent>
            {chartData.length === 0 ? <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Nenhuma venda ainda.</div> : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs><linearGradient id="cT" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="dia" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [fmt(v), "Total"]} />
                  <Area type="monotone" dataKey="total" stroke="#6366f1" fill="url(#cT)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <CardContent className="pt-6">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              <strong>Aviso:</strong> Este sistema organiza informações e registra operações. Nao toma decisoes juridicas, nao aprova nem nega compras automaticamente.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
''')
print("OK")
subprocess.run(["git", "add", "src/routes/app.$companyId.loja.index.tsx"], cwd=BASE)
r = subprocess.run(["git", "commit", "-m", "fix: KpiCard props corretos no dashboard da Loja"], cwd=BASE, capture_output=True, text=True)
print(r.stdout.strip() or r.stderr.strip())
r2 = subprocess.run(["git", "push", "-u", "origin", "claude/saas-evaluation-gaps-gqhbgj"], cwd=BASE, capture_output=True, text=True)
print(r2.stdout.strip() or r2.stderr.strip())
if r2.returncode == 0: print("Pronto! Deploy em 1-2 min.")
else: print("Push falhou:", r2.stderr)
