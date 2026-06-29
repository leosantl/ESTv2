# Changelog

## [Refatoração da camada de dados] — 2026-06-29

Reorganização da camada de acesso a dados para melhorar manutenibilidade.
Sem mudança de comportamento em runtime; as rotas não foram alteradas.

### Adicionado
- `src/hooks/queries/` — hooks de dados divididos por domínio: `companies`,
  `clients`, `weapons`, `ammo`, `schedules`, `finance`, `documents`, `users`,
  `billing`, `admin`.
- `src/lib/formatters.ts` — funções de formatação (data, hora, relativo, moeda)
  e mapeadores de enum do banco → rótulos da UI, antes duplicados inline.
- `src/lib/query-keys.ts` — fábrica central de chaves do React Query.
- `src/lib/constants.ts` — constantes da aplicação (tamanho de página,
  intervalos de refetch, TTL de URL assinada, janela de séries financeiras).
- `PROJECT_STATUS.md` — status técnico honesto do projeto.

### Alterado
- `src/hooks/useSupabase.ts` deixou de ser um monolito de ~700 linhas e passou
  a ser um barrel de ~20 linhas que reexporta os módulos de `queries/`. Todos
  os imports existentes (`@/hooks/useSupabase`) continuam válidos.
- Números mágicos (page size 50, refetch 60s/120s, TTL 300s, etc.) substituídos
  por constantes nomeadas.
- Chaves de query passaram a usar a fábrica central, garantindo consistência
  entre consulta e invalidação entre domínios.

### Removido
- Métricas hardcoded `churn: 1.8` e `growth: 8.6` do `useAdminKpis` — eram
  valores fixos não calculados e não utilizados por nenhuma tela.
