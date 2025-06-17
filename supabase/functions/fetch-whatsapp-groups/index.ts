
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Interface para os grupos retornados pela Evolution API
interface EvolutionGroup {
  id: string;
  subject: string;
  participants: any[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[FETCH-WHATSAPP-GROUPS] Função iniciada');

    // Criar cliente Supabase para verificar autenticação
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
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
      console.error('[FETCH-WHATSAPP-GROUPS] Erro de autenticação:', userError)
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
      .select('role, instance_name')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      console.error('[FETCH-WHATSAPP-GROUPS] Usuário não é admin:', profileError)
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas administradores podem acessar esta funcionalidade.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const { instanceName } = await req.json()
    
    if (!instanceName) {
      return new Response(
        JSON.stringify({ error: 'instanceName é obrigatório' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('[FETCH-WHATSAPP-GROUPS] Buscando grupos para instância:', instanceName);

    // Buscar grupos na Evolution API
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')

    if (!evolutionApiUrl || !evolutionApiKey) {
      console.error('[FETCH-WHATSAPP-GROUPS] Configurações da Evolution API não encontradas')
      return new Response(
        JSON.stringify({ error: 'Configuração da Evolution API não encontrada' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const evolutionResponse = await fetch(
      `${evolutionApiUrl}/group/fetchAllGroups/${instanceName}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApiKey,
        },
      }
    )

    if (!evolutionResponse.ok) {
      console.error('[FETCH-WHATSAPP-GROUPS] Erro na Evolution API:', evolutionResponse.status)
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao buscar grupos no WhatsApp',
          details: `Status: ${evolutionResponse.status}`
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const evolutionData = await evolutionResponse.json()
    console.log('[FETCH-WHATSAPP-GROUPS] Grupos encontrados:', evolutionData.length)

    // Formatar os dados dos grupos
    const groups = evolutionData.map((group: EvolutionGroup) => ({
      groupId: group.id,
      groupName: group.subject || 'Grupo sem nome',
      participantCount: group.participants?.length || 0
    }))

    return new Response(
      JSON.stringify({ 
        success: true, 
        groups: groups,
        total: groups.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('[FETCH-WHATSAPP-GROUPS] Erro inesperado:', error)
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
