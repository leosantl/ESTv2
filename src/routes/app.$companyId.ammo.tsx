import { createFileRoute, useParams } from "@tanstack/react-router";
import { PageHeader } from "@/components/shell/PageHeader";
import { KpiCard } from "@/components/shell/KpiCard";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { useAmmoStock, useAmmoMovements, useCreateAmmoMovement } from "@/hooks/useSupabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/app/$companyId/ammo")({
  head: () => ({ meta: [{ title: "Munições · StandControl" }] }),
  component: AmmoPage,
});

function AmmoPage() {
  const { companyId } = useParams({ from: "/app/$companyId/ammo" });
  const { data: ammoStock = [], isLoading } = useAmmoStock(companyId);
  const { data: ammoMovements = [] } = useAmmoMovements(companyId);
  const createMovement = useCreateAmmoMovement();
  const [moveDialog, setMoveDialog] = useState<{ type: "entrada" | "saida" } | null>(null);

  const total = ammoStock.reduce((a, b) => a + b.stock, 0);
  const low = ammoStock.filter((s) => s.abaixoMinimo).length;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Munições"
        description="Controle de estoque, entradas e saídas por calibre."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setMoveDialog({ type: "saida" })}>Saída</Button>
            <Button size="sm" onClick={() => setMoveDialog({ type: "entrada" })}><Plus className="mr-1 h-3.5 w-3.5" /> Entrada</Button>
          </>
        }
      />
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Estoque Total" value={total.toLocaleString("pt-BR")} hint="cartuchos" />
          <KpiCard label="SKUs" value={ammoStock.length} hint="calibres ativos" />
          <KpiCard label="Abaixo do mínimo" value={low} hint="reposição" hintTone="warning" />
          <KpiCard label="Movimentações" value={ammoMovements.length} hint="registradas" hintTone="muted" />
        </section>

        <div className="rounded-lg border bg-card">
          <div className="border-b p-4"><h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Estoque por calibre</h2></div>
          {isLoading ? <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Calibre</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Marca</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Estoque</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Mínimo</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Última entrada</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {ammoStock.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-[11px]">{s.caliber}</TableCell>
                    <TableCell className="text-xs">{s.brand}</TableCell>
                    <TableCell className={"font-mono text-xs tabular-nums " + (s.abaixoMinimo ? "text-destructive font-bold" : "")}>{s.stock.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">{s.min.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">{s.lastEntry}</TableCell>
                  </TableRow>
                ))}
                {!ammoStock.length && <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">Nenhum calibre cadastrado.</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="rounded-lg border bg-card">
          <div className="border-b p-4"><h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Movimentações recentes</h2></div>
          <ul className="divide-y">
            {ammoMovements.map((m) => (
              <li key={m.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3">
                <span className={"font-mono text-[10px] font-bold uppercase " + (m.type === "Entrada" ? "text-emerald-600" : "text-foreground")}>{m.type}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{m.caliber} · {m.qty.toLocaleString("pt-BR")} un.</p>
                  <p className="truncate text-[10px] text-muted-foreground">{m.responsible}</p>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">{m.date}</span>
              </li>
            ))}
            {!ammoMovements.length && <li className="p-4 text-center text-xs text-muted-foreground">Sem movimentações registradas.</li>}
          </ul>
        </div>
      </div>

      {moveDialog && (
        <MovementDialog
          type={moveDialog.type}
          stocks={ammoStock}
          onClose={() => setMoveDialog(null)}
          onSave={async (payload) => {
            await createMovement.mutateAsync({ ...payload, company_id: companyId, tipo: moveDialog.type });
            setMoveDialog(null);
          }}
        />
      )}
    </div>
  );
}

function MovementDialog({ type, stocks, onClose, onSave }: {
  type: "entrada" | "saida";
  stocks: Array<{ id: string; caliber: string; brand: string; stock: number }>;
  onClose: () => void;
  onSave: (p: { ammo_stock_id: string; calibre: string; quantidade: number; responsavel: string; observacoes?: string }) => Promise<void>;
}) {
  const [stockId, setStockId] = useState(stocks[0]?.id ?? "");
  const [qty, setQty] = useState(50);
  const [responsible, setResponsible] = useState("");
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);

  const selected = stocks.find((s) => s.id === stockId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stockId || !responsible) { toast.error("Preencha todos os campos."); return; }
    setSaving(true);
    try {
      await onSave({ ammo_stock_id: stockId, calibre: selected?.caliber ?? "", quantidade: qty, responsavel: responsible, observacoes: obs });
    } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{type === "entrada" ? "Registrar Entrada" : "Registrar Saída"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Calibre</label>
            <select value={stockId} onChange={(e) => setStockId(e.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none">
              {stocks.map((s) => <option key={s.id} value={s.id}>{s.caliber} — {s.brand} ({s.stock} un.)</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Quantidade *</label>
            <input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="h-9 w-full rounded-md border bg-background px-3 text-sm font-mono outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Responsável *</label>
            <input placeholder="Nome ou NF" value={responsible} onChange={(e) => setResponsible(e.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Observações</label>
            <input placeholder="Opcional" value={obs} onChange={(e) => setObs(e.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none" />
          </div>
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={saving}>{saving ? "Salvando..." : "Registrar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
