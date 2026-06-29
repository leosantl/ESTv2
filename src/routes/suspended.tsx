import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShieldAlert, CreditCard, LogOut, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/suspended")({
  head: () => ({ meta: [{ title: "Acesso suspenso · StandControl" }] }),
  component: SuspendedPage,
});

function SuspendedPage() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-destructive/10">
          <ShieldAlert className="h-7 w-7 text-destructive" strokeWidth={1.75} />
        </div>
        <h1 className="mt-5 text-xl font-semibold tracking-tight">Acesso temporariamente suspenso</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A assinatura da sua empresa está com pendência financeira ou foi cancelada. Regularize o pagamento para restaurar o acesso completo à plataforma.
        </p>

        <div className="mt-6 space-y-2">
          {profile?.company_id && (
            <Link to="/app/$companyId/billing" params={{ companyId: profile.company_id }}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-accent text-sm font-semibold text-accent-foreground hover:opacity-90">
              <CreditCard className="h-3.5 w-3.5" /> Ver faturas e regularizar
            </Link>
          )}
          <a href="mailto:suporte@standcontrol.com.br" className="flex h-10 w-full items-center justify-center gap-2 rounded-md border text-sm font-semibold hover:bg-muted">
            <MessageCircle className="h-3.5 w-3.5" /> Falar com o suporte
          </a>
          <button onClick={() => signOut().then(() => navigate({ to: "/login" }))}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md text-sm font-semibold text-muted-foreground hover:bg-muted">
            <LogOut className="h-3.5 w-3.5" /> Sair da conta
          </button>
        </div>

        <p className="mt-6 text-[11px] text-muted-foreground">
          Se você acredita que isso é um erro, contate o administrador da sua empresa ou nosso suporte.
        </p>
      </div>
    </div>
  );
}
