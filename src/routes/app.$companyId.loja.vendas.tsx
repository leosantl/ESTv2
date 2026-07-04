import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Eye, AlertTriangle, CheckCircle2, Clock, ShoppingBag } from "lucide-react";
import {
  useLojaVendas, useCreateLojaVenda, useUpdateLojaVendaStatus,
  useLojaClientes, useLojaProdutos, useLojaClienteDocs,
} from "@/hooks/queries/loja";

export const Route = createFileRoute("/app/$companyId/loja/vendas")({
  head: () => ({ meta: [{ title: "Vendas · Loja" }] }),
  component: VendasPage,
});

const FORMAS = [
  { value: "pix", label: "PIX" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "cartao_debito", label: "Cartão de Débito" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "boleto", label: "Boleto" },
  { value: "parcelado", label: "Parcelado" },
  { value: "credito_interno", label: "Crédito Interno" },
];

const STATUS_COLOR: Record<string, string> = {
  rascunho: "bg-gray-100 text-gray-600",
  aguardando_pagamento: "bg-amber-100 text-amber-700",
  paga: "bg-emerald-100 text-emerald-700",
  cancelada: "bg-red-100 text-red-700",
  devolvida: "bg-violet-100 text-violet-700",
};

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho", aguardando_pagamento: "Aguardando pag.", paga: "Paga", cancelada: "Cancelada", devolvida: "Devolvida",
};

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function docStatus(validade?: string) {
  if (!validade) return null;
  const diff = Math.ceil((new Date(validade).getTime() - Date.now()) / 86400000);
  if (diff < 0) return { label: "Vencido", icon: AlertTriangle, color: "text-red-600" };
  if (diff <= 90) return { label: `Vence em ${diff}d`, icon: Clock, color: "text-amber-600" };
  return null;
}

type Item = { produto_id: string; quantidade: number; preco_unit: number; desconto: number };

function ChecklistDocs({ clienteId }: { clienteId: string }) {
  const { data: docs = [] } = useLojaClienteDocs(clienteId);
  if (!docs.length) return <p className="text-xs text-muted-foreground">Nenhum documento cadastrado para este cliente.</p>;
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Checklist de documentos</p>
      {docs.map((d: Record<string, unknown>) => {
        const st = docStatus(d.data_validade as string | undefined);
        const Icon = st?.icon ?? CheckCircle2;
        return (
          <div key={d.id as string} className="flex items-center justify-between rounded border p-2">
            <div className="flex items-center gap-2 text-xs">
              {st ? <Icon className={`h-3.5 w-3.5 ${st.color}`} /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
              <span>{d.tipo as string}</span>
              {d.numero && <span className="text-muted-foreground">#{d.numero as string}</span>}
            </div>
            {st && <span className={`text-[10px] font-medium ${st.color}`}>{st.label}</span>}
          </div>
        );
      })}
      <p className="text-[10px] text-muted-foreground pt-1">
        ⚠️ O operador é responsável pela decisão de prosseguir. O sistema apenas informa.
      </p>
    </div>
  );
}

function VendasPage() {
  const { companyId } = useParams({ from: "/app/$companyId/loja/vendas" });
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"cliente" | "itens" | "pagamento">("cliente");
  const [clienteId, setClienteId] = useState("");
  const [itens, setItens] = useState<Item[]>([{ produto_id: "", quantidade: 1, preco_unit: 0, desconto: 0 }]);
  const [forma, setForma] = useState("pix");

  const { data: vendasData, isLoading } = useLojaVendas(companyId, statusFilter);
  const { data: clientes = [] } = useLojaClientes(companyId);
  const { data: produtos = [] } = useLojaProdutos(companyId);
  const criar = useCreateLojaVenda();
  const atualizarStatus = useUpdateLojaVendaStatus();

  const subtotal = itens.reduce((s, i) => s + (i.preco_unit - i.desconto) * i.quantidade, 0);

  function resetForm() {
    setStep("cliente"); setClienteId(""); setItens([{ produto_id: "", quantidade: 1, preco_unit: 0, desconto: 0 }]); setForma("pix");
  }

  async function handleFinish() {
    const validItens = itens.filter((i) => i.produto_id && i.quantidade > 0);
    if (!validItens.length) return;
    const numero = `VND-${Date.now().toString().slice(-6)}`;
    await criar.mutateAsync({
      venda: {
        company_id: companyId, cliente_id: clienteId || null,
        status: "paga", forma_pagamento: forma, numero_venda: numero,
        subtotal, desconto: 0, total: subtotal,
      },
      itens: validItens,
    });
    setOpen(false); resetForm();
  }

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 space-y-4">
      <PageHeader
        title="Vendas"
        description="Registrar e gerenciar vendas com checklist de documentação e controle de pagamento."
        actions={<Button size="sm" onClick={() => { resetForm(); setOpen(true); }}><Plus className="mr-1.5 h-3.5 w-3.5" /> Nova venda</Button>}
      />

      <div className="flex gap-2 flex-wrap">
        {Object.entries(STATUS_LABEL).map(([v, l]) => (
          <Button key={v} size="sm" variant={statusFilter === v ? "default" : "outline"} className="h-8 text-xs"
            onClick={() => setStatusFilter(statusFilter === v ? undefined : v)}>{l}</Button>
        ))}
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : !vendasData?.data?.length ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Nenhuma venda registrada.</div>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Data</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Nº</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Cliente</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Pagamento</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Total</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendasData.data.map((v) => (
                <TableRow key={v.id} className="text-sm">
                  <TableCell className="text-xs text-muted-foreground">{new Date(v.data_venda).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-xs font-mono">{v.numero_venda ?? "—"}</TableCell>
                  <TableCell className="text-xs">{v.loja_clientes?.nome ?? <span className="text-muted-foreground">Sem cliente</span>}</TableCell>
                  <TableCell className="text-xs capitalize">{FORMAS.find((f) => f.value === v.forma_pagamento)?.label ?? v.forma_pagamento ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-sm">{fmt(v.total)}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[v.status] ?? ""}`}>{STATUS_LABEL[v.status] ?? v.status}</span>
                  </TableCell>
                  <TableCell>
                    {v.status === "aguardando_pagamento" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => atualizarStatus.mutate({ id: v.id, status: "paga" })}>Confirmar</Button>
                    )}
                    {v.status === "paga" && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive"
                        onClick={() => { if (confirm("Cancelar venda?")) atualizarStatus.mutate({ id: v.id, status: "cancelada" }); }}>Cancelar</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </div>

      {/* Wizard de nova venda */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" /> Nova venda
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {step === "cliente" ? "1/3 · Cliente" : step === "itens" ? "2/3 · Produtos" : "3/3 · Pagamento"}
              </span>
            </DialogTitle>
          </DialogHeader>

          {step === "cliente" && (
            <div className="space-y-4">
              <div>
                <Label>Cliente</Label>
                <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                  <option value="">— Venda sem cliente —</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome} ({c.cpf ?? c.tipo})</option>)}
                </select>
              </div>
              {clienteId && <ChecklistDocs clienteId={clienteId} />}
              <div className="flex justify-end">
                <Button onClick={() => setStep("itens")}>Próximo →</Button>
              </div>
            </div>
          )}

          {step === "itens" && (
            <div className="space-y-4">
              <div className="space-y-2">
                {itens.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <select value={item.produto_id}
                        onChange={(e) => {
                          const prod = produtos.find((p) => p.id === e.target.value);
                          const n = [...itens]; n[idx].produto_id = e.target.value; n[idx].preco_unit = prod?.valor_venda ?? 0; setItens(n);
                        }}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm">
                        <option value="">Produto...</option>
                        {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome} — {fmt(p.valor_venda)}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2"><Input type="number" min="1" placeholder="Qtd" value={item.quantidade} onChange={(e) => { const n = [...itens]; n[idx].quantidade = Number(e.target.value); setItens(n); }} /></div>
                    <div className="col-span-2"><Input type="number" step="0.01" placeholder="R$ unit" value={item.preco_unit || ""} onChange={(e) => { const n = [...itens]; n[idx].preco_unit = Number(e.target.value); setItens(n); }} /></div>
                    <div className="col-span-2"><Input type="number" step="0.01" placeholder="Desc." value={item.desconto || ""} onChange={(e) => { const n = [...itens]; n[idx].desconto = Number(e.target.value); setItens(n); }} /></div>
                    <div className="col-span-2 text-xs text-right tabular-nums">{fmt((item.preco_unit - item.desconto) * item.quantidade)}</div>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setItens([...itens, { produto_id: "", quantidade: 1, preco_unit: 0, desconto: 0 }])}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Item
              </Button>
              <div className="flex items-center justify-between border-t pt-3">
                <p className="font-semibold">Subtotal: {fmt(subtotal)}</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep("cliente")}>← Voltar</Button>
                  <Button onClick={() => setStep("pagamento")} disabled={!itens.some((i) => i.produto_id)}>Próximo →</Button>
                </div>
              </div>
            </div>
          )}

          {step === "pagamento" && (
            <div className="space-y-4">
              <div>
                <Label>Forma de pagamento *</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {FORMAS.map((f) => (
                    <button key={f.value} type="button"
                      onClick={() => setForma(f.value)}
                      className={`rounded-lg border p-2.5 text-sm text-left transition-colors ${forma === f.value ? "border-primary bg-primary/10 font-semibold" : "hover:border-muted-foreground"}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border bg-muted/40 p-4 space-y-1">
                <div className="flex justify-between text-sm"><span>Subtotal</span><span className="tabular-nums">{fmt(subtotal)}</span></div>
                <div className="flex justify-between text-sm font-bold border-t pt-1 mt-1"><span>Total</span><span className="tabular-nums">{fmt(subtotal)}</span></div>
              </div>
              <div className="flex gap-2 justify-between">
                <Button variant="outline" onClick={() => setStep("itens")}>← Voltar</Button>
                <Button onClick={handleFinish} disabled={criar.isPending}>
                  {criar.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Confirmar venda
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
