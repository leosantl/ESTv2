import { createFileRoute, Outlet, useParams, Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Package, Layers, ArchiveX, Truck, ShoppingCart,
  Users, FileText, ShoppingBag, Wallet, BarChart3, Shield, Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/$companyId/loja")({ component: LojaLayout });

const NAV_ITEMS = [
  { label: "Dashboard",    icon: LayoutDashboard, path: "" },
  { label: "Produtos",     icon: Package,         path: "/produtos" },
  { label: "Categorias",   icon: Layers,          path: "/categorias" },
  { label: "Estoque",      icon: ArchiveX,        path: "/estoque" },
  { label: "Fornecedores", icon: Truck,           path: "/fornecedores" },
  { label: "Compras",      icon: ShoppingCart,    path: "/compras" },
  { label: "Clientes",     icon: Users,           path: "/clientes" },
  { label: "Documentos",   icon: FileText,        path: "/documentos" },
  { label: "Vendas",       icon: ShoppingBag,     path: "/vendas" },
  { label: "Financeiro",   icon: Wallet,          path: "/financeiro" },
  { label: "Relatórios",   icon: BarChart3,       path: "/relatorios" },
  { label: "Auditoria",    icon: Shield,          path: "/auditoria" },
  { label: "Config.",      icon: Settings2,       path: "/config" },
];

function LojaLayout() {
  const { companyId } = useParams({ from: "/app/$companyId/loja" });
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const base = `/app/${companyId}/loja`;

  return (
    <div className="flex flex-col h-full">
      {/* Sub-nav horizontal */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="flex overflow-x-auto px-4 sm:px-6 lg:px-8 gap-0 scrollbar-none">
          {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
            const url = base + path;
            const isActive = path === ""
              ? pathname === base || pathname === base + "/"
              : pathname.startsWith(url);
            return (
              <Link
                key={path}
                to={url}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-3 text-[11px] font-medium whitespace-nowrap border-b-2 transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
