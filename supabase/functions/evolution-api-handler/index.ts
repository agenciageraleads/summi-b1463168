
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

        return new Response(JSON.stringify({ 
          success: true,
          state: 'needs_qr_code',
          instanceName: instanceNameToUse,
          message: 'Instância inicializada, gere códigos para conectar'
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "generate-qr-code":
      case "generate-pairing-code": {
        const targetInstanceName = instanceName || profile.instance_name;
        if (!targetInstanceName) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: "Nome da instância não encontrado" 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        auditLog(action.toUpperCase(), user.id, { instanceName: targetInstanceName });

        // Verificar se a instância existe e seu status
        let instanceExists = false;
        let currentStatus = 'disconnected';
        
        try {
          const statusResponse = await retryWithBackoff(() => 
            fetch(`${cleanApiUrl}/instance/connectionState/${targetInstanceName}`, {
              headers: { 'apikey': evolutionApiKey }
            })
          );
          
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            instanceExists = true;
            currentStatus = statusData.state || 'disconnected';
            console.log(`[EVOLUTION-HANDLER] Instance exists with state: ${currentStatus}`);
            
            if (currentStatus === 'open') {
              return new Response(JSON.stringify({ 
                success: true,
                state: 'already_connected',
                message: 'WhatsApp já está conectado'
              }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            }
          } else if (statusResponse.status === 404) {
            console.log(`[EVOLUTION-HANDLER] Instance não existe, será criada`);
            instanceExists = false;
          }
        } catch (error) {
          console.log(`[EVOLUTION-HANDLER] Erro ao verificar instância, assumindo que não existe:`, error);
          instanceExists = false;
        }

        // Se não existe, criar instância com suporte a Pairing Code
        if (!instanceExists) {
          console.log(`[EVOLUTION-HANDLER] Criando instância com suporte a Pairing Code: ${targetInstanceName}`);
          
          const createPayload = {
            instanceName: targetInstanceName,
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

          try {
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
              if (!errorText.toLowerCase().includes("instance already exists")) {
                throw new Error(`Falha ao criar instância: ${createResponse.status} - ${errorText}`);
              }
            }
            
            console.log(`[EVOLUTION-HANDLER] Instância criada/verificada com sucesso`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Aguarda estabilização
            
          } catch (error) {
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

        // Gerar QR Code
        let qrCode = null;
        try {
          const qrResponse = await retryWithBackoff(() =>
            fetch(`${cleanApiUrl}/instance/connect/${targetInstanceName}`, {
              method: 'GET',
              headers: { 'apikey': evolutionApiKey }
            })
          );

          if (qrResponse.ok) {
            const qrData = await qrResponse.json();
            if (qrData.qrcode?.base64 || qrData.base64) {
              qrCode = qrData.qrcode?.base64 || qrData.base64;
              if (!qrCode.startsWith('data:image/')) {
                qrCode = `data:image/png;base64,${qrCode}`;
              }
            }
          }
        } catch (error) {
          console.error(`[EVOLUTION-HANDLER] Erro ao gerar QR Code:`, error);
        }

        // Gerar Pairing Code
        let pairingCode = null;
        try {
          const pairingResponse = await retryWithBackoff(() =>
            fetch(`${cleanApiUrl}/instance/connect/${targetInstanceName}?number=${profile.numero}`, {
              method: 'GET',
              headers: { 'apikey': evolutionApiKey }
            })
          );

          if (pairingResponse.ok) {
            const pairingData = await pairingResponse.json();
            if (pairingData.pairingCode || pairingData.code) {
              pairingCode = pairingData.pairingCode || pairingData.code;
            }
          }
        } catch (error) {
          console.error(`[EVOLUTION-HANDLER] Erro ao gerar Pairing Code:`, error);
        }

        if (!qrCode && !pairingCode) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: "Não foi possível gerar códigos de conexão" 
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        return new Response(JSON.stringify({ 
          success: true,
          state: 'needs_connection',
          qrCode: qrCode,
          pairingCode: pairingCode,
          message: 'Códigos gerados com sucesso'
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "get-status": {
        const targetInstanceName = instanceName || profile.instance_name;
        if (!targetInstanceName) {
          return new Response(JSON.stringify({ 
            success: true, 
            status: 'disconnected' 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        try {
          const statusResponse = await retryWithBackoff(() =>
            fetch(`${cleanApiUrl}/instance/connectionState/${targetInstanceName}`, {
              headers: { 'apikey': evolutionApiKey }
            })
          );

          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            const status = statusData.state || 'disconnected';
            console.log(`[EVOLUTION-HANDLER] Status da instância ${targetInstanceName}: ${status}`);
            
            return new Response(JSON.stringify({ 
              success: true, 
              status: status 
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
        } catch (error) {
          console.error(`[EVOLUTION-HANDLER] Erro ao verificar status:`, error);
        }

        return new Response(JSON.stringify({ 
          success: true, 
          status: 'disconnected' 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "logout": {
        const targetInstanceName = instanceName || profile.instance_name;
        if (!targetInstanceName) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: "Nome da instância não encontrado" 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        auditLog("LOGOUT", user.id, { instanceName: targetInstanceName });

        try {
          // CORREÇÃO: Usar DELETE ao invés de GET
          const logoutResponse = await retryWithBackoff(() =>
            fetch(`${cleanApiUrl}/instance/logout/${targetInstanceName}`, {
              method: 'DELETE',
              headers: { 'apikey': evolutionApiKey }
            })
          );

          const success = logoutResponse.ok || logoutResponse.status === 404;
          
          return new Response(JSON.stringify({ 
            success: true,
            message: success ? 'WhatsApp desconectado com sucesso' : 'Processo de desconexão executado'
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });

        } catch (error) {
          console.error(`[EVOLUTION-HANDLER] Erro ao desconectar:`, error);
          return new Response(JSON.stringify({ 
            success: false, 
            error: `Erro ao desconectar: ${error.message}` 
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }

      case "delete": {
        const targetInstanceName = instanceName || profile.instance_name;
        if (!targetInstanceName) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: "Nome da instância não encontrado" 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        auditLog("DELETE_INSTANCE", user.id, { instanceName: targetInstanceName });

        try {
          // CORREÇÃO: Usar DELETE ao invés de GET
          const deleteResponse = await retryWithBackoff(() =>
            fetch(`${cleanApiUrl}/instance/delete/${targetInstanceName}`, {
              method: 'DELETE',
              headers: { 'apikey': evolutionApiKey }
            })
          );

          const success = deleteResponse.ok || deleteResponse.status === 404;

          // Limpar instance_name do perfil
          await supabaseServiceRole
            .from('profiles')
            .update({ instance_name: null })
            .eq('id', user.id);
          
          return new Response(JSON.stringify({ 
            success: true,
            message: success ? 'Instância deletada com sucesso' : 'Instância removida do perfil'
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });

        } catch (error) {
          console.error(`[EVOLUTION-HANDLER] Erro ao deletar instância:`, error);
          return new Response(JSON.stringify({ 
            success: false, 
            error: `Erro ao deletar instância: ${error.message}` 
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }

      case "restart": {
        const targetInstanceName = instanceName || profile.instance_name;
        if (!targetInstanceName) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: "Nome da instância não encontrado" 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        auditLog("RESTART_INSTANCE", user.id, { instanceName: targetInstanceName });

        try {
          const restartResponse = await retryWithBackoff(() =>
            fetch(`${cleanApiUrl}/instance/restart/${targetInstanceName}`, {
              method: 'PUT',
              headers: { 'apikey': evolutionApiKey }
            })
          );

          const success = restartResponse.ok;
          
          return new Response(JSON.stringify({ 
            success: success,
            message: success ? 'Instância reiniciada com sucesso' : 'Erro ao reiniciar instância'
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });

        } catch (error) {
          console.error(`[EVOLUTION-HANDLER] Erro ao reiniciar instância:`, error);
          return new Response(JSON.stringify({ 
            success: false, 
            error: `Erro ao reiniciar instância: ${error.message}` 
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }

      default: {
        return new Response(JSON.stringify({ 
          success: false, 
          error: `Ação não reconhecida: ${action}` 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[EVOLUTION-HANDLER] ERROR:", errorMessage);
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
