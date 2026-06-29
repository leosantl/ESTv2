import { createFileRoute, useParams } from "@tanstack/react-router";
import { PageHeader } from "@/components/shell/PageHeader";
import { KpiCard } from "@/components/shell/KpiCard";
import { StatusBadge } from "@/components/shell/StatusBadge";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MiniBars } from "@/components/charts/MiniBars";
import { useState } from "react";
import { useFinanceEntries, useCashflow, useCreateFinanceEntry, useFinanceCategories } from "@/hooks/useSupabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/app/$companyId/finance")({
  head: () => ({ meta: [{ title: "Financeiro · StandControl" }] }),
  component: FinancePage,
});

const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function FinancePage() {
  const { companyId } = useParams({ from: "/app/$companyId/finance" });
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const { data: entries = [], isLoading } = useFinanceEntries(companyId, { tipo: typeFilter });
  const { data: cashflow = [] } = useCashflow(companyId);
  const { data: categories = [] } = useFinanceCategories(companyId);
  const createEntry = useCreateFinanceEntry();
  const [open, setOpen] = useState(false);

  const revenue = entries.filter((e) => e.type === "Receita" && e.status === "Compensado").reduce((a, b) => a + b.amount, 0);
  const expense = entries.filter((e) => e.type === "Despesa" && e.status === "Compensado").reduce((a, b) => a + b.amount, 0);
  const overdue = entries.filter((e) => e.status === "Atrasado").reduce((a, b) => a + b.amount, 0);

  function exportCsv() {
    if (!entries.length) return;
    const header = ["Data", "Descrição", "Categoria", "Tipo", "Valor (R$)", "Status"];
    const lines = entries.map((e) => [
      e.date, e.description, e.category ?? "", e.type,
      (e.amount / 100).toFixed(2).replace(".", ","), e.status,
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financeiro-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Financeiro" description="Receitas, despesas e fluxo de caixa do clube."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!entries.length}>
              <Download className="mr-1 h-3.5 w-3.5" /> Exportar CSV
            </Button>
            <Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1 h-3.5 w-3.5" /> Novo lançamento</Button>
          </>
        }
      />
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Receita" value={fmt(revenue)} hint="compensado" hintTone="positive" />
          <KpiCard label="Despesa" value={fmt(expense)} hint="compensado" hintTone="muted" />
          <KpiCard label="Saldo" value={fmt(revenue - expense)} hint="líquido" hintTone={revenue - expense >= 0 ? "positive" : "danger"} />
          <KpiCard label="Em atraso" value={fmt(overdue)} hint="inadimplência" hintTone="danger" />
        </section>

        <div className="rounded-lg border bg-card">
          <div className="border-b p-4"><h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Fluxo de caixa — 6 meses</h2></div>
          <div className="p-4">
            {cashflow.length > 0
              ? <MiniBars data={cashflow} keys={[{ key: "in", label: "Entradas", color: "var(--foreground)" }, { key: "out", label: "Saídas", color: "var(--muted-foreground)" }]} />
              : <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">Sem dados suficientes</div>}
          </div>
        </div>

        <div className="flex gap-2">
          {["Receita", "Despesa"].map((t) => (
            <Button key={t} size="sm" variant={typeFilter === t ? "default" : "outline"} onClick={() => setTypeFilter(typeFilter === t ? undefined : t)}>{t}</Button>
          ))}
        </div>

        <div className="rounded-lg border bg-card">
          {isLoading ? <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Data</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Descrição</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Categoria</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Tipo</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Valor</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">{e.date}</TableCell>
                    <TableCell className="text-sm font-medium">{e.description}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{e.category}</TableCell>
                    <TableCell className="text-xs">{e.type}</TableCell>
                    <TableCell className={"text-right font-mono text-xs tabular-nums " + (e.type === "Receita" ? "text-emerald-600" : "text-foreground")}>
                      {e.type === "Receita" ? "+" : "-"}{fmt(e.amount)}
                    </TableCell>
                    <TableCell><StatusBadge status={e.status} /></TableCell>
                  </TableRow>
                ))}
                {!entries.length && <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">Nenhum lançamento.</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <NewEntryDialog open={open} onClose={() => setOpen(false)} categories={categories}
        onSave={async (p) => { await createEntry.mutateAsync({ ...p, company_id: companyId }); setOpen(false); }} />
    </div>
  );
}

function NewEntryDialog({ open, onClose, categories, onSave }: {
  open: boolean; onClose: () => void;
  categories: Array<{ id: string; nome: string }>;
  onSave: (p: { descricao: string; tipo: "receita" | "despesa"; valor: number; vencimento: string; status: string; category_id?: string }) => Promise<void>;
}) {
  const [form, setForm] = useState({ descricao: "", tipo: "receita" as "receita" | "despesa", valor: "", vencimento: "", status: "previsto", category_id: "" });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const valorNum = Math.round(parseFloat(form.valor.replace(",", ".")) * 100);
    if (!form.descricao || !valorNum) { toast.error("Preencha descrição e valor."); return; }
    setSaving(true);
    try {
      await onSave({ descricao: form.descricao, tipo: form.tipo, valor: valorNum, vencimento: form.vencimento, status: form.status, category_id: form.category_id || undefined });
      setForm({ descricao: "", tipo: "receita", valor: "", vencimento: "", status: "previsto", category_id: "" });
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Novo lançamento</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Descrição *</label>
            <input value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))} placeholder="Mensalidades — Julho"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo</label>
            <select value={form.tipo} onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value as "receita" | "despesa" }))} className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none">
              <option value="receita">Receita</option><option value="despesa">Despesa</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Valor (R$) *</label>
            <input value={form.valor} onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))} placeholder="1500,00"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm font-mono outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Vencimento</label>
            <input type="date" value={form.vencimento} onChange={(e) => setForm((p) => ({ ...p, vencimento: e.target.value }))} className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
            <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none">
              <option value="previsto">Previsto</option><option value="compensado">Compensado</option><option value="atrasado">Atrasado</option>
            </select>
          </div>
          {categories.length > 0 && (
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Categoria</label>
              <select value={form.category_id} onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value }))} className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none">
                <option value="">Sem categoria</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          )}
          <div className="sm:col-span-2 flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={saving}>{saving ? "Salvando..." : "Lançar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
