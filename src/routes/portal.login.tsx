import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Lock, Mail, Target } from "lucide-react";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/login")({
  head: () => ({ meta: [{ title: "Portal do Atirador — Entrar" }] }),
  component: PortalLoginPage,
});

function PortalLoginPage() {
  const navigate = useNavigate();
  const { signIn, setNewPassword, user } = usePortalAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newPasswordMode, setNewPasswordMode] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  const isRecovery = typeof window !== "undefined" &&
    window.location.hash.includes("type=recovery");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      navigate({ to: "/portal/dashboard" });
    } catch (err) {
      toast.error((err as Error).message || "Credenciais inválidas.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd !== confirmPwd) { toast.error("Senhas não coincidem."); return; }
    if (newPwd.length < 8) { toast.error("Senha deve ter ao menos 8 caracteres."); return; }
    setLoading(true);
    try {
      await setNewPassword(newPwd);
      toast.success("Senha definida! Você já pode entrar.");
      setNewPasswordMode(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const showSetPwd = newPasswordMode || isRecovery;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-10">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded bg-accent text-[10px] font-bold tracking-tighter text-accent-foreground">PA</div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">StandControl</p>
            <p className="text-sm font-semibold leading-tight">Portal do Atirador</p>
          </div>
        </div>

        <div className="mx-auto my-auto w-full max-w-sm py-12">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {showSetPwd ? "Primeiro acesso" : "Autenticação"}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {showSetPwd ? "Defina sua senha" : "Acessar meu portal"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {showSetPwd
              ? "Crie uma senha segura para acessar seu portal."
              : "Use o e-mail e a senha enviados pelo seu clube."}
          </p>

          {showSetPwd ? (
            <form onSubmit={handleSetPassword} className="mt-8 space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nova senha</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input type={showPwd ? "text" : "password"} required minLength={8}
                    value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
                    className="h-10 w-full rounded-md border bg-card pl-9 pr-10 text-sm font-mono outline-none transition-colors focus:border-foreground/60" />
                  <button type="button" onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-muted">
                    {showPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Confirmar senha</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input type="password" required minLength={8}
                    value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)}
                    className="h-10 w-full rounded-md border bg-card pl-9 pr-3 text-sm font-mono outline-none transition-colors focus:border-foreground/60" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="group inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-accent text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60">
                {loading ? "Salvando..." : "Salvar senha"}
                {!loading && <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="mt-8 space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">E-mail</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="h-10 w-full rounded-md border bg-card pl-9 pr-3 text-sm font-mono outline-none transition-colors focus:border-foreground/60" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Senha</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input type={showPwd ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                    className="h-10 w-full rounded-md border bg-card pl-9 pr-10 text-sm font-mono outline-none transition-colors focus:border-foreground/60" />
                  <button type="button" onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-muted">
                    {showPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="group inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-accent text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60">
                {loading ? "Aguarde..." : "Entrar"}
                {!loading && <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />}
              </button>
              <button type="button" onClick={() => setNewPasswordMode(true)}
                className="w-full text-center text-xs text-muted-foreground hover:underline">
                Primeiro acesso / Esqueci minha senha
              </button>
            </form>
          )}
        </div>

        <p className="mt-auto text-[11px] text-muted-foreground">© 2026 StandControl · Portal do Atirador</p>
      </div>

      <div className="relative hidden overflow-hidden bg-accent text-accent-foreground lg:block">
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] opacity-70">
            <Target className="h-3.5 w-3.5" /> Portal do Atirador
          </div>
          <div className="max-w-md">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-60">Seu espaço pessoal</p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-tight">Seus documentos e agenda, sempre à mão.</h2>
            <p className="mt-3 text-sm leading-relaxed opacity-70">Acesse seus documentos, confira sua agenda de treinos e mantenha seus dados atualizados — diretamente pelo portal do seu clube.</p>
            <dl className="mt-8 grid grid-cols-3 gap-6 border-t border-white/10 pt-6">
              {[{ k: "Documentos", v: "Seguros" }, { k: "Agenda", v: "Online" }, { k: "Acesso", v: "24h" }].map((s) => (
                <div key={s.k}>
                  <dd className="font-mono text-2xl font-semibold tabular-nums">{s.v}</dd>
                  <dt className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] opacity-60">{s.k}</dt>
                </div>
              ))}
            </dl>
          </div>
          <p className="text-[11px] opacity-50">LGPD · Dados protegidos · Acesso restrito ao titular</p>
        </div>
      </div>
    </div>
  );
}
