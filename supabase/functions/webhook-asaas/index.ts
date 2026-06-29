import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  // Validate webhook token
  const token = req.headers.get("x-asaas-webhook-token");
  if (token !== Deno.env.get("ASAAS_WEBHOOK_TOKEN")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  );

  try {
    const payload = await req.json() as Record<string, unknown>;
    const event = payload.event as string;
    const data = payload.data as Record<string, unknown>;

    const chargeId = data.id as string;
    const { data: invoice } = await supabase
      .from("invoices")
      .select("*")
      .eq("asaas_charge_id", chargeId)
      .single()
      .catch(() => ({ data: null }));

    if (!invoice) return new Response("OK", { status: 200 });

    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      // Mark as paid and create payment record
      await supabase.from("invoices").update({
        status: "paga",
        paid_at: new Date().toISOString(),
      }).eq("id", invoice.id);

      await supabase.from("payments").insert({
        invoice_id: invoice.id,
        valor: data.value || invoice.valor,
        forma_pagamento: data.billingType || "automatic",
        asaas_payment_id: chargeId,
      });

      // Reactivate company if suspended
      await supabase.from("companies").update({ status: "active" })
        .eq("id", invoice.company_id)
        .eq("status", "overdue");

    } else if (event === "PAYMENT_OVERDUE") {
      await supabase.from("invoices").update({
        status: "atrasada",
      }).eq("id", invoice.id);

    } else if (event === "SUBSCRIPTION_CANCELLED") {
      const { data: invoices } = await supabase.from("invoices")
        .select("company_id")
        .eq("asaas_charge_id", chargeId);

      if (invoices?.[0]) {
        await supabase.from("companies").update({ status: "cancelled" })
          .eq("id", invoices[0].company_id);
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
