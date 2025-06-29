
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

// Função para sanitizar entrada
const sanitizeInput = (input: string): string => {
  if (!input) return '';
  return input.replace(/[<>\"']/g, '').trim();
};

// Função para criar nome de instância válido
const createValidInstanceName = (nome: string, numero: string): string => {
  const cleanName = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 12);
  
  const lastDigits = numero.slice(-4);
  const instanceName = `${cleanName}_${lastDigits}`;
  
  console.log(`[EVOLUTION-HANDLER] Nome da instância criado: ${instanceName} (${instanceName.length} caracteres)`);
  return instanceName;
};

// Função para validar número de telefone brasileiro
const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^55[1-9][1-9][0-9]{8,9}$/;
  const cleanPhone = phone.replace(/\D/g, '');
  console.log(`[EVOLUTION-HANDLER] Validando telefone: ${cleanPhone} - Válido: ${phoneRegex.test(cleanPhone)}`);
  return phoneRegex.test(cleanPhone);
};

// Função para retry com backoff exponencial
const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`[EVOLUTION-HANDLER] Tentativa ${attempt} falhou, tentando novamente em ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
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
    const webhookUrl = Deno.env.get("WEBHOOK_N8N_RECEBE_MENSAGEM");

    if (!evolutionApiUrl || !evolutionApiKey || !webhookUrl) {
      auditLog("MISSING_ENV_VARS", user.id, { action });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Configuração da API Evolution ou Webhook não encontrada" 
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

        const instanceNameToUse = profile.instance_name || createValidInstanceName(profile.nome, profile.numero);
        
        if (!profile.instance_name) {
          const { error: updateError } = await supabaseServiceRole
            .from('profiles')
            .update({ instance_name: instanceNameToUse })
            .eq('id', user.id);
          if (updateError) {
            console.error("[EVOLUTION-HANDLER] Erro ao salvar instance_name inicial:", updateError);
          }
        }

        // Verificar se a instância já existe
        try {
          const checkResponse = await retryWithBackoff(() => 
            fetch(`${cleanApiUrl}/instance/connectionState/${instanceNameToUse}`, {
              headers: { 'apikey': evolutionApiKey }
            })
          );
          
          if (checkResponse.ok) {
            const statusData = await checkResponse.json();
            console.log(`[EVOLUTION-HANDLER] Instance exists with state: ${statusData.state}`);
            
            if (statusData.state === 'open') {
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
        try {
          const createPayload = {
            instanceName: instanceNameToUse,
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

          const createResponse = await retryWithBackoff(() =>
            fetch(`${cleanApiUrl}/instance/create?number=${profile.numero}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': evolutionApiKey
              },
              body: JSON.stringify(createPayload)
            })
          );
          
          if (!createResponse.ok) {
            const errorText = await createResponse.text();
            throw new Error(`Falha ao criar instância: ${createResponse.status} - ${errorText}`);
          }
          
          const createData = await createResponse.json();
          console.log(`[EVOLUTION-HANDLER] Instância criada com sucesso:`, createData);
          
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

      case "generate-qr-code": {
        if (!instanceName) {
          return new Response(JSON.stringify({ success: false, error: "Nome da instância é obrigatório" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        try {
          const connectResponse = await retryWithBackoff(() =>
            fetch(`${cleanApiUrl}/instance/connect/${instanceName}?number=${profile.numero}`, {
              method: 'GET',
              headers: { 'apikey': evolutionApiKey }
            })
          );

          if (!connectResponse.ok) {
            const errorText = await connectResponse.text();
            throw new Error(`HTTP ${connectResponse.status}: ${errorText}`);
          }

          const connectData = await connectResponse.json();
          
          if (connectData.code) {
            auditLog("QR_CODE_GENERATED", user.id, { instanceName });
            return new Response(JSON.stringify({
              success: true,
              qrCode: `data:image/png;base64,${connectData.base64}`,
              message: "QR Code gerado com sucesso"
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          } else if (connectData.instance?.state === 'open') {
            return new Response(JSON.stringify({
              success: true,
              alreadyConnected: true,
              message: "Instância já está conectada"
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          } else {
            throw new Error("Resposta inesperada da API Evolution");
          }
        } catch (error) {
          auditLog("QR_CODE_ERROR", user.id, { instanceName, error: error.message });
          return new Response(JSON.stringify({
            success: false,
            error: `Erro ao gerar QR Code: ${error.message}`
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }

      case "generate-pairing-code": {
        if (!instanceName) {
          return new Response(JSON.stringify({ success: false, error: "Nome da instância é obrigatório" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        try {
          const connectResponse = await retryWithBackoff(() =>
            fetch(`${cleanApiUrl}/instance/connect/${instanceName}?number=${profile.numero}`, {
              method: 'GET',
              headers: { 'apikey': evolutionApiKey }
            })
          );

          if (!connectResponse.ok) {
            const errorText = await connectResponse.text();
            throw new Error(`HTTP ${connectResponse.status}: ${errorText}`);
          }

          const connectData = await connectResponse.json();
          
          if (connectData.pairingCode) {
            auditLog("PAIRING_CODE_GENERATED", user.id, { instanceName });
            return new Response(JSON.stringify({
              success: true,
              pairingCode: connectData.pairingCode,
              message: "Pairing Code gerado com sucesso"
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          } else if (connectData.instance?.state === 'open') {
            return new Response(JSON.stringify({
              success: true,
              alreadyConnected: true,
              message: "Instância já está conectada"
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          } else {
            throw new Error("Pairing Code não disponível na resposta");
          }
        } catch (error) {
          auditLog("PAIRING_CODE_ERROR", user.id, { instanceName, error: error.message });
          return new Response(JSON.stringify({
            success: false,
            error: `Erro ao gerar Pairing Code: ${error.message}`
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
          const statusResponse = await retryWithBackoff(() =>
            fetch(`${cleanApiUrl}/instance/connectionState/${instanceName}`, {
              headers: { 'apikey': evolutionApiKey }
            })
          );
      
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
          const restartResponse = await retryWithBackoff(() =>
            fetch(`${cleanApiUrl}/instance/restart/${instanceName}`, {
              method: 'GET',
              headers: { 'apikey': evolutionApiKey }
            })
          );
      
          if (!restartResponse.ok) {
            throw new Error(`HTTP ${restartResponse.status}: ${await restartResponse.text()}`);
          }
      
          auditLog("INSTANCE_RESTARTED", user.id, { instanceName });
          return new Response(JSON.stringify({ success: true, message: "Instância reiniciada com sucesso" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } catch (error) {
          auditLog("RESTART_ERROR", user.id, { instanceName, error: error.message });
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
          const logoutResponse = await retryWithBackoff(() =>
            fetch(`${cleanApiUrl}/instance/logout/${instanceName}`, {
              method: 'GET',
              headers: { 'apikey': evolutionApiKey }
            })
          );

          if (!logoutResponse.ok) {
            const errorTxt = await logoutResponse.text();
            throw new Error(`Erro ao deslogar: ${logoutResponse.status} - ${errorTxt}`);
          }

          // Verificar se realmente desconectou
          const checkStatusRes = await fetch(`${cleanApiUrl}/instance/connectionState/${instanceName}`, {
            headers: { 'apikey': evolutionApiKey }
          });
          
          let disconnected = false;
          if (checkStatusRes.ok) {
            const statusData = await checkStatusRes.json();
            disconnected = statusData.state === 'disconnected' || statusData.state === 'closed';
          } else {
            disconnected = true; // Se não conseguiu verificar, assume que desconectou
          }

          if (disconnected) {
            await supabaseServiceRole
              .from('profiles')
              .update({ instance_name: null })
              .eq('id', user.id);
          }

          auditLog("LOGOUT_SUCCESS", user.id, { instanceName });
          return new Response(JSON.stringify({ 
            success: true, 
            message: "WhatsApp desconectado com sucesso",
            disconnected 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } catch (error) {
          auditLog("LOGOUT_ERROR", user.id, { instanceName, error: error.message });
          return new Response(JSON.stringify({ 
            success: false, 
            error: `Erro ao deslogar: ${error.message}` 
          }), {
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
          // Logout primeiro
          try {
            await fetch(`${cleanApiUrl}/instance/logout/${instanceName}`, {
              method: 'GET',
              headers: { 'apikey': evolutionApiKey }
            });
          } catch (logoutError) {
            console.log(`[EVOLUTION-HANDLER] Logout durante delete falhou (continuando): ${logoutError.message}`);
          }

          // Deletar instância
          const deleteResponse = await retryWithBackoff(() =>
            fetch(`${cleanApiUrl}/instance/delete/${instanceName}`, {
              method: 'GET',
              headers: { 'apikey': evolutionApiKey }
            })
          );

          if (!deleteResponse.ok) {
            const errorTxt = await deleteResponse.text();
            throw new Error(`Erro ao deletar: ${deleteResponse.status} - ${errorTxt}`);
          }

          // Verificar se deletou
          const checkStatusRes = await fetch(`${cleanApiUrl}/instance/connectionState/${instanceName}`, {
            headers: { 'apikey': evolutionApiKey }
          });
          
          let deleted = !checkStatusRes.ok; // Se não conseguiu buscar, provavelmente foi deletado

          if (deleted) {
            await supabaseServiceRole
              .from('profiles')
              .update({ instance_name: null })
              .eq('id', user.id);
          }

          auditLog("DELETE_SUCCESS", user.id, { instanceName });
          return new Response(JSON.stringify({ 
            success: true, 
            message: "Instância deletada com sucesso" 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } catch (error) {
          auditLog("DELETE_ERROR", user.id, { instanceName, error: error.message });
          return new Response(JSON.stringify({ 
            success: false, 
            error: `Erro ao deletar: ${error.message}` 
          }), {
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
