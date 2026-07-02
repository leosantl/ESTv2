import { createFileRoute, useParams } from "@tanstack/react-router";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shell/StatusBadge";
import {
  LogIn, LogOut, Clock, Search, Loader2, Target, ScanFace,
  CheckCircle2, AlertTriangle, ChevronRight, Camera, X, BarChart3,
} from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  useRangeSessions, useClientDescriptors, useStartSession,
  useEndSession, useRangeReport,
} from "@/hooks/queries/range";
import { useClients, useWeapons } from "@/hooks/useSupabase";
import { getDescriptor, bestMatch } from "@/lib/face-recognition";
import { supabase } from "@/lib/supabase";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/app/$companyId/range")({
  head: () => ({ meta: [{ title: "Pista · StandControl" }] }),
  component: RangePage,
});

type Tab = "entrada" | "saida" | "historico" | "relatorio";

type MatchedClient = {
  id: string;
  name: string;
  cr?: string;
  activeSessionId?: string;
  activeSessionEntrada?: string;
};

function RangePage() {
  const { companyId } = useParams({ from: "/app/$companyId/range" });
  const [tab, setTab] = useState<Tab>("entrada");
  const [histDate, setHistDate] = useState(new Date().toISOString().slice(0, 10));
  const [reportFrom, setReportFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [reportTo, setReportTo] = useState(new Date().toISOString().slice(0, 10));

  const { data: sessions = [], isLoading: loadingSessions } = useRangeSessions(companyId, histDate);
  const { data: descriptors = [] } = useClientDescriptors(companyId);
  const { data: allClients } = useClients(companyId);
  const { data: weapons = [] } = useWeapons(companyId);
  const { data: reportData = [] } = useRangeReport(companyId, reportFrom, reportTo);
  const startSession = useStartSession();
  const endSession = useEndSession();

  const [matched, setMatched] = useState<MatchedClient | null>(null);
  const [manualSearch, setManualSearch] = useState("");
  const [shotsMap, setShotsMap] = useState<Record<string, string>>({});
  const [selectedWeapons, setSelectedWeapons] = useState<Set<string>>(new Set());

  function resetFlow() {
    setMatched(null);
    setManualSearch("");
    setShotsMap({});
    setSelectedWeapons(new Set());
  }

  const resolveClient = useCallback(async (clientId: string) => {
    const client = allClients?.data.find((c) => c.id === clientId);
    if (!client) return;
    const { data: activeSess } = await supabase
      .from("range_sessions")
      .select("id, entrada_at")
      .eq("company_id", companyId)
      .eq("client_id", clientId)
      .eq("status", "ativo")
      .limit(1)
      .maybeSingle();
    setMatched({
      id: clientId,
      name: client.name,
      cr: client.cr,
      activeSessionId: activeSess?.id,
      activeSessionEntrada: activeSess?.entrada_at,
    });
  }, [allClients, companyId]);

  async function handleFaceDescriptor(descriptor: Float32Array) {
    const match = bestMatch(descriptor, descriptors);
    if (!match) {
      toast.error("Rosto não reconhecido. Use a busca manual.");
      return;
    }
    await resolveClient(match.id);
  }

  async function confirmEntrada() {
    if (!matched) return;
    if (matched.activeSessionId) {
      toast.error("Este atirador já está na pista!");
      return;
    }
    await startSession.mutateAsync({ companyId, clientId: matched.id });
    resetFlow();
  }

  async function confirmSaida() {
    if (!matched?.activeSessionId) return;
    const shots = Array.from(selectedWeapons)
      .map((wid) => ({ weapon_id: wid, disparos: parseInt(shotsMap[wid] ?? "0", 10) }))
      .filter((s) => s.disparos > 0);
    await endSession.mutateAsync({ sessionId: matched.activeSessionId, companyId, shots });
    resetFlow();
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const todaySessions = histDate === hoje ? sessions : [];
  const ativos = todaySessions.filter((s) => s.status === "ativo").length;

  const TABS = [
    { key: "entrada" as Tab, label: "Entrada", icon: LogIn },
    { key: "saida" as Tab, label: "Saída", icon: LogOut },
    { key: "historico" as Tab, label: "Histórico", icon: Clock },
    { key: "relatorio" as Tab, label: "Relatório", icon: BarChart3 },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Controle de Pista"
        description="Entrada e saída de atiradores com reconhecimento facial e registro de disparos."
      />
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700">
            <Target className="h-3 w-3" />
            {ativos} atirador{ativos !== 1 ? "es" : ""} na pista
          </div>
          <div className="text-xs text-muted-foreground">
            {sessions.filter((s) => s.status === "concluido").length} saídas hoje
          </div>
        </div>

        <div className="flex gap-0 rounded-lg border bg-muted/40 p-1 w-fit flex-wrap">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => { setTab(key); resetFlow(); }}
              className={"flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors " +
                (tab === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </div>

        {(tab === "entrada" || tab === "saida") && (
          <div className="grid gap-6 lg:grid-cols-2">
            <CameraPanel mode={tab} onDescriptor={handleFaceDescriptor} />

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Busca manual
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Nome, CPF ou CR..."
                    className="pl-8"
                    value={manualSearch}
                    onChange={(e) => setManualSearch(e.target.value)}
                  />
                </div>
              </div>

              {manualSearch.length >= 2 && (
                <div className="rounded-lg border bg-card divide-y max-h-52 overflow-y-auto shadow-sm">
                  {(allClients?.data ?? [])
                    .filter((c) =>
                      c.name.toLowerCase().includes(manualSearch.toLowerCase()) ||
                      (c.cr ?? "").toLowerCase().includes(manualSearch.toLowerCase()) ||
                      (c.cpf ?? "").includes(manualSearch)
                    )
                    .slice(0, 8)
                    .map((c) => (
                      <button key={c.id}
                        onClick={() => { setManualSearch(""); resolveClient(c.id); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors">
                        <div className="grid size-8 shrink-0 place-items-center rounded-full bg-muted font-mono text-[10px] font-bold">
                          {c.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{c.name}</p>
                          <p className="text-[11px] text-muted-foreground">CR {c.cr || "—"}</p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </button>
                    ))}
                  {(allClients?.data ?? []).filter((c) =>
                    c.name.toLowerCase().includes(manualSearch.toLowerCase()) ||
                    (c.cr ?? "").toLowerCase().includes(manualSearch.toLowerCase())
                  ).length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">Nenhum atirador encontrado</p>
                  )}
                </div>
              )}

              {matched && tab === "entrada" && (
                <EntradaCard
                  client={matched}
                  onConfirm={confirmEntrada}
                  onCancel={resetFlow}
                  loading={startSession.isPending}
                />
              )}

              {matched && tab === "saida" && (
                <SaidaCard
                  client={matched}
                  weapons={weapons}
                  selectedWeapons={selectedWeapons}
                  setSelectedWeapons={setSelectedWeapons}
                  shotsMap={shotsMap}
                  setShotsMap={setShotsMap}
                  onConfirm={confirmSaida}
                  onCancel={resetFlow}
                  loading={endSession.isPending}
                />
              )}
            </div>
          </div>
        )}

        {tab === "historico" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Data:</label>
              <input type="date" value={histDate} onChange={(e) => setHistDate(e.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-sm outline-none" />
            </div>
            {loadingSessions ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <SessionTable sessions={sessions} />
            )}
          </div>
        )}

        {tab === "relatorio" && (
          <RelatorioPanel
            data={reportData}
            from={reportFrom}
            to={reportTo}
            setFrom={setReportFrom}
            setTo={setReportTo}
          />
        )}
      </div>
    </div>
  );
}

/* ─── CameraPanel ─── */
function CameraPanel({
  mode,
  onDescriptor,
}: {
  mode: "entrada" | "saida";
  onDescriptor: (d: Float32Array) => Promise<void>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [status, setStatus] = useState<"idle" | "scanning" | "found">("idle");

  function stopCamera() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
    setStatus("idle");
    scanningRef.current = false;
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360, facingMode: "user" } });
      streamRef.current = stream;
      setCameraOn(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        intervalRef.current = setInterval(autoScan, 2000);
      }, 50);
    } catch {
      toast.error("Camera nao disponivel. Use a busca manual.");
    }
  }

  async function autoScan() {
    if (scanningRef.current || !videoRef.current) return;
    scanningRef.current = true;
    setStatus("scanning");
    try {
      const descriptor = await getDescriptor(videoRef.current);
      if (!descriptor) { setStatus("idle"); return; }
      setStatus("found");
      stopCamera();
      await onDescriptor(descriptor);
    } catch {
      setStatus("idle");
    } finally {
      scanningRef.current = false;
    }
  }

  useEffect(() => () => stopCamera(), []);

  const Icon = mode === "entrada" ? LogIn : LogOut;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold ${mode === "entrada" ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-700"}`}>
        <Icon className="h-4 w-4" />
        {mode === "entrada" ? "Identificacao - Entrada" : "Identificacao - Saida"}
        {cameraOn && (
          <span className="ml-auto flex items-center gap-1 text-[11px] font-normal text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Verificando automaticamente...
          </span>
        )}
      </div>
      <div className="p-4 space-y-3">
        <div className={`relative rounded-lg overflow-hidden bg-muted flex items-center justify-center ${cameraOn ? "" : "h-52"}`}>
          <video ref={videoRef} className={`w-full rounded-lg ${cameraOn ? "block" : "hidden"}`} autoPlay muted playsInline />
          {!cameraOn && (
            <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
              <Camera className="h-12 w-12 opacity-30" />
              <p className="text-sm">Camera desligada</p>
              <Button size="sm" onClick={startCamera} className="mt-1">
                <Camera className="mr-1.5 h-3.5 w-3.5" /> Ativar camera
              </Button>
            </div>
          )}
          {cameraOn && status === "scanning" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
              <div className="flex flex-col items-center gap-2 text-white">
                <ScanFace className="h-10 w-10 animate-pulse" />
                <p className="text-xs font-medium">Analisando rosto...</p>
              </div>
            </div>
          )}
          {cameraOn && (
            <button onClick={stopCamera} className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <p className="text-center text-[11px] text-muted-foreground">ou use a busca manual ao lado</p>
      </div>
    </div>
  );
}


function EntradaCard({
  client, onConfirm, onCancel, loading,
}: {
  client: MatchedClient;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const alreadyIn = !!client.activeSessionId;
  return (
    <div className={`rounded-xl border p-4 space-y-4 ${alreadyIn ? "border-amber-400 bg-amber-500/5" : "border-emerald-400 bg-emerald-500/5"}`}>
      <div className="flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-muted font-mono text-sm font-bold">
          {client.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
        </div>
        <div>
          <p className="font-semibold">{client.name}</p>
          <p className="text-xs text-muted-foreground">CR {client.cr || "—"}</p>
        </div>
        {alreadyIn
          ? <AlertTriangle className="ml-auto h-5 w-5 text-amber-500" />
          : <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-500" />
        }
      </div>

      {alreadyIn && (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700">
          Este atirador já está na pista desde{" "}
          {client.activeSessionEntrada
            ? format(parseISO(client.activeSessionEntrada), "HH:mm", { locale: ptBR })
            : "—"}.
        </p>
      )}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} className="flex-1">
          <X className="mr-1 h-3.5 w-3.5" /> Cancelar
        </Button>
        <Button size="sm" className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={onConfirm} disabled={loading || alreadyIn}>
          {loading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <LogIn className="mr-1 h-3.5 w-3.5" />}
          Confirmar entrada
        </Button>
      </div>
    </div>
  );
}

function SaidaCard({
  client, weapons, selectedWeapons, setSelectedWeapons,
  shotsMap, setShotsMap, onConfirm, onCancel, loading,
}: {
  client: MatchedClient;
  weapons: Array<{ id: string; brand: string; model: string; caliber: string; serial: string }>;
  selectedWeapons: Set<string>;
  setSelectedWeapons: (s: Set<string>) => void;
  shotsMap: Record<string, string>;
  setShotsMap: (m: Record<string, string>) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const noSession = !client.activeSessionId;

  function toggleWeapon(id: string) {
    const n = new Set(selectedWeapons);
    if (n.has(id)) { n.delete(id); } else { n.add(id); }
    setSelectedWeapons(n);
  }

  const tempoMin = client.activeSessionEntrada
    ? differenceInMinutes(new Date(), parseISO(client.activeSessionEntrada))
    : null;

  return (
    <div className="rounded-xl border border-rose-400 bg-rose-500/5 p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-muted font-mono text-sm font-bold">
          {client.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
        </div>
        <div>
          <p className="font-semibold">{client.name}</p>
          <p className="text-xs text-muted-foreground">
            CR {client.cr || "—"}
            {tempoMin !== null && ` · ${tempoMin}min na pista`}
          </p>
        </div>
        {noSession
          ? <AlertTriangle className="ml-auto h-5 w-5 text-amber-500" />
          : <CheckCircle2 className="ml-auto h-5 w-5 text-rose-500" />
        }
      </div>

      {noSession ? (
        <>
          <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700">
            Nenhuma sessão ativa para este atirador.
          </p>
          <Button variant="outline" size="sm" onClick={onCancel} className="w-full">
            <X className="mr-1 h-3.5 w-3.5" /> Fechar
          </Button>
        </>
      ) : (
        <>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Selecione as armas utilizadas e informe os disparos
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {weapons.map((w) => {
                const checked = selectedWeapons.has(w.id);
                return (
                  <div key={w.id}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors cursor-pointer ${checked ? "border-foreground/30 bg-muted/50" : "hover:bg-muted/30"}`}
                    onClick={() => toggleWeapon(w.id)}>
                    <div className={`h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${checked ? "border-foreground bg-foreground" : "border-muted-foreground"}`}>
                      {checked && <div className="h-2 w-2 rounded-sm bg-background" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{w.brand} {w.model}</p>
                      <p className="text-[11px] text-muted-foreground">{w.caliber} — {w.serial}</p>
                    </div>
                    {checked && (
                      <input
                        type="number"
                        min="1"
                        placeholder="Disparos"
                        value={shotsMap[w.id] ?? ""}
                        onChange={(e) => setShotsMap({ ...shotsMap, [w.id]: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                        className="w-24 h-8 rounded-md border bg-background px-2 text-sm text-center outline-none focus:border-foreground/60"
                      />
                    )}
                  </div>
                );
              })}
              {weapons.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Nenhuma arma no acervo. Cadastre armas em "Acervo".
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={onCancel}>
              <X className="mr-1 h-3.5 w-3.5" /> Cancelar
            </Button>
            <Button size="sm" className="flex-1 bg-rose-600 text-white hover:bg-rose-700"
              onClick={onConfirm} disabled={loading}>
              {loading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <LogOut className="mr-1 h-3.5 w-3.5" />}
              Registrar saída
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function SessionTable({ sessions }: { sessions: RangeSession[] }) {
  if (!sessions || sessions.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground">
        <Clock className="h-8 w-8 opacity-30" />
        <p className="text-sm">Nenhuma sessão neste dia</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              {["Atirador", "Entrada", "Saída", "Tempo", "Armas / Disparos", "Status"].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {sessions.map((s) => {
              const entrada = parseISO(s.entrada_at);
              const saida = s.saida_at ? parseISO(s.saida_at) : null;
              const mins = saida ? differenceInMinutes(saida, entrada) : differenceInMinutes(new Date(), entrada);
              const h = Math.floor(mins / 60);
              const m = mins % 60;
              const tempo = h > 0 ? `${h}h${m.toString().padStart(2, "0")}min` : `${m}min`;
              return (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{s.clientName}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{format(entrada, "HH:mm", { locale: ptBR })}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{saida ? format(saida, "HH:mm") : "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{tempo}</td>
                  <td className="px-4 py-3">
                    {s.shots.length === 0
                      ? <span className="text-xs text-muted-foreground">—</span>
                      : <div className="space-y-0.5">{s.shots.map((sh, i) => (
                          <p key={i} className="text-[11px]"><span className="font-medium">{sh.disparos}×</span> {sh.weaponLabel}</p>
                        ))}</div>
                    }
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={s.status === "ativo" ? "Ativo" : "Concluído"} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import type { RangeSession } from "@/hooks/queries/range";

function RelatorioPanel({
  data, from, to, setFrom, setTo,
}: {
  data: unknown[];
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
}) {
  type ShotRow = { disparos: number; weapons: { marca: string; modelo: string; calibre: string; numero_serie: string } | null };
  type SessionRow = {
    id: string;
    entrada_at: string;
    saida_at: string | null;
    status: string;
    clients: { nome: string } | null;
    session_shots: ShotRow[];
  };

  const rows = data as SessionRow[];
  const weaponTotals: Record<string, { label: string; total: number }> = {};
  let totalDisparos = 0;
  for (const r of rows) {
    for (const sh of r.session_shots ?? []) {
      const wKey = sh.weapons
        ? `${sh.weapons.marca} ${sh.weapons.modelo} ${sh.weapons.calibre} — ${sh.weapons.numero_serie}`
        : "—";
      if (!weaponTotals[wKey]) weaponTotals[wKey] = { label: wKey, total: 0 };
      weaponTotals[wKey].total += sh.disparos;
      totalDisparos += sh.disparos;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {[["De", from, setFrom], ["Até", to, setTo]].map(([label, val, setter]) => (
          <div key={String(label)}>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{String(label)}</label>
            <input type="date" value={String(val)} onChange={(e) => (setter as (v: string) => void)(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm outline-none" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: "Sessões no período", value: rows.length, color: "text-foreground", bg: "bg-muted" },
          { label: "Total de disparos", value: totalDisparos, color: "text-violet-600", bg: "bg-violet-500/10" },
          { label: "Armas utilizadas", value: Object.keys(weaponTotals).length, color: "text-blue-600", bg: "bg-blue-500/10" },
        ].map((c) => (
          <div key={c.label} className={`rounded-xl border p-4 ${c.bg}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{c.label}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {Object.keys(weaponTotals).length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b"><h3 className="text-sm font-semibold">Disparos por arma</h3></div>
          <div className="divide-y">
            {Object.values(weaponTotals).sort((a, b) => b.total - a.total).map((w) => (
              <div key={w.label} className="flex items-center justify-between px-4 py-3">
                <p className="text-sm truncate max-w-xs">{w.label}</p>
                <span className="font-mono text-sm font-bold tabular-nums">{w.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b"><h3 className="text-sm font-semibold">Sessões ({rows.length})</h3></div>
        {rows.length === 0
          ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma sessão no período.</p>
          : <div className="divide-y max-h-96 overflow-y-auto">
              {rows.map((r) => {
                const totalDisp = (r.session_shots ?? []).reduce((a, s) => a + s.disparos, 0);
                return (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <Target className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{r.clients?.nome ?? "—"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {format(parseISO(r.entrada_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        {r.saida_at && ` → ${format(parseISO(r.saida_at), "HH:mm")}`}
                        {totalDisp > 0 && ` · ${totalDisp} disparos`}
                      </p>
                    </div>
                    <StatusBadge status={r.status === "ativo" ? "Ativo" : "Concluído"} />
                  </div>
                );
              })}
            </div>
        }
      </div>
    </div>
  );
}
