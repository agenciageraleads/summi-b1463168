
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

    console.log(`[EVOLUTION-HANDLER] Action requested: ${action}`);

    // Buscar perfil do usuário
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

    const cleanApiUrl = evolutionApiUrl.replace(/\/$/, '');

    // Processar ações baseadas no tipo
    switch (action) {
      case "initialize-connection": {
        auditLog("INITIALIZE_CONNECTION", user.id);
        
        console.log(`[EVOLUTION-HANDLER] Iniciando initialize-connection - User: ${user.id}`);
        
        // Verificar se o número é válido
        if (!profile.numero) {
          return new Response(JSON.stringify({ 
            success: true,
            state: 'needs_phone_number',
            message: 'Configure seu número de telefone nas configurações'
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        if (!validatePhoneNumber(profile.numero)) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: "Número de telefone inválido. Use formato brasileiro: 5511999999999" 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Determinar nome da instância
        const instanceNameToUse = profile.instance_name || `${profile.nome.toLowerCase().replace(/\s+/g, '')}_${profile.numero.slice(-4)}`;
        
        console.log(`[EVOLUTION-HANDLER] Instance name: ${instanceNameToUse}`);

        // Verificar se a instância já existe
        try {
          const checkResponse = await fetch(`${cleanApiUrl}/instance/connectionState/${instanceNameToUse}`, {
            headers: { 'apikey': evolutionApiKey }
          });
          
          if (checkResponse.ok) {
            const statusData = await checkResponse.json();
            console.log(`[EVOLUTION-HANDLER] Instance exists with state: ${statusData.state}`);
            
            if (statusData.state === 'open') {
              // Garantir que o perfil tem o instance_name salvo
              if (!profile.instance_name) {
                await supabaseServiceRole
                  .from('profiles')
                  .update({ instance_name: instanceNameToUse })
                  .eq('id', user.id);
              }

              return new Response(JSON.stringify({ 
                success: true,
                state: 'already_connected',
                instanceName: instanceNameToUse,
                message: 'WhatsApp já está conectado'
              }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            } else {
              // Instância existe mas não está conectada
              return new Response(JSON.stringify({ 
                success: true,
                state: 'needs_qr_code',
                instanceName: instanceNameToUse,
                message: 'Instância encontrada, gere o QR Code para conectar'
              }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            }
          }
        } catch (error) {
          console.log(`[EVOLUTION-HANDLER] Instance não existe, criando nova instância`);
        }
        
        // Criar nova instância
        console.log(`[EVOLUTION-HANDLER] Criando nova instância: ${instanceNameToUse}`);
        
        try {
          const createResponse = await fetch(`${cleanApiUrl}/instance/create`, {
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
          
          if (!createResponse.ok) {
            const errorText = await createResponse.text();
            console.error(`[EVOLUTION-HANDLER] Erro ao criar instância: ${createResponse.status} - ${errorText}`);
            throw new Error(`Falha ao criar instância: ${createResponse.status}`);
          }
          
          const createData = await createResponse.json();
          console.log(`[EVOLUTION-HANDLER] Instância criada com sucesso`);
          
          // Salvar instance_name no perfil
          await supabaseServiceRole
            .from('profiles')
            .update({ instance_name: instanceNameToUse })
            .eq('id', user.id);
          
          auditLog("INSTANCE_CREATED", user.id, { instanceName: instanceNameToUse });
          
          return new Response(JSON.stringify({ 
            success: true,
            state: 'needs_qr_code',
            instanceName: instanceNameToUse,
            message: 'Instância criada com sucesso, gere o QR Code para conectar'
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
          
        } catch (error) {
          auditLog("INSTANCE_CREATION_ERROR", user.id, { error: error.message });
          console.error(`[EVOLUTION-HANDLER] Erro ao criar instância:`, error);
          
          return new Response(JSON.stringify({ 
            success: false, 
            error: `Erro ao criar instância: ${error.message}` 
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }

      case "get-status": {
        if (!instanceName) {
          return new Response(JSON.stringify({ success: false, error: "Nome da instância é obrigatório" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      
        try {
          const statusResponse = await fetch(`${cleanApiUrl}/instance/connectionState/${instanceName}`, {
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
          console.error(`[EVOLUTION-HANDLER] Erro ao obter status da instância ${instanceName}:`, error);
          return new Response(JSON.stringify({ success: false, error: "Erro ao obter status da instância" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }
      
      case "restart": {
        if (!instanceName) {
          return new Response(JSON.stringify({ success: false, error: "Nome da instância é obrigatório" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      
        try {
          const restartResponse = await fetch(`${cleanApiUrl}/instance/restart/${instanceName}`, {
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
          console.error(`[EVOLUTION-HANDLER] Erro ao reiniciar instância ${instanceName}:`, error);
          return new Response(JSON.stringify({ success: false, error: "Erro ao reiniciar instância" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }
      
      case "logout": {
        if (!instanceName) {
          return new Response(JSON.stringify({ success: false, error: "Nome da instância é obrigatório" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      
        try {
          const logoutResponse = await fetch(`${cleanApiUrl}/instance/logout/${instanceName}`, {
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
          console.error(`[EVOLUTION-HANDLER] Erro ao deslogar instância ${instanceName}:`, error);
          return new Response(JSON.stringify({ success: false, error: "Erro ao deslogar instância" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }
      
      case "delete": {
        if (!instanceName) {
          return new Response(JSON.stringify({ success: false, error: "Nome da instância é obrigatório" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      
        try {
          const deleteResponse = await fetch(`${cleanApiUrl}/instance/delete/${instanceName}`, {
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
