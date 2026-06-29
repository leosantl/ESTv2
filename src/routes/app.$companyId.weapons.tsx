import { createFileRoute, useParams } from "@tanstack/react-router";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatusBadge } from "@/components/shell/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { useWeapons, useCreateWeapon, useClients } from "@/hooks/useSupabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/app/$companyId/weapons")({
  head: () => ({ meta: [{ title: "Acervo · StandControl" }] }),
  component: WeaponsPage,
});

function WeaponsPage() {
  const { companyId } = useParams({ from: "/app/$companyId/weapons" });
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { data: weapons = [], isLoading } = useWeapons(companyId, { search });
  const createWeapon = useCreateWeapon();
  const { data: clientsData } = useClients(companyId);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Acervo"
        description="Armas registradas no clube, com calibre, número de série e proprietário."
        actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1 h-3.5 w-3.5" /> Cadastrar arma</Button>}
      />
      <div className="space-y-4 p-4 sm:p-6 lg:p-8">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por marca, modelo, série..." className="h-9 pl-8 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="rounded-lg border bg-card">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Marca / Modelo</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Calibre</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Nº Série</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Proprietário</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Cadastro</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weapons.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell><p className="text-sm font-semibold">{w.brand}</p><p className="text-[11px] text-muted-foreground">{w.model}</p></TableCell>
                    <TableCell className="font-mono text-[11px]">{w.caliber}</TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">{w.serial}</TableCell>
                    <TableCell className="text-xs">{w.owner}</TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">{w.registeredAt}</TableCell>
                    <TableCell><StatusBadge status={w.status} /></TableCell>
                  </TableRow>
                ))}
                {!weapons.length && <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">Nenhuma arma cadastrada.</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <NewWeaponDialog open={open} onClose={() => setOpen(false)}
        clients={clientsData?.data ?? []}
        onSave={async (p) => {
          await createWeapon.mutateAsync({ ...p, company_id: companyId });
          setOpen(false);
        }} />
    </div>
  );
}

function NewWeaponDialog({ open, onClose, clients, onSave }: { open: boolean; onClose: () => void; clients: Array<{ id: string; name: string }>; onSave: (p: Record<string, string>) => Promise<void> }) {
  const [form, setForm] = useState({ marca: "", modelo: "", calibre: "", numero_serie: "", client_id: "", observacoes: "" });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.marca || !form.numero_serie) { toast.error("Marca e série são obrigatórios."); return; }
    setSaving(true);
    try { await onSave(form); setForm({ marca: "", modelo: "", calibre: "", numero_serie: "", client_id: "", observacoes: "" }); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Cadastrar arma</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          {[
            { key: "marca", label: "Marca *", ph: "Taurus" },
            { key: "modelo", label: "Modelo *", ph: "G3C" },
            { key: "calibre", label: "Calibre *", ph: "9mm" },
            { key: "numero_serie", label: "Nº de Série *", ph: "TG3-492118", mono: true },
          ].map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{f.label}</label>
              <input placeholder={f.ph} value={(form as Record<string, string>)[f.key]} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                className={`h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-foreground/60 ${f.mono ? "font-mono" : ""}`} />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Proprietário</label>
            <select value={form.client_id} onChange={(e) => setForm((p) => ({ ...p, client_id: e.target.value }))}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-foreground/60">
              <option value="">Sem proprietário</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={saving}>{saving ? "Salvando..." : "Cadastrar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
