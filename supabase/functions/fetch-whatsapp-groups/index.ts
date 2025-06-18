
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Headers CORS para permitir requisições do frontend
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Interface para os grupos retornados pela Evolution API v2
interface EvolutionGroup {
  id: string;
  subject: string;
  participants?: any[];
  participantsCount?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[FETCH-WHATSAPP-GROUPS] Iniciando busca de grupos');

    // Criar cliente Supabase
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

    // Verificar usuário autenticado
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

    // Buscar perfil do usuário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('instance_name, nome')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('[FETCH-WHATSAPP-GROUPS] Erro ao buscar perfil:', profileError);
      return new Response(
        JSON.stringify({ error: 'Perfil do usuário não encontrado' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!profile.instance_name) {
      console.error('[FETCH-WHATSAPP-GROUPS] Instance name não configurado');
      return new Response(
        JSON.stringify({ error: 'WhatsApp não conectado. Configure sua conexão primeiro.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('[FETCH-WHATSAPP-GROUPS] Perfil encontrado:', {
      nome: profile.nome,
      instance_name: profile.instance_name
    });

    // Verificar configurações da Evolution API
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')

    if (!evolutionApiUrl || !evolutionApiKey) {
      console.error('[FETCH-WHATSAPP-GROUPS] Configurações da Evolution API não encontradas');
      return new Response(
        JSON.stringify({ 
          error: 'Configuração da Evolution API não encontrada'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('[FETCH-WHATSAPP-GROUPS] Configurações Evolution API OK');

    // Construir URL da Evolution API seguindo a documentação v2
    // GET /group/fetchAllGroups/{instanceName}?getParticipants=true
    const evolutionUrl = `${evolutionApiUrl}/group/fetchAllGroups/${profile.instance_name}?getParticipants=true`;
    console.log('[FETCH-WHATSAPP-GROUPS] URL da Evolution API:', evolutionUrl);

    // Fazer requisição para a Evolution API seguindo a documentação
    const evolutionResponse = await fetch(evolutionUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey, // Header conforme documentação
      },
    })

    console.log('[FETCH-WHATSAPP-GROUPS] Status da resposta:', evolutionResponse.status);

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
          apiResponse: errorText
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Processar resposta da Evolution API
    const evolutionData = await evolutionResponse.json()
    console.log('[FETCH-WHATSAPP-GROUPS] Resposta da Evolution API:', {
      type: typeof evolutionData,
      isArray: Array.isArray(evolutionData),
      length: Array.isArray(evolutionData) ? evolutionData.length : 'N/A',
      keys: evolutionData && typeof evolutionData === 'object' ? Object.keys(evolutionData) : null
    });

    // A Evolution API pode retornar um objeto com uma propriedade contendo o array
    // ou diretamente um array, vamos verificar ambos os casos
    let groupsArray: EvolutionGroup[] = [];

    if (Array.isArray(evolutionData)) {
      groupsArray = evolutionData;
    } else if (evolutionData && typeof evolutionData === 'object') {
      // Procurar por propriedades que possam conter os grupos
      const possibleKeys = ['groups', 'data', 'result', 'response'];
      for (const key of possibleKeys) {
        if (evolutionData[key] && Array.isArray(evolutionData[key])) {
          groupsArray = evolutionData[key];
          break;
        }
      }
      
      // Se não encontrou em propriedades conhecidas, tenta usar o próprio objeto se tiver propriedades de grupo
      if (groupsArray.length === 0 && evolutionData.id && evolutionData.subject) {
        groupsArray = [evolutionData];
      }
    }

    console.log('[FETCH-WHATSAPP-GROUPS] Grupos encontrados:', groupsArray.length);

    if (!Array.isArray(groupsArray) || groupsArray.length === 0) {
      console.log('[FETCH-WHATSAPP-GROUPS] Nenhum grupo encontrado ou formato inválido');
      return new Response(
        JSON.stringify({ 
          success: true, 
          groups: [],
          total: 0,
          instanceName: profile.instance_name,
          message: 'Nenhum grupo encontrado'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Formatar os dados dos grupos conforme esperado pelo frontend
    const formattedGroups = groupsArray.map((group: EvolutionGroup) => ({
      groupId: group.id,
      groupName: group.subject || 'Grupo sem nome',
      participantCount: group.participants?.length || group.participantsCount || 0,
      id: group.id, // Alias para compatibilidade
      name: group.subject || 'Grupo sem nome', // Alias para compatibilidade
      participants: group.participants?.length || group.participantsCount || 0 // Alias para compatibilidade
    }))

    console.log('[FETCH-WHATSAPP-GROUPS] Grupos formatados:', {
      total: formattedGroups.length,
      sample: formattedGroups.slice(0, 2)
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        groups: formattedGroups,
        total: formattedGroups.length,
        instanceName: profile.instance_name
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
