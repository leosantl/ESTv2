import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft, ArrowRight, Building2, Check, CreditCard, FileBadge2, Sparkles, Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "StandControl — Cadastrar empresa" }] }),
  component: OnboardingPage,
});

const steps = [
  { id: 1, label: "Empresa", icon: Building2 },
  { id: 2, label: "Operação CAC", icon: FileBadge2 },
  { id: 3, label: "Equipe", icon: Users },
  { id: 4, label: "Plano", icon: CreditCard },
  { id: 5, label: "Concluído", icon: Sparkles },
];

type CompanyForm = {
  razaoSocial: string; nomeFantasia: string; cnpj: string;
  tipo: string; cidade: string; email: string; telefone: string;
};
type TeamMember = { email: string; nome: string; role: string };

function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState<"starter" | "professional" | "enterprise">("professional");
  const [companyForm, setCompanyForm] = useState<CompanyForm>({
    razaoSocial: "", nomeFantasia: "", cnpj: "", tipo: "Clube", cidade: "", email: "", telefone: "",
  });
  const [adminPassword, setAdminPassword] = useState("");
  const [team, setTeam] = useState<TeamMember[]>([{ email: "", nome: "", role: "instrutor" }]);
  const [submitting, setSubmitting] = useState(false);
  const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(null);
  const navigate = useNavigate();

  async function finalizeSignup() {
    if (!companyForm.razaoSocial || !companyForm.nomeFantasia || !companyForm.email || !adminPassword) {
      toast.error("Preencha os dados da empresa e a senha do administrador.");
      setStep(1);
      return;
    }
    if (adminPassword.length < 8) {
      toast.error("A senha do administrador deve ter ao menos 8 caracteres.");
      setStep(1);
      return;
    }
    setSubmitting(true);
    try {
      const initials = companyForm.nomeFantasia.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

      const { data: companyId, error: companyErr } = await supabase.rpc("create_company_onboarding", {
        p_razao_social: companyForm.razaoSocial,
        p_nome_fantasia: companyForm.nomeFantasia,
        p_cnpj: companyForm.cnpj || "",
        p_email: companyForm.email,
        p_telefone: companyForm.telefone || "",
        p_cidade: companyForm.cidade || "",
        p_tipo: companyForm.tipo,
        p_logo_initials: initials || "??",
        p_plan_id: plan,
      });

      if (companyErr) throw companyErr;
      setCreatedCompanyId(companyId as string);

      const { error: signUpErr } = await supabase.auth.signUp({
        email: companyForm.email,
        password: adminPassword,
        options: {
          data: { nome: companyForm.razaoSocial.split(" ")[0], role: "company_admin", company_id: companyId },
        },
      });
      if (signUpErr) throw signUpErr;

      const validMembers = team.filter((m) => m.email && m.nome);
      for (const m of validMembers) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.functions.invoke("invite-user", {
            body: { email: m.email, nome: m.nome, role: m.role, company_id: companyId },
            headers: { Authorization: `Bearer ${session.access_token}` },
          }).catch(() => {});
        }
      }

      toast.success("Empresa cadastrada com sucesso!");
      setStep(5);
    } catch (err) {
      toast.error((err as Error).message || "Erro ao cadastrar empresa.");
    } finally {
      setSubmitting(false);
    }
  }

  async function next() {
    if (step === 4) { await finalizeSignup(); return; }
    if (step === 5) {
      navigate({ to: createdCompanyId ? "/app/$companyId" : "/", params: createdCompanyId ? { companyId: createdCompanyId } : undefined });
      return;
    }
    setStep((s) => Math.min(5, s + 1));
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded bg-accent text-[10px] font-bold tracking-tighter text-accent-foreground">SC</div>
            <span className="text-sm font-semibold">StandControl</span>
          </Link>
          <Link to="/login" className="text-xs font-semibold text-muted-foreground hover:text-foreground">Já tenho conta →</Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Onboarding · Etapa {step} de 5</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Cadastrar nova empresa</h1>
        </div>
        <ol className="mb-8 flex items-center gap-2 overflow-x-auto rounded-lg border bg-card p-3">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const done = step > s.id;
            const active = step === s.id;
            return (
              <li key={s.id} className="flex items-center gap-2">
                {i > 0 && <span className="h-px w-6 shrink-0 bg-border" />}
                <button onClick={() => step > s.id && setStep(s.id)}
                  className={"flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors " +
                    (active ? "bg-foreground text-background" : done ? "text-foreground" : "text-muted-foreground")}>
                  {done ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                  {s.label}
                </button>
              </li>
            );
          })}
        </ol>
        <div className="rounded-xl border bg-card p-8">
          {step === 1 && <StepEmpresa form={companyForm} onChange={setCompanyForm} password={adminPassword} onPassword={setAdminPassword} />}
          {step === 2 && <StepOperacao />}
          {step === 3 && <StepEquipe team={team} onChange={setTeam} />}
          {step === 4 && <StepPlano plan={plan} onChange={setPlan} />}
          {step === 5 && <StepConcluido companyId={createdCompanyId} />}
          <div className="mt-8 flex justify-between border-t pt-6">
            <button onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1 || step === 5}
              className="flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-40">
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar
            </button>
            <button onClick={next} disabled={submitting}
              className="flex items-center gap-1.5 rounded-md bg-foreground px-5 py-2 text-sm font-semibold text-background disabled:opacity-60">
              {submitting ? "Salvando..." : step === 4 ? "Confirmar e ativar" : step === 5 ? "Ir para o painel" : "Continuar"}
              {!submitting && <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function StepEmpresa({ form, onChange, password, onPassword }: {
  form: CompanyForm; onChange: (f: CompanyForm) => void; password: string; onPassword: (p: string) => void;
}) {
  function formatCnpj(v: string) {
    const d = v.replace(/\D/g, "").slice(0, 14);
    return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  const fields = [
    { key: "razaoSocial", label: "Razão social *", span: 2 },
    { key: "nomeFantasia", label: "Nome fantasia *", span: 2 },
    { key: "cnpj", label: "CNPJ", span: 1 },
    { key: "tipo", label: "Tipo", span: 1, type: "select", options: ["Clube", "Estande", "Despachante", "Instrutor"] },
    { key: "email", label: "E-mail *", span: 1, type: "email" },
    { key: "telefone", label: "Telefone", span: 1 },
    { key: "cidade", label: "Cidade", span: 2 },
  ];
  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold">Dados da empresa</h2>
      <p className="mb-6 text-sm text-muted-foreground">Informações básicas do seu clube ou estande.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key} className={f.span === 2 ? "sm:col-span-2" : ""}>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{f.label}</label>
            {f.type === "select" ? (
              <select value={(form as any)[f.key]} onChange={(e) => onChange({ ...form, [f.key]: e.target.value })}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none">
                {f.options!.map((o) => <option key={o}>{o}</option>)}
              </select>
            ) : (
              <input type={f.type ?? "text"} value={f.key === "cnpj" ? formatCnpj((form as any)[f.key]) : (form as any)[f.key]}
                onChange={(e) => onChange({ ...form, [f.key]: f.key === "cnpj" ? e.target.value.replace(/\D/g, "") : e.target.value })}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none" />
            )}
          </div>
        ))}
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Senha do administrador *</label>
          <input type="password" value={password} onChange={(e) => onPassword(e.target.value)} placeholder="Mínimo 8 caracteres"
            className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none" />
        </div>
      </div>
    </div>
  );
}

function StepOperacao() {
  const modules = [
    { label: "Cadastro de atiradores e CRs", default: true },
    { label: "Controle de acervo (armas)", default: true },
    { label: "Movimentação de munições", default: true },
    { label: "Agenda de baias e instrutores", default: true },
    { label: "Despachante integrado (GTs/SIGMA)", default: false },
    { label: "Financeiro e mensalidades", default: true },
  ];
  const [enabled, setEnabled] = useState(() => modules.map((m) => m.default));
  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold">Operação CAC</h2>
      <p className="mb-6 text-sm text-muted-foreground">Estes módulos já vêm habilitados em todos os planos e podem ser ajustados depois.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {modules.map((m, i) => (
          <label key={m.label} className="flex cursor-pointer items-center justify-between rounded-lg border bg-background px-4 py-3">
            <span className="text-sm font-medium">{m.label}</span>
            <button type="button" onClick={() => setEnabled((p) => p.map((v, j) => j === i ? !v : v))}
              className={"relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors " + (enabled[i] ? "bg-foreground" : "bg-input")}>
              <span className={"pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow transition-transform " + (enabled[i] ? "translate-x-4" : "translate-x-0")} />
            </button>
          </label>
        ))}
      </div>
    </div>
  );
}

function StepEquipe({ team, onChange }: { team: TeamMember[]; onChange: (t: TeamMember[]) => void }) {
  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold">Equipe inicial</h2>
      <p className="mb-6 text-sm text-muted-foreground">Convide membros da sua equipe. Você pode pular e adicionar depois.</p>
      <div className="space-y-3">
        {team.map((m, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-3">
            <input placeholder="Nome" value={m.nome} onChange={(e) => onChange(team.map((t, j) => j === i ? { ...t, nome: e.target.value } : t))}
              className="h-9 rounded-md border bg-background px-3 text-sm outline-none" />
            <input placeholder="E-mail" value={m.email} onChange={(e) => onChange(team.map((t, j) => j === i ? { ...t, email: e.target.value } : t))}
              className="h-9 rounded-md border bg-background px-3 text-sm outline-none" />
            <select value={m.role} onChange={(e) => onChange(team.map((t, j) => j === i ? { ...t, role: e.target.value } : t))}
              className="h-9 rounded-md border bg-background px-3 text-sm outline-none">
              {["instrutor", "operador", "gerente", "financeiro"].map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
        ))}
        <button onClick={() => onChange([...team, { email: "", nome: "", role: "instrutor" }])}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground">+ Adicionar membro</button>
      </div>
    </div>
  );
}

function StepPlano({ plan, onChange }: { plan: string; onChange: (p: any) => void }) {
  const plans = [
    { id: "starter", name: "Starter", price: "199", hint: "Até 500 clientes · 5 usuários", features: ["Acervo e CRs", "Documentos", "Suporte e-mail"] },
    { id: "professional", name: "Professional", price: "599", hint: "Até 5.000 clientes · 20 usuários", popular: true, features: ["Tudo do Starter", "Agenda multi-baia", "Financeiro completo", "Suporte prioritário"] },
    { id: "enterprise", name: "Enterprise", price: "1.499", hint: "Ilimitado · multi-unidade", features: ["Tudo do Pro", "SSO/SAML", "API + Webhooks", "CSM dedicado"] },
  ];
  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold">Escolher plano</h2>
      <p className="mb-6 text-sm text-muted-foreground">Trial de 14 dias incluso em todos os planos. Sem cartão obrigatório.</p>
      <div className="grid gap-4 sm:grid-cols-3">
        {plans.map((p) => (
          <button key={p.id} onClick={() => onChange(p.id)}
            className={"rounded-xl border-2 p-5 text-left transition-all " + (plan === p.id ? "border-foreground" : "border-border hover:border-foreground/40")}>
            {p.popular && <span className="mb-2 inline-block rounded bg-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-background">Popular</span>}
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{p.name}</p>
            <p className="mt-1 text-2xl font-bold">R$ {p.price}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">por mês · {p.hint}</p>
            <ul className="mt-4 space-y-1.5">
              {p.features.map((f) => <li key={f} className="flex items-center gap-2 text-xs"><Check className="h-3 w-3 shrink-0" />{f}</li>)}
            </ul>
            <div className={"mt-4 w-full rounded-md py-2 text-center text-xs font-semibold " + (plan === p.id ? "bg-foreground text-background" : "border border-border")}>
              {plan === p.id ? "Selecionado" : "Selecionar"}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepConcluido({ companyId }: { companyId: string | null }) {
  return (
    <div className="py-8 text-center">
      <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-foreground text-background">
        <Sparkles className="h-7 w-7" />
      </div>
      <h2 className="text-2xl font-bold">Tudo pronto!</h2>
      <p className="mt-2 text-sm text-muted-foreground">Sua empresa foi cadastrada. Clique em "Ir para o painel" para começar.</p>
      {!companyId && <p className="mt-2 text-xs text-muted-foreground">Verifique seu e-mail para confirmar o cadastro.</p>}
    </div>
  );
}
