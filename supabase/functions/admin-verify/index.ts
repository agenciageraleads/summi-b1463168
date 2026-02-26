// ABOUTME: Verifica acesso administrativo via allowlist em secrets (ADMIN_ALLOWLIST).
// ABOUTME: Retorna is_admin baseado no user.id autenticado. Fallback: allowlist_configured=false.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const parseAllowlist = (raw: string | undefined) => {
  const out = new Set<string>();
  if (!raw) return out;
  for (const item of raw.split(/[\s,]+/g)) {
    const trimmed = item.trim();
    if (trimmed) out.add(trimmed);
  }
  return out;
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: "Configuração do Supabase não encontrada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const allowlist = parseAllowlist(Deno.env.get("ADMIN_ALLOWLIST"));
    const allowlistConfigured = allowlist.size > 0;

    if (!allowlistConfigured) {
      return new Response(
        JSON.stringify({
          is_admin: null,
          allowlist_configured: false,
          user_id: authData.user.id,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isAdmin = allowlist.has(authData.user.id);
    return new Response(
      JSON.stringify({
        is_admin: isAdmin,
        allowlist_configured: true,
        user_id: authData.user.id,
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

