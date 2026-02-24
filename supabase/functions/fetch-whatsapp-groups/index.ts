
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Headers CORS para permitir requisições do frontend
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
    console.log('[FETCH-WHATSAPP-GROUPS] 🚀 Iniciando busca de grupos');

    // Criar cliente Supabase com service role para melhor autenticação
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!supabaseServiceKey || !supabaseUrl) {
      console.error('[FETCH-WHATSAPP-GROUPS] ❌ Configurações do Supabase não encontradas');
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor não encontrada' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Cliente com service role para operações administrativas
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Cliente normal para verificação de usuário
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      auth: { persistSession: false }
    });

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('[FETCH-WHATSAPP-GROUPS] ❌ Token de autorização não fornecido');
      return new Response(
        JSON.stringify({ error: 'Token de autorização necessário' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('[FETCH-WHATSAPP-GROUPS] 🔑 Token de autorização encontrado, verificando usuário...');

    // Verificar usuário autenticado
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('[FETCH-WHATSAPP-GROUPS] ❌ Erro de autenticação:', {
        error: userError,
        hasUser: !!user
      });
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado ou token inválido' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('[FETCH-WHATSAPP-GROUPS] ✅ Usuário autenticado:', {
      id: user.id,
      email: user.email
    });

    // Buscar perfil do usuário usando service role para evitar problemas de RLS
    console.log('[FETCH-WHATSAPP-GROUPS] 🔍 Buscando perfil do usuário na base de dados...');
    
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('instance_name, nome, id, numero')
      .eq('id', user.id)
      .maybeSingle();

    console.log('[FETCH-WHATSAPP-GROUPS] 📊 Resultado da busca do perfil:', {
      profile: profile ? { 
        id: profile.id, 
        nome: profile.nome, 
        instance_name: profile.instance_name,
        hasNumero: !!profile.numero 
      } : null,
      error: profileError,
      userId: user.id
    });

    if (profileError) {
      console.error('[FETCH-WHATSAPP-GROUPS] ❌ Erro ao buscar perfil:', profileError);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao buscar perfil do usuário',
          details: profileError.message 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!profile) {
      console.error('[FETCH-WHATSAPP-GROUPS] ❌ Perfil não encontrado para o usuário:', user.id);
      return new Response(
        JSON.stringify({ 
          error: 'Perfil do usuário não encontrado',
          details: 'Usuário não possui perfil criado no sistema'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!profile.instance_name) {
      console.error('[FETCH-WHATSAPP-GROUPS] ❌ Instance name não configurado para o usuário:', user.id);
      return new Response(
        JSON.stringify({ 
          error: 'WhatsApp não conectado. Configure sua conexão primeiro.',
          details: 'Instance name não encontrado no perfil'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('[FETCH-WHATSAPP-GROUPS] ✅ Perfil encontrado:', {
      nome: profile.nome,
      instance_name: profile.instance_name,
      id: profile.id
    });

    // Verificar configurações da Evolution API
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')

    if (!evolutionApiUrl || !evolutionApiKey) {
      console.error('[FETCH-WHATSAPP-GROUPS] ❌ Configurações da Evolution API não encontradas');
      return new Response(
        JSON.stringify({ 
          error: 'Configuração da Evolution API não encontrada',
          details: 'Variáveis de ambiente da Evolution API não configuradas'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('[FETCH-WHATSAPP-GROUPS] ⚙️ Configurações Evolution API validadas');

    // Construir URL da Evolution API (normalizar barras)
    const baseUrl = evolutionApiUrl.endsWith('/') ? evolutionApiUrl.slice(0, -1) : evolutionApiUrl;
    const evolutionUrl = `${baseUrl}/group/fetchAllGroups/${profile.instance_name}`;
    console.log('[FETCH-WHATSAPP-GROUPS] 🌐 URL da Evolution API:', evolutionUrl);

    // Fazer requisição para Evolution API
    const evolutionResponse = await fetch(evolutionUrl, {
      method: 'GET',
      headers: {
        'apikey': evolutionApiKey,
      },
    })

    console.log('[FETCH-WHATSAPP-GROUPS] 📡 Status da resposta Evolution API:', {
      status: evolutionResponse.status,
      statusText: evolutionResponse.statusText,
      ok: evolutionResponse.ok
    });

    if (!evolutionResponse.ok) {
      const errorText = await evolutionResponse.text();
      console.error('[FETCH-WHATSAPP-GROUPS] ❌ Erro na Evolution API:', {
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
    console.log('[FETCH-WHATSAPP-GROUPS] 📄 Resposta bruta da Evolution API:', {
      dataType: typeof evolutionData,
      isArray: Array.isArray(evolutionData),
      keysIfObject: typeof evolutionData === 'object' ? Object.keys(evolutionData) : null,
      firstElement: Array.isArray(evolutionData) ? evolutionData[0] : null
    });

    // Determinar array de grupos baseado na estrutura da resposta
    let groupsArray = [];

    if (Array.isArray(evolutionData)) {
      groupsArray = evolutionData;
    } else if (evolutionData && evolutionData.groups && Array.isArray(evolutionData.groups)) {
      groupsArray = evolutionData.groups;
    } else if (evolutionData && evolutionData.data && Array.isArray(evolutionData.data)) {
      groupsArray = evolutionData.data;
    } else {
      console.log('[FETCH-WHATSAPP-GROUPS] ⚠️ Estrutura inesperada na resposta:', evolutionData);
      groupsArray = [];
    }

    console.log('[FETCH-WHATSAPP-GROUPS] 📊 Grupos encontrados:', {
      total: groupsArray.length,
      sample: groupsArray.slice(0, 2)
    });

    // Formatar os dados dos grupos para o frontend
    const formattedGroups = groupsArray.map((group: any, index: number) => {
      console.log('[FETCH-WHATSAPP-GROUPS] 🔄 Formatando grupo', index, ':', {
        id: group.id || group.remoteJid,
        subject: group.subject,
        participantsCount: group.participants?.length || 0
      });

      return {
        id: group.id || group.remoteJid || `group-${index}`,
        groupId: group.id || group.remoteJid || `group-${index}`,
        name: group.subject || 'Grupo sem nome',
        groupName: group.subject || 'Grupo sem nome',
        participants: group.participants?.length || 0,
        participantCount: group.participants?.length || 0,
      };
    });

    console.log('[FETCH-WHATSAPP-GROUPS] ✅ Grupos formatados com sucesso:', {
      total: formattedGroups.length,
      sample: formattedGroups.slice(0, 2)
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        groups: formattedGroups,
        total: formattedGroups.length,
        instanceName: profile.instance_name,
        userProfile: {
          id: profile.id,
          nome: profile.nome,
          instance_name: profile.instance_name
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('[FETCH-WHATSAPP-GROUPS] 💥 Erro inesperado:', {
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : null,
      error: error
    });
    
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
