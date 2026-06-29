import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowRight, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "StandControl — Redefinir senha" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [validSession, setValidSession] = useState(false);

  useEffect(() => {
    // Supabase handles the recovery token from the URL hash automatically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setValidSession(true);
      }
      setReady(true);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setValidSession(true);
      setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { toast.error("A senha deve ter ao menos 8 caracteres."); return; }
    if (password !== confirmPassword) { toast.error("As senhas não coincidem."); return; }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha redefinida com sucesso!");
      navigate({ to: "/login" });
    } catch (err) {
      toast.error((err as Error).message || "Não foi possível redefinir a senha.");
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
            <ShieldCheck className="h-3.5 w-3.5" /> Redefinição de senha
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Nova senha</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {!ready
              ? "Validando link..."
              : validSession
              ? "Escolha uma nova senha segura para sua conta."
              : "Link inválido ou expirado. Solicite um novo na tela de login."}
          </p>

          {ready && validSession ? (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Nova senha <span className="font-normal normal-case">(mín. 8 caracteres)</span>
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPwd ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 w-full rounded-md border bg-card pl-9 pr-10 text-sm font-mono outline-none transition-colors focus:border-foreground/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-muted"
                  >
                    {showPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Confirmar nova senha
                </label>
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-10 w-full rounded-md border bg-card px-3 text-sm font-mono outline-none transition-colors focus:border-foreground/60"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="group inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-accent text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Salvando..." : "Redefinir senha"}
                {!loading && <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />}
              </button>
            </form>
          ) : ready && !validSession ? (
            <div className="mt-8">
              <Link
                to="/login"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-accent text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
              >
                Voltar ao login
              </Link>
            </div>
          ) : (
            <div className="mt-8 h-24 animate-pulse rounded-md bg-muted" />
          )}
        </div>

        <p className="mt-auto text-[11px] text-muted-foreground">© 2026 StandControl · Termos · Privacidade · Status</p>
      </div>

      <div className="relative hidden overflow-hidden bg-accent text-accent-foreground lg:block">
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="relative flex h-full flex-col justify-center p-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-60">Segurança</p>
          <h2 className="mt-2 max-w-md text-3xl font-semibold leading-tight tracking-tight">Sua senha é protegida com criptografia.</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed opacity-70">Use uma senha forte com letras, números e símbolos. Nunca compartilhe suas credenciais com terceiros.</p>
        </div>
      </div>
    </div>
  );
}
