import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { extractAttribution, insertGrowthEvent } from "../_shared/growth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const eventType = typeof body?.eventType === "string" ? body.eventType.trim() : "";

    if (!eventType) {
      throw new Error("eventType é obrigatório");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });

    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      const { data: userData } = await supabaseAuth.auth.getUser(token);
      userId = userData.user?.id ?? null;
    }

    const attribution = extractAttribution(body);

    await insertGrowthEvent(supabaseAdmin, {
      eventType,
      dedupeKey: typeof body?.dedupeKey === "string" ? body.dedupeKey : null,
      userId,
      leadKey: attribution.leadKey,
      planContext: typeof body?.planContext === "string" ? body.planContext : null,
      source: attribution.source,
      medium: attribution.medium,
      campaign: attribution.campaign,
      content: attribution.content,
      term: attribution.term,
      referralCode: attribution.referralCode,
      metadata: typeof body?.metadata === "object" && body.metadata ? body.metadata : {},
      occurredAt: typeof body?.occurredAt === "string" ? body.occurredAt : null,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro interno do servidor",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
