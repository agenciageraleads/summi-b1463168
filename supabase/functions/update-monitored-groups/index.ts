
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[UPDATE-MONITORED-GROUPS] Função iniciada');

    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!supabaseServiceKey || !supabaseUrl) {
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor não encontrada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Usar service role para operações administrativas
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '');

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autorização necessário' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('[UPDATE-MONITORED-GROUPS] Erro de autenticação:', userError)
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se o usuário é admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      console.error('[UPDATE-MONITORED-GROUPS] Usuário não é admin:', profileError)
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas administradores podem acessar esta funcionalidade.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userId, groupId, groupName, action } = await req.json()
    
    if (!userId || !groupId || !action) {
      return new Response(
        JSON.stringify({ error: 'userId, groupId e action são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[UPDATE-MONITORED-GROUPS] Ação:', action, 'para grupo:', groupId, 'usuário:', userId);

    if (action === 'add') {
      // Verificar se já não existe 3 grupos monitorados para este usuário usando service role
      const { count: currentCount } = await supabaseAdmin
        .from('monitored_whatsapp_groups')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      if (currentCount && currentCount >= 3) {
        return new Response(
          JSON.stringify({ error: 'Limite máximo de 3 grupos monitorados atingido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Adicionar grupo monitorado usando service role
      const { data, error } = await supabaseAdmin
        .from('monitored_whatsapp_groups')
        .insert({
          user_id: userId,
          group_id: groupId,
          group_name: groupName || 'Grupo sem nome'
        })
        .select()

      if (error) {
        console.error('[UPDATE-MONITORED-GROUPS] Erro ao adicionar grupo:', error)
        return new Response(
          JSON.stringify({ error: 'Erro ao adicionar grupo para monitoramento' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('[UPDATE-MONITORED-GROUPS] Grupo adicionado com sucesso:', data)

    } else if (action === 'remove') {
      // Remover grupo monitorado usando service role
      const { data, error } = await supabaseAdmin
        .from('monitored_whatsapp_groups')
        .delete()
        .eq('user_id', userId)
        .eq('group_id', groupId)
        .select()

      if (error) {
        console.error('[UPDATE-MONITORED-GROUPS] Erro ao remover grupo:', error)
        return new Response(
          JSON.stringify({ error: 'Erro ao remover grupo do monitoramento' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('[UPDATE-MONITORED-GROUPS] Grupo removido com sucesso:', data)

    } else {
      return new Response(
        JSON.stringify({ error: 'Ação inválida. Use "add" ou "remove"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Grupo ${action === 'add' ? 'adicionado ao' : 'removido do'} monitoramento com sucesso` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[UPDATE-MONITORED-GROUPS] Erro inesperado:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
