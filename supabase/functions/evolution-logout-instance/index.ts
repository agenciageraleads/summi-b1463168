
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EVOLUTION-LOGOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar autenticação com melhor tratamento
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logStep("No authorization header");
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Token de autorização obrigatório' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    logStep("Attempting to verify token");
    
    // Usar o service key para verificar o token do usuário
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      logStep("Authentication failed", { error: authError?.message, hasUser: !!user });
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Sessão expirada ou inválida. Faça login novamente.' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    logStep("User authenticated successfully", { userId: user.id });

    // Buscar dados do usuário (instance_name)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('instance_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.instance_name) {
      logStep("No instance found for user", { userId: user.id, profileError });
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Nenhuma instância encontrada para desconectar'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const instanceName = profile.instance_name;
    logStep("Found instance for user", { instanceName, userId: user.id });

    const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");
    
    if (!evolutionApiUrl || !evolutionApiKey) {
      throw new Error("Evolution API credentials not configured");
    }

    logStep("Attempting to logout instance", { instanceName });

    // Fazer logout na Evolution API
    try {
      const logoutResponse = await fetch(`${evolutionApiUrl}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: {
          'apikey': evolutionApiKey
        }
      });
      
      logStep("Logout attempt", { status: logoutResponse.status });
      
      if (!logoutResponse.ok) {
        const errorText = await logoutResponse.text();
        logStep("Logout failed", { status: logoutResponse.status, error: errorText });
      }
    } catch (logoutError) {
      logStep("Logout request failed", logoutError);
    }

    // IMPORTANTE: Apenas limpar instance_name do perfil, NÃO deletar a instância
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ instance_name: null })
      .eq('id', user.id);

    if (updateError) {
      logStep("Failed to clear instance_name", updateError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Erro ao atualizar perfil'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    } else {
      logStep("Successfully cleared instance_name from profile");
    }

    logStep("Logout process completed successfully");

    return new Response(JSON.stringify({
      success: true,
      message: 'WhatsApp desconectado com sucesso'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in evolution-logout-instance", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false,
      error: `Erro ao desconectar: ${errorMessage}`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
