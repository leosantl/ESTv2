import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useUnits, useCreateUnit, useUpdateUnit, useDeleteUnit, type Unit } from "@/hooks/queries/units";
import { usePlanGate } from "@/hooks/usePlanGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Building2, Lock, ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PLAN_LABEL } from "@/lib/plan-features";
import { toast } from "sonner";

export const Route = createFileRoute("/app/$companyId/units")({ component: UnitsPage });

type FormData = { nome: string; cidade: string; estado: string; telefone: string; email: string; endereco: string; responsavel: string; };
const EMPTY_FORM: FormData = { nome: "", cidade: "", estado: "", telefone: "", email: "", endereco: "", responsavel: "" };

function UnitForm({ open, onClose, onSubmit, initial, loading }: { open: boolean; onClose: () => void; onSubmit: (data: FormData) => void; initial?: FormData; loading: boolean; }) {
  const [form, setForm] = useState<FormData>(initial ?? EMPTY_FORM);
  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    onSubmit(form);
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{initial ? "Editar unidade" : "Nova unidade"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="grid gap-1.5"><Label>Nome *</Label><Input value={form.nome} onChange={set("nome")} placeholder="Ex: Unidade Centro" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Cidade</Label><Input value={form.cidade} onChange={set("cidade")} placeholder="São Paulo" /></div>
            <div className="grid gap-1.5"><Label>Estado (UF)</Label><Input value={form.estado} onChange={set("estado")} placeholder="SP" maxLength={2} className="uppercase" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Telefone</Label><Input value={form.telefone} onChange={set("telefone")} placeholder="(11) 99999-9999" /></div>
            <div className="grid gap-1.5"><Label>E-mail</Label><Input value={form.email} onChange={set("email")} placeholder="unidade@empresa.com" type="email" /></div>
          </div>
          <div className="grid gap-1.5"><Label>Endereço</Label><Input value={form.endereco} onChange={set("endereco")} placeholder="Rua, número, bairro" /></div>
          <div className="grid gap-1.5"><Label>Responsável</Label><Input value={form.responsavel} onChange={set("responsavel")} placeholder="Nome do responsável" /></div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LockedState({ billingUrl }: { billingUrl: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="grid size-14 place-items-center rounded-full bg-muted"><Lock className="h-6 w-6 text-muted-foreground" /></div>
      <div>
        <h2 className="text-lg font-semibold">Multi-unidade</h2>
        <p className="mt-1 text-sm text-muted-foreground">Gerencie múltiplas unidades da sua empresa.<br />Disponível no plano <span className="font-semibold text-foreground">{PLAN_LABEL.enterprise}</span>.</p>
      </div>
      <Link to={billingUrl} className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90">
        Ver planos <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function UnitsPage() {
  const { companyId } = useParams({ from: "/app/$companyId/units" });
  const { allowed } = usePlanGate(companyId, "loja");
  const { data: units = [], isLoading } = useUnits(companyId);
  const createUnit = useCreateUnit(companyId);
  const updateUnit = useUpdateUnit(companyId);
  const deleteUnit = useDeleteUnit(companyId);
  const [showCreate, setShowCreate] = useState(false);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const billingUrl = `/app/${companyId}/billing`;

  if (!allowed) return <LockedState billingUrl={billingUrl} />;

  const handleCreate = (form: FormData) => {
    createUnit.mutate({ ...form, company_id: companyId }, {
      onSuccess: () => { toast.success("Unidade criada."); setShowCreate(false); },
      onError: (e) => toast.error((e as Error).message),
    });
  };
  const handleUpdate = (form: FormData) => {
    if (!editUnit) return;
    updateUnit.mutate({ id: editUnit.id, ...form }, {
      onSuccess: () => { toast.success("Unidade atualizada."); setEditUnit(null); },
      onError: (e) => toast.error((e as Error).message),
    });
  };
  const handleToggle = (unit: Unit) => {
    updateUnit.mutate({ id: unit.id, ativo: !unit.ativo }, {
      onSuccess: () => toast.success(unit.ativo ? "Unidade desativada." : "Unidade ativada."),
      onError: (e) => toast.error((e as Error).message),
    });
  };
  const handleDelete = () => {
    if (!deleteId) return;
    deleteUnit.mutate(deleteId, {
      onSuccess: () => { toast.success("Unidade excluída."); setDeleteId(null); },
      onError: (e) => toast.error((e as Error).message),
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Unidades</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie as unidades da sua empresa</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="mr-1.5 h-4 w-4" /> Nova unidade</Button>
      </div>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : units.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <Building2 className="h-8 w-8 text-muted-foreground" />
          <div><p className="font-medium">Nenhuma unidade cadastrada</p><p className="text-sm text-muted-foreground">Crie sua primeira unidade para começar</p></div>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="mr-1.5 h-4 w-4" /> Criar unidade</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {units.map((unit) => (
            <div key={unit.id} className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">{unit.nome}</p>
                    <Badge variant={unit.ativo ? "default" : "secondary"} className="shrink-0 text-[10px]">{unit.ativo ? "Ativa" : "Inativa"}</Badge>
                  </div>
                  {(unit.cidade || unit.estado) && <p className="mt-0.5 text-xs text-muted-foreground">{[unit.cidade, unit.estado].filter(Boolean).join(", ")}</p>}
                  {unit.responsavel && <p className="mt-0.5 text-xs text-muted-foreground">Resp: {unit.responsavel}</p>}
                  {unit.telefone && <p className="mt-0.5 text-xs text-muted-foreground">{unit.telefone}</p>}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 border-t pt-3">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setEditUnit(unit)}><Pencil className="mr-1 h-3 w-3" /> Editar</Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleToggle(unit)}>{unit.ativo ? "Desativar" : "Ativar"}</Button>
                <Button variant="ghost" size="sm" className="ml-auto h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={() => setDeleteId(unit.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <UnitForm open={showCreate} onClose={() => setShowCreate(false)} onSubmit={handleCreate} loading={createUnit.isPending} />
      {editUnit && (
        <UnitForm open={!!editUnit} onClose={() => setEditUnit(null)} onSubmit={handleUpdate}
          initial={{ nome: editUnit.nome, cidade: editUnit.cidade ?? "", estado: editUnit.estado ?? "", telefone: editUnit.telefone ?? "", email: editUnit.email ?? "", endereco: editUnit.endereco ?? "", responsavel: editUnit.responsavel ?? "" }}
          loading={updateUnit.isPending} />
      )}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir unidade?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Usuários vinculados a esta unidade perderão o vínculo.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
