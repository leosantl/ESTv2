import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Search, Pencil, FileText, AlertTriangle } from "lucide-react";
import {
  useLojaClientes, useCreateLojaCliente, useUpdateLojaCliente,
  useLojaClienteDocs, useCreateLojaClienteDoc, type LojaCliente,
} from "@/hooks/queries/loja";

export const Route = createFileRoute("/app/$companyId/loja/clientes")({
  head: () => ({ meta: [{ title: "Clientes · Loja" }] }),
  component: ClientesPage,
});

const TIPOS = ["associado", "cac", "militar", "policia", "civil", "empresa"];
const STATUS = ["ativo", "inativo", "bloqueado"];
const STATUS_COLOR: Record<string, string> = {
  ativo: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  inativo: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  bloqueado: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};
const TIPO_DOC = ["RG/CNH", "CPF", "CR", "CRAF", "Guia de Tráfego", "Cert. Capacidade Técnica", "Laudo Psicológico", "Comprovante de Residência", "Outro"];

function docStatus(validade?: string) {
  if (!validade) return null;
  const diff = Math.ceil((new Date(validade).getTime() - Date.now()) / 86400000);
  if (diff < 0) return { label: "Vencido", color: "text-red-600" };
  if (diff <= 30) return { label: "Vence em 30d", color: "text-red-500" };
  if (diff <= 60) return { label: "Vence em 60d", color: "text-orange-500" };
  if (diff <= 90) return { label: "Vence em 90d", color: "text-amber-500" };
  return null;
}

function ClientesPage() {
  const { companyId } = useParams({ from: "/app/$companyId/loja/clientes" });
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<LojaCliente | null>(null);
  const [openDocs, setOpenDocs] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<LojaCliente | null>(null);
  const [openDocForm, setOpenDocForm] = useState(false);

  const { data: clientes = [], isLoading } = useLojaClientes(companyId, search, tipoFilter, statusFilter);
  const criar = useCreateLojaCliente();
  const atualizar = useUpdateLojaCliente();
  const { data: docs = [] } = useLojaClienteDocs(selectedCliente?.id ?? "");
  const criarDoc = useCreateLojaClienteDoc();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      company_id: companyId,
      nome: fd.get("nome"),
      tipo: fd.get("tipo"),
      status: fd.get("status") || "ativo",
      cpf: fd.get("cpf") || null,
      rg: fd.get("rg") || null,
      data_nascimento: fd.get("data_nascimento") || null,
      sexo: fd.get("sexo") || null,
      telefone: fd.get("telefone") || null,
      email: fd.get("email") || null,
      endereco: fd.get("endereco") || null,
      cidade: fd.get("cidade") || null,
      estado: fd.get("estado") || null,
      observacoes: fd.get("observacoes") || null,
    };
    const tipo = payload.tipo as string;
    if (tipo === "militar") {
      payload.mil_organizacao = fd.get("mil_organizacao") || null;
      payload.mil_forca = fd.get("mil_forca") || null;
      payload.mil_posto = fd.get("mil_posto") || null;
      payload.mil_situacao = fd.get("mil_situacao") || null;
      payload.mil_matricula = fd.get("mil_matricula") || null;
      payload.mil_doc_func = fd.get("mil_doc_func") || null;
    }
    if (editing) await atualizar.mutateAsync({ id: editing.id, ...payload });
    else await criar.mutateAsync(payload);
    setOpenForm(false);
  }

  async function handleDocSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await criarDoc.mutateAsync({
      company_id: companyId,
      cliente_id: selectedCliente?.id,
      tipo: fd.get("tipo"),
      numero: fd.get("numero") || null,
      orgao_emissor: fd.get("orgao_emissor") || null,
      data_emissao: fd.get("data_emissao") || null,
      data_validade: fd.get("data_validade") || null,
      observacoes: fd.get("observacoes") || null,
    });
    setOpenDocForm(false);
  }

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 space-y-4">
      <PageHeader
        title="Clientes"
        description="Cadastro completo de clientes com documentação e alertas de vencimento."
        actions={<Button size="sm" onClick={() => { setEditing(null); setOpenForm(true); }}><Plus className="mr-1.5 h-3.5 w-3.5" /> Novo cliente</Button>}
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nome..." className="h-9 pl-8 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {TIPOS.map((t) => (
            <Button key={t} size="sm" variant={tipoFilter === t ? "default" : "outline"} className="capitalize h-8 text-xs"
              onClick={() => setTipoFilter(tipoFilter === t ? undefined : t)}>{t}</Button>
          ))}
          {STATUS.map((s) => (
            <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} className="capitalize h-8 text-xs"
              onClick={() => setStatusFilter(statusFilter === s ? undefined : s)}>{s}</Button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : clientes.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Nenhum cliente cadastrado.</div>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Nome</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Tipo</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">CPF</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Contato</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((c) => (
                <TableRow key={c.id} className="text-sm">
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="capitalize text-xs text-muted-foreground">{c.tipo}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.cpf ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.telefone ?? c.email ?? "—"}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${STATUS_COLOR[c.status] ?? ""}`}>{c.status}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Documentos"
                        onClick={() => { setSelectedCliente(c); setOpenDocs(true); }}>
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => { setEditing(c); setOpenForm(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </div>

      {/* Form de cliente */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Tabs defaultValue="dados">
              <TabsList>
                <TabsTrigger value="dados">Dados</TabsTrigger>
                {(editing?.tipo === "militar" || !editing) && <TabsTrigger value="militar">Militar</TabsTrigger>}
              </TabsList>
              <TabsContent value="dados" className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Label>Nome *</Label><Input name="nome" defaultValue={editing?.nome} required /></div>
                  <div>
                    <Label>Tipo *</Label>
                    <select name="tipo" defaultValue={editing?.tipo ?? "civil"} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" required>
                      {TIPOS.map((t) => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <select name="status" defaultValue={editing?.status ?? "ativo"} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                      {STATUS.map((s) => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </div>
                  <div><Label>CPF</Label><Input name="cpf" defaultValue={editing?.cpf ?? ""} /></div>
                  <div><Label>RG</Label><Input name="rg" defaultValue={editing?.rg ?? ""} /></div>
                  <div><Label>Data de nascimento</Label><Input name="data_nascimento" type="date" defaultValue={editing?.data_nascimento ?? ""} /></div>
                  <div>
                    <Label>Sexo</Label>
                    <select name="sexo" defaultValue={editing?.sexo ?? ""} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                      <option value="">—</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                    </select>
                  </div>
                  <div><Label>Telefone</Label><Input name="telefone" defaultValue={editing?.telefone ?? ""} /></div>
                  <div><Label>E-mail</Label><Input name="email" type="email" defaultValue={editing?.email ?? ""} /></div>
                  <div className="col-span-2"><Label>Endereço</Label><Input name="endereco" defaultValue={editing?.endereco ?? ""} /></div>
                  <div><Label>Cidade</Label><Input name="cidade" defaultValue={editing?.cidade ?? ""} /></div>
                  <div><Label>Estado</Label><Input name="estado" maxLength={2} defaultValue={editing?.estado ?? ""} /></div>
                  <div className="col-span-2"><Label>Observações</Label><Textarea name="observacoes" rows={2} defaultValue={editing?.observacoes ?? ""} /></div>
                </div>
              </TabsContent>
              <TabsContent value="militar" className="space-y-3 mt-3">
                <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-3 text-xs text-amber-800 dark:text-amber-200">
                  Apenas armazenar informações. O sistema não infere nem valida direitos legais.
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Organização Militar</Label><Input name="mil_organizacao" defaultValue={editing?.mil_organizacao ?? ""} /></div>
                  <div><Label>Força</Label><Input name="mil_forca" placeholder="Ex: EB, FAB, Marinha" defaultValue={editing?.mil_forca ?? ""} /></div>
                  <div><Label>Posto/Graduação</Label><Input name="mil_posto" defaultValue={editing?.mil_posto ?? ""} /></div>
                  <div><Label>Situação</Label><Input name="mil_situacao" placeholder="Ex: Ativo, Reserva, Reformado" defaultValue={editing?.mil_situacao ?? ""} /></div>
                  <div><Label>Matrícula</Label><Input name="mil_matricula" defaultValue={editing?.mil_matricula ?? ""} /></div>
                  <div><Label>Documento funcional</Label><Input name="mil_doc_func" defaultValue={editing?.mil_doc_func ?? ""} /></div>
                </div>
              </TabsContent>
            </Tabs>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpenForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={criar.isPending || atualizar.isPending}>{(criar.isPending || atualizar.isPending) && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}{editing ? "Salvar" : "Criar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Documentos do cliente */}
      <Dialog open={openDocs} onOpenChange={setOpenDocs}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Documentos — {selectedCliente?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {docs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum documento cadastrado.</p>
            ) : docs.map((d: Record<string, unknown>) => {
              const st = docStatus(d.data_validade as string | undefined);
              return (
                <div key={d.id as string} className={`rounded-lg border p-3 ${st?.color ? "border-amber-200" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{d.tipo as string}</p>
                      {d.numero && <p className="text-xs text-muted-foreground">Nº {d.numero as string}</p>}
                      {d.orgao_emissor && <p className="text-xs text-muted-foreground">Emissor: {d.orgao_emissor as string}</p>}
                      {d.data_validade && <p className="text-xs text-muted-foreground">Validade: {new Date(d.data_validade as string).toLocaleDateString("pt-BR")}</p>}
                    </div>
                    {st && (
                      <span className={`flex items-center gap-1 text-[10px] font-medium ${st.color}`}>
                        <AlertTriangle className="h-3 w-3" />{st.label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            <Button size="sm" onClick={() => setOpenDocForm(true)}><Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar documento</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openDocForm} onOpenChange={setOpenDocForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo documento</DialogTitle></DialogHeader>
          <form onSubmit={handleDocSubmit} className="space-y-3">
            <div>
              <Label>Tipo *</Label>
              <select name="tipo" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" required>
                {TIPO_DOC.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><Label>Número</Label><Input name="numero" /></div>
            <div><Label>Órgão emissor</Label><Input name="orgao_emissor" /></div>
            <div><Label>Data de emissão</Label><Input name="data_emissao" type="date" /></div>
            <div><Label>Data de validade</Label><Input name="data_validade" type="date" /></div>
            <div><Label>Observações</Label><Input name="observacoes" /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpenDocForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={criarDoc.isPending}>{criarDoc.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
