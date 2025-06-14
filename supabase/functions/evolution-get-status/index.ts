import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EVOLUTION-STATUS] ${step}${detailsStr}`);
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

    // Remove trailing slash if present
    const cleanApiUrl = evolutionApiUrl.replace(/\/$/, '');

    const { instanceName } = await req.json();
    if (!instanceName) throw new Error("Instance name is required");

    // CORREÇÃO: Usar o endpoint correto /instance/status/ em vez de /instance/fetchInstances/
    logStep("Checking status", { instanceName, url: `${cleanApiUrl}/instance/status/${instanceName}` });

    const response = await fetch(`${cleanApiUrl}/instance/status/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': evolutionApiKey,
        'Content-Type': 'application/json'
      }
    });

    logStep("API Response", { status: response.status, ok: response.ok });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("Error checking status", { status: response.status, error: errorText });
      // Return disconnected status instead of throwing error
      return new Response(JSON.stringify({
        success: true,
        status: 'disconnected'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const data = await response.json();
    logStep("Status response", data);

    // A resposta da API Evolution para /status/ tem uma estrutura diferente
    const status = data.instance?.state || data.state || 'disconnected';

    return new Response(JSON.stringify({
      success: true,
      status: status
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in evolution-get-status", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: true, 
      status: 'disconnected' 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
