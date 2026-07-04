import os, subprocess

BASE = os.path.expanduser("~/Downloads/ESTv2")
path = os.path.join(BASE, "src/routes/app.$companyId.range.tsx")

# --- Parte 1: face-recognition.ts — reduzir inputSize para 160 ---
facelib_path = os.path.join(BASE, "src/lib/face-recognition.ts")
with open(facelib_path, encoding="utf-8") as f:
    fl = f.read()
if "inputSize: 320" in fl:
    fl = fl.replace("inputSize: 320", "inputSize: 160")
    with open(facelib_path, "w", encoding="utf-8") as f:
        f.write(fl)
    print("face-recognition.ts: inputSize reduzido para 160.")
else:
    print("face-recognition.ts: inputSize 320 nao encontrado (ok se ja alterado).")

# --- Parte 2: range.tsx ---
with open(path, encoding="utf-8") as f:
    c = f.read()

# Fix React import to add useEffect
old_import = 'import { useState, useRef, useCallback } from "react";'
new_import = 'import { useState, useRef, useCallback, useEffect } from "react";'
if old_import in c:
    c = c.replace(old_import, new_import)
    print("Import atualizado.")
elif new_import in c:
    print("Import ja tem useEffect.")
else:
    print("WARN: import nao encontrado, verifique manualmente.")

# Locate CameraPanel function start
START_MARKERS = [
    "/* --- CameraPanel --- */\nfunction CameraPanel({",
    "/* --- CameraPanel ---*/\nfunction CameraPanel({",
    "/* ─── CameraPanel ─── */\nfunction CameraPanel({",
    "function CameraPanel({",
]
idx_start = -1
for marker in START_MARKERS:
    idx = c.find(marker)
    if idx != -1:
        idx_start = idx
        print(f"CameraPanel encontrado com marcador: {repr(marker[:40])}")
        break

if idx_start == -1:
    print("ERRO: CameraPanel nao encontrado no arquivo.")
    exit(1)

# Find next top-level function after CameraPanel
NEXT_MARKERS = [
    "\n/* ─── EntradaCard",
    "\n/* --- EntradaCard",
    "\nfunction EntradaCard(",
]
idx_next = -1
for marker in NEXT_MARKERS:
    idx = c.find(marker, idx_start + 100)
    if idx != -1:
        idx_next = idx
        print(f"Proximo marcador encontrado: {repr(marker[:40])}")
        break

if idx_next == -1:
    print("ERRO: nao encontrou o fim do CameraPanel.")
    exit(1)

NEW_CAMERA = '''/* ─── CameraPanel ─── */
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
        intervalRef.current = setInterval(autoScan, 600);
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

'''

c = c[:idx_start] + NEW_CAMERA + c[idx_next:]

with open(path, "w", encoding="utf-8") as f:
    f.write(c)
print("CameraPanel auto-scan aplicado com sucesso!")

result = subprocess.run(["git", "diff", "--stat"], cwd=BASE, capture_output=True, text=True)
print(result.stdout)

subprocess.run(["git", "add", "src/routes/app.$companyId.range.tsx", "src/lib/face-recognition.ts"], cwd=BASE)
r = subprocess.run(["git", "commit", "-m", "perf: face scan every 600ms + inputSize 160 for faster detection"], cwd=BASE, capture_output=True, text=True)
print(r.stdout or r.stderr)

r2 = subprocess.run(["git", "push", "-u", "origin", "claude/saas-evaluation-gaps-gqhbgj"], cwd=BASE, capture_output=True, text=True)
print(r2.stdout or r2.stderr)
if r2.returncode == 0:
    print("Pronto! Deploy em 1-2 min.")
else:
    print("Push falhou:", r2.stderr)
