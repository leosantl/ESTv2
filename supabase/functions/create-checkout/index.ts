import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  );

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_ANON_KEY") || "",
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return new Response("Unauthorized", { status: 401 });

  try {
    const { company_id, plan_id, billing } = await req.json() as {
      company_id: string;
      plan_id: "starter" | "professional" | "enterprise";
      billing: "monthly" | "annual";
    };

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.company_id !== company_id || !["company_admin", "super_admin"].includes(profile.role)) {
      return new Response("Forbidden", { status: 403 });
    }

    const { data: company } = await supabase
      .from("companies")
      .select("razao_social, email, cnpj, telefone")
      .eq("id", company_id)
      .single();

    if (!company) return new Response("Company not found", { status: 404 });

    const { data: plan } = await supabase
      .from("plans")
      .select("name, monthly_price, annual_price")
      .eq("id", plan_id)
      .single();

    if (!plan) return new Response("Plan not found", { status: 404 });

    const asaasKey = Deno.env.get("ASAAS_API_KEY");
    const asaasEnv = Deno.env.get("ASAAS_ENV") || "sandbox";
    const baseUrl = asaasEnv === "production"
      ? "https://api.asaas.com/v3"
      : "https://sandbox.asaas.com/api/v3";

    if (!asaasKey) {
      return new Response(
        JSON.stringify({ checkout_url: null, message: "Pagamento não configurado. Entre em contato: financeiro@standcontrol.com.br" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create or retrieve Asaas customer
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("asaas_sub_id")
      .eq("company_id", company_id)
      .single();

    let asaasCustomerId: string | null = null;

    // Search existing customer by email
    const searchRes = await fetch(`${baseUrl}/customers?email=${encodeURIComponent(company.email)}`, {
      headers: { access_token: asaasKey },
    });
    const searchData = await searchRes.json();
    if (searchData.data?.length > 0) {
      asaasCustomerId = searchData.data[0].id;
    } else {
      // Create new customer
      const createRes = await fetch(`${baseUrl}/customers`, {
        method: "POST",
        headers: { access_token: asaasKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: company.razao_social,
          email: company.email,
          cpfCnpj: company.cnpj?.replace(/\D/g, "") || undefined,
          mobilePhone: company.telefone?.replace(/\D/g, "") || undefined,
        }),
      });
      const createData = await createRes.json();
      asaasCustomerId = createData.id;
    }

    const price = billing === "annual" ? plan.annual_price : plan.monthly_price;
    const cycle = billing === "annual" ? "YEARLY" : "MONTHLY";

    // Create subscription in Asaas
    const subRes = await fetch(`${baseUrl}/subscriptions`, {
      method: "POST",
      headers: { access_token: asaasKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: "BOLETO",
        value: price / 100,
        nextDueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        cycle,
        description: `StandControl ${plan.name} — ${billing === "annual" ? "Anual" : "Mensal"}`,
        externalReference: company_id,
      }),
    });
    const subData = await subRes.json();

    if (subData.id) {
      await supabase
        .from("subscriptions")
        .update({ plan_id, asaas_sub_id: subData.id, status: "active", trial: false })
        .eq("company_id", company_id);
    }

    // Get payment link if available
    const checkoutUrl = subData.bankSlipUrl || subData.invoiceUrl || null;

    return new Response(
      JSON.stringify({ checkout_url: checkoutUrl, asaas_sub_id: subData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
