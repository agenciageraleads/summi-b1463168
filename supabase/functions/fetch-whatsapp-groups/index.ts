
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
      console.error('[FETCH-WHATSAPP-GROUPS] Token de autorização não fornecido');
      return new Response(
        JSON.stringify({ error: 'Token de autorização necessário' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('[FETCH-WHATSAPP-GROUPS] Verificando autenticação do usuário');
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      console.error('[FETCH-WHATSAPP-GROUPS] Erro de autenticação:', userError);
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('[FETCH-WHATSAPP-GROUPS] Usuário autenticado:', user.id);

    // Verificar se o usuário é admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, instance_name')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[FETCH-WHATSAPP-GROUPS] Erro ao buscar perfil:', profileError);
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar permissões do usuário' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!profile || profile.role !== 'admin') {
      console.error('[FETCH-WHATSAPP-GROUPS] Usuário não é admin. Role:', profile?.role);
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas administradores podem acessar esta funcionalidade.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('[FETCH-WHATSAPP-GROUPS] Usuário admin verificado');

    const { instanceName } = await req.json()
    
    if (!instanceName) {
      console.error('[FETCH-WHATSAPP-GROUPS] instanceName não fornecido');
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

    console.log('[FETCH-WHATSAPP-GROUPS] Evolution API URL:', evolutionApiUrl ? 'Configurada' : 'Não configurada');
    console.log('[FETCH-WHATSAPP-GROUPS] Evolution API Key:', evolutionApiKey ? 'Configurada' : 'Não configurada');

    if (!evolutionApiUrl || !evolutionApiKey) {
      console.error('[FETCH-WHATSAPP-GROUPS] Configurações da Evolution API não encontradas');
      return new Response(
        JSON.stringify({ 
          error: 'Configuração da Evolution API não encontrada',
          details: 'Verifique as variáveis EVOLUTION_API_URL e EVOLUTION_API_KEY'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const evolutionUrl = `${evolutionApiUrl}/group/fetchAllGroups/${instanceName}`;
    console.log('[FETCH-WHATSAPP-GROUPS] Chamando Evolution API:', evolutionUrl);

    const evolutionResponse = await fetch(evolutionUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
    })

    console.log('[FETCH-WHATSAPP-GROUPS] Status da resposta da Evolution API:', evolutionResponse.status);

    if (!evolutionResponse.ok) {
      const errorText = await evolutionResponse.text();
      console.error('[FETCH-WHATSAPP-GROUPS] Erro na Evolution API:', {
        status: evolutionResponse.status,
        statusText: evolutionResponse.statusText,
        body: errorText
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao buscar grupos no WhatsApp',
          details: `Status: ${evolutionResponse.status} - ${evolutionResponse.statusText}`,
          apiError: errorText
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const evolutionData = await evolutionResponse.json()
    console.log('[FETCH-WHATSAPP-GROUPS] Dados recebidos da Evolution API:', {
      type: typeof evolutionData,
      isArray: Array.isArray(evolutionData),
      length: Array.isArray(evolutionData) ? evolutionData.length : 'N/A'
    });

    // Verificar se a resposta é um array
    if (!Array.isArray(evolutionData)) {
      console.error('[FETCH-WHATSAPP-GROUPS] Resposta da Evolution API não é um array:', evolutionData);
      return new Response(
        JSON.stringify({ 
          error: 'Formato de resposta inválido da Evolution API',
          details: 'Esperado array, recebido: ' + typeof evolutionData
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Formatar os dados dos grupos
    const groups = evolutionData.map((group: EvolutionGroup) => ({
      groupId: group.id,
      groupName: group.subject || 'Grupo sem nome',
      participantCount: group.participants?.length || 0
    }))

    console.log('[FETCH-WHATSAPP-GROUPS] Grupos formatados:', groups.length);

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
