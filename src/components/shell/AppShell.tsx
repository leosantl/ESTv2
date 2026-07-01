import { type ReactNode } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronsUpDown, Search, Bell, LogOut, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export type NavGroup = {
  label: string;
  items: { title: string; url: string; icon: LucideIcon; badge?: string }[];
};

function SidebarSections({ groups }: { groups: NavGroup[] }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.label}>
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {group.label}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => {
                const active = pathname === item.url || (item.url !== "/" && pathname.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link to={item.url} className="flex items-center gap-2.5">
                        <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                        <span className="truncate text-sm">{item.title}</span>
                        {item.badge && !collapsed && (
                          <span className="ml-auto rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                            {item.badge}
                          </span>
                        )}
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

export function AppShell({
  groups,
  brandLabel,
  brandSub,
  brandInitials,
  brandHref,
  userInitials,
  userName,
  userRole,
  onSignOut,
  onSignOut,
  children,
}: {
  groups: NavGroup[];
  brandLabel: string;
  brandSub: string;
  brandInitials: string;
  brandHref: string;
  userInitials: string;
  userName: string;
  userRole: string;
  onSignOut?: () => void;
  onSignOut?: () => void;
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader className="border-b">
          <Link to={brandHref} className="flex items-center gap-2.5 px-1 py-1.5">
            <div className="grid size-8 shrink-0 place-items-center rounded bg-accent text-[10px] font-bold tracking-tighter text-accent-foreground">
              {brandInitials}
            {onSignOut && (
              <button onClick={onSignOut} title="Sair" className="group-data-[collapsible=icon]:hidden shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
              </button>
            )}
            </div>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {brandLabel}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold">{brandSub}</span>
                <div className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
              {onSignOut && (
              <button onClick={onSignOut} title="Sair" className="group-data-[collapsible=icon]:hidden shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
              </button>
            )}
            </div>
            {onSignOut && (
              <button onClick={onSignOut} title="Sair" className="group-data-[collapsible=icon]:hidden shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
              </button>
            )}
            </div>
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground group-data-[collapsible=icon]:hidden" />
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarSections groups={groups} />
        </SidebarContent>
        <SidebarFooter className="border-t">
          <div className="flex items-center gap-2.5 p-1">
            <div className="grid size-8 shrink-0 place-items-center rounded-full border bg-muted font-mono text-[10px] font-medium">
              {userInitials}
            {onSignOut && (
              <button onClick={onSignOut} title="Sair" className="group-data-[collapsible=icon]:hidden shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
              </button>
            )}
            </div>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-xs font-semibold">{userName}</p>
              <p className="truncate text-[10px] text-muted-foreground">{userRole}</p>
            {onSignOut && (
              <button onClick={onSignOut} title="Sair" className="group-data-[collapsible=icon]:hidden shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
              </button>
            )}
            </div>
            {onSignOut && (
              <button onClick={onSignOut} title="Sair" className="group-data-[collapsible=icon]:hidden shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
              </button>
            )}
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
    </SidebarProvider>
  );
}