import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowRight, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/invite")({
  head: () => ({ meta: [{ title: "StandControl — Definir senha" }] }),
  component: InvitePage,
});

function InvitePage() {
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setEmail(session.user.email ?? null);
      setReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setEmail(session.user.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { toast.error("A senha deve ter ao menos 6 caracteres."); return; }
    if (password !== confirmPassword) { toast.error("As senhas não coincidem."); return; }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha definida com sucesso! Bem-vindo ao StandControl.");
      navigate({ to: "/" });
    } catch (err) {
      toast.error((err as Error).message || "Não foi possível definir a senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-10">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded bg-accent text-[10px] font-bold tracking-tighter text-accent-foreground">SC</div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">StandControl</p>
            <p className="text-sm font-semibold leading-tight">Plataforma CAC</p>
          </div>
        </Link>

        <div className="mx-auto my-auto w-full max-w-sm py-12">
          <div className="mb-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Convite de acesso
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Defina sua senha</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {ready
              ? email ? `Você foi convidado com o e-mail ${email}. Escolha uma senha para ativar sua conta.` : "Escolha uma senha para ativar sua conta."
              : "Validando convite..."}
          </p>

          {ready ? (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nova senha</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input type={showPwd ? "text" : "password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                    className="h-10 w-full rounded-md border bg-card pl-9 pr-10 text-sm font-mono outline-none transition-colors focus:border-foreground/60" />
                  <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-muted">
                    {showPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Confirmar senha</label>
                <input type={showPwd ? "text" : "password"} required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-10 w-full rounded-md border bg-card px-3 text-sm font-mono outline-none transition-colors focus:border-foreground/60" />
              </div>
              <button type="submit" disabled={loading}
                className="group inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-accent text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60">
                {loading ? "Ativando conta..." : "Ativar conta"}
                {!loading && <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />}
              </button>
            </form>
          ) : (
            <div className="mt-8 h-24 animate-pulse rounded-md bg-muted" />
          )}
        </div>

        <p className="mt-auto text-[11px] text-muted-foreground">© 2026 StandControl · Termos · Privacidade · Status</p>
      </div>

      <div className="relative hidden overflow-hidden bg-accent text-accent-foreground lg:block">
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="relative flex h-full flex-col justify-center p-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-60">Bem-vindo</p>
          <h2 className="mt-2 max-w-md text-3xl font-semibold leading-tight tracking-tight">Sua conta está quase pronta.</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed opacity-70">Defina sua senha para acessar imediatamente o workspace da sua organização, com todas as permissões já configuradas pelo administrador.</p>
        </div>
      </div>
    </div>
  );
}
