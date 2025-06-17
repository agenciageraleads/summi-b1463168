
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
    console.log('[GET-MONITORED-GROUPS] Função iniciada');

    // Criar cliente Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    // Verificar autenticação
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

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      console.error('[GET-MONITORED-GROUPS] Erro de autenticação:', userError)
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Verificar se o usuário é admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      console.error('[GET-MONITORED-GROUPS] Usuário não é admin:', profileError)
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas administradores podem acessar esta funcionalidade.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const { target_user_id } = await req.json()
    
    if (!target_user_id) {
      return new Response(
        JSON.stringify({ error: 'target_user_id é obrigatório' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('[GET-MONITORED-GROUPS] Buscando grupos monitorados para usuário:', target_user_id);

    // Buscar grupos monitorados diretamente na tabela
    const { data: monitoredGroups, error: fetchError } = await supabase
      .from('monitored_whatsapp_groups')
      .select('*')
      .eq('user_id', target_user_id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('[GET-MONITORED-GROUPS] Erro ao buscar grupos:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar grupos monitorados' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('[GET-MONITORED-GROUPS] Grupos encontrados:', monitoredGroups?.length || 0);

    return new Response(
      JSON.stringify(monitoredGroups || []),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('[GET-MONITORED-GROUPS] Erro inesperado:', error)
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
