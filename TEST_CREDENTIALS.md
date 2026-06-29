# 🔐 Credenciais de Teste — StandControl

Use estas credenciais para testar a plataforma após fazer seed dos dados.

## Super Admin (Acesso Total)

- **Email**: `admin@standcontrol.com.br`
- **Senha**: `superadmin123`
- **Acesso**: Dashboard admin global, todas as empresas

## Company Admin — Tático Preciso SP

- **Email**: `admin@tatico.cac`
- **Senha**: `admin123`
- **Empresa**: Tático Preciso SP (Professional Plan, Ativa)
- **Acesso**: Dashboard operacional completo da empresa

## Test Data Disponível

### Empresa
- **ID**: `a0000000-0000-0000-0000-000000000001`
- **Nome**: Tático Preciso SP
- **Tipo**: Clube
- **Plano**: Professional
- **Status**: Ativa

### Atiradores (Clientes)
1. Ricardo S. Almeida — CR SP-154329 (Ativo)
2. Ana C. Oliveira — CR SP-287451 (Ativo)
3. Bruno M. Santos — CR SP-312685 (Pendente)

### Armas
- Taurus G3C 9mm (Ricardo) — Operacional
- Taurus PT92AF .45 ACP (Ana) — Operacional

### Munições
- 9mm CBC — 500 cartuchos
- .45 ACP Magtech — 250 cartuchos

### Pistas
- Baía 1 — Coberta até 25m
- Baía 2 — Descoberta

### Financeiro
- Mensalidades Junho — R$ 3.000 (Compensado)
- Aluguel — R$ 500 (Compensado)
- Internet — R$ 50 (Previsto)

### Documentos
- CR Ricardo — Válido até 2027-01-15
- CR Ana — Vencido desde 2026-06-30

## Como Resetar Dados

Para limpar a base e começar do zero:

```sql
-- Via Supabase SQL Editor
DELETE FROM documents;
DELETE FROM finance_entries;
DELETE FROM finance_categories;
DELETE FROM ammo_movements;
DELETE FROM ammo_stock;
DELETE FROM schedules;
DELETE FROM lanes;
DELETE FROM weapons;
DELETE FROM clients;
DELETE FROM audit_logs;
DELETE FROM payments;
DELETE FROM invoices;
DELETE FROM subscriptions;
DELETE FROM companies;
DELETE FROM profiles WHERE role != 'super_admin';

-- Depois rodar seed.sql novamente
```

## Notas

- Senhas de teste são **inseguras** — usar apenas em dev/staging
- Não compartilhar credenciais de produção
- Se precisar de super_admin novo:
  - Criar usuário via Supabase Dashboard
  - Fazer UPDATE manual na tabela `profiles` com `role='super_admin'`

---

**Desenvolvido para testes rápidos e demonstrações.**
