import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const auth = req.headers.get("Authorization");
  if (!auth) return new Response("Unauthorized", { status: 401 });

  const token = auth.replace("Bearer ", "");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  try {
    const { email, nome, role, company_id } = await req.json();

    // Validar caller role e limites do plano
    const { data: caller } = await supabase
      .from("profiles")
      .select("role, company_id")
      .eq("id", (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (!caller || (caller.role !== "company_admin" && caller.role !== "super_admin")) {
      return new Response(JSON.stringify({ error: "Permission denied" }), { status: 403 });
    }

    if (caller.role === "company_admin" && caller.company_id !== company_id) {
      return new Response(JSON.stringify({ error: "Cannot invite to other company" }), { status: 403 });
    }

    // Check plan limits
    const { data: limits } = await supabase.rpc("check_plan_limits", { p_company_id: company_id });
    if (!limits?.can_add_user) {
      return new Response(JSON.stringify({ error: "Plan user limit reached" }), { status: 400 });
    }

    // Invite via Supabase Auth
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${Deno.env.get("INVITE_REDIRECT_URL") || "https://app.standcontrol.com"}/invite`,
      data: { nome, role, company_id },
    });

    if (error) throw error;

    // Log audit
    await supabase.from("audit_logs").insert({
      company_id,
      action: "create",
      table_name: "profiles",
      new_data: { email, nome, role },
    });

    return new Response(JSON.stringify({ user: data.user }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
