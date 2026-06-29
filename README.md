# 🎯 StandControl — SaaS para Gestão CAC

> Plataforma premium para clubes de tiro, estandes, instrutores e despachantes CAC. Controle total de atiradores, acervo, munições, agenda e financeiro em um único lugar.

**Stack:** React 19 + TanStack Router + React Query | Supabase + PostgreSQL + RLS | Tailwind CSS

## ✨ Características

- **Gestão de Atiradores**: Cadastro completo de CRs, CRAF, calibres preferidos
- **Acervo de Armas**: Registro de armas por proprietário e situação
- **Controle de Munições**: Estoque, movimentações (entrada/saída/ajuste)
- **Agenda Inteligente**: Treinos, avaliações, cursos com detecção de conflitos
- **Documentos**: Upload de CRs, CRAF, certificados com vencimento monitorado
- **Financeiro**: Receitas, despesas, fluxo de caixa, relatórios
- **Controle de Usuários**: Convites, perfis (Admin, Gerente, Operador, Instrutor, Financeiro)
- **Multi-tenant Seguro**: RLS (Row-Level Security) — cada empresa vê apenas seus dados
- **Painel Admin**: Visão global de MRR, empresas, faturas (para super_admin)
- **Onboarding Integrado**: Wizard de cadastro de empresa, trial de 14 dias

## 🚀 Quick Start

```bash
# 1. Clonar repositório
git clone <seu-repo>
cd standcontrol-final

# 2. Instalar dependências
npm install

# 3. Configurar Supabase (ver SETUP.md)
# - Criar projeto Supabase
# - Rodar migrations
# - Copiar .env.example → .env
# - Preencher VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY

# 4. Rodar localmente
npm run dev
```

Acesse: **http://localhost:5173**

## 📊 Estrutura do Projeto

```
src/
├── routes/           # Todas as páginas (file-based routing TanStack)
│   ├── __root.tsx    # Layout raiz com AuthProvider
│   ├── login.tsx     # Autenticação
│   ├── onboarding.tsx # Wizard de cadastro
│   ├── app.$companyId/*.tsx  # Rotas autenticadas por empresa
│   └── admin/*.tsx   # Dashboard super_admin
├── contexts/         # AuthContext (sessão do usuário)
├── hooks/
│   ├── queries/      # Hooks de dados por domínio (companies, clients, ...)
│   └── useSupabase.ts # Barrel de compatibilidade (reexporta queries/*)
├── lib/
│   ├── supabase.ts   # Cliente Supabase tipado
│   ├── formatters.ts # Formatação de datas/moeda + mapeamento de enums
│   ├── query-keys.ts # Fábrica central de chaves do React Query
│   ├── constants.ts  # Constantes (page size, intervalos de refetch, TTLs)
│   └── utils.ts
├── components/
│   ├── shell/        # AppShell, PageHeader, KpiCard, StatusBadge
│   ├── ui/           # Shadcn componentes reutilizáveis
│   └── charts/       # MiniArea, MiniBars (Recharts)
└── styles.css        # Tailwind + global
```

## 🔒 Segurança

- **Autenticação**: Supabase Auth (email + password, MFA pronto)
- **Row-Level Security**: Cada empresa isolada via `company_id` na sessão
- **Auditoria**: Todos os DDL's (insert/update/delete) registrados em `audit_logs`
- **Storage Privado**: Documentos criptografados em bucket S3, acesso apenas da empresa
- **Super Admin**: Acesso global; company_admin gerencia sua empresa

## 🌐 API & Integração

### Edge Functions (Supabase)

- `invite-user`: Envia convite de acesso (cria usuário Auth)
- `webhook-asaas`: Recebe notificações de pagamento (Asaas)
- `check-subscriptions`: Cron diária — expira trials, marca overdue, suspende

### RPCs (Funções SQL)

- `get_company_kpis()` → Dashboard metrics
- `get_cashflow()` → Fluxo 6 meses
- `get_admin_kpis()` → MRR, ARR, inadimplência
- `check_plan_limits()` → Validação de limites do plano

## 📦 Build & Deployment

```bash
# Build para produção
npm run build

# Preview local do build
npm run preview
```

Pronto para Vercel, Netlify, ou qualquer host estático (Vite).

**Environment Variables (produção):**
```
VITE_SUPABASE_URL=https://...supabase.co
VITE_SUPABASE_ANON_KEY=eyJhb...
```

## 🛠️ Desenvolvimento

**Stack Tecnológico:**
- **Frontend**: React 19 + Hooks + TypeScript
- **Roteamento**: TanStack Router (file-based, como Remix)
- **Estado**: React Query (server state) + React Context (auth)
- **UI**: Shadcn + Tailwind CSS (design tokens personalizáveis)
- **Database**: PostgreSQL (Supabase) — migrations versionadas
- **Charts**: Recharts (gráficos leves)
- **Validação**: Zod

**Convenções:**
- Rotas por arquivo: `src/routes/app.$companyId.clients.tsx`
- Hooks de dados organizados por domínio em `src/hooks/queries/` (um arquivo
  por entidade). Importe do domínio específico em código novo, ex.:
  `import { useClients } from "@/hooks/queries/clients"`. O barrel
  `@/hooks/useSupabase` permanece para compatibilidade.
- Chaves do React Query centralizadas em `src/lib/query-keys.ts`
- Sem pasta `/pages`, `/api`, nem `/components/pages`

## 📝 Licença

Proprietary — StandControl © 2026

## 📧 Suporte

- Documentação: `SETUP.md`
- Issues: GitHub Issues
- Email: suporte@standcontrol.com.br

---

**Desenvolvido com ❤️ para CACs do Brasil.**
