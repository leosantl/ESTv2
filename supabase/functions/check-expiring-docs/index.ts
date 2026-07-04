import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  const callerKey = req.headers.get("x-service-key") ?? req.headers.get("Authorization")?.replace("Bearer ", "");
  if (callerKey !== SERVICE_KEY) return new Response("Unauthorized", { status: 401 });

  const db = createClient(SUPABASE_URL, SERVICE_KEY);
  const today = new Date().toISOString().split("T")[0];
  let sent = 0, skipped = 0, errors = 0;

  const { data: companies, error: cErr } = await db
    .from("companies")
    .select("id, nome_fantasia, email, notification_settings(alert_days, enabled), subscriptions!inner(status)")
    .in("subscriptions.status", ["active", "trial"]);

  if (cErr) return new Response(JSON.stringify({ error: cErr.message }), { status: 500 });

  for (const company of companies ?? []) {
    const settings = (company.notification_settings as Array<{ alert_days: number[]; enabled: boolean }> | null)?.[0];
    if (settings?.enabled === false) continue;
    const alertDays: number[] = settings?.alert_days ?? [7, 15, 30];
    const adminEmail: string = company.email;
    if (!adminEmail) continue;

    const maxDays = Math.max(...alertDays);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + maxDays);
    const cutoffStr = cutoff.toISOString().split("T")[0];

    const { data: docs } = await db
      .from("documents_with_status")
      .select("id, nome, tipo, vencimento, clients(nome)")
      .eq("company_id", company.id)
      .not("vencimento", "is", null)
      .gte("vencimento", today)
      .lte("vencimento", cutoffStr);

    for (const doc of docs ?? []) {
      const venc = new Date(doc.vencimento as string);
      const daysLeft = Math.ceil((venc.getTime() - new Date(today).getTime()) / 86400000);
      if (!alertDays.includes(daysLeft)) continue;

      const { count } = await db.from("notification_log")
        .select("id", { count: "exact", head: true })
        .eq("company_id", company.id).eq("doc_id", doc.id)
        .eq("days_remaining", daysLeft).gte("sent_at", today);

      if ((count ?? 0) > 0) { skipped++; continue; }

      const clientName = (doc.clients as { nome?: string } | null)?.nome ?? "—";
      const docType = String(doc.tipo).toUpperCase();
      const vencFormatted = new Date(doc.vencimento as string).toLocaleDateString("pt-BR");

      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-service-key": SERVICE_KEY },
          body: JSON.stringify({
            type: "document_expiring", company_id: company.id,
            to_email: adminEmail, to_name: company.nome_fantasia,
            data: { doc_type: docType, client_name: clientName, doc_name: doc.nome, days: daysLeft, date: vencFormatted },
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        await db.from("notification_log").insert({
          company_id: company.id, doc_id: doc.id, days_remaining: daysLeft,
          to_email: adminEmail, doc_type: docType, client_name: clientName,
          doc_name: String(doc.nome), sent_at: new Date().toISOString(),
        });
        sent++;
      } catch (e) { console.error((e as Error).message); errors++; }
    }
  }
  return new Response(JSON.stringify({ ok: true, sent, skipped, errors, checked_at: today }),
    { status: 200, headers: { "Content-Type": "application/json" } });
});
