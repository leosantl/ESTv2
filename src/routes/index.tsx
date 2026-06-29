import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanies } from "@/hooks/useSupabase";
import { StatusBadge } from "@/components/shell/StatusBadge";
import { ArrowRight, Building2, Crown, KeyRound, LogIn, ShieldAlert, ShieldCheck, Users, Loader2 } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "StandControl — Selecionar empresa" }] }),
  component: Index,
});

function Index() {
  const { user, profile, loading: authLoading } = useAuth();
  const { data: companies = [], isLoading } = useCompanies();
  const navigate = useNavigate();

  // Redireciona se não logado
  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Super admin vai direto para o painel admin
  if (profile?.role === "super_admin") {
    navigate({ to: "/admin" });
    return null;
  }

  // Se não tem nenhuma empresa, redireciona para onboarding
  if (!companies || companies.length === 0) {
    if (profile?.role !== "super_admin") {
      navigate({ to: "/onboarding" });
      return null;
    }
  }

  // Usuário de empresa com apenas 1 empresa: redireciona direto
  if (profile?.company_id && companies.length === 1 && companies[0]) {
    navigate({ to: "/app/$companyId", params: { companyId: companies[0].id } });
    return null;
  }

  const visibleCompanies = profile?.role === "super_admin"
    ? companies
    : companies.filter((c) => c.id === profile?.company_id);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded bg-accent text-[10px] font-bold tracking-tighter text-accent-foreground">SC</div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">StandControl</p>
              <p className="text-sm font-semibold leading-tight">Plataforma de gestão CAC</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!user && (
              <Link to="/login" className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-2 text-xs font-bold hover:bg-muted">
                <LogIn className="h-3.5 w-3.5" /> Entrar
              </Link>
            )}
            {profile?.role === "super_admin" && (
              <Link to="/admin" className="group inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-xs font-bold transition-colors hover:bg-muted">
                <Crown className="h-3.5 w-3.5" strokeWidth={2} />
                <span>Super Admin</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Workspaces</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Selecionar empresa</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Você tem acesso a {visibleCompanies.length} unidade{visibleCompanies.length !== 1 ? "s" : ""}.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCompanies.map((c) => (
            <Link key={c.id} to="/app/$companyId" params={{ companyId: c.id }}
              className="group relative flex flex-col gap-4 rounded-lg border bg-card p-5 transition-all hover:border-foreground/40 hover:shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="grid size-10 place-items-center rounded bg-accent text-xs font-bold tracking-tighter text-accent-foreground">{c.logoInitials}</div>
                <StatusBadge status={c.status} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{c.type}</p>
                <h3 className="truncate text-base font-semibold">{c.name}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{c.city}</p>
              </div>
              <div className="mt-auto flex items-center justify-between border-t pt-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><Users className="h-3 w-3" strokeWidth={2} /><span className="font-mono tabular-nums">{c.members.toLocaleString("pt-BR")}</span></span>
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" strokeWidth={2} />{c.plan}</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>

        {profile?.role === "super_admin" && (
          <Link to="/onboarding" className="mt-10 block rounded-lg border border-dashed bg-muted/20 p-6 text-center transition-colors hover:border-foreground/40 hover:bg-muted/40">
            <Building2 className="mx-auto h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
            <p className="mt-2 text-sm font-semibold">Adicionar nova empresa</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Configure uma nova unidade em poucos minutos.</p>
          </Link>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Link to="/invite" className="flex items-center gap-3 rounded-md border bg-card p-4 hover:bg-muted">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            <div><p className="text-xs font-semibold">Definir senha</p><p className="text-[11px] text-muted-foreground">Fluxo de convite</p></div>
          </Link>
          <Link to="/suspended" className="flex items-center gap-3 rounded-md border bg-card p-4 hover:bg-muted">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            <div><p className="text-xs font-semibold">Empresa suspensa</p><p className="text-[11px] text-muted-foreground">Bloqueio por inadimplência</p></div>
          </Link>
        </div>
      </main>
    </div>
  );
}
