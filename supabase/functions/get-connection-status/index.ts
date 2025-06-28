
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[GET-CONNECTION-STATUS] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("🔍 Verificando status da conexão WhatsApp");

    // 1. Autenticação
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      logStep("❌ Erro de autenticação", authError);
      return new Response(
        JSON.stringify({ error: 'unauthorized' }),
        { status: 401, headers: corsHeaders }
      );
    }

    logStep("✅ Usuário autenticado", { userId: user.id });

    // 2. Construir nome da instância
    const instanceName = `summi_${user.id}`;
    logStep("🏷️ Nome da instância", { instanceName });

    // 3. Configurações da API Evolution
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');

    if (!evolutionApiUrl || !evolutionApiKey) {
      logStep("❌ Configurações da Evolution API ausentes");
      return new Response(
        JSON.stringify({ error: 'evolution_api_config_missing' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // 4. Verificar status da instância
    const fetchResponse = await fetch(`${evolutionApiUrl}/instance/fetch/${instanceName}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
    });

    if (fetchResponse.status === 404) {
      logStep("📭 Instância não encontrada");
      return new Response(
        JSON.stringify({ status: 'not_found' }),
        { status: 200, headers: corsHeaders }
      );
    }

    if (!fetchResponse.ok) {
      const fetchError = await fetchResponse.text();
      logStep("❌ Erro ao verificar instância", { error: fetchError });
      return new Response(
        JSON.stringify({ error: 'fetch_failed', details: fetchError }),
        { status: 500, headers: corsHeaders }
      );
    }

    const instanceData = await fetchResponse.json();
    const instanceState = instanceData.instance?.state;
    
    logStep("📊 Status da instância", { state: instanceState });

    let status = 'unknown';
    if (instanceState === 'open') {
      status = 'connected';
    } else if (instanceState === 'connecting' || instanceState === 'close') {
      status = 'connecting';
    }

    return new Response(
      JSON.stringify({ 
        status,
        instanceName,
        state: instanceState 
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    logStep("❌ Erro inesperado", error);
    return new Response(
      JSON.stringify({ error: 'internal_server_error', details: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
