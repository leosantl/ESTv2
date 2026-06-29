-- ====================================================================
-- 005_views_functions.sql
-- RPCs (Remote Procedure Calls) para KPIs, cashflow, relatórios
-- ====================================================================

CREATE OR REPLACE FUNCTION get_company_kpis(p_company_id UUID)
RETURNS TABLE (
  clients JSONB, weapons JSONB, ammo JSONB, 
  schedules JSONB, documents JSONB, finance JSONB
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    jsonb_build_object(
      'total', COUNT(DISTINCT c.id),
      'ativos', COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'ativo'),
      'novos_mes', COUNT(DISTINCT c.id) FILTER (WHERE c.joined_at >= CURRENT_DATE - INTERVAL '30 days')
    ),
    jsonb_build_object(
      'total', COUNT(DISTINCT w.id),
      'operacionais', COUNT(DISTINCT w.id) FILTER (WHERE w.situacao = 'operacional')
    ),
    jsonb_build_object(
      'total_estoque', COALESCE(SUM(a.estoque), 0),
      'abaixo_minimo', COUNT(DISTINCT a.id) FILTER (WHERE a.estoque < a.estoque_minimo)
    ),
    jsonb_build_object(
      'hoje', COUNT(DISTINCT s.id) FILTER (WHERE DATE(s.starts_at) = CURRENT_DATE),
      'semana', COUNT(DISTINCT s.id) FILTER (WHERE s.starts_at >= CURRENT_DATE AND s.starts_at < CURRENT_DATE + INTERVAL '7 days')
    ),
    jsonb_build_object(
      'total', COUNT(DISTINCT d.id),
      'vencendo', COUNT(DISTINCT d.id) FILTER (WHERE d.vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'),
      'vencidos', COUNT(DISTINCT d.id) FILTER (WHERE d.vencimento < CURRENT_DATE)
    ),
    jsonb_build_object(
      'receita_mes', COALESCE(SUM(CASE WHEN f.tipo = 'receita' AND DATE_TRUNC('month', f.created_at) = DATE_TRUNC('month', CURRENT_DATE) THEN f.valor ELSE 0 END), 0),
      'despesa_mes', COALESCE(SUM(CASE WHEN f.tipo = 'despesa' AND DATE_TRUNC('month', f.created_at) = DATE_TRUNC('month', CURRENT_DATE) THEN f.valor ELSE 0 END), 0),
      'inadimplencia', COALESCE(SUM(CASE WHEN f.tipo = 'despesa' AND f.status = 'atrasado' THEN f.valor ELSE 0 END), 0)
    )
  FROM clients c
  FULL OUTER JOIN weapons w ON c.company_id = w.company_id
  FULL OUTER JOIN ammo_stock a ON c.company_id = a.company_id
  FULL OUTER JOIN schedules s ON c.company_id = s.company_id
  FULL OUTER JOIN documents d ON c.company_id = d.company_id
  FULL OUTER JOIN finance_entries f ON c.company_id = f.company_id
  WHERE c.company_id = p_company_id AND c.deleted_at IS NULL
     OR w.company_id = p_company_id
     OR a.company_id = p_company_id
     OR s.company_id = p_company_id
     OR d.company_id = p_company_id
     OR f.company_id = p_company_id;
$$;

CREATE OR REPLACE FUNCTION get_cashflow(p_company_id UUID, p_months INT DEFAULT 6)
RETURNS TABLE (mes TEXT, receita NUMERIC, despesa NUMERIC) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH months AS (
    SELECT DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month' * generate_series(p_months-1, 0)) AS month
  )
  SELECT
    TO_CHAR(m.month, 'MMM/YY')::TEXT,
    COALESCE(SUM(CASE WHEN f.tipo = 'receita' THEN f.valor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN f.tipo = 'despesa' THEN f.valor ELSE 0 END), 0)
  FROM months m
  LEFT JOIN finance_entries f ON DATE_TRUNC('month', f.created_at) = m.month AND f.company_id = p_company_id
  GROUP BY m.month
  ORDER BY m.month;
$$;

CREATE OR REPLACE FUNCTION get_week_schedule_summary(p_company_id UUID)
RETURNS TABLE (dia TEXT, count BIGINT) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH days AS (
    SELECT DATE_TRUNC('day', CURRENT_DATE + INTERVAL '1 day' * generate_series(0, 6)) AS day
  )
  SELECT
    TO_CHAR(d.day, 'DDD')::TEXT,
    COUNT(s.id)
  FROM days d
  LEFT JOIN schedules s ON DATE(s.starts_at) = d.day AND s.company_id = p_company_id
  GROUP BY d.day
  ORDER BY d.day;
$$;

CREATE OR REPLACE FUNCTION get_admin_kpis()
RETURNS TABLE (
  empresas_ativas INT, empresas_trial INT, empresas_suspensas INT,
  empresas_churn INT, novos_mes INT, mrr NUMERIC, arr NUMERIC, inadimplencia NUMERIC
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END)::INT,
    COUNT(DISTINCT CASE WHEN c.status = 'trial' THEN c.id END)::INT,
    COUNT(DISTINCT CASE WHEN c.status IN ('suspended', 'overdue') THEN c.id END)::INT,
    COUNT(DISTINCT CASE WHEN c.status = 'cancelled' THEN c.id END)::INT,
    COUNT(DISTINCT CASE WHEN c.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN c.id END)::INT,
    COALESCE(SUM(CASE WHEN s.status IN ('active', 'trial') THEN p.monthly_price ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN s.status IN ('active', 'trial') THEN p.annual_price ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN i.status = 'atrasada' THEN i.valor ELSE 0 END), 0)
  FROM companies c
  FULL OUTER JOIN subscriptions s ON c.id = s.company_id
  FULL OUTER JOIN plans p ON s.plan_id = p.id
  FULL OUTER JOIN invoices i ON c.id = i.company_id AND i.status = 'atrasada';
$$;

CREATE OR REPLACE FUNCTION get_mrr_series(p_months INT DEFAULT 6)
RETURNS TABLE (mes TEXT, value NUMERIC) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH months AS (
    SELECT DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month' * generate_series(p_months-1, 0)) AS month
  )
  SELECT
    TO_CHAR(m.month, 'MMM/YY')::TEXT,
    COALESCE(SUM(p.monthly_price), 0)
  FROM months m
  CROSS JOIN plans p
  LEFT JOIN subscriptions s ON s.plan_id = p.id
    AND DATE_TRUNC('month', s.start_date) <= m.month
    AND (s.end_date IS NULL OR DATE_TRUNC('month', s.end_date) > m.month)
  WHERE p.active = TRUE
  GROUP BY m.month
  ORDER BY m.month;
$$;

CREATE OR REPLACE FUNCTION check_plan_limits(p_company_id UUID)
RETURNS TABLE (
  can_add_client BOOLEAN,
  can_add_user BOOLEAN,
  current_clients INT,
  current_users INT,
  plan_name TEXT,
  max_clients INT,
  max_users INT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    (COALESCE(p.max_clients, 999999) > (SELECT COUNT(*) FROM clients WHERE company_id = p_company_id AND deleted_at IS NULL))::BOOLEAN,
    (COALESCE(p.max_users, 999999) > (SELECT COUNT(*) FROM profiles WHERE company_id = p_company_id))::BOOLEAN,
    COUNT(DISTINCT c.id)::INT,
    COUNT(DISTINCT pr.id)::INT,
    p.name,
    p.max_clients,
    p.max_users
  FROM subscriptions s
  FULL OUTER JOIN plans p ON s.plan_id = p.id
  LEFT JOIN clients c ON s.company_id = c.company_id AND c.deleted_at IS NULL
  LEFT JOIN profiles pr ON s.company_id = pr.company_id
  WHERE s.company_id = p_company_id
  GROUP BY p.id, p.name, p.max_clients, p.max_users;
$$;
