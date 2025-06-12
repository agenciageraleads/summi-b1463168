
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EVOLUTION-STATE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");
    
    if (!evolutionApiUrl || !evolutionApiKey) {
      throw new Error("Evolution API credentials not configured");
    }

    const cleanApiUrl = evolutionApiUrl.replace(/\/$/, '');

    const { instanceName } = await req.json();
    if (!instanceName) throw new Error("Instance name is required");

    logStep("Checking connection state", { instanceName, url: `${cleanApiUrl}/instance/connectionState/${instanceName}` });

    const response = await fetch(`${cleanApiUrl}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': evolutionApiKey,
        'Content-Type': 'application/json'
      }
    });

    logStep("API Response", { status: response.status, ok: response.ok });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("Error checking connection state", { status: response.status, error: errorText });
      // CORREÇÃO: Retornar disconnected em vez de erro
      return new Response(JSON.stringify({
        success: true,
        state: 'disconnected'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const data = await response.json();
    logStep("Connection state response", data);

    // CORREÇÃO: Normalizar o retorno do estado
    const state = data.instance?.state || data.state || 'disconnected';

    return new Response(JSON.stringify({
      success: true,
      state: state
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in evolution-connection-state", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: true, 
      state: 'disconnected' 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
