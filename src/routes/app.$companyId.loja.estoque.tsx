import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, ArrowDown, ArrowUp, RefreshCw } from "lucide-react";
import { useLojaEstoqueMovimentos, useCreateLojaMovimento, useLojaProdutos } from "@/hooks/queries/loja";

export const Route = createFileRoute("/app/$companyId/loja/estoque")({
  head: () => ({ meta: [{ title: "Estoque · Loja" }] }),
  component: EstoquePage,
});

const TIPOS_MOV = [
  { value: "entrada",       label: "Entrada",       icon: ArrowDown, color: "text-emerald-600" },
  { value: "saida",         label: "Saída",         icon: ArrowUp,   color: "text-red-600" },
  { value: "ajuste",        label: "Ajuste",        icon: RefreshCw, color: "text-blue-600" },
  { value: "inventario",    label: "Inventário",    icon: RefreshCw, color: "text-violet-600" },
  { value: "transferencia", label: "Transferência", icon: RefreshCw, color: "text-amber-600" },
];

function EstoquePage() {
  const { companyId } = useParams({ from: "/app/$companyId/loja/estoque" });
  const [open, setOpen] = useState(false);
  const { data: movs = [], isLoading } = useLojaEstoqueMovimentos(companyId);
  const { data: produtos = [] } = useLojaProdutos(companyId);
  const criar = useCreateLojaMovimento();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await criar.mutateAsync({
      company_id: companyId,
      produto_id: fd.get("produto_id"),
      tipo: fd.get("tipo"),
      quantidade: Number(fd.get("quantidade")),
      custo_unit: Number(fd.get("custo_unit")) || null,
      motivo: fd.get("motivo") || null,
      documento_ref: fd.get("documento_ref") || null,
    });
    setOpen(false);
  }

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 space-y-4">
      <PageHeader
        title="Estoque"
        description="Controle de movimentações — entradas, saídas, ajustes e inventário."
        actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" /> Registrar movimento</Button>}
      />

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : movs.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Nenhuma movimentação registrada.</div>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Data/Hora</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Produto</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Tipo</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Qtd</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Motivo</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Operador</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movs.map((m: Record<string, unknown>) => {
                const t = TIPOS_MOV.find((x) => x.value === m.tipo);
                const Icon = t?.icon ?? RefreshCw;
                return (
                  <TableRow key={m.id as string} className="text-sm">
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(m.created_at as string).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {(m.loja_produtos as { nome: string } | null)?.nome ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span className={`flex items-center gap-1 text-xs font-medium ${t?.color ?? ""}`}>
                        <Icon className="h-3.5 w-3.5" /> {t?.label ?? m.tipo as string}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {m.tipo === "saida" ? <span className="text-red-600">-{m.quantidade as number}</span> : <span className="text-emerald-600">+{m.quantidade as number}</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.motivo as string ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {(m.profiles as { nome: string } | null)?.nome ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar movimentação</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Produto *</Label>
              <select name="produto_id" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" required>
                <option value="">Selecione...</option>
                {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome} (estoque: {p.estoque_atual})</option>)}
              </select>
            </div>
            <div>
              <Label>Tipo *</Label>
              <select name="tipo" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" required>
                {TIPOS_MOV.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Quantidade *</Label>
              <Input name="quantidade" type="number" min="1" required />
            </div>
            <div>
              <Label>Custo unitário (R$)</Label>
              <Input name="custo_unit" type="number" step="0.01" min="0" placeholder="Opcional" />
            </div>
            <div>
              <Label>Motivo</Label>
              <Input name="motivo" placeholder="Ex: compra, venda, ajuste de inventário..." />
            </div>
            <div>
              <Label>Documento de referência</Label>
              <Input name="documento_ref" placeholder="NF, pedido, contrato..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={criar.isPending}>{criar.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Registrar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
