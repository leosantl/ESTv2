import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Search, Pencil } from "lucide-react";
import { useLojaFornecedores, useCreateLojaFornecedor, useUpdateLojaFornecedor } from "@/hooks/queries/loja";

export const Route = createFileRoute("/app/$companyId/loja/fornecedores")({
  head: () => ({ meta: [{ title: "Fornecedores · Loja" }] }),
  component: FornecedoresPage,
});

type Forn = {
  id: string; razao_social: string; nome_fantasia: string | null; cpf_cnpj: string | null;
  telefone: string | null; email: string | null; cidade: string | null; estado: string | null;
  responsavel: string | null; inscricao_est: string | null; endereco: string | null; observacoes: string | null;
};

function FornecedoresPage() {
  const { companyId } = useParams({ from: "/app/$companyId/loja/fornecedores" });
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Forn | null>(null);
  const { data: forn = [], isLoading } = useLojaFornecedores(companyId, search);
  const criar = useCreateLojaFornecedor();
  const atualizar = useUpdateLojaFornecedor();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      company_id: companyId,
      razao_social: fd.get("razao_social"),
      nome_fantasia: fd.get("nome_fantasia") || null,
      cpf_cnpj: fd.get("cpf_cnpj") || null,
      inscricao_est: fd.get("inscricao_est") || null,
      telefone: fd.get("telefone") || null,
      email: fd.get("email") || null,
      endereco: fd.get("endereco") || null,
      cidade: fd.get("cidade") || null,
      estado: fd.get("estado") || null,
      responsavel: fd.get("responsavel") || null,
      observacoes: fd.get("observacoes") || null,
    };
    if (editing) await atualizar.mutateAsync({ id: editing.id, ...payload });
    else await criar.mutateAsync(payload);
    setOpen(false);
  }

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 space-y-4">
      <PageHeader
        title="Fornecedores"
        description="Cadastro de fornecedores com histórico de compras."
        actions={<Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="mr-1.5 h-3.5 w-3.5" /> Novo fornecedor</Button>}
      />
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar fornecedor..." className="h-9 pl-8 text-sm max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (forn as Forn[]).length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Nenhum fornecedor cadastrado.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Razão Social</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">CNPJ/CPF</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Cidade</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Contato</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Responsável</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(forn as Forn[]).map((f) => (
                <TableRow key={f.id} className="text-sm">
                  <TableCell>
                    <div className="font-medium">{f.razao_social}</div>
                    {f.nome_fantasia && <div className="text-xs text-muted-foreground">{f.nome_fantasia}</div>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{f.cpf_cnpj ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{f.cidade}{f.estado ? `/${f.estado}` : ""}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{f.telefone ?? f.email ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{f.responsavel ?? "—"}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(f); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Razão Social *</Label><Input name="razao_social" defaultValue={editing?.razao_social} required /></div>
              <div><Label>Nome Fantasia</Label><Input name="nome_fantasia" defaultValue={editing?.nome_fantasia ?? ""} /></div>
              <div><Label>CPF/CNPJ</Label><Input name="cpf_cnpj" defaultValue={editing?.cpf_cnpj ?? ""} /></div>
              <div><Label>Inscrição Estadual</Label><Input name="inscricao_est" defaultValue={editing?.inscricao_est ?? ""} /></div>
              <div><Label>Telefone</Label><Input name="telefone" defaultValue={editing?.telefone ?? ""} /></div>
              <div className="col-span-2"><Label>E-mail</Label><Input name="email" type="email" defaultValue={editing?.email ?? ""} /></div>
              <div className="col-span-2"><Label>Endereço</Label><Input name="endereco" defaultValue={editing?.endereco ?? ""} /></div>
              <div><Label>Cidade</Label><Input name="cidade" defaultValue={editing?.cidade ?? ""} /></div>
              <div><Label>Estado</Label><Input name="estado" maxLength={2} defaultValue={editing?.estado ?? ""} /></div>
              <div className="col-span-2"><Label>Responsável</Label><Input name="responsavel" defaultValue={editing?.responsavel ?? ""} /></div>
              <div className="col-span-2"><Label>Observações</Label><Input name="observacoes" defaultValue={editing?.observacoes ?? ""} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={criar.isPending || atualizar.isPending}>{(criar.isPending || atualizar.isPending) && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}{editing ? "Salvar" : "Criar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
