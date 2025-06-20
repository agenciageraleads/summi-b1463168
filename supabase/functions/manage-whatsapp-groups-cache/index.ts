
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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!supabaseServiceKey || !supabaseUrl) {
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor não encontrada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action } = await req.json();

    if (action === 'get_cached') {
      // Buscar grupos do cache
      const { data: cachedGroups, error } = await supabaseAdmin
        .from('whatsapp_groups_cache')
        .select('*')
        .eq('user_id', user.id)
        .order('group_name');

      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true,
          groups: cachedGroups.map(group => ({
            id: group.group_id,
            name: group.group_name,
            participants: group.participants_count,
            lastUpdated: group.last_updated
          })),
          cached: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'refresh_from_api') {
      // Buscar perfil do usuário
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('instance_name')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.instance_name) {
        return new Response(
          JSON.stringify({ error: 'WhatsApp não conectado' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Buscar da Evolution API
      const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
      const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');

      if (!evolutionApiUrl || !evolutionApiKey) {
        return new Response(
          JSON.stringify({ error: 'Configuração da Evolution API não encontrada' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const baseUrl = evolutionApiUrl.endsWith('/') ? evolutionApiUrl.slice(0, -1) : evolutionApiUrl;
      const evolutionUrl = `${baseUrl}/group/fetchAllGroups/${profile.instance_name}?getParticipants=false`;

      const evolutionResponse = await fetch(evolutionUrl, {
        method: 'GET',
        headers: { 'apikey': evolutionApiKey },
      });

      if (!evolutionResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Erro ao buscar grupos no WhatsApp' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const evolutionData = await evolutionResponse.json();
      let groupsArray = [];

      if (Array.isArray(evolutionData)) {
        groupsArray = evolutionData;
      } else if (evolutionData?.groups && Array.isArray(evolutionData.groups)) {
        groupsArray = evolutionData.groups;
      } else if (evolutionData?.data && Array.isArray(evolutionData.data)) {
        groupsArray = evolutionData.data;
      }

      // Limpar cache antigo
      await supabaseAdmin
        .from('whatsapp_groups_cache')
        .delete()
        .eq('user_id', user.id);

      // Inserir novos grupos no cache
      if (groupsArray.length > 0) {
        const groupsToCache = groupsArray.map(group => ({
          user_id: user.id,
          group_id: group.id || group.remoteJid,
          group_name: group.subject || 'Grupo sem nome',
          participants_count: group.participants?.length || 0
        }));

        const { error: insertError } = await supabaseAdmin
          .from('whatsapp_groups_cache')
          .insert(groupsToCache);

        if (insertError) throw insertError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          groups: groupsArray.map(group => ({
            id: group.id || group.remoteJid,
            name: group.subject || 'Grupo sem nome',
            participants: group.participants?.length || 0
          })),
          cached: false,
          refreshed: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Ação não reconhecida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[MANAGE-GROUPS-CACHE] Erro:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
