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

// NOVO: Log específico para payloads de criação
const logInstanceCreationPayload = (payload: any) => {
  console.log(`[EVOLUTION-QR] 🚨 PAYLOAD DE CRIAÇÃO DA INSTÂNCIA:`);
  console.log(`[EVOLUTION-QR] instanceName: ${payload.instanceName}`);
  console.log(`[EVOLUTION-QR] settings.groups_ignore: ${payload.settings?.groups_ignore}`);
  console.log(`[EVOLUTION-QR] settings.always_online: ${payload.settings?.always_online}`);
  console.log(`[EVOLUTION-QR] settings.read_messages: ${payload.settings?.read_messages}`);
  console.log(`[EVOLUTION-QR] webhook.url: ${payload.webhook?.url}`);
  console.log(`[EVOLUTION-QR] webhook.byEvents: ${payload.webhook?.byEvents}`);
  console.log(`[EVOLUTION-QR] integration: ${payload.integration}`);
  console.log(`[EVOLUTION-QR] PAYLOAD COMPLETO:`, JSON.stringify(payload, null, 2));
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

    // Remove a barra final se presente para consistência
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

    // 1. Verificar se a instância existe e seu status
    logStep("Checking instance status", { instanceName });
    
    let instanceExists = false;
    let currentStatus = 'disconnected';
    
    try {
      const statusResponse = await fetch(`${cleanApiUrl}/instance/connectionState/${instanceName}`, {
        method: 'GET',
        headers: { 'apikey': evolutionApiKey, 'Content-Type': 'application/json' }
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        instanceExists = true;
        currentStatus = statusData.state || 'disconnected';
        logStep("Instance exists with status", { status: currentStatus });
        
        // Se já está conectada, não precisa de QR Code
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
      } else if (statusResponse.status === 404) {
        logStep("Instance does not exist (404), will attempt to create.", { status: statusResponse.status });
        instanceExists = false;
      } else {
        const errorText = await statusResponse.text();
        logStep("Error checking instance status, assuming non-existent", { status: statusResponse.status, error: errorText });
        instanceExists = false;
      }
    } catch (error) {
      logStep("Error during instance status check, assuming non-existent", { error: error.message });
      instanceExists = false;
    }

    // 2. Se a instância não existe, criar ela primeiro
    if (!instanceExists) {
      logStep("🚨 CRIANDO NOVA INSTÂNCIA - MONITORANDO PAYLOAD", { instanceName });
      
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('numero, role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.numero) {
        throw new Error("User phone number not found in profile");
      }

      // Determinar webhook baseado no role do usuário.
      // Mantem compatibilidade com envs antigas do n8n, mas permite apontar para o worker na VPS.
      const webhookUrl = profile.role === 'beta'
        ? (Deno.env.get("WEBHOOK_ANALISA_MENSAGENS") ?? Deno.env.get("WEBHOOK_N8N_ANALISA_MENSAGENS"))
        : (Deno.env.get("WEBHOOK_RECEBE_MENSAGEM") ?? Deno.env.get("WEBHOOK_N8N_RECEBE_MENSAGEM"));
      
      logStep("Webhook selecionado baseado no role", { role: profile.role, webhookUrl });
      
      const createPayload = {
        instanceName,
        token: evolutionApiKey,
        qrcode: true, // Solicita o QR Code diretamente na criação
        number: profile.numero,
        integration: "WHATSAPP-BAILEYS",
        webhook: {
          url: webhookUrl,
          byEvents: false,
          base64: true,
          headers: { "Content-Type": "application/json" },
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

      // LOG DETALHADO DO PAYLOAD
      logInstanceCreationPayload(createPayload);

      const createResponse = await fetch(`${cleanApiUrl}/instance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
        body: JSON.stringify(createPayload)
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        logStep("🚨 ERRO NA CRIAÇÃO - Response details", { 
          status: createResponse.status, 
          error: errorText,
          payloadUsed: createPayload 
        });
        
        // Se o erro for que a instância já existe, não é um erro fatal. Apenas continue.
        if (errorText && errorText.toLowerCase().includes("instance already exists")) {
            logStep("Instance creation failed because it already exists. Proceeding to connect.");
        } else {
            throw new Error(`Failed to create instance: ${createResponse.status} - ${errorText}`);
        }
      } else {
        const creationData = await createResponse.json();
        logStep("✅ SUCESSO NA CRIAÇÃO - Response data", { 
          instance: creationData.instance?.instanceName,
          responseData: creationData 
        });
        
        // Otimização: Se o QR Code veio na resposta da criação, retorna imediatamente
        let qrCodeDataFromCreate = creationData.qrcode?.base64 || creationData.base64 || creationData.qrcode?.code || creationData.code;

        if (qrCodeDataFromCreate) {
          logStep("QR Code found in creation response, returning directly.");
          if (!qrCodeDataFromCreate.startsWith('data:image/')) {
            qrCodeDataFromCreate = `data:image/png;base64,${qrCodeDataFromCreate}`;
          }
          return new Response(JSON.stringify({ success: true, qrCode: qrCodeDataFromCreate }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
        
        logStep("QR Code not in creation response, will proceed to connect endpoint after a delay.");
        await new Promise(resolve => setTimeout(resolve, 3000)); // Espera 3s para a instância estabilizar
      }
    }

    // 3. Gerar o QR Code (para instâncias existentes ou se a criação não retornou o QR)
    logStep("Generating QR Code via connect endpoint", { instanceName });

    const response = await fetch(`${cleanApiUrl}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: { 'apikey': evolutionApiKey, 'Content-Type': 'application/json' }
    });

    logStep("Connect API Response", { status: response.status, ok: response.ok });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("Error generating QR via connect", { status: response.status, error: errorText });
      throw new Error(`Failed to generate QR Code: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    logStep("Connect QR Code response data", data);

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

    let qrCodeData = data.qrcode?.base64 || data.base64 || data.qrcode?.code || data.code;

    if (!qrCodeData) {
      logStep("QR Code data not found in connect response", { availableKeys: Object.keys(data) });
      throw new Error('QR Code not found in API response - instance may already be connected');
    }

    if (!qrCodeData.startsWith('data:image/')) {
      qrCodeData = `data:image/png;base64,${qrCodeData}`;
    }

    return new Response(JSON.stringify({ success: true, qrCode: qrCodeData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("FATAL ERROR in evolution-generate-qr", { message: errorMessage });
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
