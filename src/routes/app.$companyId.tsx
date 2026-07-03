import { createFileRoute, Outlet, useParams, useNavigate } from "@tanstack/react-router";
import { AppShell, type NavGroup } from "@/components/shell/AppShell";
import {
  LayoutDashboard, Users, Crosshair, Package, FileText,
  CalendarDays, Wallet, UserCog, CreditCard, ArrowLeftRight, ScanFace, Store,
} from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/hooks/useSupabase";
import { Loader2, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/app/$companyId")({ component: CompanyLayout });

function CompanyLayout() {
  const { companyId } = useParams({ from: "/app/$companyId" });
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const { data: company, isLoading: loadingCompany, error } = useCompany(companyId);

  // Guard: não autenticado
  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  // Guard: usuário não pertence a esta empresa (e não é super_admin)
  useEffect(() => {
    if (!authLoading && profile && profile.role !== "super_admin" && profile.company_id !== companyId) {
      navigate({ to: "/" });
    }
  }, [authLoading, profile, companyId, navigate]);

  if (authLoading || loadingCompany) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (error || !company) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Empresa não encontrada ou sem acesso.</p>
      </div>
    );
  }

  // Bloqueio: assinatura suspensa/cancelada (exceto super_admin)
  const blocked = profile?.role !== "super_admin" && (company.status === "Suspensa" || company.status === "Cancelada");
  if (blocked) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Acesso suspenso</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            O acesso da empresa <strong>{company.name}</strong> está temporariamente suspenso, geralmente por pendência financeira.
            Entre em contato com o suporte ou regularize a assinatura para continuar.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <a href={`/app/${companyId}/billing`} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90">Ver faturas</a>
            <button onClick={() => signOut().then(() => navigate({ to: "/login" }))} className="rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted">Sair</button>
          </div>
        </div>
      </div>
    );
  }

  const base = `/app/${companyId}`;

  const groups: NavGroup[] = [
    {
      label: "Operação",
      items: [
        { title: "Dashboard", url: base, icon: LayoutDashboard },
        { title: "Atiradores", url: `${base}/clients`, icon: Users },
        { title: "Acervo", url: `${base}/weapons`, icon: Crosshair },
        { title: "Munições", url: `${base}/ammo`, icon: Package },
        { title: "Pista", url: `${base}/range`, icon: ScanFace },
      ],
    },
    {
      label: "Gestão",
      items: [
        { title: "Documentos", url: `${base}/documents`, icon: FileText },
        { title: "Agenda", url: `${base}/schedule`, icon: CalendarDays },
        { title: "Financeiro", url: `${base}/finance`, icon: Wallet },
        { title: "Loja", url: `${base}/loja`, icon: Store },
      ],
    },
    {
      label: "Conta",
      items: [
        { title: "Usuários", url: `${base}/users`, icon: UserCog },
        { title: "Assinatura", url: `${base}/billing`, icon: CreditCard },
        { title: "Trocar workspace", url: "/", icon: ArrowLeftRight },
      ],
    },
  ];

  const roleLabel: Record<string, string> = {
    super_admin: "Super Admin", company_admin: "Administrador", gerente: "Gerente",
    operador: "Operador", financeiro: "Financeiro", instrutor: "Instrutor",
  };

  return (
    <AppShell
      groups={groups}
      brandLabel="StandControl"
      brandSub={company.name}
      brandInitials={company.logoInitials}
      brandHref={base}
      userInitials={(profile?.nome ?? "U").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
      userName={profile?.nome ?? company.responsible}
      userRole={roleLabel[profile?.role ?? ""] ?? "Usuário"}
      onSignOut={() => signOut().then(() => navigate({ to: "/login" }))}
    >
      <Outlet />
    </AppShell>
  );
}
