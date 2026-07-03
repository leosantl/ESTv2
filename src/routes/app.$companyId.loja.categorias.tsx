import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Tag } from "lucide-react";
import { useLojaCategorias, useCreateLojaCategoria, useDeleteLojaCategoria } from "@/hooks/queries/loja";

export const Route = createFileRoute("/app/$companyId/loja/categorias")({
  head: () => ({ meta: [{ title: "Categorias · Loja" }] }),
  component: CategoriasPage,
});

function CategoriasPage() {
  const { companyId } = useParams({ from: "/app/$companyId/loja/categorias" });
  const [open, setOpen] = useState(false);
  const { data: cats = [], isLoading } = useLojaCategorias(companyId);
  const criar = useCreateLojaCategoria();
  const deletar = useDeleteLojaCategoria();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await criar.mutateAsync({ company_id: companyId, nome: fd.get("nome"), descricao: fd.get("descricao") || null, cor: fd.get("cor") || "#6366f1" });
    setOpen(false);
  }

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 space-y-4">
      <PageHeader title="Categorias" description="Organize os produtos por categorias." actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" /> Nova categoria</Button>} />
      {isLoading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cats.length === 0 ? (
            <p className="col-span-3 text-center text-sm text-muted-foreground py-10">Nenhuma categoria cadastrada.</p>
          ) : cats.map((c: { id: string; nome: string; descricao?: string; cor: string }) => (
            <div key={c.id} className="flex items-center gap-3 rounded-lg border bg-card p-4">
              <div className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center" style={{ background: c.cor + "33" }}>
                <Tag className="h-4 w-4" style={{ color: c.cor }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{c.nome}</p>
                {c.descricao && <p className="text-xs text-muted-foreground truncate">{c.descricao}</p>}
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive shrink-0"
                onClick={() => { if (confirm("Remover categoria?")) deletar.mutate(c.id); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova categoria</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Nome *</Label><Input name="nome" required /></div>
            <div><Label>Descrição</Label><Input name="descricao" /></div>
            <div><Label>Cor</Label><input name="cor" type="color" defaultValue="#6366f1" className="h-9 w-full rounded-md border border-input cursor-pointer" /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={criar.isPending}>{criar.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Criar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
