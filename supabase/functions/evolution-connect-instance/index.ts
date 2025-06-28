
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EVOLUTION-CONNECT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");
    
    if (!evolutionApiUrl || !evolutionApiKey) {
      throw new Error("Evolution API credentials not configured");
    }

    const cleanApiUrl = evolutionApiUrl.replace(/\/$/, '');
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");

    const { instanceName } = await req.json();
    if (!instanceName) throw new Error("Instance name is required");

    // CORREÇÃO: Primeiro verificar se a instância já está conectada
    logStep("Checking current instance status", { instanceName });
    
    const statusResponse = await fetch(`${cleanApiUrl}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': evolutionApiKey,
        'Content-Type': 'application/json'
      }
    });

    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      const currentState = statusData.instance?.state || statusData.state;
      
      if (currentState === 'open') {
        logStep("Instance already connected");
        return new Response(JSON.stringify({
          success: false,
          error: 'Instance is already connected',
          alreadyConnected: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // CORREÇÃO: Gerar QR Code apenas se não estiver conectado
    logStep("Connecting to instance", { instanceName, url: `${cleanApiUrl}/instance/connect/${instanceName}` });

    const response = await fetch(`${cleanApiUrl}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': evolutionApiKey,
        'Content-Type': 'application/json'
      }
    });

    logStep("API Response", { status: response.status, ok: response.ok });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("Error connecting instance", { status: response.status, error: errorText });
      throw new Error(`Failed to connect instance: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    logStep("Connect response", data);

    // CORREÇÃO: Extrair o QR Code corretamente
    let qrCodeData = null;
    if (data.qrcode?.base64) {
      qrCodeData = data.qrcode.base64;
    } else if (data.qrcode?.code) {
      qrCodeData = data.qrcode.code;
    } else if (data.base64) {
      qrCodeData = data.base64;
    } else if (data.code) {
      qrCodeData = data.code;
    }

    if (!qrCodeData) {
      logStep("QR Code data not found", { availableKeys: Object.keys(data) });
      throw new Error('QR Code not found in API response');
    }

    // CORREÇÃO: Garantir formato correto do QR Code
    if (!qrCodeData.startsWith('data:image/')) {
      qrCodeData = `data:image/png;base64,${qrCodeData}`;
    }

    return new Response(JSON.stringify({
      success: true,
      qrCode: qrCodeData
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in evolution-connect-instance", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
