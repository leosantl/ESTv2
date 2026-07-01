import { createFileRoute, useParams } from "@tanstack/react-router";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatusBadge } from "@/components/shell/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, MoreHorizontal, Loader2, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { useClients, useCreateClient, useDeleteClient } from "@/hooks/useSupabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/app/$companyId/clients")({
  head: () => ({ meta: [{ title: "Atiradores · StandControl" }] }),
  component: ClientsPage,
});

function ClientsPage() {
  const { companyId } = useParams({ from: "/app/$companyId/clients" });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useClients(companyId, { search, status: statusFilter });
  const createClient = useCreateClient();
  const deleteClient = useDeleteClient();

  const statuses = ["Ativo", "Pendente", "Inativo"];

  function exportCsv() {
    const rows = data?.data ?? [];
    if (!rows.length) return;
    const header = ["Nome", "CPF", "CR", "Validade CR", "Calibre", "Telefone", "E-mail", "Status"];
    const lines = rows.map((c) => [
      c.name, c.cpf ?? "", c.cr ?? "", "", c.caliber ?? "", c.phone ?? "", c.email ?? "", c.status,
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `atiradores-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Atiradores"
        description="Cadastro completo de CACs com CR, calibre principal e status."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!data?.data?.length}>
              <Download className="mr-1 h-3.5 w-3.5" /> Exportar CSV
            </Button>
            <Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1 h-3.5 w-3.5" /> Novo atirador</Button>
          </>
        }
      />
      <div className="space-y-4 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nome, CPF, CR..." className="h-9 pl-8 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {statuses.map((s) => (
              <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(statusFilter === s ? undefined : s)}>
                {s}
              </Button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Nome</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">CPF</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">CR</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Calibre</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Contato</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.data ?? []).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">{c.cpf}</TableCell>
                    <TableCell className="font-mono text-[11px]">{c.cr}</TableCell>
                    <TableCell className="font-mono text-[11px]">{c.caliber}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.phone}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => {
                        if (confirm(`Remover ${c.name}?`)) deleteClient.mutate({ id: c.id, company_id: companyId });
                      }}>
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!data?.data?.length && <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">Nenhum atirador encontrado.</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </div>
        {data && <p className="text-right text-[11px] text-muted-foreground">{data.total} registro{data.total !== 1 ? "s" : ""}</p>}
      </div>

      <NewClientDialog open={open} onClose={() => setOpen(false)} companyId={companyId} onSave={async (payload) => {
        await createClient.mutateAsync({ ...payload, company_id: companyId });
        setOpen(false);
      }} />
    </div>
  );
}

function NewClientDialog({ open, onClose, companyId: _cid, onSave }: { open: boolean; onClose: () => void; companyId: string; onSave: (p: Record<string, string>) => Promise<void> }) {
  const [form, setForm] = useState({ nome: "", cpf: "", cr: "", cr_validade: "", telefone: "", email: "", calibre_preferido: "" });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome) { toast.error("Nome obrigatório."); return; }
    setSaving(true);
    try { await onSave(form); setForm({ nome: "", cpf: "", cr: "", cr_validade: "", telefone: "", email: "", calibre_preferido: "" }); }
    finally { setSaving(false); }
  }

  const fields = [
    { key: "nome", label: "Nome completo *", placeholder: "Ricardo S. Almeida" },
    { key: "cpf", label: "CPF", placeholder: "154.***.**9-22" },
    { key: "cr", label: "CR", placeholder: "SP-154329" },
    { key: "cr_validade", label: "Validade do CR", placeholder: "2027-12-31", type: "date" },
    { key: "telefone", label: "Telefone", placeholder: "(11) 98421-3320" },
    { key: "email", label: "E-mail", placeholder: "ricardo@cac.br" },
    { key: "calibre_preferido", label: "Calibre principal", placeholder: "9mm" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Novo atirador</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key} className={f.key === "nome" ? "sm:col-span-2" : ""}>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{f.label}</label>
              <input type={f.type ?? "text"} placeholder={f.placeholder} value={(form as Record<string, string>)[f.key]}
                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-foreground/60" />
            </div>
          ))}
          <div className="sm:col-span-2 flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={saving}>{saving ? "Salvando..." : "Cadastrar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
