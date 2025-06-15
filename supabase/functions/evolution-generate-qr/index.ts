
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

    // Primeiro verificar se a instância existe e seu status
    logStep("Checking instance status", { instanceName });
    
    let instanceExists = false;
    let currentStatus = 'disconnected';
    
    try {
      const statusResponse = await fetch(`${cleanApiUrl}/instance/connectionState/${instanceName}`, {
        method: 'GET',
        headers: {
          'apikey': evolutionApiKey,
          'Content-Type': 'application/json'
        }
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        instanceExists = true;
        currentStatus = statusData.state || 'disconnected';
        logStep("Instance exists with status", { status: currentStatus });
        
        // Se já está conectada, retornar erro
        if (currentStatus === 'open') {
          return new Response(JSON.stringify({
            success: false,
            error: 'Instance is already connected. No QR Code needed.',
            alreadyConnected: true
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      } else {
        logStep("Instance does not exist or error checking status", { status: statusResponse.status });
        instanceExists = false;
      }
    } catch (error) {
      logStep("Error checking instance status, treating as non-existent", { error: error.message });
      instanceExists = false;
    }

    // Se a instância não existe, criar ela primeiro
    if (!instanceExists) {
      logStep("Creating new instance", { instanceName });
      
      // Buscar dados do usuário para criar a instância
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('numero')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.numero) {
        throw new Error("User phone number not found in profile");
      }

      const webhookUrl = Deno.env.get("WEBHOOK_N8N_RECEBE_MENSAGEM");
      
      const createPayload = {
        instanceName: instanceName,
        token: evolutionApiKey,
        qrcode: true,
        number: profile.numero,
        integration: "WHATSAPP-BAILEYS",
        webhook: {
          url: webhookUrl,
          byEvents: false,
          base64: true,
          headers: {
            "Content-Type": "application/json"
          },
          events: ["MESSAGES_UPSERT"]
        },
        settings: {
          reject_call: false,
          msg_call: "",
          groups_ignore: true,
          always_online: false,
          read_messages: false,
          read_status: false
        }
      };

      const createResponse = await fetch(`${cleanApiUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApiKey
        },
        body: JSON.stringify(createPayload)
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        logStep("Error creating instance", { status: createResponse.status, error: errorText });
        throw new Error(`Failed to create instance: ${createResponse.status} - ${errorText}`);
      }

      logStep("Instance created successfully");
      
      // Aguardar um pouco para a instância se estabelecer
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Agora gerar o QR Code
    logStep("Generating QR Code for instance", { instanceName });

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
