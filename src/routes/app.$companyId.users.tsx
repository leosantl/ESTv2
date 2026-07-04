import { createFileRoute, useParams } from "@tanstack/react-router";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatusBadge } from "@/components/shell/StatusBadge";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { useUsers, useInviteUser, useUpdateUser } from "@/hooks/useSupabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/app/$companyId/users")({
  head: () => ({ meta: [{ title: "Usuários · StandControl" }] }),
  component: UsersPage,
});

function UsersPage() {
  const { companyId } = useParams({ from: "/app/$companyId/users" });
  const { data: users = [], isLoading } = useUsers(companyId);
  const invite = useInviteUser();
  const updateUser = useUpdateUser();
  const [open, setOpen] = useState(false);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Usuários" description="Gerencie quem tem acesso à plataforma e seus níveis de permissão."
        actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1 h-3.5 w-3.5" /> Convidar usuário</Button>} />
      <div className="space-y-4 p-4 sm:p-6 lg:p-8">
        <div className="rounded-lg border bg-card">
          {isLoading ? <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Nome</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">E-mail</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Perfil</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Último acesso</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-xs">{u.role}</TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">{u.lastAccess}</TableCell>
                    <TableCell><StatusBadge status={u.status} /></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => {
                        const newStatus = u.status === "Ativo" ? "suspenso" : "ativo";
                        updateUser.mutate({ id: u.id, company_id: companyId, status: newStatus });
                      }}>
                        {u.status === "Ativo" ? "Suspender" : "Reativar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!users.length && <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">Nenhum usuário.</TableCell></TableRow>}
              </TableBody>
            </Table>
            </div>
          )}
        </div>
      </div>

      <InviteDialog open={open} onClose={() => setOpen(false)}
        onSave={async (p) => { await invite.mutateAsync({ ...p, company_id: companyId }); setOpen(false); }} />
    </div>
  );
}

function InviteDialog({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (p: { email: string; nome: string; role: string }) => Promise<void> }) {
  const [form, setForm] = useState({ nome: "", email: "", role: "operador" });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome || !form.email) { toast.error("Preencha nome e e-mail."); return; }
    setSaving(true);
    try { await onSave(form); setForm({ nome: "", email: "", role: "operador" }); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Convidar usuário</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nome *</label>
            <input value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">E-mail *</label>
            <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className="h-9 w-full rounded-md border bg-background px-3 text-sm font-mono outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Perfil</label>
            <select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none">
              <option value="company_admin">Administrador</option><option value="gerente">Gerente</option>
              <option value="operador">Operador</option><option value="financeiro">Financeiro</option><option value="instrutor">Instrutor</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={saving}>{saving ? "Enviando..." : "Enviar convite"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
