import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, ArrowDown, ArrowUp, Check } from "lucide-react";
import { useLojaFinanceiro, useCreateLojaFinanceiro, useUpdateLojaFinanceiro } from "@/hooks/queries/loja";

export const Route = createFileRoute("/app/$companyId/loja/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro · Loja" }] }),
  component: FinanceiroPage,
});

const FORMAS = ["pix", "cartao_credito", "cartao_debito", "dinheiro", "boleto", "parcelado", "credito_interno"];
const STATUS_COLOR: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-700",
  pago: "bg-emerald-100 text-emerald-700",
  atrasado: "bg-red-100 text-red-700",
  cancelado: "bg-gray-100 text-gray-600",
};

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function FinanceiroPage() {
  const { companyId } = useParams({ from: "/app/$companyId/loja/financeiro" });
  const [tipoFilter, setTipoFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [open, setOpen] = useState(false);

  const { data: lancamentos = [], isLoading } = useLojaFinanceiro(companyId, tipoFilter, statusFilter);
  const criar = useCreateLojaFinanceiro();
  const atualizar = useUpdateLojaFinanceiro();

  const totalReceber = (lancamentos as Record<string, unknown>[]).filter((l) => l.tipo === "receber" && l.status !== "cancelado").reduce((s, l) => s + Number(l.valor), 0);
  const totalPagar = (lancamentos as Record<string, unknown>[]).filter((l) => l.tipo === "pagar" && l.status !== "cancelado").reduce((s, l) => s + Number(l.valor), 0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await criar.mutateAsync({
      company_id: companyId,
      tipo: fd.get("tipo"),
      descricao: fd.get("descricao"),
      valor: Number(fd.get("valor")),
      vencimento: fd.get("vencimento"),
      forma: fd.get("forma") || null,
      observacoes: fd.get("observacoes") || null,
    });
    setOpen(false);
  }

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 space-y-4">
      <PageHeader
        title="Financeiro"
        description="Contas a receber e a pagar da loja."
        actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" /> Novo lançamento</Button>}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 p-4">
          <p className="text-xs text-muted-foreground">A Receber</p>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{fmt(totalReceber)}</p>
        </div>
        <div className="rounded-lg border bg-red-50 dark:bg-red-950/30 p-4">
          <p className="text-xs text-muted-foreground">A Pagar</p>
          <p className="text-xl font-bold text-red-700 dark:text-red-400 tabular-nums">{fmt(totalPagar)}</p>
        </div>
        <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 p-4">
          <p className="text-xs text-muted-foreground">Saldo previsto</p>
          <p className={`text-xl font-bold tabular-nums ${totalReceber - totalPagar >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>{fmt(totalReceber - totalPagar)}</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["receber", "pagar"].map((t) => (
          <Button key={t} size="sm" variant={tipoFilter === t ? "default" : "outline"} className="capitalize h-8 text-xs"
            onClick={() => setTipoFilter(tipoFilter === t ? undefined : t)}>
            {t === "receber" ? <ArrowDown className="h-3 w-3 mr-1 text-emerald-600" /> : <ArrowUp className="h-3 w-3 mr-1 text-red-600" />}
            {t === "receber" ? "A Receber" : "A Pagar"}
          </Button>
        ))}
        {["pendente", "pago", "atrasado"].map((s) => (
          <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} className="capitalize h-8 text-xs"
            onClick={() => setStatusFilter(statusFilter === s ? undefined : s)}>{s}</Button>
        ))}
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (lancamentos as Record<string, unknown>[]).length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Nenhum lançamento.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Vencimento</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Descrição</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Tipo</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Valor</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(lancamentos as Record<string, unknown>[]).map((l) => (
                <TableRow key={l.id as string} className="text-sm">
                  <TableCell className="text-xs text-muted-foreground">{new Date(l.vencimento as string).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="font-medium text-sm">{l.descricao as string}</TableCell>
                  <TableCell>
                    <span className={`flex items-center gap-1 text-xs font-medium ${l.tipo === "receber" ? "text-emerald-600" : "text-red-600"}`}>
                      {l.tipo === "receber" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                      {l.tipo === "receber" ? "Receber" : "Pagar"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{fmt(l.valor as number)}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${STATUS_COLOR[l.status as string] ?? ""}`}>{l.status as string}</span>
                  </TableCell>
                  <TableCell>
                    {l.status === "pendente" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => atualizar.mutate({ id: l.id as string, status: "pago", pago_em: new Date().toISOString().slice(0, 10) })}>
                        <Check className="h-3 w-3 mr-1" /> Baixar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo lançamento</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label>Tipo *</Label>
              <select name="tipo" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" required>
                <option value="receber">A Receber</option>
                <option value="pagar">A Pagar</option>
              </select>
            </div>
            <div><Label>Descrição *</Label><Input name="descricao" required /></div>
            <div><Label>Valor (R$) *</Label><Input name="valor" type="number" step="0.01" min="0.01" required /></div>
            <div><Label>Vencimento *</Label><Input name="vencimento" type="date" required /></div>
            <div>
              <Label>Forma</Label>
              <select name="forma" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                <option value="">— Não especificado —</option>
                {FORMAS.map((f) => <option key={f} value={f} className="capitalize">{f.replace("_", " ")}</option>)}
              </select>
            </div>
            <div><Label>Observações</Label><Input name="observacoes" /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={criar.isPending}>{criar.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
