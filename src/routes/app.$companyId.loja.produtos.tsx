import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Search, Loader2, Pencil, Trash2, AlertTriangle, PackageX } from "lucide-react";
import {
  useLojaProdutos, useLojaCategorias, useLojaFornecedores,
  useCreateLojaProduto, useUpdateLojaProduto, useDeleteLojaProduto,
  type LojaProduto,
} from "@/hooks/queries/loja";

export const Route = createFileRoute("/app/$companyId/loja/produtos")({
  head: () => ({ meta: [{ title: "Produtos · Loja" }] }),
  component: ProdutosPage,
});

const TIPOS = [
  { value: "produto",     label: "Produto comum" },
  { value: "controlado",  label: "Controlado (PCE)" },
  { value: "equipamento", label: "Equipamento" },
  { value: "vestuario",   label: "Vestuário" },
  { value: "acessorio",   label: "Acessório" },
  { value: "epi",         label: "EPI" },
  { value: "servico",     label: "Serviço" },
];

const TIPO_COLOR: Record<string, string> = {
  produto: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  controlado: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  equipamento: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  vestuario: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
  acessorio: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  epi: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  servico: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
};

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function ProdutosPage() {
  const { companyId } = useParams({ from: "/app/$companyId/loja/produtos" });
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string | undefined>();
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<LojaProduto | null>(null);

  const { data: produtos = [], isLoading } = useLojaProdutos(companyId, search, tipoFilter);
  const { data: categorias = [] } = useLojaCategorias(companyId);
  const { data: fornecedores = [] } = useLojaFornecedores(companyId);
  const criar = useCreateLojaProduto();
  const atualizar = useUpdateLojaProduto();
  const deletar = useDeleteLojaProduto();

  function openNew() { setEditing(null); setOpenForm(true); }
  function openEdit(p: LojaProduto) { setEditing(p); setOpenForm(true); }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      company_id: companyId,
      nome: fd.get("nome"),
      tipo: fd.get("tipo"),
      categoria_id: fd.get("categoria_id") || null,
      fornecedor_id: fd.get("fornecedor_id") || null,
      codigo_interno: fd.get("codigo_interno") || null,
      codigo_barras: fd.get("codigo_barras") || null,
      sku: fd.get("sku") || null,
      marca: fd.get("marca") || null,
      fabricante: fd.get("fabricante") || null,
      modelo: fd.get("modelo") || null,
      descricao: fd.get("descricao") || null,
      unidade: fd.get("unidade") || "un",
      valor_compra: Number(fd.get("valor_compra")) || 0,
      valor_venda: Number(fd.get("valor_venda")) || 0,
      estoque_minimo: Number(fd.get("estoque_minimo")) || 0,
      estoque_maximo: Number(fd.get("estoque_maximo")) || null,
    };
    const tipo = payload.tipo as string;
    if (tipo === "controlado") {
      payload.pce_numero_serie = fd.get("pce_numero_serie") || null;
      payload.pce_calibre = fd.get("pce_calibre") || null;
      payload.pce_tipo = fd.get("pce_tipo") || null;
      payload.pce_pais_origem = fd.get("pce_pais_origem") || null;
      payload.pce_ano_fabr = Number(fd.get("pce_ano_fabr")) || null;
      payload.pce_registro = fd.get("pce_registro") || null;
    }
    if (editing) {
      await atualizar.mutateAsync({ id: editing.id, ...payload });
    } else {
      await criar.mutateAsync(payload);
    }
    setOpenForm(false);
  }

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 space-y-4">
      <PageHeader
        title="Produtos"
        description="Catálogo de produtos da loja com controle de estoque e preços."
        actions={<Button size="sm" onClick={openNew}><Plus className="mr-1.5 h-3.5 w-3.5" /> Novo produto</Button>}
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nome..." className="h-9 pl-8 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {TIPOS.map((t) => (
            <Button key={t.value} size="sm" variant={tipoFilter === t.value ? "default" : "outline"}
              onClick={() => setTipoFilter(tipoFilter === t.value ? undefined : t.value)}>
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : produtos.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Nenhum produto cadastrado.</div>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Nome</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Tipo</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Categoria</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Compra</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Venda</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Margem</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Estoque</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {produtos.map((p) => (
                <TableRow key={p.id} className="text-sm">
                  <TableCell className="font-medium">
                    <div>{p.nome}</div>
                    {p.codigo_interno && <div className="text-[10px] text-muted-foreground">{p.codigo_interno}</div>}
                  </TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TIPO_COLOR[p.tipo] ?? ""}`}>
                      {TIPOS.find((t) => t.value === p.tipo)?.label ?? p.tipo}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{p.loja_categorias?.nome ?? "—"}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{fmt(p.valor_compra)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums font-medium">{fmt(p.valor_venda)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    <span className={p.margem_lucro >= 20 ? "text-emerald-600" : p.margem_lucro >= 10 ? "text-amber-600" : "text-red-600"}>
                      {p.margem_lucro.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`text-sm font-semibold ${p.estoque_atual === 0 ? "text-red-600" : p.estoque_atual <= p.estoque_minimo ? "text-amber-600" : "text-foreground"}`}>
                      {p.estoque_atual === 0 ? <PackageX className="inline h-3.5 w-3.5 mr-0.5" /> : p.estoque_atual <= p.estoque_minimo ? <AlertTriangle className="inline h-3.5 w-3.5 mr-0.5" /> : null}
                      {p.estoque_atual} {p.unidade}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Remover produto?")) deletar.mutate(p.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </div>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Nome *</Label>
                <Input name="nome" defaultValue={editing?.nome} required />
              </div>
              <div>
                <Label>Tipo *</Label>
                <select name="tipo" defaultValue={editing?.tipo ?? "produto"} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring" required>
                  {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Categoria</Label>
                <select name="categoria_id" defaultValue={editing?.categoria_id ?? ""} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="">— Sem categoria —</option>
                  {categorias.map((c: { id: string; nome: string }) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <Label>Código interno</Label>
                <Input name="codigo_interno" defaultValue={editing?.codigo_interno ?? ""} />
              </div>
              <div>
                <Label>Código de barras</Label>
                <Input name="codigo_barras" defaultValue={editing?.codigo_barras ?? ""} />
              </div>
              <div>
                <Label>SKU</Label>
                <Input name="sku" defaultValue={editing?.sku ?? ""} />
              </div>
              <div>
                <Label>Marca</Label>
                <Input name="marca" defaultValue={editing?.marca ?? ""} />
              </div>
              <div>
                <Label>Fabricante</Label>
                <Input name="fabricante" defaultValue={editing?.fabricante ?? ""} />
              </div>
              <div>
                <Label>Modelo</Label>
                <Input name="modelo" defaultValue={editing?.modelo ?? ""} />
              </div>
              <div>
                <Label>Unidade</Label>
                <Input name="unidade" defaultValue={editing?.unidade ?? "un"} />
              </div>
              <div>
                <Label>Fornecedor</Label>
                <select name="fornecedor_id" defaultValue={editing?.fornecedor_id ?? ""} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="">— Sem fornecedor —</option>
                  {fornecedores.map((f: { id: string; razao_social: string; nome_fantasia?: string }) => <option key={f.id} value={f.id}>{f.nome_fantasia || f.razao_social}</option>)}
                </select>
              </div>
              <div>
                <Label>Valor de compra (R$)</Label>
                <Input name="valor_compra" type="number" step="0.01" min="0" defaultValue={editing?.valor_compra ?? 0} />
              </div>
              <div>
                <Label>Valor de venda (R$)</Label>
                <Input name="valor_venda" type="number" step="0.01" min="0" defaultValue={editing?.valor_venda ?? 0} />
              </div>
              <div>
                <Label>Estoque mínimo</Label>
                <Input name="estoque_minimo" type="number" min="0" defaultValue={editing?.estoque_minimo ?? 0} />
              </div>
              <div>
                <Label>Estoque máximo</Label>
                <Input name="estoque_maximo" type="number" min="0" defaultValue={editing?.estoque_maximo ?? ""} />
              </div>
              <div className="col-span-2">
                <Label>Descrição</Label>
                <Textarea name="descricao" rows={3} defaultValue={editing?.descricao ?? ""} />
              </div>
            </div>

            {/* Campos PCE — mostrados via JS simplificado, ficam ocultos por padrão */}
            <div id="pce-fields" className="space-y-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20 p-4">
              <p className="text-xs font-semibold text-red-700 dark:text-red-300 uppercase tracking-wider">Produto Controlado (PCE) — campos adicionais</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Número de série</Label><Input name="pce_numero_serie" defaultValue={editing?.pce_numero_serie ?? ""} /></div>
                <div><Label>Calibre</Label><Input name="pce_calibre" defaultValue={editing?.pce_calibre ?? ""} /></div>
                <div><Label>Tipo PCE</Label><Input name="pce_tipo" defaultValue={editing?.pce_tipo ?? ""} /></div>
                <div><Label>País de origem</Label><Input name="pce_pais_origem" defaultValue={editing?.pce_pais_origem ?? ""} /></div>
                <div><Label>Ano fabricação</Label><Input name="pce_ano_fabr" type="number" defaultValue={editing?.pce_ano_fabr ?? ""} /></div>
                <div><Label>Registro interno</Label><Input name="pce_registro" defaultValue={editing?.pce_registro ?? ""} /></div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpenForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={criar.isPending || atualizar.isPending}>
                {(criar.isPending || atualizar.isPending) && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {editing ? "Salvar alterações" : "Criar produto"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
