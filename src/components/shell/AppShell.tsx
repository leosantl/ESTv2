import { type ReactNode, useState } from "react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronsUpDown, Search, Bell, LogOut, Lock, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PLAN_LABEL, type PlanId } from "@/lib/plan-features";

export type NavItem = { title: string; url: string; icon: LucideIcon; badge?: string; locked?: boolean; requiredPlan?: PlanId; };
export type NavGroup = { label: string; items: NavItem[]; };

function UpgradeModal({ open, onClose, item, billingUrl }: { open: boolean; onClose: () => void; item: NavItem|null; billingUrl: string; }) {
  if (!item) return null;
  const planLabel = item.requiredPlan ? PLAN_LABEL[item.requiredPlan] : "superior";
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-accent/20"><Lock className="h-5 w-5 text-accent-foreground" /></div>
          <DialogTitle className="text-center">Recurso bloqueado</DialogTitle>
          <DialogDescription className="text-center">
            <strong>{item.title}</strong> está disponível no plano <span className="font-semibold text-foreground">{planLabel}</span> ou superior.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex flex-col gap-2">
          <Link to={billingUrl} onClick={onClose} className="flex items-center justify-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90">
            Ver planos e fazer upgrade <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted">Cancelar</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SidebarSections({ groups, onLockedClick }: { groups: NavGroup[]; onLockedClick: (item: NavItem) => void; }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.label}>
          {!collapsed && <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{group.label}</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => {
                const active = pathname === item.url || (item.url !== "/" && pathname.startsWith(item.url));
                if (item.locked) {
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton tooltip={`${item.title} — plano ${item.requiredPlan ? PLAN_LABEL[item.requiredPlan] : "superior"}`} onClick={() => onLockedClick(item)} className="cursor-pointer opacity-50 hover:opacity-70">
                        <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                        <span className="truncate text-sm">{item.title}</span>
                        {!collapsed && <Lock className="ml-auto h-3 w-3 shrink-0" />}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link to={item.url} className="flex items-center gap-2.5">
                        <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                        <span className="truncate text-sm">{item.title}</span>
                        {item.badge && !collapsed && <span className="ml-auto rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{item.badge}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}

export function AppShell({ groups, brandLabel, brandSub, brandInitials, brandHref, userInitials, userName, userRole, billingUrl, onSignOut, children }: { groups: NavGroup[]; brandLabel: string; brandSub: string; brandInitials: string; brandHref: string; userInitials: string; userName: string; userRole: string; billingUrl?: string; onSignOut?: () => void; children: ReactNode; }) {
  const [upgradeItem, setUpgradeItem] = useState<NavItem | null>(null);
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader className="border-b">
          <Link to={brandHref} className="flex items-center gap-2.5 px-1 py-1.5">
            <div className="grid size-8 shrink-0 place-items-center rounded bg-accent text-[10px] font-bold tracking-tighter text-accent-foreground">{brandInitials}</div>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{brandLabel}</p>
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold">{brandSub}</span>
                <div className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
              </div>
            </div>
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground group-data-[collapsible=icon]:hidden" />
          </Link>
        </SidebarHeader>
        <SidebarContent><SidebarSections groups={groups} onLockedClick={setUpgradeItem} /></SidebarContent>
        <SidebarFooter className="border-t">
          <div className="flex items-center gap-2.5 p-1">
            <div className="grid size-8 shrink-0 place-items-center rounded-full border bg-muted font-mono text-[10px] font-medium">{userInitials}</div>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-xs font-semibold">{userName}</p>
              <p className="truncate text-[10px] text-muted-foreground">{userRole}</p>
            </div>
            {onSignOut && <button onClick={onSignOut} title="Sair" className="group-data-[collapsible=icon]:hidden shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><LogOut className="h-4 w-4" strokeWidth={1.75} /></button>}
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur-sm">
          <SidebarTrigger className="-ml-1" />
          <div className="hidden flex-1 items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground sm:flex">
            <Search className="h-3.5 w-3.5" />
            <span>Buscar atiradores, armas, documentos...</span>
            <kbd className="ml-auto font-mono text-[10px]">⌘K</kbd>
          </div>
          <div className="flex-1 sm:hidden" />
          <Button variant="ghost" size="icon" className="relative size-8">
            <Bell className="h-4 w-4" strokeWidth={1.75} />
            <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-destructive" />
          </Button>
        </header>
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </SidebarInset>
      <UpgradeModal open={!!upgradeItem} onClose={() => setUpgradeItem(null)} item={upgradeItem} billingUrl={billingUrl ?? "/"} />
    </SidebarProvider>
  );
}
