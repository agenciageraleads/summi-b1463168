// ABOUTME: Remove privilégios admin indevidos (profiles.role='admin') fora da allowlist (ADMIN_ALLOWLIST).
// ABOUTME: Requer autenticação e que o usuário esteja na allowlist.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const parseAllowlist = (raw: string | undefined) => {
  const out: string[] = [];
  if (!raw) return out;
  for (const item of raw.split(/[\s,]+/g)) {
    const trimmed = item.trim();
    if (trimmed) out.push(trimmed);
  }
  return Array.from(new Set(out));
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Token de autorização obrigatório" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allowlist = parseAllowlist(Deno.env.get("ADMIN_ALLOWLIST"));
    if (allowlist.length === 0) {
      return new Response(JSON.stringify({ error: "ADMIN_ALLOWLIST não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Configuração do Supabase não encontrada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Autenticar usuário chamador
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Token inválido ou sessão expirada" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = authData.user.id;
    if (!allowlist.includes(callerId)) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cliente admin (service role) para operar no banco
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const inList = `(${allowlist.join(",")})`;

    const { data: demoted, error: demoteError } = await supabaseAdmin
      .from("profiles")
      .update({ role: "user" })
      .eq("role", "admin")
      .not("id", "in", inList)
      .select("id, role");

    if (demoteError) {
      return new Response(JSON.stringify({ error: "Falha ao rebaixar admins", details: demoteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const demotedIds = (demoted ?? []).map((row: any) => row.id).filter(Boolean);

    // Tentar registrar auditoria (best-effort)
    try {
      if (demotedIds.length > 0) {
        await supabaseAdmin.from("security_audit_log").insert({
          user_id: callerId,
          event_type: "admin_cleanup_executed",
          event_details: { demoted_user_ids: demotedIds, allowlist_count: allowlist.length },
          severity: "high",
        });
      }
    } catch {
      // ignore
    }

    return new Response(
      JSON.stringify({
        success: true,
        demoted_count: demotedIds.length,
        demoted_user_ids: demotedIds,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

