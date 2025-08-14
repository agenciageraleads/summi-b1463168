// ABOUTME: Edge Function para promover/remover usuários do programa beta
// ABOUTME: Funcionalidade limpa e simples para gestão de usuários beta

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = (level: string, message: string, data?: any) => {
  console.log(`[${level.toUpperCase()}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    log('info', 'Iniciando promote-user-beta');

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autorização necessário' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);

    if (authError || !user) {
      log('error', 'Erro de autenticação', authError);
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify admin privileges
    const { data: adminCheck, error: adminError } = await supabase
      .rpc('is_admin', { user_id: user.id });

    if (adminError || !adminCheck) {
      log('error', 'Usuário não é admin', { userId: user.id, adminError });
      
      // Log security violation
      await supabase.from('security_audit_log').insert({
        user_id: user.id,
        event_type: 'unauthorized_beta_promotion_attempt',
        event_details: {
          attempted_action: 'promote_user_beta',
          blocked_reason: 'insufficient_privileges'
        },
        severity: 'high'
      });

      return new Response(
        JSON.stringify({ error: 'Acesso negado: Apenas administradores podem promover usuários beta' }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Parse request body
    const { userId, action } = await req.json();

    if (!userId || !action) {
      return new Response(
        JSON.stringify({ error: 'userId e action são obrigatórios' }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!['promote', 'remove'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'action deve ser "promote" ou "remove"' }),
        { status: 400, headers: corsHeaders }
      );
    }

    log('info', 'Processando ação beta', { userId, action, adminId: user.id });

    // Get target user profile
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('nome, role, instance_name')
      .eq('id', userId)
      .single();

    if (userError || !targetUser) {
      log('error', 'Usuário alvo não encontrado', { userId, userError });
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Determine new role
    const newRole = action === 'promote' ? 'beta' : 'user';
    
    // Update user role
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (updateError) {
      log('error', 'Erro ao atualizar role do usuário', { userId, newRole, updateError });
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar usuário' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Log the action
    await supabase.from('security_audit_log').insert({
      user_id: userId,
      event_type: 'beta_role_change',
      event_details: {
        old_role: targetUser.role,
        new_role: newRole,
        action: action,
        admin_id: user.id,
        admin_action: `User ${action === 'promote' ? 'promoted to' : 'removed from'} beta`,
        target_user_name: targetUser.nome,
        timestamp: new Date().toISOString()
      },
      severity: 'medium'
    });

    // Update webhook if user has instance (only if needed)
    if (targetUser.instance_name) {
      try {
        log('info', 'Atualizando webhook para instância', { 
          instanceName: targetUser.instance_name, 
          newRole 
        });

        // Call Evolution API to update webhook
        const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
        const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');

        if (evolutionApiUrl && evolutionApiKey) {
          const webhookUrl = newRole === 'beta' 
            ? Deno.env.get('WEBHOOK_N8N_ANALISA_MENSAGENS')
            : Deno.env.get('WEBHOOK_N8N_RECEBE_MENSAGEM');

          const response = await fetch(`${evolutionApiUrl}/webhook/set/${targetUser.instance_name}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': evolutionApiKey,
            },
            body: JSON.stringify({
              url: webhookUrl,
              webhook_by_events: false,
              webhook_base64: false,
              events: [
                "APPLICATION_STARTUP",
                "QRCODE_UPDATED", 
                "CONNECTION_UPDATE",
                "MESSAGES_UPSERT",
                "MESSAGES_UPDATE",
                "MESSAGES_DELETE",
                "SEND_MESSAGE",
                "CONTACTS_SET",
                "CONTACTS_UPSERT",
                "CONTACTS_UPDATE",
                "PRESENCE_UPDATE",
                "CHATS_SET",
                "CHATS_UPSERT",
                "CHATS_UPDATE",
                "CHATS_DELETE",
                "GROUPS_UPSERT",
                "GROUP_UPDATE",
                "GROUP_PARTICIPANTS_UPDATE",
                "NEW_JWT_TOKEN"
              ]
            })
          });

          if (!response.ok) {
            log('warn', 'Falha ao atualizar webhook da Evolution API', {
              status: response.status,
              instanceName: targetUser.instance_name
            });
          } else {
            log('info', 'Webhook atualizado com sucesso', {
              instanceName: targetUser.instance_name,
              newWebhookUrl: webhookUrl
            });
          }
        }
      } catch (webhookError) {
        log('warn', 'Erro ao atualizar webhook (não crítico)', webhookError);
      }
    }

    const successMessage = action === 'promote' 
      ? `Usuário ${targetUser.nome} promovido para BETA com sucesso`
      : `Usuário ${targetUser.nome} removido do programa BETA`;

    log('info', 'Ação beta concluída com sucesso', { 
      userId, 
      action, 
      newRole, 
      targetUserName: targetUser.nome 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: successMessage,
        userId,
        newRole,
        userName: targetUser.nome
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    log('error', 'Erro inesperado na função promote-user-beta', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});