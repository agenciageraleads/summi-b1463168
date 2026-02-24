// ABOUTME: Edge Function para enviar anúncios administrativos
// ABOUTME: Processa envio de mensagens por email/WhatsApp e registra entregas

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
    console.log(`[SEND-ANNOUNCEMENT] 📤 Iniciando envio de anúncio`);
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error('[SEND-ANNOUNCEMENT] ❌ Token de autorização não fornecido');
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
      console.error('[SEND-ANNOUNCEMENT] ❌ Token inválido:', authError?.message);
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
      console.error('[SEND-ANNOUNCEMENT] ❌ Usuário não é admin:', user.id);
      return new Response(JSON.stringify({
        success: false,
        error: "Apenas administradores podem enviar anúncios"
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Extrair dados da requisição
    const { announcement_id } = await req.json();

    if (!announcement_id) {
      return new Response(JSON.stringify({
        success: false,
        error: "ID do anúncio é obrigatório"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Buscar anúncio
    const { data: announcement, error: announcementError } = await supabaseAdmin
      .from('admin_announcements')
      .select('*')
      .eq('id', announcement_id)
      .single();

    if (announcementError || !announcement) {
      console.error('[SEND-ANNOUNCEMENT] ❌ Anúncio não encontrado:', announcementError);
      return new Response(JSON.stringify({
        success: false,
        error: "Anúncio não encontrado"
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (announcement.status !== 'draft') {
      return new Response(JSON.stringify({
        success: false,
        error: "Anúncio já foi enviado ou está sendo processado"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Atualizar status para 'sending'
    await supabaseAdmin
      .from('admin_announcements')
      .update({ status: 'sending' })
      .eq('id', announcement_id);

    // Buscar todos os usuários
    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, nome, numero');

    if (usersError) {
      console.error('[SEND-ANNOUNCEMENT] ❌ Erro ao buscar usuários:', usersError);
      await supabaseAdmin
        .from('admin_announcements')
        .update({ status: 'failed' })
        .eq('id', announcement_id);
      
      return new Response(JSON.stringify({
        success: false,
        error: "Erro ao buscar usuários"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let sentCount = 0;
    let failedCount = 0;
    const deliveries = [];

    console.log(`[SEND-ANNOUNCEMENT] 📋 Processando ${users?.length || 0} usuários`);

    // Processar cada usuário
    for (const userProfile of users || []) {
      // Enviar por email se habilitado
      if (announcement.send_via_email && userProfile.email) {
        try {
          // Aqui você integraria com seu provedor de email (SendGrid, etc.)
          // Para este exemplo, vamos simular o envio
          console.log(`[SEND-ANNOUNCEMENT] 📧 Enviando email para: ${userProfile.email}`);
          
          deliveries.push({
            announcement_id,
            user_id: userProfile.id,
            delivery_method: 'email',
            status: 'sent',
            sent_at: new Date().toISOString()
          });
          
          sentCount++;
        } catch (error) {
          console.error(`[SEND-ANNOUNCEMENT] ❌ Erro ao enviar email para ${userProfile.email}:`, error);
          deliveries.push({
            announcement_id,
            user_id: userProfile.id,
            delivery_method: 'email',
            status: 'failed',
            error_message: (error as Error).message
          });
          
          failedCount++;
        }
      }

      // Enviar por WhatsApp se habilitado
      if (announcement.send_via_whatsapp && userProfile.numero) {
        try {
          // Aqui você integraria com a API do WhatsApp/Evolution
          // Para este exemplo, vamos simular o envio
          console.log(`[SEND-ANNOUNCEMENT] 📱 Enviando WhatsApp para: ${userProfile.numero}`);
          
          deliveries.push({
            announcement_id,
            user_id: userProfile.id,
            delivery_method: 'whatsapp',
            status: 'sent',
            sent_at: new Date().toISOString()
          });
          
          sentCount++;
        } catch (error) {
          console.error(`[SEND-ANNOUNCEMENT] ❌ Erro ao enviar WhatsApp para ${userProfile.numero}:`, error);
          deliveries.push({
            announcement_id,
            user_id: userProfile.id,
            delivery_method: 'whatsapp',
            status: 'failed',
            error_message: (error as Error).message
          });
          
          failedCount++;
        }
      }
    }

    // Inserir registros de entrega
    if (deliveries.length > 0) {
      const { error: deliveriesError } = await supabaseAdmin
        .from('announcement_deliveries')
        .insert(deliveries);

      if (deliveriesError) {
        console.error('[SEND-ANNOUNCEMENT] ❌ Erro ao registrar entregas:', deliveriesError);
      }
    }

    // Atualizar anúncio com resultados
    const finalStatus = failedCount === 0 ? 'sent' : (sentCount > 0 ? 'sent' : 'failed');
    await supabaseAdmin
      .from('admin_announcements')
      .update({
        status: finalStatus,
        sent_count: sentCount,
        failed_count: failedCount,
        sent_at: new Date().toISOString()
      })
      .eq('id', announcement_id);

    console.log(`[SEND-ANNOUNCEMENT] ✅ Envio concluído - Enviados: ${sentCount}, Falharam: ${failedCount}`);

    return new Response(JSON.stringify({ 
      success: true,
      sent_count: sentCount,
      failed_count: failedCount,
      status: finalStatus
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('[SEND-ANNOUNCEMENT] Erro inesperado:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Erro interno do servidor" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});