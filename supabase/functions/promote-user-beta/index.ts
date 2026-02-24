// ABOUTME: Edge Function para promover/remover usuários do programa beta
// ABOUTME: Funcionalidade limpa e simples para gestão de usuários beta

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    log('info', 'Iniciando promote-user-beta');

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error('[ERROR] Falha na autenticação:', authError);
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    log('info', 'Usuário autenticado', { userId: user.id });

    // Check if requesting user is admin - DIRECT QUERY WITHOUT is_admin()
    const { data: adminProfile, error: adminError } = await supabaseClient
      .from('profiles')
      .select('role, nome')
      .eq('id', user.id)
      .single();

    if (adminError || !adminProfile) {
      console.error('[ERROR] Erro ao verificar perfil admin:', adminError);
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar permissões administrativas' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    if (adminProfile.role !== 'admin') {
      console.error('[ERROR] Acesso negado - usuário não é admin:', { 
        userId: user.id, 
        userRole: adminProfile.role 
      });
      
      // Log unauthorized access attempt
      await supabaseClient
        .from('security_audit_log')
        .insert({
          user_id: user.id,
          event_type: 'unauthorized_beta_promotion_attempt',
          event_details: {
            attempted_action: 'promote_user_beta',
            user_role: adminProfile.role
          },
          severity: 'high'
        });

      return new Response(
        JSON.stringify({ error: 'Acesso negado: apenas administradores podem promover usuários' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403 
        }
      );
    }

    log('info', 'Admin verificado com sucesso', { userId: user.id });

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
    const { data: targetUser, error: userError } = await supabaseClient
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
    const { error: updateError } = await supabaseClient
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
    await supabaseClient.from('security_audit_log').insert({
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
          // Mantem compatibilidade com envs antigas do n8n:
          // - beta: pode apontar para um endpoint que faz ingestao + analise
          // - user: pode apontar para um endpoint so de ingestao
          const webhookUrl = newRole === 'beta'
            ? (Deno.env.get('WEBHOOK_ANALISA_MENSAGENS') ?? Deno.env.get('WEBHOOK_N8N_ANALISA_MENSAGENS'))
            : (Deno.env.get('WEBHOOK_RECEBE_MENSAGEM') ?? Deno.env.get('WEBHOOK_N8N_RECEBE_MENSAGEM'));

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
        details: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
