import { createFileRoute, useParams } from "@tanstack/react-router";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatusBadge } from "@/components/shell/StatusBadge";
import { Button } from "@/components/ui/button";
import { Check, Loader2, ExternalLink, HardDrive, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePlans, useSubscription, useInvoices, useStorageUsage, useCompanyBackup, useCompany } from "@/hooks/useSupabase";
import { useState } from "react";
import { getPlanStorageBytes, fmtBytes, PLAN_STORAGE_LABEL, type PlanId } from "@/lib/plan-features";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/app/$companyId/billing")({
  head: () => ({ meta: [{ title: "Assinatura · StandControl" }] }),
  component: BillingPage,
});

const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function BillingPage() {
  const { companyId } = useParams({ from: "/app/$companyId/billing" });
  const { data: plans = [], isLoading: loadingPlans } = usePlans();
  const { data: sub } = useSubscription(companyId);
  const { data: invoices = [] } = useInvoices(companyId);
  const { data: storageData } = useStorageUsage(companyId);
  const { data: company } = useCompany(companyId);
  const companyBackup = useCompanyBackup(companyId);
  const [annual, setAnnual] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);

  const currentPlanId = sub?.plan_id;
  const storageUsed = storageData?.totalBytes ?? 0;
  const storageLimit = getPlanStorageBytes(currentPlanId);
  const storagePct = Math.min((storageUsed / storageLimit) * 100, 100);

  async function handleUpgrade(planId: string) {
    setUpgradingPlan(planId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada. Faça login novamente.");

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { company_id: companyId, plan_id: planId, billing: annual ? "annual" : "monthly" },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.checkout_url) {
        window.open(data.checkout_url, "_blank", "noopener,noreferrer");
      } else {
        toast.success("Solicitação enviada! Em breve você receberá o link de pagamento por e-mail.");
      }
    } catch (err) {
      toast.error((err as Error).message || "Não foi possível iniciar o checkout.");
    } finally {
      setUpgradingPlan(null);
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Assinatura" description="Plano atual, faturas e histórico de pagamentos." />
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        {sub && (
          <div className="rounded-lg border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Plano atual</p>
                <p className="mt-1 text-lg font-semibold">{sub.plans?.name}</p>
                {sub.trial_ends_at && sub.status === "trial" && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Trial até {new Date(sub.trial_ends_at).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>
              <StatusBadge status={sub.status === "active" ? "Ativa" : sub.status === "trial" ? "Trial" : "Suspensa"} />
            </div>
          </div>
        )}

        {/* Storage meter */}
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-full bg-muted">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Armazenamento</p>
                <p className="mt-0.5 text-sm font-semibold">
                  {fmtBytes(storageUsed)}
                  <span className="font-normal text-muted-foreground"> / {currentPlanId ? PLAN_STORAGE_LABEL[currentPlanId as PlanId] : "—"}</span>
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="shrink-0 gap-1.5"
              disabled={companyBackup.isPending}
              onClick={() => companyBackup.mutate({ companyName: company?.name ?? "clube" })}>
              {companyBackup.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Backup completo
            </Button>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full transition-all duration-500 ${storagePct >= 90 ? "bg-destructive" : storagePct >= 70 ? "bg-amber-500" : "bg-foreground"}`}
              style={{ width: `${storagePct}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {storageData?.count ?? 0} documento(s) · {storagePct.toFixed(1)}% utilizado
            {storagePct >= 80 && <span className="ml-2 font-semibold text-amber-600">Considere fazer upgrade para mais espaço.</span>}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Planos disponíveis</h2>
          <div className="flex items-center gap-2 rounded-lg border bg-card p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${!annual ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Mensal
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-colors ${annual ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Anual
              <span className="rounded bg-emerald-500/15 px-1 py-0.5 text-[9px] font-bold text-emerald-600">-17%</span>
            </button>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-3">
          {loadingPlans ? (
            <div className="col-span-3 flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : plans.map((p) => (
            <div key={p.id} className={"relative rounded-lg border bg-card p-5 " + (p.id === currentPlanId ? "border-foreground ring-1 ring-foreground/20" : "")}>
              {p.highlighted && (
                <span className="absolute -top-2.5 right-4 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                  Popular
                </span>
              )}
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{p.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{p.tagline}</p>
              <div className="mt-3">
                <p className="font-mono text-2xl font-semibold tabular-nums">
                  {fmt(annual ? p.annual / 12 : p.monthly)}
                  <span className="text-xs font-normal text-muted-foreground">/mês</span>
                </p>
                {annual && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {fmt(p.annual)}/ano · economize {fmt(p.monthly * 12 - p.annual)}
                  </p>
                )}
              </div>
              <ul className="mt-4 space-y-1.5">
                {(p.features as string[]).slice(0, 4).map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />{f}
                  </li>
                ))}
                <li className="flex items-start gap-1.5 text-xs">
                  <HardDrive className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">{PLAN_STORAGE_LABEL[p.id as PlanId] ?? "—"} de armazenamento</span>
                </li>
              </ul>
              {p.id === currentPlanId ? (
                <Button className="mt-4 w-full" size="sm" variant="outline" disabled>
                  Plano atual
                </Button>
              ) : (
                <Button
                  className="mt-4 w-full"
                  size="sm"
                  onClick={() => handleUpgrade(p.id)}
                  disabled={upgradingPlan === p.id}
                >
                  {upgradingPlan === p.id ? (
                    <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Abrindo checkout...</>
                  ) : (
                    <><ExternalLink className="mr-1 h-3.5 w-3.5" /> Fazer upgrade</>
                  )}
                </Button>
              )}
            </div>
          ))}
        </section>

        <div className="rounded-lg border bg-card">
          <div className="border-b p-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Faturas</h2>
          </div>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Vencimento</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Descrição</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Valor</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">{i.date}</TableCell>
                  <TableCell className="text-sm">{i.descricao}</TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums">{fmt(i.amount)}</TableCell>
                  <TableCell><StatusBadge status={i.status} /></TableCell>
                  <TableCell>
                    {i.status === "Pendente" || i.status === "Atrasada" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => handleUpgrade(currentPlanId ?? "professional")}
                      >
                        Pagar
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {!invoices.length && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhuma fatura.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
