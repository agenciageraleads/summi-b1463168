
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EVOLUTION-QR] ${step}${detailsStr}`);
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

    // Remove trailing slash if present
    const cleanApiUrl = evolutionApiUrl.replace(/\/$/, '');
    logStep("API URL configured", { url: cleanApiUrl });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    const { instanceName } = await req.json();
    if (!instanceName) throw new Error("Instance name is required");

    // CORREÇÃO: Primeiro verificar se a instância existe
    logStep("Checking if instance exists", { instanceName });
    
    const checkResponse = await fetch(`${cleanApiUrl}/instance/status/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': evolutionApiKey,
        'Content-Type': 'application/json'
      }
    });

    let instanceExists = false;
    let currentStatus = null;

    if (checkResponse.ok) {
      const statusData = await checkResponse.json();
      currentStatus = statusData.instance?.state || statusData.state;
      instanceExists = true;
      
      logStep("Instance exists with status", { status: currentStatus });
      
      // Se a instância já está conectada (open), não gerar QR Code
      if (currentStatus === 'open' || currentStatus === 'connected') {
        logStep("Instance already connected, no QR needed");
        return new Response(JSON.stringify({
          success: false,
          error: 'Instance is already connected. No QR Code needed.',
          alreadyConnected: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    } else if (checkResponse.status === 404) {
      logStep("Instance does not exist, will create it");
      instanceExists = false;
    } else {
      const errorText = await checkResponse.text();
      logStep("Error checking instance status", { status: checkResponse.status, error: errorText });
      throw new Error(`Failed to check instance status: ${checkResponse.status} - ${errorText}`);
    }

    // Se a instância não existe, criar ela primeiro
    if (!instanceExists) {
      logStep("Creating new instance", { instanceName });
      
      const createResponse = await fetch(`${cleanApiUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'apikey': evolutionApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instanceName: instanceName,
          integration: "WHATSAPP-BAILEYS",
          webhook: `${Deno.env.get("SUPABASE_URL")}/functions/v1/evolution-api-handler`,
          events: ["MESSAGES_UPSERT"],
          webhookByEvents: false,
          webhookBase64: true
        })
      });

      if (!createResponse.ok) {
        const createErrorText = await createResponse.text();
        logStep("Error creating instance", { status: createResponse.status, error: createErrorText });
        throw new Error(`Failed to create instance: ${createResponse.status} - ${createErrorText}`);
      }

      const createData = await createResponse.json();
      logStep("Instance created successfully", createData);

      // Aguardar 3 segundos para a instância se estabilizar
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Agora gerar o QR Code
    logStep("Generating QR Code", { instanceName, url: `${cleanApiUrl}/instance/connect/${instanceName}` });

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
      logStep("Error generating QR", { status: response.status, error: errorText });
      throw new Error(`Failed to generate QR Code: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    logStep("QR Code response", data);

    // Verificar se a resposta indica que a instância já está conectada
    if (data.instance?.state === 'open') {
      logStep("Instance became connected during request");
      return new Response(JSON.stringify({
        success: false,
        error: 'Instance is already connected. No QR Code needed.',
        alreadyConnected: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

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
      throw new Error('QR Code not found in API response - instance may already be connected');
    }

    // Ensure the QR code data is properly formatted
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
    logStep("ERROR in evolution-generate-qr", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
