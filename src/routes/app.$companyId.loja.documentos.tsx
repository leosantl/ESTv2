import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useLojaClientes, useLojaClienteDocs } from "@/hooks/queries/loja";

export const Route = createFileRoute("/app/$companyId/loja/documentos")({
  head: () => ({ meta: [{ title: "Documentos · Loja" }] }),
  component: DocumentosPage,
});

function docAlert(validade?: string) {
  if (!validade) return null;
  const diff = Math.ceil((new Date(validade).getTime() - Date.now()) / 86400000);
  if (diff < 0) return { label: "Vencido", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" };
  if (diff <= 30) return { label: `Vence em ${diff}d`, icon: Clock, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20" };
  if (diff <= 60) return { label: `Vence em ${diff}d`, icon: Clock, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/20" };
  if (diff <= 90) return { label: `Vence em ${diff}d`, icon: Clock, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20" };
  return { label: "Válido", icon: CheckCircle2, color: "text-emerald-600", bg: "" };
}

function AllDocs({ companyId, search }: { companyId: string; search: string }) {
  const { data: clientes = [] } = useLojaClientes(companyId, search);
  return (
    <>
      {clientes.map((c) => (
        <ClienteDocsRow key={c.id} clienteId={c.id} clienteNome={c.nome} />
      ))}
    </>
  );
}

function ClienteDocsRow({ clienteId, clienteNome }: { clienteId: string; clienteNome: string }) {
  const { data: docs = [] } = useLojaClienteDocs(clienteId);
  if (!docs.length) return null;
  return (
    <>
      {docs.map((d: Record<string, unknown>) => {
        const al = docAlert(d.data_validade as string | undefined);
        const Icon = al?.icon ?? CheckCircle2;
        return (
          <TableRow key={d.id as string} className={`text-sm ${al?.bg ?? ""}`}>
            <TableCell className="font-medium">{clienteNome}</TableCell>
            <TableCell className="text-xs">{d.tipo as string}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{d.numero as string ?? "—"}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{d.orgao_emissor as string ?? "—"}</TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {d.data_validade ? new Date(d.data_validade as string).toLocaleDateString("pt-BR") : "—"}
            </TableCell>
            <TableCell>
              {al && (
                <span className={`flex items-center gap-1 text-[10px] font-medium ${al.color}`}>
                  <Icon className="h-3 w-3" />{al.label}
                </span>
              )}
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}

function DocumentosPage() {
  const { companyId } = useParams({ from: "/app/$companyId/loja/documentos" });
  const [search, setSearch] = useState("");

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 space-y-4">
      <PageHeader
        title="Documentos"
        description="Visão consolidada de todos os documentos dos clientes com alertas de vencimento."
      />
      <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-3 text-xs text-amber-800 dark:text-amber-200">
        <strong>Aviso:</strong> O sistema apenas exibe alertas e registra documentos. Não realiza validação jurídica. A decisão de prosseguir ou não com qualquer operação é sempre do operador.
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Filtrar por cliente..." className="h-9 pl-8 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider">Cliente</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider">Tipo</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider">Nº</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider">Emissor</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider">Validade</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider">Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AllDocs companyId={companyId} search={search} />
          </TableBody>
        </Table>
        </div>
      </div>
    </div>
  );
}
