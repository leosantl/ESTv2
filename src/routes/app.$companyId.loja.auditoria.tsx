import { createFileRoute, useParams } from "@tanstack/react-router";
import { PageHeader } from "@/components/shell/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Shield } from "lucide-react";
import { useLojaAuditoria } from "@/hooks/queries/loja";

export const Route = createFileRoute("/app/$companyId/loja/auditoria")({
  head: () => ({ meta: [{ title: "Auditoria · Loja" }] }),
  component: AuditoriaPage,
});

function AuditoriaPage() {
  const { companyId } = useParams({ from: "/app/$companyId/loja/auditoria" });
  const { data: logs = [], isLoading } = useLojaAuditoria(companyId);

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 space-y-4">
      <PageHeader
        title="Auditoria"
        description="Registro imutável de todas as ações realizadas no módulo Loja."
        actions={
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="h-4 w-4 text-emerald-600" />
            Registros não podem ser excluídos
          </div>
        }
      />
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (logs as Record<string, unknown>[]).length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Nenhum registro de auditoria.</div>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Data/Hora</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Usuário</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Tela</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Ação</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Entidade</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Anterior</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Novo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(logs as Record<string, unknown>[]).map((l) => (
                <TableRow key={l.id as string} className="text-xs align-top">
                  <TableCell className="text-muted-foreground whitespace-nowrap">{new Date(l.created_at as string).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{(l.profiles as { nome: string } | null)?.nome ?? "—"}</TableCell>
                  <TableCell className="capitalize">{l.tela as string}</TableCell>
                  <TableCell><span className="font-mono bg-muted rounded px-1 py-0.5">{l.acao as string}</span></TableCell>
                  <TableCell className="text-muted-foreground">{l.entidade as string ?? "—"}</TableCell>
                  <TableCell className="max-w-[120px] truncate text-muted-foreground">
                    {l.valor_ant ? JSON.stringify(l.valor_ant).slice(0, 60) : "—"}
                  </TableCell>
                  <TableCell className="max-w-[120px] truncate text-muted-foreground">
                    {l.valor_novo ? JSON.stringify(l.valor_novo).slice(0, 60) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </div>
    </div>
  );
}
