
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
    const authHeader = req.headers.get("Authorization");
    
    // Verificar autenticação para algumas ações
    let userData = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data, error } = await supabaseClient.auth.getUser(token);
      if (!error && data.user) {
        userData = data.user;
      }
    }

    const { action, instanceName, ...params } = await req.json();
    logStep("Action requested", { action, instanceName });

    switch (action) {
      case 'create':
        return await handleCreateInstance(cleanApiUrl, evolutionApiKey, instanceName, userData, supabaseClient);
      
      case 'get-qrcode':
        return await handleGetQRCode(cleanApiUrl, evolutionApiKey, instanceName);
      
      case 'get-status':
        return await handleGetStatus(cleanApiUrl, evolutionApiKey, instanceName);
      
      case 'logout':
        return await handleLogout(cleanApiUrl, evolutionApiKey, instanceName, userData, supabaseClient);
      
      case 'delete':
        return await handleDeleteInstance(cleanApiUrl, evolutionApiKey, instanceName, userData, supabaseClient);
      
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

// Função para criar instância e configurar webhook automaticamente
async function handleCreateInstance(apiUrl: string, apiKey: string, instanceName: string, userData: any, supabase: any) {
  logStep("Creating instance", { instanceName });

  // 1. Criar a instância
  const createPayload = {
    instanceName,
    token: apiKey,
    qrcode: true,
    integration: "WHATSAPP-BAILEYS"
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
    logStep("Error creating instance", { status: createResponse.status, error: errorText });
    throw new Error(`Failed to create instance: ${createResponse.status} - ${errorText}`);
  }

  const createData = await createResponse.json();
  logStep("Instance created successfully", createData);

  // 2. Configurar webhook automaticamente
  logStep("Configuring webhook for instance", { instanceName });
  
  const webhookPayload = {
    webhook: {
      url: "https://webhookn8n.gera-leads.com/webhook/whatsapp",
      by_events: true,
      base64: true,
      events: ["MESSAGES_UPSERT"]
    }
  };

  const webhookResponse = await fetch(`${apiUrl}/webhook/set/${instanceName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey
    },
    body: JSON.stringify(webhookPayload)
  });

  if (!webhookResponse.ok) {
    const errorText = await webhookResponse.text();
    logStep("Error configuring webhook", { status: webhookResponse.status, error: errorText });
    // Não falhar a criação se o webhook falhar, mas logar o erro
  } else {
    const webhookData = await webhookResponse.json();
    logStep("Webhook configured successfully", webhookData);
  }

  // 3. Atualizar o perfil do usuário com o nome da instância
  if (userData) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        instance_name: instanceName,
        updated_at: new Date().toISOString()
      })
      .eq('id', userData.id);

    if (updateError) {
      logStep("Error updating user profile", updateError);
    }
  }

  return new Response(JSON.stringify({
    success: true,
    instanceName: createData.instance?.instanceName || instanceName,
    status: createData.instance?.status || 'created',
    webhookConfigured: webhookResponse.ok
  }), {
    headers: { 'Access-Control-Allow-Origin': '*', "Content-Type": "application/json" },
    status: 200,
  });
}

// Função para obter QR Code
async function handleGetQRCode(apiUrl: string, apiKey: string, instanceName: string) {
  logStep("Getting QR Code", { instanceName });

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
  logStep("QR Code response", data);

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
    headers: { 'Access-Control-Allow-Origin': '*', "Content-Type": "application/json" },
    status: 200,
  });
}

// Função para verificar status da conexão
async function handleGetStatus(apiUrl: string, apiKey: string, instanceName: string) {
  logStep("Checking connection status", { instanceName });

  const response = await fetch(`${apiUrl}/instance/connectionState/${instanceName}`, {
    method: 'GET',
    headers: {
      'apikey': apiKey,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    logStep("Error checking status, returning disconnected", { status: response.status });
    return new Response(JSON.stringify({
      success: true,
      status: 'DISCONNECTED'
    }), {
      headers: { 'Access-Control-Allow-Origin': '*', "Content-Type": "application/json" },
      status: 200,
    });
  }

  const data = await response.json();
  logStep("Status response", data);

  const status = data.instance?.state || data.state || 'DISCONNECTED';
  const normalizedStatus = status.toUpperCase();

  return new Response(JSON.stringify({
    success: true,
    status: normalizedStatus
  }), {
    headers: { 'Access-Control-Allow-Origin': '*', "Content-Type": "application/json" },
    status: 200,
  });
}

// Função para fazer logout/desconectar
async function handleLogout(apiUrl: string, apiKey: string, instanceName: string, userData: any, supabase: any) {
  logStep("Logging out instance", { instanceName });

  const response = await fetch(`${apiUrl}/instance/logout/${instanceName}`, {
    method: 'DELETE',
    headers: {
      'apikey': apiKey,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    logStep("Error during logout", { status: response.status, error: errorText });
    // Não falhar se o logout der erro, pode ser que já esteja desconectado
  }

  // Atualizar status no banco
  if (userData) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        updated_at: new Date().toISOString()
      })
      .eq('id', userData.id);

    if (updateError) {
      logStep("Error updating user profile after logout", updateError);
    }
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'Instance logged out successfully'
  }), {
    headers: { 'Access-Control-Allow-Origin': '*', "Content-Type": "application/json" },
    status: 200,
  });
}

// Função para deletar instância
async function handleDeleteInstance(apiUrl: string, apiKey: string, instanceName: string, userData: any, supabase: any) {
  logStep("Deleting instance", { instanceName });

  const response = await fetch(`${apiUrl}/instance/delete/${instanceName}`, {
    method: 'DELETE',
    headers: {
      'apikey': apiKey
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    logStep("Error deleting instance", { status: response.status, error: errorText });
    // Não falhar se a deleção der erro
  }

  // Limpar dados do usuário
  if (userData) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        instance_name: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userData.id);

    if (updateError) {
      logStep("Error updating user profile after delete", updateError);
    }
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'Instance deleted successfully'
  }), {
    headers: { 'Access-Control-Allow-Origin': '*', "Content-Type": "application/json" },
    status: 200,
  });
}
