import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, ChevronRight } from "lucide-react";
import { useLojaCompras, useCreateLojaCompra, useUpdateLojaCompraStatus, useLojaFornecedores, useLojaProdutos } from "@/hooks/queries/loja";

export const Route = createFileRoute("/app/$companyId/loja/compras")({
  head: () => ({ meta: [{ title: "Compras · Loja" }] }),
  component: ComprasPage,
});

const STATUS_FLOW = ["pedido", "recebimento", "conferencia", "estoque", "financeiro", "concluida"];
const STATUS_COLOR: Record<string, string> = {
  pedido: "bg-blue-100 text-blue-700",
  recebimento: "bg-amber-100 text-amber-700",
  conferencia: "bg-orange-100 text-orange-700",
  estoque: "bg-violet-100 text-violet-700",
  financeiro: "bg-teal-100 text-teal-700",
  concluida: "bg-emerald-100 text-emerald-700",
  cancelada: "bg-red-100 text-red-700",
};

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

type Item = { produto_id: string; quantidade: number; custo_unit: number };

function ComprasPage() {
  const { companyId } = useParams({ from: "/app/$companyId/loja/compras" });
  const [open, setOpen] = useState(false);
  const [itens, setItens] = useState<Item[]>([{ produto_id: "", quantidade: 1, custo_unit: 0 }]);
  const { data: compras = [], isLoading } = useLojaCompras(companyId);
  const { data: fornecedores = [] } = useLojaFornecedores(companyId);
  const { data: produtos = [] } = useLojaProdutos(companyId);
  const criar = useCreateLojaCompra();
  const atualizarStatus = useUpdateLojaCompraStatus();

  const total = itens.reduce((s, i) => s + i.quantidade * i.custo_unit, 0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const validItens = itens.filter((i) => i.produto_id && i.quantidade > 0);
    if (!validItens.length) return;
    await criar.mutateAsync({
      compra: {
        company_id: companyId,
        fornecedor_id: fd.get("fornecedor_id") || null,
        numero_pedido: fd.get("numero_pedido") || null,
        data_pedido: fd.get("data_pedido"),
        observacoes: fd.get("observacoes") || null,
        valor_total: total,
      },
      itens: validItens,
    });
    setOpen(false);
    setItens([{ produto_id: "", quantidade: 1, custo_unit: 0 }]);
  }

  function nextStatus(current: string) {
    const idx = STATUS_FLOW.indexOf(current);
    return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
  }

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 space-y-4">
      <PageHeader
        title="Compras"
        description="Gerenciar pedidos de compra com fluxo: Pedido → Recebimento → Conferência → Estoque → Financeiro."
        actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" /> Nova compra</Button>}
      />
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (compras as Record<string, unknown>[]).length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Nenhuma compra registrada.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Data</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Pedido</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Fornecedor</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Total</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(compras as Record<string, unknown>[]).map((c) => {
                const forn = c.loja_fornecedores as { razao_social: string; nome_fantasia?: string } | null;
                const next = nextStatus(c.status as string);
                return (
                  <TableRow key={c.id as string} className="text-sm">
                    <TableCell className="text-xs text-muted-foreground">{new Date(c.data_pedido as string).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="font-medium text-xs">{c.numero_pedido as string ?? "—"}</TableCell>
                    <TableCell className="text-xs">{forn?.nome_fantasia || forn?.razao_social || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-xs">{fmt(c.valor_total as number)}</TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${STATUS_COLOR[c.status as string] ?? ""}`}>
                        {c.status as string}
                      </span>
                    </TableCell>
                    <TableCell>
                      {next && (
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => atualizarStatus.mutate({ id: c.id as string, status: next })}>
                          → {next} <ChevronRight className="h-3 w-3 ml-0.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova compra</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fornecedor</Label>
                <select name="fornecedor_id" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                  <option value="">— Sem fornecedor —</option>
                  {(fornecedores as { id: string; razao_social: string; nome_fantasia?: string }[]).map((f) => <option key={f.id} value={f.id}>{f.nome_fantasia || f.razao_social}</option>)}
                </select>
              </div>
              <div><Label>Nº do Pedido</Label><Input name="numero_pedido" /></div>
              <div><Label>Data do pedido</Label><Input name="data_pedido" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></div>
              <div><Label>Observações</Label><Input name="observacoes" /></div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Itens</p>
              <div className="space-y-2">
                {itens.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <select value={item.produto_id}
                        onChange={(e) => { const n = [...itens]; n[idx].produto_id = e.target.value; setItens(n); }}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm">
                        <option value="">Produto...</option>
                        {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <Input type="number" min="1" placeholder="Qtd" value={item.quantidade}
                        onChange={(e) => { const n = [...itens]; n[idx].quantidade = Number(e.target.value); setItens(n); }} />
                    </div>
                    <div className="col-span-3">
                      <Input type="number" step="0.01" placeholder="R$ unit" value={item.custo_unit || ""}
                        onChange={(e) => { const n = [...itens]; n[idx].custo_unit = Number(e.target.value); setItens(n); }} />
                    </div>
                    <div className="col-span-2 text-xs text-right text-muted-foreground tabular-nums">
                      {fmt(item.quantidade * item.custo_unit)}
                    </div>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-2"
                onClick={() => setItens([...itens, { produto_id: "", quantidade: 1, custo_unit: 0 }])}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar item
              </Button>
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <p className="font-semibold">Total: {fmt(total)}</p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={criar.isPending}>{criar.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Registrar compra</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
