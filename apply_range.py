#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os, subprocess, shutil

BASE = os.path.expanduser("~/Downloads/ESTv2")

def write(rel, content):
    path = os.path.join(BASE, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  wrote {rel}")

def replace_in(rel, old, new):
    path = os.path.join(BASE, rel)
    with open(path, encoding="utf-8") as f:
        c = f.read()
    if old not in c:
        print(f"  WARN: pattern not found in {rel}")
        return
    with open(path, "w", encoding="utf-8") as f:
        f.write(c.replace(old, new, 1))
    print(f"  patched {rel}")

print("=== Step 1: writing new files ===")

write("src/lib/face-recognition.ts", r'''/**
 * Reconhecimento facial via @vladmandic/face-api (tiny models carregados do CDN).
 */
import * as faceapi from "@vladmandic/face-api";

const MODEL_URL =
  "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

let modelsLoaded = false;

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
}

function euclidean(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

export async function getDescriptor(
  el: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<Float32Array | null> {
  await loadFaceModels();
  const det = await faceapi
    .detectSingleFace(el, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
    .withFaceLandmarks(true)
    .withFaceDescriptor();
  return det?.descriptor ?? null;
}

export function bestMatch(
  descriptor: Float32Array,
  candidates: Array<{ id: string; face_descriptor: number[] | null }>
): { id: string; distance: number } | null {
  let best: { id: string; distance: number } | null = null;
  for (const c of candidates) {
    if (!c.face_descriptor || c.face_descriptor.length === 0) continue;
    const stored = new Float32Array(c.face_descriptor);
    const dist = euclidean(descriptor, stored);
    if (!best || dist < best.distance) best = { id: c.id, distance: dist };
  }
  return best && best.distance < 0.55 ? best : null;
}
''')

write("src/hooks/queries/range.ts", r'''/**
 * Hooks do domínio Controle de Pista (range sessions / shot logging).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { supabase } from "@/lib/supabase";

export interface RangeSession {
  id: string;
  client_id: string;
  clientName: string;
  foto_facial?: string | null;
  entrada_at: string;
  saida_at?: string | null;
  status: "ativo" | "concluido";
  shots: Array<{ weapon_id: string; weaponLabel: string; disparos: number }>;
}

export function useRangeSessions(companyId: string, date?: string) {
  return useQuery({
    queryKey: queryKeys.range.sessions(companyId, date),
    queryFn: async () => {
      const day = date ?? new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("range_sessions")
        .select(
          "*, clients(nome, foto_facial), session_shots(id, disparos, weapons(id, numero_serie, marca, modelo, calibre))"
        )
        .eq("company_id", companyId)
        .gte("entrada_at", `${day}T00:00:00Z`)
        .lte("entrada_at", `${day}T23:59:59Z`)
        .order("entrada_at", { ascending: false });
      if (error) throw error;

      return (data ?? []).map((s) => ({
        id: s.id,
        client_id: s.client_id,
        clientName: (s.clients as { nome: string } | null)?.nome ?? "—",
        foto_facial: (s.clients as { foto_facial?: string } | null)?.foto_facial ?? null,
        entrada_at: s.entrada_at as string,
        saida_at: s.saida_at as string | null,
        status: s.status as "ativo" | "concluido",
        shots: ((s.session_shots as unknown[]) ?? []).map((sh) => {
          const shot = sh as { id: string; disparos: number; weapons: { id: string; numero_serie: string; marca: string; modelo: string; calibre: string } | null };
          return {
            weapon_id: shot.weapons?.id ?? "",
            weaponLabel: shot.weapons
              ? `${shot.weapons.marca} ${shot.weapons.modelo} ${shot.weapons.calibre} — ${shot.weapons.numero_serie}`
              : "—",
            disparos: shot.disparos,
          };
        }),
      })) as RangeSession[];
    },
    enabled: !!companyId,
    refetchInterval: 30_000,
  });
}

export function useRangeReport(companyId: string, from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.range.report(companyId, from, to),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("range_sessions")
        .select(
          "id, entrada_at, saida_at, status, clients(nome), session_shots(disparos, weapons(marca, modelo, calibre, numero_serie))"
        )
        .eq("company_id", companyId)
        .gte("entrada_at", `${from}T00:00:00Z`)
        .lte("entrada_at", `${to}T23:59:59Z`)
        .order("entrada_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId && !!from && !!to,
  });
}

export function useClientDescriptors(companyId: string) {
  return useQuery({
    queryKey: queryKeys.range.descriptors(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, nome, face_descriptor")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .not("face_descriptor", "is", null);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; nome: string; face_descriptor: number[] | null }>;
    },
    enabled: !!companyId,
    staleTime: 5 * 60_000,
  });
}

export function useStartSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ companyId, clientId }: { companyId: string; clientId: string }) => {
      const { data, error } = await supabase
        .from("range_sessions")
        .insert({ company_id: companyId, client_id: clientId, status: "ativo" })
        .select()
        .single();
      if (error) throw error;
      return data as { id: string; company_id: string };
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: queryKeys.range.scope(d.company_id) });
      toast.success("Entrada registrada!");
    },
    onError: (e) => toast.error((e as Error).message),
  });
}

export function useEndSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      companyId,
      shots,
    }: {
      sessionId: string;
      companyId: string;
      shots: Array<{ weapon_id: string; disparos: number }>;
    }) => {
      const { error: sessErr } = await supabase
        .from("range_sessions")
        .update({ saida_at: new Date().toISOString(), status: "concluido" })
        .eq("id", sessionId);
      if (sessErr) throw sessErr;

      if (shots.length > 0) {
        const { error: shotsErr } = await supabase.from("session_shots").insert(
          shots.map((s) => ({ session_id: sessionId, weapon_id: s.weapon_id, disparos: s.disparos }))
        );
        if (shotsErr) throw shotsErr;
      }
      return { sessionId, companyId };
    },
    onSuccess: ({ companyId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.range.scope(companyId) });
      toast.success("Saída registrada com sucesso!");
    },
    onError: (e) => toast.error((e as Error).message),
  });
}

export function useSaveClientFace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      companyId,
      clientId,
      file,
      descriptor,
    }: {
      companyId: string;
      clientId: string;
      file: File;
      descriptor: Float32Array;
    }) => {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${companyId}/faciais/${clientId}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("documentos")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;

      const { error } = await supabase
        .from("clients")
        .update({ foto_facial: path, face_descriptor: Array.from(descriptor) })
        .eq("id", clientId);
      if (error) throw error;
      return { companyId, clientId };
    },
    onSuccess: ({ companyId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.scope(companyId) });
      qc.invalidateQueries({ queryKey: queryKeys.range.descriptors(companyId) });
      toast.success("Foto facial cadastrada!");
    },
    onError: (e) => toast.error((e as Error).message),
  });
}
''')

print("=== Step 2: writing range page ===")

RANGE_TSX = r'''import { createFileRoute, useParams } from "@tanstack/react-router";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shell/StatusBadge";
import {
  LogIn, LogOut, Clock, Search, Loader2, Target, ScanFace,
  CheckCircle2, AlertTriangle, ChevronRight, Camera, X, BarChart3,
} from "lucide-react";
import { useState, useRef, useCallback } from "react";
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

function CameraPanel({
  mode,
  onDescriptor,
}: {
  mode: "entrada" | "saida";
  onDescriptor: (d: Float32Array) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [streamRef, setStreamRef] = useState<MediaStream | null>(null);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360, facingMode: "user" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setStreamRef(stream);
      setCameraOn(true);
    } catch {
      toast.error("Câmera não disponível. Use a busca manual.");
    }
  }

  function stopCamera() {
    streamRef?.getTracks().forEach((t) => t.stop());
    setStreamRef(null);
    setCameraOn(false);
  }

  async function identify() {
    if (!videoRef.current) return;
    setScanning(true);
    try {
      const descriptor = await getDescriptor(videoRef.current);
      if (!descriptor) {
        toast.error("Nenhuma face detectada. Olhe para a câmera.");
        return;
      }
      onDescriptor(descriptor);
    } catch (e) {
      toast.error("Erro no reconhecimento: " + (e as Error).message);
    } finally {
      setScanning(false);
    }
  }

  const color = mode === "entrada" ? "bg-emerald-500" : "bg-rose-500";
  const Icon = mode === "entrada" ? LogIn : LogOut;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold ${mode === "entrada" ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-700"}`}>
        <Icon className="h-4 w-4" />
        {mode === "entrada" ? "Identificação — Entrada" : "Identificação — Saída"}
      </div>

      <div className="p-4 space-y-3">
        <div className={`relative rounded-lg overflow-hidden bg-muted flex items-center justify-center ${cameraOn ? "" : "h-52"}`}>
          <video
            ref={videoRef}
            className={`w-full rounded-lg ${cameraOn ? "block" : "hidden"}`}
            autoPlay
            muted
            playsInline
          />
          {!cameraOn && (
            <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
              <Camera className="h-12 w-12 opacity-30" />
              <p className="text-sm">Câmera desligada</p>
              <Button size="sm" onClick={startCamera} className="mt-1">
                <Camera className="mr-1.5 h-3.5 w-3.5" /> Ativar câmera
              </Button>
            </div>
          )}
          {cameraOn && scanning && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="flex flex-col items-center gap-2 text-white">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm font-medium">Reconhecendo...</p>
              </div>
            </div>
          )}
          {cameraOn && (
            <button onClick={stopCamera} className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {cameraOn && (
          <Button className={`w-full gap-2 ${color} text-white hover:opacity-90`} onClick={identify} disabled={scanning}>
            <ScanFace className="h-4 w-4" />
            {scanning ? "Analisando..." : "Identificar por facial"}
          </Button>
        )}

        <p className="text-center text-[11px] text-muted-foreground">
          ou use a busca manual ao lado
        </p>
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
'''

write("src/routes/app.$companyId.range.tsx", RANGE_TSX)

print("=== Step 3: writing updated clients.tsx ===")

import urllib.request
# Read clients.tsx from local repo
clients_path = os.path.join(BASE, "src/routes/app.$companyId.clients.tsx")
with open(clients_path, encoding="utf-8") as f:
    clients = f.read()

# Update imports
import re
clients = re.sub(
    r'import \{[^}]+\} from "lucide-react";',
    'import { Plus, Search, Loader2, Download, FileText, Trash2, Eye, Upload, CheckCircle2, ShieldCheck, ScrollText, FileSignature, FolderOpen, Camera, ScanFace, X } from "lucide-react";',
    clients
)

# Add face imports after useSupabase import
if 'useSaveClientFace' not in clients:
    clients = clients.replace(
        'import { useClients, useCreateClient, useDeleteClient, useDocuments, useUploadDocument, useDocumentSignedUrl } from "@/hooks/useSupabase";',
        'import { useClients, useCreateClient, useDeleteClient, useDocuments, useUploadDocument, useDocumentSignedUrl, useSaveClientFace } from "@/hooks/useSupabase";\nimport { getDescriptor } from "@/lib/face-recognition";'
    )

# Replace NewClientDialog function entirely
OLD_WIZARD_START = 'function NewClientDialog({ open, onClose, companyId, onSave }: {'
OLD_WIZARD_END = '}\n}\n'  # end of file essentially
# Find the position
start_idx = clients.find(OLD_WIZARD_START)
if start_idx != -1:
    clients_before = clients[:start_idx]
    NEW_WIZARD = r'''function NewClientDialog({ open, onClose, companyId, onSave }: {
  open: boolean; onClose: () => void; companyId: string;
  onSave: (p: Record<string, string>) => Promise<{ id: string } | void>;
}) {
  const upload = useUploadDocument();
  const saveFace = useSaveClientFace();
  const [step, setStep] = useState<"dados" | "foto" | "documentos">("dados");
  const [createdClient, setCreatedClient] = useState<{ id: string; nome: string } | null>(null);
  const [form, setForm] = useState({ nome: "", cpf: "", cr: "", cr_validade: "", telefone: "", email: "", calibre_preferido: "" });
  const [saving, setSaving] = useState(false);
  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [streamRef, setStreamRef] = useState<MediaStream | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [savingFace, setSavingFace] = useState(false);

  function resetAndClose() {
    setStep("dados");
    setCreatedClient(null);
    setForm({ nome: "", cpf: "", cr: "", cr_validade: "", telefone: "", email: "", calibre_preferido: "" });
    setPendingDocs([]);
    stopCamera();
    setCapturedFile(null);
    setCapturedPreview(null);
    onClose();
  }

  function stopCamera() {
    streamRef?.getTracks().forEach((t) => t.stop());
    setStreamRef(null);
    setCameraOn(false);
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } });
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setStreamRef(stream);
      setCameraOn(true);
    } catch { toast.error("Câmera não disponível."); }
  }

  function capturePhoto() {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")!.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "facial.jpg", { type: "image/jpeg" });
      setCapturedFile(file);
      setCapturedPreview(URL.createObjectURL(blob));
      stopCamera();
    }, "image/jpeg", 0.9);
  }

  function selectPhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCapturedFile(file);
    setCapturedPreview(URL.createObjectURL(file));
  }

  async function saveFacePhoto() {
    if (!capturedFile || !createdClient?.id) { setStep("documentos"); return; }
    setSavingFace(true);
    try {
      const img = new Image();
      img.src = capturedPreview!;
      await new Promise((r) => { img.onload = r; });
      const descriptor = await getDescriptor(img).catch(() => null);
      await saveFace.mutateAsync({ companyId, clientId: createdClient.id, file: capturedFile, descriptor: descriptor ?? new Float32Array(128) });
      setStep("documentos");
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setSavingFace(false); }
  }

  async function submitDados(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome) { toast.error("Nome obrigatório."); return; }
    setSaving(true);
    try {
      const result = await onSave(form) as { id: string } | void;
      const clientId = (result as { id: string })?.id;
      setCreatedClient({ id: clientId ?? "", nome: form.nome });
      setStep("foto");
    } finally { setSaving(false); }
  }

  function setSlotFile(slotKey: SlotKey, file: File | null) {
    setPendingDocs((prev) => {
      const existing = prev.find((d) => d.slotKey === slotKey);
      const preview = file?.type.startsWith("image/") ? URL.createObjectURL(file!) : null;
      const nome = file?.name.replace(/\.[^.]+$/, "") ?? "";
      if (existing) return prev.map((d) => d.slotKey === slotKey ? { ...d, file, preview, nome: d.nome || nome } : d);
      return [...prev, { slotKey, file, nome, vencimento: "", preview }];
    });
  }

  function updateSlot(slotKey: SlotKey, field: "nome" | "vencimento", value: string) {
    setPendingDocs((prev) => prev.map((d) => d.slotKey === slotKey ? { ...d, [field]: value } : d));
  }

  function removeSlot(slotKey: SlotKey) {
    setPendingDocs((prev) => prev.filter((d) => d.slotKey !== slotKey));
  }

  async function finishWithDocs() {
    const toUpload = pendingDocs.filter((d) => d.file);
    if (toUpload.length === 0) { resetAndClose(); return; }
    for (const d of toUpload) {
      if (!d.vencimento) { toast.error(`Informe o vencimento de ${d.slotKey.toUpperCase()}.`); return; }
    }
    if (!createdClient?.id) { resetAndClose(); return; }
    setUploadingDocs(true);
    try {
      for (const d of toUpload) {
        await upload.mutateAsync({
          companyId, file: d.file!, nome: d.nome || d.slotKey.toUpperCase(),
          tipo: d.slotKey, emissao: new Date().toISOString().slice(0, 10),
          vencimento: d.vencimento, clientId: createdClient.id,
        });
      }
      toast.success(`${toUpload.length} documento(s) anexado(s)!`);
      resetAndClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setUploadingDocs(false); }
  }

  const fields = [
    { key: "nome", label: "Nome completo *", placeholder: "Ricardo S. Almeida", span: true },
    { key: "cpf", label: "CPF", placeholder: "154.***.**9-22" },
    { key: "cr", label: "CR", placeholder: "SP-154329" },
    { key: "cr_validade", label: "Validade do CR", placeholder: "", type: "date" },
    { key: "telefone", label: "Telefone", placeholder: "(11) 98421-3320" },
    { key: "email", label: "E-mail", placeholder: "ricardo@cac.br" },
    { key: "calibre_preferido", label: "Calibre principal", placeholder: "9mm" },
  ];

  const STEPS = ["dados", "foto", "documentos"] as const;

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-1">
          {STEPS.map((s, i) => {
            const past = STEPS.indexOf(step) > i;
            const active = step === s;
            return (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className={`h-px w-8 ${STEPS.indexOf(step) >= i ? "bg-foreground" : "bg-border"}`} />}
                <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${active ? "bg-foreground text-background" : past ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                  {past ? <CheckCircle2 className="h-3 w-3" /> : <span>{i + 1}</span>}
                  {s === "dados" ? "Dados" : s === "foto" ? "Foto facial" : "Documentos"}
                </div>
              </div>
            );
          })}
        </div>

        <DialogHeader>
          <DialogTitle>
            {step === "dados" ? "Novo atirador" : step === "foto" ? `Foto facial — ${createdClient?.nome ?? ""}` : `Documentos — ${createdClient?.nome ?? ""}`}
          </DialogTitle>
        </DialogHeader>

        {step === "dados" && (
          <form onSubmit={submitDados} className="grid gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className={f.span ? "sm:col-span-2" : ""}>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{f.label}</label>
                <input type={f.type ?? "text"} placeholder={f.placeholder} value={(form as Record<string, string>)[f.key]}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-foreground/60" />
              </div>
            ))}
            <div className="sm:col-span-2 flex justify-end gap-2 border-t pt-3">
              <Button type="button" variant="outline" size="sm" onClick={resetAndClose}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />Salvando...</> : "Próximo → Foto facial"}
              </Button>
            </div>
          </form>
        )}

        {step === "foto" && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              A foto facial é usada para reconhecimento automático na entrada e saída da pista.
              Você pode pular esta etapa e cadastrar depois.
            </p>
            {capturedPreview ? (
              <div className="relative">
                <img src={capturedPreview} alt="Foto facial" className="w-full max-h-64 rounded-xl object-cover" />
                <button onClick={() => { setCapturedFile(null); setCapturedPreview(null); }}
                  className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : cameraOn ? (
              <div className="relative">
                <video ref={videoRef} className="w-full rounded-xl" autoPlay muted playsInline />
                <div className="absolute inset-0 flex items-end justify-center pb-4 gap-2">
                  <Button size="sm" onClick={capturePhoto} className="bg-white text-black hover:bg-white/90 shadow-lg">
                    <Camera className="mr-1.5 h-3.5 w-3.5" /> Capturar
                  </Button>
                  <Button size="sm" variant="outline" onClick={stopCamera} className="bg-black/40 text-white border-white/30 hover:bg-black/60">
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed py-10 text-muted-foreground">
                <ScanFace className="h-12 w-12 opacity-30" />
                <p className="text-sm">Nenhuma foto capturada</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={startCamera}>
                    <Camera className="mr-1.5 h-3.5 w-3.5" /> Usar câmera
                  </Button>
                  <label>
                    <span className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-muted transition-colors">
                      <Upload className="h-3 w-3" /> Enviar foto
                    </span>
                    <input type="file" accept="image/*" className="sr-only" onChange={selectPhotoFile} />
                  </label>
                </div>
              </div>
            )}
            <div className="flex justify-between gap-2 border-t pt-3">
              <Button type="button" variant="ghost" size="sm" className="text-muted-foreground"
                onClick={() => { stopCamera(); setStep("documentos"); }}>
                Pular — fazer depois
              </Button>
              <Button size="sm" onClick={saveFacePhoto} disabled={savingFace || !capturedFile}>
                {savingFace ? <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />Salvando...</> : "Salvar foto → Documentos"}
              </Button>
            </div>
          </div>
        )}

        {step === "documentos" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Adicione os documentos agora ou clique em "Concluir" para fazer depois.
            </p>
            {DOC_SLOTS.map((slot) => {
              const Icon = slot.icon;
              const pending = pendingDocs.find((d) => d.slotKey === slot.key);
              const hasFile = !!pending?.file;
              return (
                <div key={slot.key} className={`rounded-xl border overflow-hidden transition-colors ${hasFile ? "border-foreground/20 bg-muted/20" : "bg-card"}`}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className={`grid size-9 shrink-0 place-items-center rounded-lg ${slot.bg}`}>
                      <Icon className={`h-4 w-4 ${slot.color}`} strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{slot.label}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{slot.desc}</p>
                    </div>
                    {hasFile ? (
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7" onClick={() => removeSlot(slot.key)}>remover</Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <span className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                          <Upload className="h-3 w-3" /> Anexar
                        </span>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) setSlotFile(slot.key, f); }} />
                      </label>
                    )}
                  </div>
                  {hasFile && (
                    <div className="border-t px-4 pb-3 pt-2 grid grid-cols-2 gap-3">
                      {pending?.preview && (
                        <div className="col-span-2"><img src={pending.preview} alt="preview" className="max-h-20 rounded object-contain" /></div>
                      )}
                      <div className="col-span-2">
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nome do arquivo</label>
                        <input value={pending?.nome ?? ""} onChange={(e) => updateSlot(slot.key, "nome", e.target.value)}
                          placeholder={`${slot.label} — ${createdClient?.nome ?? ""}`}
                          className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Vencimento *</label>
                        <input type="date" value={pending?.vencimento ?? ""} onChange={(e) => updateSlot(slot.key, "vencimento", e.target.value)}
                          className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none" />
                      </div>
                      <div className="flex items-end">
                        <p className="text-[10px] text-muted-foreground">{pending?.file?.name}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="flex justify-between gap-2 border-t pt-3">
              <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={resetAndClose}>
                Pular — fazer depois
              </Button>
              <Button size="sm" onClick={finishWithDocs} disabled={uploadingDocs}>
                {uploadingDocs ? <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />Enviando...</> :
                  pendingDocs.filter((d) => d.file).length > 0
                    ? `Salvar ${pendingDocs.filter((d) => d.file).length} documento(s) e concluir`
                    : "Concluir cadastro"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
'''
    clients = clients_before + NEW_WIZARD
    print("  replaced NewClientDialog wizard")
else:
    print("  WARN: NewClientDialog not found, skipping")

write("src/routes/app.$companyId.clients.tsx", clients)

print("=== Step 4: patching existing files ===")

replace_in("src/lib/query-keys.ts",
    "  admin: {",
    """  range: {
    sessions: (companyId: string, date?: string) =>
      ["range-sessions", companyId, date ?? "today"] as const,
    scope: (companyId: string) => ["range-sessions", companyId] as const,
    descriptors: (companyId: string) => ["face-descriptors", companyId] as const,
    activeSession: (companyId: string, clientId?: string) =>
      ["active-session", companyId, clientId ?? ""] as const,
    report: (companyId: string, from: string, to: string) =>
      ["range-report", companyId, from, to] as const,
  },
  admin: {"""
)

replace_in("src/hooks/useSupabase.ts",
    'export * from "./queries/admin";',
    'export * from "./queries/admin";\nexport * from "./queries/range";'
)

replace_in("src/routes/app.$companyId.tsx",
    'import {\n  LayoutDashboard, Users, Crosshair, Package, FileText,\n  CalendarDays, Wallet, UserCog, CreditCard, ArrowLeftRight,\n} from "lucide-react";',
    'import {\n  LayoutDashboard, Users, Crosshair, Package, FileText,\n  CalendarDays, Wallet, UserCog, CreditCard, ArrowLeftRight, ScanFace,\n} from "lucide-react";'
)

replace_in("src/routes/app.$companyId.tsx",
    '        { title: "Munições", url: `${base}/ammo`, icon: Package },\n      ],\n    },\n    {\n      label: "Gestão",',
    '        { title: "Munições", url: `${base}/ammo`, icon: Package },\n        { title: "Pista", url: `${base}/range`, icon: ScanFace },\n      ],\n    },\n    {\n      label: "Gestão",'
)

# patch package.json
pkg_path = os.path.join(BASE, "package.json")
with open(pkg_path, encoding="utf-8") as f:
    pkg = f.read()
if "@vladmandic/face-api" not in pkg:
    pkg = pkg.replace(
        '"@hookform/resolvers"',
        '"@vladmandic/face-api": "^1.7.14",\n    "@hookform/resolvers"'
    )
    with open(pkg_path, "w", encoding="utf-8") as f:
        f.write(pkg)
    print("  patched package.json")
else:
    print("  package.json already has @vladmandic/face-api")

print("\n=== Step 5: npm install ===")
subprocess.run(["npm", "install", "--legacy-peer-deps"], cwd=BASE, check=True)

print("\n=== Step 6: git commit & push ===")
subprocess.run(["git", "add", "-A"], cwd=BASE, check=True)
subprocess.run(["git", "commit", "-m", "feat: facial recognition + range control (Pista) module\n\nEntry/exit with webcam face scan, shot logging per weapon,\ndaily history, admin report. New client wizard adds facial\nphoto step (camera or upload). @vladmandic/face-api models\nloaded from CDN. SQL migration required (see conversation)."], cwd=BASE, check=True)
subprocess.run(["git", "push", "-u", "origin", "claude/saas-evaluation-gaps-gqhbgj"], cwd=BASE, check=True)

print("\n✅ Concluído! Vercel vai fazer deploy automaticamente.")
print("\nLembre-se de rodar o SQL de migração no Supabase (SQL Editor).")
