-- ====================================================================
-- seed.sql
-- Dados de teste e exemplo para desenvolvimento
-- ====================================================================

-- Test company
INSERT INTO companies (id, razao_social, nome_fantasia, cnpj, email, telefone, cidade, tipo, logo_initials, plan_id, status)
VALUES ('a0000000-0000-0000-0000-000000000001', 'Tático Preciso Brasil LTDA', 'Tático Preciso SP', '42.108.553/0001-72', 'admin@tatico.cac', '(11) 98421-3320', 'São Paulo, SP', 'Clube', 'TP', 'professional', 'active')
ON CONFLICT DO NOTHING;

-- Subscription
INSERT INTO subscriptions (company_id, plan_id, status, trial)
VALUES ('a0000000-0000-0000-0000-000000000001', 'professional', 'active', false)
ON CONFLICT DO NOTHING;

-- Test clients
INSERT INTO clients (company_id, nome, cpf, cr, cr_validade, calibre_preferido, status)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Ricardo S. Almeida', '154.***.**9-22', 'SP-154329', '2027-12-31', '9mm', 'ativo'),
  ('a0000000-0000-0000-0000-000000000001', 'Ana C. Oliveira', '287.***.**4-15', 'SP-287451', '2026-06-30', '.45 ACP', 'ativo'),
  ('a0000000-0000-0000-0000-000000000001', 'Bruno M. Santos', NULL, 'SP-312685', '2028-03-15', '9mm', 'pendente')
ON CONFLICT DO NOTHING;

-- Test weapons
INSERT INTO weapons (company_id, client_id, marca, modelo, calibre, numero_serie, situacao)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Taurus', 'G3C', '9mm', 'TG3-492118', 'operacional'),
  ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Taurus', 'PT92AF', '.45 ACP', 'TP9-328754', 'operacional')
ON CONFLICT DO NOTHING;

-- Test ammo stock
INSERT INTO ammo_stock (company_id, calibre, marca, estoque, estoque_minimo)
VALUES
  ('a0000000-0000-0000-0000-000000000001', '9mm', 'CBC', 500, 100),
  ('a0000000-0000-0000-0000-000000000001', '.45 ACP', 'Magtech', 250, 50)
ON CONFLICT DO NOTHING;

-- Test lanes
INSERT INTO lanes (company_id, nome, descricao, ativa)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Baía 1', 'Baia coberta até 25m', true),
  ('a0000000-0000-0000-0000-000000000001', 'Baía 2', 'Baia descoberta', true)
ON CONFLICT DO NOTHING;

-- Test finance entries
INSERT INTO finance_entries (company_id, descricao, tipo, valor, status, vencimento)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Mensalidades Junho', 'receita', 300000, 'compensado', '2026-06-30'),
  ('a0000000-0000-0000-0000-000000000001', 'Aluguel da sede', 'despesa', 50000, 'compensado', '2026-06-01'),
  ('a0000000-0000-0000-0000-000000000001', 'Internet e telefone', 'despesa', 5000, 'previsto', '2026-07-15')
ON CONFLICT DO NOTHING;

-- Test documents
INSERT INTO documents (company_id, client_id, nome, tipo, emissao, vencimento)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'CR Ricardo', 'cr', '2024-01-15', '2027-01-15'),
  ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'CR Ana', 'cr', '2023-06-30', '2026-06-30')
ON CONFLICT DO NOTHING;
