
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[DISCONNECT-WHATSAPP] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("🚀 Iniciando processo de desconexão WhatsApp");

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

    // 4. Executar logout da instância
    logStep("🔐 Fazendo logout da instância");
    const logoutResponse = await fetch(`${evolutionApiUrl}/instance/logout/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
    });

    if (logoutResponse.ok) {
      logStep("✅ Logout realizado com sucesso");
    } else {
      const logoutError = await logoutResponse.text();
      logStep("⚠️ Erro no logout (continuando com deleção)", { error: logoutError });
    }

    // 5. Aguardar um momento e então deletar a instância
    await new Promise(resolve => setTimeout(resolve, 2000));

    logStep("🗑️ Deletando instância");
    const deleteResponse = await fetch(`${evolutionApiUrl}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
    });

    if (!deleteResponse.ok) {
      const deleteError = await deleteResponse.text();
      logStep("❌ Erro ao deletar instância", { error: deleteError });
      return new Response(
        JSON.stringify({ error: 'instance_deletion_failed', details: deleteError }),
        { status: 500, headers: corsHeaders }
      );
    }

    logStep("✅ Instância deletada com sucesso");

    // 6. Limpar instance_name do perfil
    await supabaseClient
      .from('profiles')
      .update({ instance_name: null })
      .eq('id', user.id);

    logStep("✅ Perfil limpo");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Instance deleted successfully.' 
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
