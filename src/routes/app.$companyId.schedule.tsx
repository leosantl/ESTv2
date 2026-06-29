import { createFileRoute, useParams } from "@tanstack/react-router";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatusBadge } from "@/components/shell/StatusBadge";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { useState } from "react";
import { useSchedules, useCreateSchedule, useLanes, useClients } from "@/hooks/useSupabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/app/$companyId/schedule")({
  head: () => ({ meta: [{ title: "Agenda · StandControl" }] }),
  component: SchedulePage,
});

function SchedulePage() {
  const { companyId } = useParams({ from: "/app/$companyId/schedule" });
  const today = new Date().toISOString().split("T")[0];
  const { data: todaySchedule = [], isLoading } = useSchedules(companyId, { date: today });
  const { data: lanes = [] } = useLanes(companyId);
  const { data: clientsData } = useClients(companyId);
  const createSchedule = useCreateSchedule();
  const [open, setOpen] = useState(false);

  const todayLabel = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="animate-fade-in">
      <PageHeader title="Agenda" description="Treinos, cursos, avaliações e reservas das pistas."
        actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1 h-3.5 w-3.5" /> Novo agendamento</Button>} />
      <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[1fr_320px] lg:p-8">
        <div className="rounded-lg border bg-card">
          <div className="border-b p-4 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground capitalize">{todayLabel}</h2>
            <span className="font-mono text-[10px] text-muted-foreground">{todaySchedule.length} eventos</span>
          </div>
          {isLoading ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <ul className="divide-y">
              {todaySchedule.map((s) => (
                <li key={s.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 p-4">
                  <div className="text-center">
                    <p className="font-mono text-sm font-bold tabular-nums">{s.time}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{s.durationMin}min</p>
                  </div>
                  <div className="min-w-0 border-l pl-4">
                    <p className="truncate text-sm font-semibold">{s.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{s.client} · {s.lane} · {s.instructor}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </li>
              ))}
              {!todaySchedule.length && <li className="p-8 text-center text-sm text-muted-foreground">Nenhum agendamento hoje.</li>}
            </ul>
          )}
        </div>
        <aside className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Calendário</h2>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
            {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => <div key={i} className="text-muted-foreground font-bold">{d}</div>)}
            {Array.from({ length: 30 }).map((_, i) => {
              const dayNum = i + 1;
              const isToday = dayNum === new Date().getDate();
              return <div key={i} className={"aspect-square grid place-items-center rounded font-mono tabular-nums " + (isToday ? "bg-accent text-accent-foreground font-bold" : i % 5 === 0 ? "bg-muted/50" : "")}>{dayNum}</div>;
            })}
          </div>
        </aside>
      </div>

      <NewScheduleDialog open={open} onClose={() => setOpen(false)} lanes={lanes} clients={clientsData?.data ?? []}
        onSave={async (p) => { await createSchedule.mutateAsync({ ...p, company_id: companyId }); setOpen(false); }} />
    </div>
  );
}

function NewScheduleDialog({ open, onClose, lanes, clients, onSave }: {
  open: boolean; onClose: () => void;
  lanes: Array<{ id: string; nome: string }>;
  clients: Array<{ id: string; name: string }>;
  onSave: (p: { titulo: string; tipo: string; starts_at: string; duration_min: number; client_id?: string; lane_id?: string }) => Promise<void>;
}) {
  const [form, setForm] = useState({ titulo: "", tipo: "treino", data: "", hora: "", duracao: 60, client_id: "", lane_id: "" });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo || !form.data || !form.hora) { toast.error("Preencha título, data e hora."); return; }
    setSaving(true);
    try {
      await onSave({
        titulo: form.titulo, tipo: form.tipo, starts_at: `${form.data}T${form.hora}:00`,
        duration_min: form.duracao, client_id: form.client_id || undefined, lane_id: form.lane_id || undefined,
      });
      setForm({ titulo: "", tipo: "treino", data: "", hora: "", duracao: 60, client_id: "", lane_id: "" });
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Novo agendamento</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Título *</label>
            <input value={form.titulo} onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))} placeholder="Treino livre"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo</label>
            <select value={form.tipo} onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))} className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none">
              <option value="treino">Treino</option><option value="avaliacao">Avaliação</option>
              <option value="curso">Curso</option><option value="reserva">Reserva</option><option value="evento">Evento</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pista</label>
            <select value={form.lane_id} onChange={(e) => setForm((p) => ({ ...p, lane_id: e.target.value }))} className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none">
              <option value="">Sem pista</option>{lanes.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Data *</label>
            <input type="date" value={form.data} onChange={(e) => setForm((p) => ({ ...p, data: e.target.value }))} className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Hora *</label>
            <input type="time" value={form.hora} onChange={(e) => setForm((p) => ({ ...p, hora: e.target.value }))} className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Duração (min)</label>
            <input type="number" min={15} step={15} value={form.duracao} onChange={(e) => setForm((p) => ({ ...p, duracao: Number(e.target.value) }))} className="h-9 w-full rounded-md border bg-background px-3 text-sm font-mono outline-none" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cliente</label>
            <select value={form.client_id} onChange={(e) => setForm((p) => ({ ...p, client_id: e.target.value }))} className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none">
              <option value="">Sem cliente vinculado</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={saving}>{saving ? "Salvando..." : "Agendar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
