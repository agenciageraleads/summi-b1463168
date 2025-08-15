
// ABOUTME: Edge Function para deletar conta de usuário com sequência transacional correta
// ABOUTME: Implementa ordem segura: Evolution API → Dados Supabase → Auth Users

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
    console.log(`[DELETE-ACCOUNT] 🗑️ Iniciando função de exclusão de conta`);
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error('[DELETE-ACCOUNT] ❌ Token de autorização não fornecido');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Token de autorização obrigatório' 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Extrair dados da requisição 
    const requestBody = await req.json();
    const targetUserId = requestBody.target_user_id;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    console.log(`[DELETE-ACCOUNT] 🔍 Verificando autenticação do usuário...`);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('[DELETE-ACCOUNT] ❌ Token inválido:', authError?.message);
      return new Response(JSON.stringify({
        success: false,
        error: "Token inválido ou sessão expirada"
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Verificar se é admin (para exclusão de outros usuários) ou usuário excluindo própria conta
    const { data: isAdminData } = await supabaseAdmin.rpc('is_admin', { user_id: user.id });
    const isAdmin = !!isAdminData;
    const userId = user.id;
    const finalTargetUserId = requestBody.target_user_id || userId;

    console.log(`[DELETE-ACCOUNT] 👤 Usuário autenticado: ${userId} (admin: ${isAdmin})`);
    console.log(`[DELETE-ACCOUNT] 🎯 Usuário alvo: ${finalTargetUserId}`);

    if (requestBody.target_user_id && !isAdmin) {
      console.error('[DELETE-ACCOUNT] ❌ Usuário não admin tentando deletar outro usuário');
      return new Response(JSON.stringify({
        success: false,
        error: "Apenas administradores podem excluir contas de outros usuários"
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // AUDITORIA: Log de segurança crítico
    console.log(`[SECURITY-AUDIT] ${new Date().toISOString()} - DELETE_ACCOUNT_ATTEMPT - User: ${userId} (admin: ${isAdmin}) targeting: ${finalTargetUserId}`);

    // Buscar dados do usuário a ser deletado
    console.log(`[DELETE-ACCOUNT] 🔍 Buscando dados do usuário: ${finalTargetUserId}`);
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('instance_name, nome, email, numero')
      .eq('id', finalTargetUserId)
      .single();

    if (profileError || !profile) {
      console.error('[DELETE-ACCOUNT] ❌ Perfil não encontrado:', profileError?.message);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Usuário não encontrado" 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`[DELETE-ACCOUNT] 📋 Perfil encontrado: ${profile.nome} (${profile.email})`);

    // 1º) Deletar instância na Evolution API (se existir)
    if (profile.instance_name) {
      console.log(`[DELETE-ACCOUNT] 🔗 Deletando instância Evolution: ${profile.instance_name}`);
      
      try {
        const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");
        const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");
        
        if (!evolutionApiUrl || !evolutionApiKey) {
          console.warn('[DELETE-ACCOUNT] ⚠️ Evolution API não configurada, pulando exclusão da instância');
        } else {
          const cleanApiUrl = evolutionApiUrl.replace(/\/$/, '');
          const deleteInstanceResponse = await fetch(`${cleanApiUrl}/instance/delete/${profile.instance_name}`, {
            method: 'DELETE',
            headers: { 'apikey': evolutionApiKey },
            signal: AbortSignal.timeout(10000) // 10s timeout
          });
          
          if (deleteInstanceResponse.ok || deleteInstanceResponse.status === 404) {
            console.log(`[DELETE-ACCOUNT] ✅ Instância Evolution deletada: ${profile.instance_name}`);
          } else {
            const errorText = await deleteInstanceResponse.text();
            console.warn(`[DELETE-ACCOUNT] ⚠️ Falha ao deletar instância Evolution: ${deleteInstanceResponse.status} - ${errorText}`);
          }
        }
      } catch (evolutionError) {
        console.warn(`[DELETE-ACCOUNT] ⚠️ Erro ao deletar instância Evolution:`, evolutionError.message);
      }
    }

    // 2º) Deletar dados relacionados no Supabase
    const tablesToClean = [
      'chats',
      'feedback', 
      'subscribers',
      'monitored_whatsapp_groups',
      'user_calendars',
      'whatsapp_groups_cache'
    ];

    console.log(`[DELETE-ACCOUNT] 🧹 Limpando ${tablesToClean.length} tabelas relacionadas...`);

    for (const table of tablesToClean) {
      try {
        const userIdField = table === 'chats' ? 'id_usuario' : 'user_id';
        const { error: deleteError } = await supabaseAdmin
          .from(table)
          .delete()
          .eq(userIdField, finalTargetUserId);

        if (deleteError) {
          console.warn(`[DELETE-ACCOUNT] ⚠️ Erro ao limpar tabela ${table}:`, deleteError.message);
        } else {
          console.log(`[DELETE-ACCOUNT] ✅ Dados limpos da tabela: ${table}`);
        }
      } catch (error) {
        console.warn(`[DELETE-ACCOUNT] ⚠️ Erro ao processar tabela ${table}:`, error.message);
      }
    }

    // 3º) Deletar perfil
    console.log(`[DELETE-ACCOUNT] 👤 Deletando perfil do usuário...`);
    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', finalTargetUserId);

    if (profileDeleteError) {
      console.error('[DELETE-ACCOUNT] ❌ Erro ao deletar perfil:', profileDeleteError.message);
      return new Response(JSON.stringify({
        success: false,
        error: 'Erro ao deletar perfil do usuário'
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`[DELETE-ACCOUNT] ✅ Perfil deletado: ${finalTargetUserId}`);

    // 4º) Deletar usuário da auth (apenas se não for admin fazendo exclusão de outro usuário)
    if (!isAdmin || finalTargetUserId === userId) {
      console.log(`[DELETE-ACCOUNT] 🔐 Deletando usuário da autenticação...`);
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(finalTargetUserId);
      
      if (authDeleteError) {
        console.error('[DELETE-ACCOUNT] ❌ Erro ao deletar usuário da auth:', authDeleteError.message);
        return new Response(JSON.stringify({
          success: false,
          error: 'Erro ao deletar conta de autenticação'
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      console.log(`[DELETE-ACCOUNT] ✅ Usuário deletado da auth: ${finalTargetUserId}`);
    } else {
      console.log(`[DELETE-ACCOUNT] 🔒 Admin deletion - mantendo auth do usuário: ${finalTargetUserId}`);
    }

    // Log final de auditoria
    console.log(`[SECURITY-AUDIT] ${new Date().toISOString()} - DELETE_ACCOUNT_SUCCESS - User: ${userId} (admin: ${isAdmin}) deleted: ${finalTargetUserId} (${profile.email})`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: isAdmin && finalTargetUserId !== userId ? 'Usuário deletado pelo admin com sucesso' : 'Conta deletada com sucesso'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('Erro inesperado:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Erro interno do servidor" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
