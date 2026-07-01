import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { AppShell, type NavGroup } from "@/components/shell/AppShell";
import { LayoutDashboard, Building2, Package, Wallet, ArrowLeftRight, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuth as useAuthCtx } from "@/contexts/AuthContext";

const groups: NavGroup[] = [
  { label: "Operação", items: [
    { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
    { title: "Empresas", url: "/admin/companies", icon: Building2 },
  ]},
  { label: "Comercial", items: [
    { title: "Planos", url: "/admin/plans", icon: Package },
    { title: "Financeiro", url: "/admin/finance", icon: Wallet },
  ]},
  { label: "Atalhos", items: [{ title: "Trocar workspace", url: "/", icon: ArrowLeftRight }] },
];

export const Route = createFileRoute("/admin")({ component: AdminLayout });

function AdminLayout() {
  const { user, profile, loading, isSuperAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!loading && profile && !isSuperAdmin) navigate({ to: "/" });
  }, [loading, profile, isSuperAdmin, navigate]);

  if (loading || !profile) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!isSuperAdmin) return null;

  return (
    <AppShell
      groups={groups}
      brandLabel="StandControl"
      brandSub="Super Admin"
      brandInitials="SC"
      brandHref="/admin"
      userInitials={(profile.nome ?? "OP").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
      userName={profile.nome}
      userRole="Super Admin"
      onSignOut={() => signOut().then(() => navigate({ to: "/login" }))}
    >
      <Outlet />
    </AppShell>
  );
}
