// ABOUTME: Edge Function para criar anúncios administrativos
// ABOUTME: Valida permissões de admin e cria registros na tabela admin_announcements

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[CREATE-ANNOUNCEMENT] 📢 Iniciando criação de anúncio`);
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error('[CREATE-ANNOUNCEMENT] ❌ Token de autorização não fornecido');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Token de autorização obrigatório' 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('[CREATE-ANNOUNCEMENT] ❌ Token inválido:', authError?.message);
      return new Response(JSON.stringify({
        success: false,
        error: "Token inválido ou sessão expirada"
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Verificar se é admin
    const { data: isAdminData } = await supabaseAdmin.rpc('verify_admin_access', { user_id: user.id });
    if (!isAdminData) {
      console.error('[CREATE-ANNOUNCEMENT] ❌ Usuário não é admin:', user.id);
      return new Response(JSON.stringify({
        success: false,
        error: "Apenas administradores podem criar anúncios"
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Extrair dados da requisição
    const { title, message, send_via_email, send_via_whatsapp } = await req.json();

    if (!title?.trim() || !message?.trim()) {
      return new Response(JSON.stringify({
        success: false,
        error: "Título e mensagem são obrigatórios"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!send_via_email && !send_via_whatsapp) {
      return new Response(JSON.stringify({
        success: false,
        error: "Selecione pelo menos um método de envio"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Contar recipients
    const { count: recipientsCount } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Criar anúncio
    const { data: announcement, error: createError } = await supabaseAdmin
      .from('admin_announcements')
      .insert({
        title: title.trim(),
        message: message.trim(),
        send_via_email: !!send_via_email,
        send_via_whatsapp: !!send_via_whatsapp,
        created_by: user.id,
        recipients_count: recipientsCount || 0,
        status: 'draft'
      })
      .select()
      .single();

    if (createError) {
      console.error('[CREATE-ANNOUNCEMENT] ❌ Erro ao criar anúncio:', createError);
      return new Response(JSON.stringify({
        success: false,
        error: "Erro ao criar anúncio"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`[CREATE-ANNOUNCEMENT] ✅ Anúncio criado: ${announcement.id}`);

    return new Response(JSON.stringify({ 
      success: true, 
      announcement
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('[CREATE-ANNOUNCEMENT] Erro inesperado:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Erro interno do servidor" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});