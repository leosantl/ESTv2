import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shell/PageHeader";
import { Check, Loader2 } from "lucide-react";
import { usePlans } from "@/hooks/useSupabase";

export const Route = createFileRoute("/admin/plans")({
  head: () => ({ meta: [{ title: "Planos · Admin StandControl" }] }),
  component: AdminPlansPage,
});

const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function AdminPlansPage() {
  const { data: plans = [], isLoading } = usePlans();

  return (
    <div className="animate-fade-in">
      <PageHeader eyebrow="Super Admin" title="Planos" description="Configuração de planos e limites disponíveis na plataforma." />
      <div className="p-4 sm:p-6 lg:p-8">
        {isLoading ? <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : (
          <section className="grid gap-4 sm:grid-cols-3">
            {plans.map((p) => (
              <div key={p.id} className={"relative rounded-lg border bg-card p-5 " + (p.highlighted ? "border-foreground" : "")}>
                {p.highlighted && <span className="absolute -top-2.5 right-4 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">Popular</span>}
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{p.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{p.tagline}</p>
                <p className="mt-3 font-mono text-2xl font-semibold tabular-nums">{fmt(p.monthly)}<span className="text-xs font-normal text-muted-foreground">/mês</span></p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">{fmt(p.annual)}/ano</p>
                <dl className="mt-4 grid grid-cols-2 gap-2 border-t pt-3 text-[11px]">
                  <div><dt className="text-muted-foreground">Clientes</dt><dd className="font-mono font-semibold">{p.maxClients}</dd></div>
                  <div><dt className="text-muted-foreground">Usuários</dt><dd className="font-mono font-semibold">{p.maxUsers}</dd></div>
                </dl>
                <ul className="mt-4 space-y-1.5">
                  {(p.features as string[]).map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-xs"><Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />{f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
