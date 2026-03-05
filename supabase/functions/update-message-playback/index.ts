
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[UPDATE-MESSAGE-PLAYBACK] Função iniciada');

    // Verificar autenticação primeiro
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autorização necessário' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Criar cliente Supabase com o token do usuário
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

    // Verificar se o usuário está autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      console.error('[UPDATE-MESSAGE-PLAYBACK] Erro de autenticação:', userError)
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('[UPDATE-MESSAGE-PLAYBACK] Usuário autenticado:', user.id);

    const { chatId, messageId, status } = await req.json()

    // Validar parâmetros
    if (!chatId || !messageId || !status) {
      return new Response(
        JSON.stringify({ error: 'chatId, messageId e status são obrigatórios' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!['started', 'completed'].includes(status)) {
      return new Response(
        JSON.stringify({ error: 'status deve ser "started" ou "completed"' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('[UPDATE-MESSAGE-PLAYBACK] Atualizando messageId:', messageId, 'com status:', status);

    // Buscar o chat primeiro para verificar se pertence ao usuário
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('id, id_usuario, conversa')
      .eq('id', chatId)
      .single()

    if (chatError || !chat) {
      console.error('[UPDATE-MESSAGE-PLAYBACK] Chat não encontrado:', chatError)
      return new Response(
        JSON.stringify({ error: 'Chat não encontrado' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Verificar se o chat pertence ao usuário autenticado
    if (chat.id_usuario !== user.id) {
      console.error('[UPDATE-MESSAGE-PLAYBACK] Usuário não autorizado para este chat');
      return new Response(
        JSON.stringify({ error: 'Você não tem permissão para atualizar este chat' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Atualizar o status de reprodução no JSONB array conversa
    const conversa = Array.isArray(chat.conversa) ? chat.conversa : [];
    let found = false;

    const updatedConversa = conversa.map((event: any) => {
      if (event.message_id === messageId) {
        found = true;
        return {
          ...event,
          audio_playback_status: status
        };
      }
      return event;
    });

    if (!found) {
      console.warn('[UPDATE-MESSAGE-PLAYBACK] Mensagem não encontrada no conversa:', messageId);
      return new Response(
        JSON.stringify({ error: 'Mensagem não encontrada no conversa' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Salvar conversa atualizada
    const { data: updatedChat, error: updateError } = await supabase
      .from('chats')
      .update({ conversa: updatedConversa })
      .eq('id', chatId)
      .select()
      .single()

    if (updateError) {
      console.error('[UPDATE-MESSAGE-PLAYBACK] Erro ao atualizar:', updateError)
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar status de reprodução' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('[UPDATE-MESSAGE-PLAYBACK] Status atualizado com sucesso:', { messageId, status })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Status de reprodução atualizado com sucesso',
        messageId,
        status
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('[UPDATE-MESSAGE-PLAYBACK] Erro inesperado:', error)
    return new Response(
      JSON.stringify({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
