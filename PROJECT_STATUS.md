# Status do Projeto — StandControl

Documento de status honesto e técnico. Substitui os relatórios de marketing
das versões anteriores.

## Resumo

StandControl é um SaaS multi-tenant para gestão de CACs. O núcleo (auth,
isolamento por RLS, CRUD dos módulos operacionais e painel admin) está
implementado e funcional. Antes de operar com pagamento real e em produção,
alguns pontos ainda precisam ser concluídos — listados abaixo sem maquiagem.

## O que está pronto

| Área | Estado | Observação |
|------|--------|------------|
| Autenticação (Supabase Auth) | Funcional | Email/senha; sessão persistida |
| Isolamento multi-tenant (RLS) | Funcional | Policies por `company_id` nas migrations 003 |
| Onboarding de empresa | Funcional | Wizard; cria empresa, admin e subscription trial |
| CRUD Clientes/Atiradores | Funcional | Listagem paginada, busca, soft delete |
| CRUD Armas | Funcional | Validação de série única no banco |
| Munições (estoque/movimentos) | Funcional | Entrada/saída com histórico |
| Agenda/Pistas | Funcional | Conflito de horário validado no banco |
| Documentos + Storage | Funcional | Upload, URL assinada, status de validade |
| Usuários e convites | Funcional | Edge Function `invite-user` |
| Financeiro | Funcional | Lançamentos, fluxo de caixa, categorias |
| Painel admin (super_admin) | Funcional | KPIs globais, MRR, faturas |

## O que NÃO está concluído

| Item | Estado | Esforço estimado |
|------|--------|------------------|
| Integração de pagamento (Asaas) | Estrutura presente, sem credenciais nem checkout | 2–3 h |
| Notificações por e-mail/SMS de alertas | Não implementado | 1–2 h |
| Cron `check-subscriptions` | Código pronto, agendamento não configurado | 30 min |
| `database.types.ts` | Placeholder — gerar via `npm run db:types` | 5 min |
| Suíte de testes automatizados | **Não existe** | — |
| Reconhecimento facial | Apenas especificado em documento, não implementado | ~9 h |

## Sobre "testes"

Os relatórios anteriores que mencionam "109 testes, 100% aprovados" referem-se
a uma **conferência manual simulada**, não a testes automatizados executados.
Não há, neste momento, nenhuma suíte de testes (unit, integração ou e2e) no
repositório. Adicionar testes (Vitest + Testing Library para hooks/UI, e testes
de policy RLS no banco) é uma recomendação prioritária antes de produção.

## Dependências externas para deploy

O deploy exige contas e configuração que não fazem parte do código:

- Projeto **Supabase** (banco, auth, storage, edge functions)
- Host de frontend (**Vercel**/Netlify) com as variáveis `VITE_SUPABASE_URL`
  e `VITE_SUPABASE_ANON_KEY`
- Conta **Asaas** (quando o pagamento for ativado)

Passo a passo em `SETUP.md`.
