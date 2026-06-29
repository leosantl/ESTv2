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
    if (companyForm.cnpj && !validateCnpj(companyForm.cnpj)) {
      toast.error("CNPJ inválido. Verifique os dígitos.");
      setStep(1);
      return;
    }
    setSubmitting(true);
    try {
      const initials = companyForm.nomeFantasia.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
      const { data: company, error: companyErr } = await supabase
        .from("companies")
        .insert({
          razao_social: companyForm.razaoSocial,
          nome_fantasia: companyForm.nomeFantasia,
          cnpj: companyForm.cnpj || null,
          email: companyForm.email,
          telefone: companyForm.telefone || null,
          cidade: companyForm.cidade || null,
          tipo: companyForm.tipo,
          logo_initials: initials || "??",
          plan_id: plan,
          status: "trial",
        })
        .select()
        .single();

      if (companyErr) throw companyErr;
      setCreatedCompanyId(company.id);

      await supabase.from("subscriptions").insert({
        company_id: company.id, plan_id: plan, status: "trial", trial: true,
      });

      const { error: signUpErr } = await supabase.auth.signUp({
        email: companyForm.email,
        password: adminPassword,
        options: {
          data: { nome: companyForm.razaoSocial.split(" ")[0], role: "company_admin", company_id: company.id },
        },
      });
      if (signUpErr) throw signUpErr;

      const validMembers = team.filter((m) => m.email && m.nome);
      for (const m of validMembers) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.functions.invoke("invite-user", {
            body: { email: m.email, nome: m.nome, role: m.role, company_id: company.id },
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
            const done = s.id < step;
            const active = s.id === step;
            return (
              <li key={s.id} className="flex flex-1 items-center gap-2">
                <div className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-3 py-2 transition-colors ${active ? "bg-accent text-accent-foreground" : done ? "bg-muted" : "opacity-60"}`}>
                  <div className={`grid size-6 shrink-0 place-items-center rounded-full font-mono text-[10px] font-bold ${active ? "bg-accent-foreground text-accent" : done ? "bg-accent text-accent-foreground" : "border bg-card"}`}>
                    {done ? <Check className="h-3 w-3" strokeWidth={3} /> : s.id}
                  </div>
                  <span className="truncate text-xs font-semibold">{s.label}</span>
                </div>
                {i < steps.length - 1 && <span className="h-px w-3 shrink-0 bg-border" />}
              </li>
            );
          })}
        </ol>

        <div className="rounded-lg border bg-card p-7 shadow-sm">
          {step === 1 && <StepCompany form={companyForm} setForm={setCompanyForm} password={adminPassword} setPassword={setAdminPassword} />}
          {step === 2 && <StepOps />}
          {step === 3 && <StepTeam team={team} setTeam={setTeam} />}
          {step === 4 && <StepPlan plan={plan} setPlan={setPlan} />}
          {step === 5 && <StepDone plan={plan} companyName={companyForm.nomeFantasia} teamCount={team.filter((m) => m.email).length} />}

          <div className="mt-8 flex items-center justify-between border-t pt-5">
            <button onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1 || step === 5}
              className="inline-flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-xs font-semibold hover:bg-muted disabled:opacity-40">
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar
            </button>
            <button onClick={next} disabled={submitting}
              className="group inline-flex h-9 items-center gap-2 rounded-md bg-accent px-4 text-xs font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-60">
              {submitting ? "Criando empresa..." : step === 5 ? "Abrir workspace" : step === 4 ? "Confirmar e ativar" : "Continuar"}
              {!submitting && <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function formatCnpj(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function validateCnpj(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  let sum = 0;
  let weight = 5;
  for (let i = 0; i < 12; i++) { sum += parseInt(d[i]) * weight; weight = weight === 2 ? 9 : weight - 1; }
  const r1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (parseInt(d[12]) !== r1) return false;
  sum = 0; weight = 6;
  for (let i = 0; i < 13; i++) { sum += parseInt(d[i]) * weight; weight = weight === 2 ? 9 : weight - 1; }
  const r2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return parseInt(d[13]) === r2;
}

function Field({ label, value, onChange, mono, full, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; mono?: boolean; full?: boolean; type?: string;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className={`h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-foreground/60 ${mono ? "font-mono" : ""}`} />
    </div>
  );
}

function StepCompany({ form, setForm, password, setPassword }: {
  form: CompanyForm; setForm: (f: CompanyForm) => void; password: string; setPassword: (p: string) => void;
}) {
  const set = (k: keyof CompanyForm) => (v: string) => setForm({ ...form, [k]: v });
  const cnpjInvalid = form.cnpj.replace(/\D/g, "").length === 14 && !validateCnpj(form.cnpj);
  return (
    <div>
      <h2 className="text-lg font-semibold">Dados da empresa</h2>
      <p className="mt-1 text-sm text-muted-foreground">Essas informações aparecerão em relatórios, recibos e documentos emitidos.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Razão social *" value={form.razaoSocial} onChange={set("razaoSocial")} full />
        <Field label="Nome fantasia *" value={form.nomeFantasia} onChange={set("nomeFantasia")} />
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">CNPJ</label>
          <input
            type="text"
            value={form.cnpj}
            onChange={(e) => set("cnpj")(formatCnpj(e.target.value))}
            placeholder="00.000.000/0001-00"
            maxLength={18}
            className={`h-10 w-full rounded-md border bg-background px-3 font-mono text-sm outline-none focus:border-foreground/60 ${cnpjInvalid ? "border-red-400 focus:border-red-500" : ""}`}
          />
          {cnpjInvalid && <p className="mt-1 text-[11px] text-red-500">CNPJ inválido</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo de operação</label>
          <select value={form.tipo} onChange={(e) => set("tipo")(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-foreground/60">
            <option value="Clube">Clube de Tiro</option><option value="Estande">Estande</option><option value="Empresa">Despachante / Empresa</option>
          </select>
        </div>
        <Field label="Cidade / UF" value={form.cidade} onChange={set("cidade")} />
        <Field label="E-mail do administrador *" value={form.email} onChange={set("email")} type="email" mono />
        <Field label="Senha do administrador *" value={password} onChange={setPassword} type="password" mono />
        <Field label="Telefone" value={form.telefone} onChange={set("telefone")} mono />
      </div>
    </div>
  );
}

function StepOps() {
  const modules = [
    { k: "Cadastro de atiradores e CRs", on: true },
    { k: "Controle de acervo (armas)", on: true },
    { k: "Movimentação de munições", on: true },
    { k: "Agenda de baias e instrutores", on: true },
    { k: "Despachante integrado (GTs/SIGMA)", on: false },
    { k: "Financeiro e mensalidades", on: true },
  ];
  return (
    <div>
      <h2 className="text-lg font-semibold">Operação CAC</h2>
      <p className="mt-1 text-sm text-muted-foreground">Estes módulos já vêm habilitados em todos os planos e podem ser ajustados depois.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {modules.map((m) => (
          <div key={m.k} className="flex items-center justify-between gap-3 rounded-md border bg-background p-3">
            <span className="text-sm">{m.k}</span>
            <span className={`relative h-5 w-9 rounded-full transition-colors ${m.on ? "bg-accent" : "bg-border"}`}>
              <span className={`absolute top-0.5 size-4 rounded-full bg-card shadow-sm transition-all ${m.on ? "left-[18px]" : "left-0.5"}`} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepTeam({ team, setTeam }: { team: TeamMember[]; setTeam: (t: TeamMember[]) => void }) {
  function update(i: number, key: keyof TeamMember, value: string) {
    const copy = [...team]; copy[i] = { ...copy[i], [key]: value }; setTeam(copy);
  }
  return (
    <div>
      <h2 className="text-lg font-semibold">Convidar equipe</h2>
      <p className="mt-1 text-sm text-muted-foreground">Cada membro receberá um e-mail para definir senha e ativar a conta. Pode pular e convidar depois.</p>
      <div className="mt-6 space-y-2">
        {team.map((u, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_160px_auto] items-center gap-2">
            <input placeholder="Nome" value={u.nome} onChange={(e) => update(i, "nome", e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:border-foreground/60" />
            <input placeholder="email@empresa.com" value={u.email} onChange={(e) => update(i, "email", e.target.value)} className="h-10 rounded-md border bg-background px-3 font-mono text-sm outline-none focus:border-foreground/60" />
            <select value={u.role} onChange={(e) => update(i, "role", e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:border-foreground/60">
              <option value="gerente">Gerente</option><option value="instrutor">Instrutor</option>
              <option value="operador">Operador</option><option value="financeiro">Financeiro</option>
            </select>
            <button onClick={() => setTeam(team.filter((_, idx) => idx !== i))} className="h-10 rounded-md border bg-card px-3 text-xs font-semibold text-muted-foreground hover:bg-muted">Remover</button>
          </div>
        ))}
        <button onClick={() => setTeam([...team, { email: "", nome: "", role: "instrutor" }])}
          className="mt-2 inline-flex h-9 items-center gap-2 rounded-md border border-dashed bg-card px-3 text-xs font-semibold text-muted-foreground hover:bg-muted">
          + Adicionar membro
        </button>
      </div>
    </div>
  );
}

type PlanCard = { id: "starter" | "professional" | "enterprise"; label: string; price: string; desc: string; features: string[]; featured?: boolean };
const plans: PlanCard[] = [
  { id: "starter", label: "Starter", price: "R$ 199", desc: "Até 500 clientes · 5 usuários", features: ["Acervo e CRs", "Documentos", "Suporte e-mail"] },
  { id: "professional", label: "Professional", price: "R$ 599", desc: "Até 5.000 clientes · 20 usuários", features: ["Tudo do Starter", "Agenda multi-baia", "Financeiro completo", "Suporte prioritário"], featured: true },
  { id: "enterprise", label: "Enterprise", price: "R$ 1.499", desc: "Ilimitado · multi-unidade", features: ["Tudo do Pro", "SSO/SAML", "API + Webhooks", "CSM dedicado"] },
];

function StepPlan({ plan, setPlan }: { plan: string; setPlan: (p: "starter" | "professional" | "enterprise") => void }) {
  return (
    <div>
      <h2 className="text-lg font-semibold">Escolher plano</h2>
      <p className="mt-1 text-sm text-muted-foreground">Trial de 14 dias incluso em todos os planos. Sem cartão obrigatório.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {plans.map((p) => {
          const active = plan === p.id;
          return (
            <button key={p.id} onClick={() => setPlan(p.id)}
              className={`relative flex flex-col gap-3 rounded-lg border p-5 text-left transition-all ${active ? "border-foreground bg-muted/40" : "bg-card hover:border-foreground/40"}`}>
              {p.featured && <span className="absolute right-3 top-3 rounded bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent-foreground">Popular</span>}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{p.label}</p>
                <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{p.price}</p>
                <p className="text-[11px] text-muted-foreground">por mês · {p.desc}</p>
              </div>
              <ul className="space-y-1.5 border-t pt-3 text-xs">
                {p.features.map((f) => <li key={f} className="flex items-center gap-2"><Check className="h-3 w-3 text-foreground" strokeWidth={3} /> {f}</li>)}
              </ul>
              <span className={`mt-auto inline-flex h-7 items-center justify-center rounded-md text-[11px] font-bold uppercase tracking-wider ${active ? "bg-accent text-accent-foreground" : "border"}`}>
                {active ? "Selecionado" : "Selecionar"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepDone({ plan, companyName, teamCount }: { plan: string; companyName: string; teamCount: number }) {
  const planLabel = plans.find((p) => p.id === plan)?.label ?? plan;
  return (
    <div className="text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-full bg-accent text-accent-foreground">
        <Check className="h-6 w-6" strokeWidth={3} />
      </div>
      <h2 className="mt-4 text-xl font-semibold tracking-tight">Empresa cadastrada com sucesso</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{companyName}</span> está ativa no plano{" "}
        <span className="font-semibold text-foreground">{planLabel}</span>. Convites foram enviados para sua equipe.
      </p>
      <dl className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3 text-left">
        {[{ k: "Status", v: "Trial ativo" }, { k: "Convites", v: `${teamCount} enviados` }, { k: "Trial", v: "14 dias" }].map((s) => (
          <div key={s.k} className="rounded-md border bg-muted/40 p-3">
            <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{s.k}</dt>
            <dd className="mt-1 font-mono text-sm font-semibold">{s.v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
