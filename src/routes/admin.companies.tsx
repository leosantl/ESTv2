import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatusBadge } from "@/components/shell/StatusBadge";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { useCompanies } from "@/hooks/useSupabase";

export const Route = createFileRoute("/admin/companies")({
  head: () => ({ meta: [{ title: "Empresas · Admin StandControl" }] }),
  component: AdminCompaniesPage,
});

function AdminCompaniesPage() {
  const { data: companies = [], isLoading } = useCompanies();
  const [search, setSearch] = useState("");

  const filtered = companies.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-fade-in">
      <PageHeader eyebrow="Super Admin" title="Empresas" description="Todas as empresas clientes da plataforma." />
      <div className="space-y-4 p-4 sm:p-6 lg:p-8">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar empresa..." className="h-9 pl-8 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="rounded-lg border bg-card">
          {isLoading ? <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Empresa</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Tipo</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Plano</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Membros</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Último acesso</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link to="/app/$companyId" params={{ companyId: c.id }} className="flex items-center gap-2 hover:underline">
                        <div className="grid size-7 place-items-center rounded bg-accent text-[10px] font-bold text-accent-foreground">{c.logoInitials}</div>
                        <span className="font-medium">{c.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.type}</TableCell>
                    <TableCell className="text-xs">{c.plan}</TableCell>
                    <TableCell className="font-mono text-xs">{c.members.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">{c.lastAccess}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                  </TableRow>
                ))}
                {!filtered.length && <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">Nenhuma empresa encontrada.</TableCell></TableRow>}
              </TableBody>
            </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
