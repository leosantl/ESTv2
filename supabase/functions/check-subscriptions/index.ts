import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Daily cron at 06:00 UTC: expire trials, mark overdue invoices, suspend delinquent companies
serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  );

  const now = new Date().toISOString();
  const today = now.split("T")[0];
  const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  try {
    // 1. Expire trial subscriptions whose trial_ends_at has passed
    const { data: expiredTrials } = await supabase
      .from("subscriptions")
      .select("id, company_id")
      .eq("status", "trial")
      .lt("trial_ends_at", today);

    if (expiredTrials?.length) {
      const ids = expiredTrials.map((s) => s.id);
      const companyIds = expiredTrials.map((s) => s.company_id);

      await supabase.from("subscriptions").update({ status: "overdue", trial: false }).in("id", ids);
      await supabase.from("companies").update({ status: "overdue" }).in("id", companyIds);
    }

    // 2. Mark invoices as overdue when 5+ days past vencimento and still pending
    await supabase
      .from("invoices")
      .update({ status: "atrasada" })
      .eq("status", "pendente")
      .lt("vencimento", fiveDaysAgo);

    // 3. Suspend active companies that have overdue invoices 30+ days old
    const { data: oldOverdue } = await supabase
      .from("invoices")
      .select("company_id")
      .eq("status", "atrasada")
      .lt("vencimento", thirtyDaysAgo);

    if (oldOverdue?.length) {
      const delinquentIds = [...new Set(oldOverdue.map((i) => i.company_id))];
      await supabase
        .from("companies")
        .update({ status: "suspended" })
        .in("id", delinquentIds)
        .in("status", ["active", "overdue"]);

      await supabase
        .from("subscriptions")
        .update({ status: "suspended" })
        .in("company_id", delinquentIds);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        expired_trials: expiredTrials?.length ?? 0,
        suspended: oldOverdue ? [...new Set(oldOverdue.map((i) => i.company_id))].length : 0,
        timestamp: now,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
