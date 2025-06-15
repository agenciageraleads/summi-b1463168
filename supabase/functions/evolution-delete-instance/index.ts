
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EVOLUTION-DELETE] ${step}${detailsStr}`);
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

    // Verificar autenticação
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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      logStep("Authentication failed", authError);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Sessão expirada ou inválida. Faça login novamente.' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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
        message: 'Nenhuma instância encontrada para deletar'
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

    // Garantir que a URL base não termine com barra
    const baseUrl = evolutionApiUrl.replace(/\/$/, '');

    logStep("Attempting to delete instance", { instanceName });

    // Primeiro fazer logout
    try {
      const logoutUrl = `${baseUrl}/instance/logout/${instanceName}`;
      const logoutResponse = await fetch(logoutUrl, {
        method: 'DELETE',
        headers: {
          'apikey': evolutionApiKey,
          'Content-Type': 'application/json'
        }
      });
      logStep("Logout attempt", { status: logoutResponse.status, url: logoutUrl });
    } catch (logoutError) {
      logStep("Logout failed, continuing with delete", logoutError);
    }

    // Depois deletar a instância
    try {
      const deleteUrl = `${baseUrl}/instance/delete/${instanceName}`;
      const deleteResponse = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'apikey': evolutionApiKey,
          'Content-Type': 'application/json'
        }
      });
      
      logStep("Delete attempt", { status: deleteResponse.status, url: deleteUrl });
      
      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        logStep("Delete failed", { status: deleteResponse.status, error: errorText });
        throw new Error(`Falha ao deletar instância: ${deleteResponse.status} - ${errorText}`);
      }
      
    } catch (deleteError) {
      logStep("Delete failed", deleteError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Erro ao deletar instância da Evolution API'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Limpar dados do usuário no banco
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ instance_name: null })
      .eq('id', user.id);

    if (updateError) {
      logStep("Failed to clear instance_name", updateError);
    } else {
      logStep("Successfully cleared instance_name from profile");
    }

    logStep("Delete process completed successfully");

    return new Response(JSON.stringify({
      success: true,
      message: 'Instância WhatsApp deletada com sucesso'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in evolution-delete-instance", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false,
      error: `Erro ao deletar instância: ${errorMessage}`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
