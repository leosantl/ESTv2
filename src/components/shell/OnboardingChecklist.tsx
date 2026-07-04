import { useState, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X, Users, Shield, CalendarDays, UserPlus, DollarSign, Sparkles } from "lucide-react";

type Step = { id: string; icon: React.ElementType; title: string; description: string; href: string; cta: string; };
const STEPS: Step[] = [
  { id: "welcome", icon: Sparkles, title: "Bem-vindo ao StandControl", description: "Sua plataforma está configurada e pronta para usar.", href: "#", cta: "Início" },
  { id: "first_client", icon: Users, title: "Cadastrar primeiro atirador", description: "Registre um atirador com CR, calibre e documentação.", href: "clients", cta: "Ir para Atiradores" },
  { id: "first_weapon", icon: Shield, title: "Registrar primeira arma", description: "Adicione uma arma ao acervo com número de série e calibre.", href: "weapons", cta: "Ir para Acervo" },
  { id: "first_schedule", icon: CalendarDays, title: "Criar primeiro agendamento", description: "Agende uma sessão de tiro ou aula com um instrutor.", href: "schedule", cta: "Ir para Agenda" },
  { id: "invite_team", icon: UserPlus, title: "Convidar membro da equipe", description: "Convide instrutores, operadores ou gestores para a plataforma.", href: "users", cta: "Gerenciar Equipe" },
  { id: "explore_finance", icon: DollarSign, title: "Explorar financeiro", description: "Configure mensalidades, receitas e relatórios financeiros.", href: "finance", cta: "Ver Financeiro" },
];

type CompletionMap = Record<string, boolean>;
function storageKey(companyId: string) { return `sc_onboarding_${companyId}`; }
function loadState(companyId: string): { completion: CompletionMap; dismissed: boolean; collapsed: boolean } {
  try { const raw = localStorage.getItem(storageKey(companyId)); if (raw) return JSON.parse(raw); } catch {}
  return { completion: { welcome: true }, dismissed: false, collapsed: false };
}
function saveState(companyId: string, state: { completion: CompletionMap; dismissed: boolean; collapsed: boolean }) {
  try { localStorage.setItem(storageKey(companyId), JSON.stringify(state)); } catch {}
}

type Props = { companyId: string; kpis?: { clients?: { total?: number }; weapons?: { total?: number }; schedules?: { hoje?: number; semana?: number }; } | null; userCount?: number; };

export function OnboardingChecklist({ companyId, kpis, userCount = 1 }: Props) {
  const [state, setState] = useState(() => loadState(companyId));
  const derived: CompletionMap = {
    welcome: true,
    first_client: (kpis?.clients?.total ?? 0) > 0,
    first_weapon: (kpis?.weapons?.total ?? 0) > 0,
    first_schedule: (kpis?.schedules?.hoje ?? 0) > 0 || (kpis?.schedules?.semana ?? 0) > 0,
    invite_team: userCount > 1 || (state.completion.invite_team ?? false),
    explore_finance: state.completion.explore_finance ?? false,
  };
  const completion = { ...state.completion, ...derived };
  const doneCount = STEPS.filter((s) => completion[s.id]).length;
  const allDone = doneCount === STEPS.length;
  const persist = useCallback((patch: Partial<typeof state>) => {
    const next = { ...state, ...patch }; setState(next); saveState(companyId, next);
  }, [companyId, state]);
  function markDone(id: string) { persist({ completion: { ...state.completion, [id]: true } }); }
  useEffect(() => {
    const needsUpdate = Object.entries(derived).some(([k, v]) => v && !state.completion[k]);
    if (needsUpdate) persist({ completion: { ...state.completion, ...derived } });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kpis, userCount]);
  if (state.dismissed || allDone) return null;
  const pct = Math.round((doneCount / STEPS.length) * 100);
  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground"><Sparkles className="h-4 w-4" /></div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-none">Configuração inicial <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">{doneCount}/{STEPS.length}</span></p>
            <div className="mt-1.5 h-1.5 w-40 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-foreground transition-all duration-500" style={{ width: `${pct}%` }} /></div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => persist({ collapsed: !state.collapsed })} className="grid size-7 place-items-center rounded-md hover:bg-muted text-muted-foreground">{state.collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}</button>
          <button onClick={() => persist({ dismissed: true })} className="grid size-7 place-items-center rounded-md hover:bg-muted text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      {!state.collapsed && (
        <ul className="border-t divide-y">
          {STEPS.map((step) => {
            const done = completion[step.id] ?? false;
            const Icon = step.icon;
            return (
              <li key={step.id} className={`flex items-start gap-3 p-3.5 transition-colors ${done ? "opacity-60" : ""}`}>
                <div className="mt-0.5 shrink-0 text-muted-foreground">{done ? <CheckCircle2 style={{ width: 18, height: 18 }} className="text-foreground" /> : <Circle style={{ width: 18, height: 18 }} />}</div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold leading-snug ${done ? "line-through" : ""}`}>{step.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{step.description}</p>
                </div>
                {!done && step.href !== "#" && (
                  <Link to={`/app/$companyId/${step.href}`} params={{ companyId }} onClick={() => markDone(step.id)} className="shrink-0 inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2.5 text-[11px] font-semibold hover:bg-muted whitespace-nowrap">{step.cta} →</Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
