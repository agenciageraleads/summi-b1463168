import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EVOLUTION-HANDLER] ${step}${detailsStr}`);
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
    logStep("Evolution API Handler started");

    const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");
    
    if (!evolutionApiUrl || !evolutionApiKey) {
      throw new Error("Evolution API credentials not configured");
    }

    const cleanApiUrl = evolutionApiUrl.replace(/\/$/, '');
    
    const { action, instanceName, ...params } = await req.json();
    logStep("Action requested", { action, instanceName });

    // Função helper para obter o usuário autenticado, movida para dentro do switch
    const getAuthenticatedUser = async () => {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        throw new Error("Authorization header is required for this action");
      }
      const token = authHeader.replace("Bearer ", "");
      const { data, error } = await supabaseClient.auth.getUser(token);

      if (error || !data.user) {
        logStep("Authentication failed", { error: error?.message });
        throw new Error("User not authenticated");
      }
      return data.user;
    };

    switch (action) {
      case 'initialize-connection': {
        const userData = await getAuthenticatedUser();
        return await handleInitializeConnection(cleanApiUrl, evolutionApiKey, userData, supabaseClient);
      }
      
      case 'get-qrcode': {
        if (!instanceName) throw new Error("instanceName is required for get-qrcode");
        return await handleGetQRCode(cleanApiUrl, evolutionApiKey, instanceName);
      }
      
      case 'disconnect': {
        const userData = await getAuthenticatedUser();
        return await handleDisconnect(cleanApiUrl, evolutionApiKey, userData, supabaseClient);
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in evolution-api-handler", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// FUNÇÃO PRINCIPAL: Inicializar conexão com lógica de estados inteligente
async function handleInitializeConnection(apiUrl: string, apiKey: string, userData: any, supabase: any) {
  logStep("Starting initialize-connection flow", { userId: userData.id });

  try {
    // Passo 1.0: Verificar estado atual do usuário no banco
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userData.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw new Error(`Failed to get user profile: ${profileError.message}`);
    }

    if (!profile) {
      throw new Error("User profile not found");
    }

    const hasInstanceName = profile.instance_name && profile.instance_name.trim() !== '';
    logStep("Profile state analyzed", { 
      hasInstanceName, 
      instanceName: profile.instance_name,
      numero: profile.numero 
    });

    // Verificar se tem número de telefone configurado
    if (!profile.numero) {
      return new Response(JSON.stringify({
        success: true,
        state: 'needs_phone_number',
        message: 'Configure seu número de telefone primeiro'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // CENÁRIO A: Nenhuma instância registrada (novo usuário)
    if (!hasInstanceName) {
      logStep("SCENARIO A: New user - creating instance atomically");
      return await createInstanceAtomically(apiUrl, apiKey, userData, supabase, profile);
    }

    // CENÁRIO B: Instância já registrada - verificar estado
    logStep("SCENARIO B: Existing instance - checking state", { instanceName: profile.instance_name });
    return await checkExistingInstanceState(apiUrl, apiKey, profile.instance_name, userData, supabase);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in initialize-connection", { message: errorMessage });
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      state: 'error'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}

// CENÁRIO A: Criar instância atomicamente (nova) - Alteração: usar nome + últimos dígitos do telefone
async function createInstanceAtomically(apiUrl: string, apiKey: string, userData: any, supabase: any, profile: any) {
  logStep("Creating instance atomically for new user");

  // Gerar instanceName usando nome + últimos 4 dígitos do telefone
  const nome = profile.nome?.toLowerCase().replace(/[^a-zA-Z0-9]/g, '') || 'user';
  const ultimosDigitos = profile.numero?.slice(-4) || '0000';
  const instanceName = `${nome}_${ultimosDigitos}`;
  
  let createdInstanceName = null;

  try {
    // 1. Criar a instância com webhook incluído no payload
    logStep("Step 1: Creating instance with webhook", { instanceName });
    
    // CORREÇÃO: Unificado o payload de criação da instância para ser consistente com a V2.
    const createPayload = {
      instanceName,
      token: apiKey,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      instanceSettings: {
        settings: {
          groupsIgnore: true,
          syncFullHistory: true
        }
      },
      webhook: {
        webhookSettings: {
          webhookUrl: "https://webhookn8n.gera-leads.com/webhook/whatsapp",
          webhookBase64: true,
          webhookEvents: [
            "MESSAGES_UPSERT"
          ]
        }
      }
    };

    const createResponse = await fetch(`${apiUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify(createPayload)
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      logStep("ERROR: Instance creation failed", { status: createResponse.status, error: errorText });
      throw new Error(`Failed to create instance: ${createResponse.status} - ${errorText}`);
    }

    const createData = await createResponse.json();
    createdInstanceName = createData.instance?.instanceName || instanceName;
    logStep("Step 1: Instance created successfully with webhook", { createdInstanceName });

    // 2. Atualizar o perfil do usuário
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        instance_name: createdInstanceName,
        updated_at: new Date().toISOString()
      })
      .eq('id', userData.id);

    if (updateError) {
      logStep("WARNING: Failed to update user profile", updateError);
    } else {
      logStep("User profile updated successfully");
    }

    return new Response(JSON.stringify({
      success: true,
      state: 'needs_qr_code',
      instanceName: createdInstanceName,
      message: 'Instância criada com webhook configurado. Gere o QR Code para conectar.'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("FATAL ERROR in atomic creation", { message: errorMessage, instanceName: createdInstanceName });
    
    // ROLLBACK: Deletar a instância criada se algo deu errado
    if (createdInstanceName) {
      logStep("Step 3: Rolling back - deleting created instance", { instanceName: createdInstanceName });
      try {
        await fetch(`${apiUrl}/instance/delete/${createdInstanceName}`, {
          method: 'DELETE',
          headers: { 'apikey': apiKey }
        });
        logStep("Rollback completed successfully");
      } catch (rollbackError) {
        logStep("WARNING: Rollback failed", { error: rollbackError });
      }
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      state: 'error'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}

// CENÁRIO B: Verificar estado de instância existente
async function checkExistingInstanceState(apiUrl: string, apiKey: string, instanceName: string, userData: any, supabase: any) {
  logStep("Checking existing instance state", { instanceName });

  try {
    // 1. Verificar estado na Evolution API
    const statusResponse = await fetch(`${apiUrl}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });

    // Se a instância não for encontrada (404), recria a instância.
    if (statusResponse.status === 404) {
      logStep("Instance not found on Evolution API, but exists in our DB. Recreating...", { instanceName });

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.id)
        .single();
      
      if (profileError || !profile) {
        throw new Error(`Profile not found for instance re-creation: ${profileError?.message}`);
      }

      return await createInstanceAtomically(apiUrl, apiKey, userData, supabase, profile);
    }
    
    let connectionState = 'DISCONNECTED';
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      connectionState = statusData.instance?.state || statusData.state || 'DISCONNECTED';
      logStep("Instance state retrieved", { connectionState });
    } else {
      // Para outros erros HTTP, apenas logamos e assumimos desconectado
      logStep("Failed to get instance state, assuming DISCONNECTED", { status: statusResponse.status });
    }

    // 2. Verificar e corrigir webhook se necessário
    await ensureWebhookConfigured(apiUrl, apiKey, instanceName);

    // 3. Retornar estado baseado na conexão
    switch (connectionState.toUpperCase()) {
      case 'OPEN':
      case 'CONNECTED':
        return new Response(JSON.stringify({
          success: true,
          state: 'already_connected',
          instanceName,
          message: 'WhatsApp já está conectado'
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });

      case 'CONNECTING':
        return new Response(JSON.stringify({
          success: true,
          state: 'is_connecting',
          instanceName,
          message: 'WhatsApp está conectando...'
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });

      default:
        return new Response(JSON.stringify({
          success: true,
          state: 'needs_qr_code',
          instanceName,
          message: 'Instância existe. Gere o QR Code para reconectar.'
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR checking existing instance", { message: errorMessage });
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      state: 'error'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}

// Garantir que o webhook está configurado corretamente
async function ensureWebhookConfigured(apiUrl: string, apiKey: string, instanceName: string) {
  logStep("Ensuring webhook is configured", { instanceName });

  try {
    const webhookPayload = {
      enabled: true,
      webhookUrl: "https://webhookn8n.gera-leads.com/webhook/whatsapp",
      webhookBase64: true,
      webhookEvents: [
        "MESSAGES_UPSERT"
      ]
    };

    const webhookResponse = await fetch(`${apiUrl}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify(webhookPayload)
    });

    if (webhookResponse.ok) {
      logStep("Webhook configured/verified successfully");
    } else {
      logStep("WARNING: Failed to configure webhook", { status: webhookResponse.status });
    }
  } catch (error) {
    logStep("WARNING: Error configuring webhook", { error });
  }
}

// Função para obter QR Code
async function handleGetQRCode(apiUrl: string, apiKey: string, instanceName: string) {
  logStep("Getting QR Code", { instanceName });

  try {
    // Adicionar verificação de status antes de gerar QR Code
    const statusResponse = await fetch(`${apiUrl}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: { 'apikey': apiKey }
    });

    if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        const connectionState = statusData.state?.toLowerCase();

        if (connectionState === 'open' || connectionState === 'connected') {
            logStep("Instance already connected, no QR needed for this request.");
            return new Response(JSON.stringify({
                success: false,
                error: 'Instância já está conectada. Não é necessário QR Code.',
                alreadyConnected: true
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }
    }
    
    const response = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("Error getting QR Code", { status: response.status, error: errorText });
      throw new Error(`Failed to get QR Code: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    logStep("QR Code response received");

    // Extrair QR Code corretamente
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
      throw new Error('QR Code not found in API response');
    }

    // Garantir formato correto do QR Code
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
    logStep("ERROR getting QR Code", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}

// Função para desconectar e remover instância
async function handleDisconnect(apiUrl: string, apiKey: string, userData: any, supabase: any) {
  logStep("Starting disconnect flow", { userId: userData.id });

  try {
    // 1. Obter dados do usuário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('instance_name')
      .eq('id', userData.id)
      .single();

    if (profileError || !profile?.instance_name) {
      logStep("No instance to disconnect");
      return new Response(JSON.stringify({
        success: true,
        message: 'Nenhuma instância para desconectar'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const instanceName = profile.instance_name;
    logStep("Disconnecting instance", { instanceName });

    // 2. Deletar instância na Evolution API
    const response = await fetch(`${apiUrl}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: {
        'apikey': apiKey
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("WARNING: Failed to delete instance", { status: response.status, error: errorText });
      // Continuar mesmo assim para limpar os dados locais
    } else {
      logStep("Instance deleted successfully");
    }

    // 3. Limpar dados no Supabase
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        instance_name: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userData.id);

    if (updateError) {
      logStep("ERROR updating profile after disconnect", updateError);
      throw new Error(`Failed to update profile: ${updateError.message}`);
    }

    logStep("Disconnect completed successfully");

    return new Response(JSON.stringify({
      success: true,
      message: 'WhatsApp desconectado com sucesso'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in disconnect flow", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}
