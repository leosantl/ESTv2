import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "StandControl — Entrar" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const { resetPassword } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (forgotMode) {
        await resetPassword(email);
        toast.success("E-mail de recuperação enviado!");
        setForgotMode(false);
      } else {
        await signIn(email, password);
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error((err as Error).message || "Credenciais inválidas.");
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
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Autenticação</p>
          <h1 className="text-2xl font-semibold tracking-tight">{forgotMode ? "Recuperar senha" : "Entrar na plataforma"}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {forgotMode ? "Informe seu e-mail para receber o link de redefinição." : "Use suas credenciais corporativas para continuar."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">E-mail corporativo</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="h-10 w-full rounded-md border bg-card pl-9 pr-3 text-sm font-mono outline-none transition-colors focus:border-foreground/60" />
              </div>
            </div>

            {!forgotMode && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Senha</label>
                  <button type="button" onClick={() => setForgotMode(true)} className="text-[11px] font-semibold text-foreground hover:underline">
                    Esqueci minha senha
                  </button>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input type={showPwd ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                    className="h-10 w-full rounded-md border bg-card pl-9 pr-10 text-sm font-mono outline-none transition-colors focus:border-foreground/60" />
                  <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-muted">
                    {showPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="group inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-accent text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60">
              {loading ? "Aguarde..." : forgotMode ? "Enviar link" : "Entrar"}
              {!loading && <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />}
            </button>

            {forgotMode && (
              <button type="button" onClick={() => setForgotMode(false)} className="w-full text-center text-xs text-muted-foreground hover:underline">
                ← Voltar ao login
              </button>
            )}

            {!forgotMode && (
              <>
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center"><span className="bg-background px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">ou</span></div>
                </div>
                <button type="button" className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border bg-card text-sm font-semibold transition-colors hover:bg-muted">
                  <ShieldCheck className="h-3.5 w-3.5" /> SSO corporativo (SAML)
                </button>
              </>
            )}
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Novo na plataforma?{" "}
            <Link to="/onboarding" className="font-semibold text-foreground hover:underline">Cadastrar empresa</Link>
          </p>
          <p className="mt-3 text-center text-xs text-muted-foreground">É associado de um clube? <Link to="/portal/login" className="font-semibold text-foreground hover:underline">Acessar Portal do Atirador →</Link></p>
        </div>

        <p className="mt-auto text-[11px] text-muted-foreground">© 2026 StandControl · Termos · Privacidade · Status</p>
      </div>

      <div className="relative hidden overflow-hidden bg-accent text-accent-foreground lg:block">
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] opacity-70">
            <span className="size-1.5 rounded-full bg-emerald-400" /> Sistema operacional · v4.18.2
          </div>
          <div className="max-w-md">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-60">Precision Executive</p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-tight">Operação CAC sob controle absoluto.</h2>
            <p className="mt-3 text-sm leading-relaxed opacity-70">Clientes, acervo, documentos, agenda e financeiro — em uma única plataforma auditável e em conformidade com o R-105 do Exército.</p>
            <dl className="mt-8 grid grid-cols-3 gap-6 border-t border-white/10 pt-6">
              {[{ k: "Clubes ativos", v: "428" }, { k: "Atiradores", v: "92.4k" }, { k: "Uptime", v: "99.99%" }].map((s) => (
                <div key={s.k}>
                  <dd className="font-mono text-2xl font-semibold tabular-nums">{s.v}</dd>
                  <dt className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] opacity-60">{s.k}</dt>
                </div>
              ))}
            </dl>
          </div>
          <p className="text-[11px] opacity-50">SOC 2 · LGPD · ISO 27001 — controles auditados</p>
        </div>
      </div>
    </div>
  );
}
