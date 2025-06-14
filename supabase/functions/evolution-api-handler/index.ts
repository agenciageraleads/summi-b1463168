import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, instance-name",
};

// Função para log de auditoria de segurança
const auditLog = (action: string, userId: string, details?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[SECURITY-AUDIT] ${timestamp} - ${action} - User: ${userId}`, details ? JSON.stringify(details) : '');
};

// Função para validar entrada e sanitizar dados
const sanitizeInput = (input: string): string => {
  if (!input) return '';
  return input.replace(/[<>\"']/g, '').trim();
};

const validatePhoneNumber = (phone: string): boolean => {
  // Validação para números brasileiros
  const phoneRegex = /^55[1-9][1-9][0-9]{8,9}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[EVOLUTION-HANDLER] Evolution API Handler started");
    
    // Verificar autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      auditLog("UNAUTHORIZED_API_ACCESS", "unknown", { endpoint: "evolution-api-handler" });
      return new Response(JSON.stringify({ success: false, error: "Token de autorização obrigatório" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Configurar clientes Supabase
    const supabaseServiceRole = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Verificar usuário
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      auditLog("INVALID_TOKEN_API", "unknown", { error: authError?.message });
      return new Response(JSON.stringify({ success: false, error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const body = await req.json();
    const action = sanitizeInput(body.action);
    const instanceName = sanitizeInput(req.headers.get("instance-name") || body.instanceName || '');

    console.log(`[EVOLUTION-HANDLER] Action requested - ${JSON.stringify({ action })}`);

    // Buscar perfil do usuário com validação de segurança
    const { data: profile, error: profileError } = await supabaseServiceRole
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      auditLog("PROFILE_NOT_FOUND", user.id, { error: profileError?.message });
      return new Response(JSON.stringify({ success: false, error: "Perfil não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Verificar configuração das variáveis de ambiente
    const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");

    if (!evolutionApiUrl || !evolutionApiKey) {
      auditLog("MISSING_ENV_VARS", user.id, { action });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Configuração da API Evolution não encontrada" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Processar ações baseadas no tipo
    switch (action) {
      case "initialize-connection": {
        auditLog("INITIALIZE_CONNECTION", user.id, { instanceName: profile.instance_name });
        
        console.log(`[EVOLUTION-HANDLER] Starting initialize-connection flow - ${JSON.stringify({ userId: user.id })}`);
        
        // Validar número se fornecido
        if (profile.numero && !validatePhoneNumber(profile.numero)) {
          auditLog("INVALID_PHONE_NUMBER", user.id, { phone: profile.numero });
          return new Response(JSON.stringify({ 
            success: false, 
            error: "Número de telefone inválido" 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const hasInstanceName = !!profile.instance_name;
        const instanceNameToUse = hasInstanceName ? profile.instance_name : `${profile.nome.toLowerCase().replace(/\s+/g, '')}_${profile.numero}`;
        
        console.log(`[EVOLUTION-HANDLER] Profile state analyzed - ${JSON.stringify({ 
          hasInstanceName, 
          instanceName: instanceNameToUse, 
          numero: profile.numero 
        })}`);

        if (hasInstanceName) {
          // Cenário B: Instância existente - verificar estado
          console.log(`[EVOLUTION-HANDLER] SCENARIO B: Existing instance - checking state - ${JSON.stringify({ instanceName: instanceNameToUse })}`);
          
          try {
            const statusResponse = await fetch(`${evolutionApiUrl}/instance/connectionState/${instanceNameToUse}`, {
              headers: { 'apikey': evolutionApiKey }
            });
            
            const statusData = await statusResponse.json();
            console.log(`[EVOLUTION-HANDLER] Instance state retrieved - ${JSON.stringify({ connectionState: statusData.state })}`);
            
            if (statusData.state === 'open') {
              // Garantir que o webhook está configurado
              console.log(`[EVOLUTION-HANDLER] Ensuring webhook is configured - ${JSON.stringify({ instanceName: instanceNameToUse })}`);
              
              try {
                await fetch(`${evolutionApiUrl}/webhook/set/${instanceNameToUse}`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': evolutionApiKey
                  },
                  body: JSON.stringify({
                    url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/evolution-webhook`,
                    webhook_by_events: false,
                    webhook_base64: false,
                    events: [
                      "APPLICATION_STARTUP",
                      "QRCODE_UPDATED", 
                      "CONNECTION_UPDATE",
                      "MESSAGES_UPSERT",
                      "MESSAGES_UPDATE"
                    ]
                  })
                });
              } catch (webhookError) {
                console.log(`[EVOLUTION-HANDLER] WARNING: Failed to configure webhook - ${JSON.stringify({ status: 400 })}`);
              }
              
              return new Response(JSON.stringify({ 
                success: true, 
                status: 'connected',
                instanceName: instanceNameToUse
              }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            }
            
            // Se não está conectado, gerar novo QR
            const qrResponse = await fetch(`${evolutionApiUrl}/instance/connect/${instanceNameToUse}`, {
              method: 'GET',
              headers: { 'apikey': evolutionApiKey }
            });
            
            const qrData = await qrResponse.json();
            
            return new Response(JSON.stringify({ 
              success: true,
              qrCode: qrData.base64,
              instanceName: instanceNameToUse,
              status: 'awaiting_connection'
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
            
          } catch (error) {
            auditLog("CONNECTION_CHECK_ERROR", user.id, { error: error.message });
            console.error(`[EVOLUTION-HANDLER] Error checking instance state:`, error);
            
            return new Response(JSON.stringify({ 
              success: false, 
              error: "Erro ao verificar estado da conexão" 
            }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
        }
        
        // Cenário A: Nova instância
        console.log(`[EVOLUTION-HANDLER] SCENARIO A: New instance - creating - ${JSON.stringify({ instanceName: instanceNameToUse })}`);
        
        try {
          // Criar nova instância
          const createResponse = await fetch(`${evolutionApiUrl}/instance/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': evolutionApiKey
            },
            body: JSON.stringify({
              instanceName: instanceNameToUse,
              token: evolutionApiKey,
              qrcode: true,
              number: profile.numero,
              webhook: `${Deno.env.get("SUPABASE_URL")}/functions/v1/evolution-webhook`,
              webhook_by_events: false,
              events: [
                "APPLICATION_STARTUP",
                "QRCODE_UPDATED", 
                "CONNECTION_UPDATE",
                "MESSAGES_UPSERT",
                "MESSAGES_UPDATE"
              ]
            })
          });
          
          if (!createResponse.ok) {
            throw new Error(`HTTP ${createResponse.status}: ${await createResponse.text()}`);
          }
          
          const createData = await createResponse.json();
          console.log(`[EVOLUTION-HANDLER] Instance created successfully - ${JSON.stringify({ instanceName: instanceNameToUse })}`);
          
          // Atualizar perfil com instance_name
          await supabaseServiceRole
            .from('profiles')
            .update({ instance_name: instanceNameToUse })
            .eq('id', user.id);
          
          auditLog("INSTANCE_CREATED", user.id, { instanceName: instanceNameToUse });
          
          return new Response(JSON.stringify({ 
            success: true,
            qrCode: createData.qrcode?.base64,
            instanceName: instanceNameToUse,
            status: 'created'
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
          
        } catch (error) {
          auditLog("INSTANCE_CREATION_ERROR", user.id, { error: error.message });
          console.error(`[EVOLUTION-HANDLER] Error creating instance:`, error);
          
          return new Response(JSON.stringify({ 
            success: false, 
            error: "Erro ao criar nova instância" 
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }

      case "get-status": {
        if (!instanceName) {
          auditLog("MISSING_INSTANCE_NAME", user.id, { action });
          return new Response(JSON.stringify({ success: false, error: "Nome da instância é obrigatório" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      
        auditLog("GET_STATUS", user.id, { instanceName });
      
        try {
          const statusResponse = await fetch(`${evolutionApiUrl}/instance/connectionState/${instanceName}`, {
            headers: { 'apikey': evolutionApiKey }
          });
      
          if (!statusResponse.ok) {
            throw new Error(`HTTP ${statusResponse.status}: ${await statusResponse.text()}`);
          }
      
          const statusData = await statusResponse.json();
          console.log(`[EVOLUTION-HANDLER] Status da instância ${instanceName}: ${statusData.state}`);
      
          return new Response(JSON.stringify({ success: true, status: statusData.state }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } catch (error) {
          auditLog("GET_STATUS_ERROR", user.id, { instanceName, error: error.message });
          console.error(`[EVOLUTION-HANDLER] Erro ao obter status da instância ${instanceName}:`, error);
          return new Response(JSON.stringify({ success: false, error: "Erro ao obter status da instância" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }
      
      case "restart": {
        if (!instanceName) {
          auditLog("MISSING_INSTANCE_NAME", user.id, { action });
          return new Response(JSON.stringify({ success: false, error: "Nome da instância é obrigatório" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      
        auditLog("RESTART_INSTANCE", user.id, { instanceName });
      
        try {
          const restartResponse = await fetch(`${evolutionApiUrl}/instance/restart/${instanceName}`, {
            method: 'GET',
            headers: { 'apikey': evolutionApiKey }
          });
      
          if (!restartResponse.ok) {
            throw new Error(`HTTP ${restartResponse.status}: ${await restartResponse.text()}`);
          }
      
          console.log(`[EVOLUTION-HANDLER] Instância ${instanceName} reiniciada com sucesso.`);
          return new Response(JSON.stringify({ success: true, message: "Instância reiniciada com sucesso" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } catch (error) {
          auditLog("RESTART_INSTANCE_ERROR", user.id, { instanceName, error: error.message });
          console.error(`[EVOLUTION-HANDLER] Erro ao reiniciar instância ${instanceName}:`, error);
          return new Response(JSON.stringify({ success: false, error: "Erro ao reiniciar instância" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }
      
      case "logout": {
        if (!instanceName) {
          auditLog("MISSING_INSTANCE_NAME", user.id, { action });
          return new Response(JSON.stringify({ success: false, error: "Nome da instância é obrigatório" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      
        auditLog("LOGOUT_INSTANCE", user.id, { instanceName });
      
        try {
          const logoutResponse = await fetch(`${evolutionApiUrl}/instance/logout/${instanceName}`, {
            method: 'GET',
            headers: { 'apikey': evolutionApiKey }
          });
      
          if (!logoutResponse.ok) {
            throw new Error(`HTTP ${logoutResponse.status}: ${await logoutResponse.text()}`);
          }
      
          console.log(`[EVOLUTION-HANDLER] Instância ${instanceName} deslogada com sucesso.`);
          return new Response(JSON.stringify({ success: true, message: "Instância deslogada com sucesso" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } catch (error) {
          auditLog("LOGOUT_INSTANCE_ERROR", user.id, { instanceName, error: error.message });
          console.error(`[EVOLUTION-HANDLER] Erro ao deslogar instância ${instanceName}:`, error);
          return new Response(JSON.stringify({ success: false, error: "Erro ao deslogar instância" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }
      
      case "delete": {
        if (!instanceName) {
          auditLog("MISSING_INSTANCE_NAME", user.id, { action });
          return new Response(JSON.stringify({ success: false, error: "Nome da instância é obrigatório" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      
        auditLog("DELETE_INSTANCE", user.id, { instanceName });
      
        try {
          const deleteResponse = await fetch(`${evolutionApiUrl}/instance/delete/${instanceName}`, {
            method: 'GET',
            headers: { 'apikey': evolutionApiKey }
          });
      
          if (!deleteResponse.ok) {
            throw new Error(`HTTP ${deleteResponse.status}: ${await deleteResponse.text()}`);
          }
      
          // Limpar instance_name no perfil
          await supabaseServiceRole
            .from('profiles')
            .update({ instance_name: null })
            .eq('id', user.id);
      
          console.log(`[EVOLUTION-HANDLER] Instância ${instanceName} deletada com sucesso.`);
          return new Response(JSON.stringify({ success: true, message: "Instância deletada com sucesso" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } catch (error) {
          auditLog("DELETE_INSTANCE_ERROR", user.id, { instanceName, error: error.message });
          console.error(`[EVOLUTION-HANDLER] Erro ao deletar instância ${instanceName}:`, error);
          return new Response(JSON.stringify({ success: false, error: "Erro ao deletar instância" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }
      
      default:
        auditLog("UNKNOWN_ACTION", user.id, { action });
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Ação não reconhecida" 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

  } catch (error) {
    auditLog("FUNCTION_ERROR", "unknown", { error: error.message });
    console.error(`[EVOLUTION-HANDLER] Function error:`, error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Erro interno do servidor" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
