import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type NotificationPayload = {
  type: "trial_expiring" | "invoice_overdue" | "document_expiring" | "invite";
  company_id: string;
  to_email: string;
  to_name: string;
  data?: Record<string, string | number>;
};

const templates: Record<string, (d: Record<string, string | number>) => { subject: string; html: string }> = {
  trial_expiring: (d) => ({
    subject: `⚠️ Seu trial do StandControl expira em ${d.days} dias`,
    html: `<p>Olá, <strong>${d.name}</strong>!</p>
<p>Seu período de trial termina em <strong>${d.days} dia(s)</strong> (${d.date}).</p>
<p>Para continuar usando o StandControl sem interrupção, acesse sua assinatura e ative um plano.</p>
<p><a href="${d.billing_url}">Ativar plano agora →</a></p>`,
  }),
  invoice_overdue: (d) => ({
    subject: `Fatura em atraso — StandControl`,
    html: `<p>Olá, <strong>${d.name}</strong>!</p>
<p>Sua fatura de <strong>R$ ${d.amount}</strong> com vencimento em <strong>${d.date}</strong> está em atraso.</p>
<p>Regularize para evitar a suspensão do acesso.</p>
<p><a href="${d.billing_url}">Pagar fatura →</a></p>`,
  }),
  document_expiring: (d) => ({
    subject: `Documento expirando — ${d.client_name}`,
    html: `<p>Olá, <strong>${d.name}</strong>!</p>
<p>O documento <strong>${d.doc_type}</strong> do atirador <strong>${d.client_name}</strong> vence em <strong>${d.days} dia(s)</strong>.</p>
<p>Acesse a plataforma para providenciar a renovação.</p>`,
  }),
  invite: (d) => ({
    subject: `Você foi convidado para o StandControl`,
    html: `<p>Olá, <strong>${d.name}</strong>!</p>
<p>Você foi adicionado ao workspace de <strong>${d.company_name}</strong> no StandControl como <strong>${d.role}</strong>.</p>
<p><a href="${d.invite_url}">Definir minha senha e acessar →</a></p>`,
  }),
};

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const authHeader = req.headers.get("Authorization");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const resendKey = Deno.env.get("RESEND_API_KEY");

  // Allow service-role calls (from cron) or authenticated user calls
  const isServiceCall = req.headers.get("x-service-key") === serviceKey;
  if (!isServiceCall && !authHeader) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    serviceKey
  );

  try {
    const payload = await req.json() as NotificationPayload;
    const { type, to_email, to_name, data = {} } = payload;

    const templateFn = templates[type];
    if (!templateFn) return new Response("Unknown notification type", { status: 400 });

    const { subject, html } = templateFn({ name: to_name, ...data });

    // Send via Resend if configured, otherwise log
    if (resendKey) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "StandControl <noreply@standcontrol.com.br>",
          to: [to_email],
          subject,
          html,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Resend error: ${err}`);
      }
    } else {
      // Log to audit_logs when email provider not configured
      await supabase.from("audit_logs").insert({
        company_id: payload.company_id,
        action: "notification_sent",
        entity_type: "notification",
        details: { type, to_email, subject, simulated: !resendKey },
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ ok: true, simulated: !resendKey }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
