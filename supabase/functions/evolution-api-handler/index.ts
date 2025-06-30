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

// NOVA: Função para interpretar estados da Evolution API de forma padronizada
const interpretConnectionState = (rawState: string | null | undefined): string => {
  if (!rawState) return 'disconnected';
  
  const state = rawState.toLowerCase();
  console.log(`[STATUS-INTERPRETER] Interpretando estado bruto: "${rawState}" -> normalizado: "${state}"`);
  
  // Estados que indicam conexão ativa
  const connectedStates = ['open', 'connected'];
  // Estados que indicam processo de conexão
  const connectingStates = ['connecting', 'qr', 'pairing'];
  // Estados que indicam desconexão
  const disconnectedStates = ['disconnected', 'close', 'closed'];
  
  if (connectedStates.includes(state)) {
    console.log(`[STATUS-INTERPRETER] Estado "${state}" interpretado como: CONNECTED`);
    return 'connected';
  }
  
  if (connectingStates.includes(state)) {
    console.log(`[STATUS-INTERPRETER] Estado "${state}" interpretado como: CONNECTING`);
    return 'connecting';
  }
  
  if (disconnectedStates.includes(state)) {
    console.log(`[STATUS-INTERPRETER] Estado "${state}" interpretado como: DISCONNECTED`);
    return 'disconnected';
  }
  
  // Estado desconhecido - log para análise
  console.log(`[STATUS-INTERPRETER] Estado desconhecido "${state}" - assumindo DISCONNECTED`);
  return 'disconnected';
};

// NOVA: Função auxiliar unificada para verificar status de instância
const getInstanceStatus = async (instanceName: string, evolutionApiUrl: string, evolutionApiKey: string) => {
  console.log(`[GET-INSTANCE-STATUS] Verificando status para instância: ${instanceName}`);
  
  try {
    const statusResponse = await retryWithBackoff(() => 
      fetch(`${evolutionApiUrl}/instance/connectionState/${instanceName}`, {
        headers: { 'apikey': evolutionApiKey }
      })
    );
    
    console.log(`[GET-INSTANCE-STATUS] Response status: ${statusResponse.status}, ok: ${statusResponse.ok}`);
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      
      // INSTRUMENTAÇÃO: Log completo dos dados brutos recebidos
      console.log('[GET-INSTANCE-STATUS] Raw status data received:', JSON.stringify(statusData, null, 2));
      
      const rawState = statusData.state || statusData.instance?.state || null;
      console.log(`[GET-INSTANCE-STATUS] Estado extraído: "${rawState}"`);
      
      const interpretedState = interpretConnectionState(rawState);
      console.log(`[GET-INSTANCE-STATUS] Estado final interpretado: "${interpretedState}"`);
      
      return {
        exists: true,
        state: interpretedState,
        rawState: rawState,
        fullResponse: statusData
      };
    } else if (statusResponse.status === 404) {
      console.log(`[GET-INSTANCE-STATUS] Instância não encontrada (404)`);
      return {
        exists: false,
        state: 'not_found',
        rawState: null,
        fullResponse: null
      };
    } else {
      console.log(`[GET-INSTANCE-STATUS] Erro HTTP: ${statusResponse.status}`);
      return {
        exists: false,
        state: 'disconnected',
        rawState: null,
        fullResponse: null
      };
    }
  } catch (error) {
    console.error(`[GET-INSTANCE-STATUS] Erro na requisição:`, error);
    return {
      exists: false,
      state: 'disconnected',
      rawState: null,
      fullResponse: null
    };
  }
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

// CORREÇÃO: Função específica para gerar pairing code
const generatePairingCodeWithPhone = async (instanceName: string, phoneNumber: string, evolutionApiUrl: string, evolutionApiKey: string) => {
  console.log(`[PAIRING-CODE-GENERATOR] 🚨 Gerando pairing code para instância: ${instanceName} com número: ${phoneNumber}`);
  
  try {
    // CORREÇÃO: Usar endpoint correto com parâmetro number para pairing code
    const pairingUrl = `${evolutionApiUrl}/instance/connect/${instanceName}?number=${phoneNumber}`;
    console.log(`[PAIRING-CODE-GENERATOR] 🚨 URL do pairing code: ${pairingUrl}`);
    
    const pairingResponse = await retryWithBackoff(() =>
      fetch(pairingUrl, {
        method: 'GET',
        headers: { 'apikey': evolutionApiKey }
      })
    );

    console.log(`[PAIRING-CODE-GENERATOR] Response status: ${pairingResponse.status}, ok: ${pairingResponse.ok}`);
    
    if (pairingResponse.ok) {
      const pairingData = await pairingResponse.json();
      console.log('[PAIRING-CODE-GENERATOR] 🚨 RAW PAIRING RESPONSE:', JSON.stringify(pairingData, null, 2));
      
      // CORREÇÃO: Buscar pairing code em diferentes propriedades possíveis
      let pairingCode = pairingData.pairingCode || pairingData.code || pairingData.pairing_code || pairingData.pair_code;
      
      if (pairingCode) {
        console.log(`[PAIRING-CODE-GENERATOR] ✅ Pairing code encontrado: ${pairingCode}`);
        return {
          success: true,
          pairingCode: pairingCode,
          rawResponse: pairingData
        };
      } else {
        console.log('[PAIRING-CODE-GENERATOR] ❌ Pairing code não encontrado na resposta');
        return {
          success: false,
          error: 'Pairing code não encontrado na resposta da API',
          rawResponse: pairingData
        };
      }
    } else {
      const errorText = await pairingResponse.text();
      console.error(`[PAIRING-CODE-GENERATOR] ❌ Erro HTTP: ${pairingResponse.status} - ${errorText}`);
      return {
        success: false,
        error: `Erro HTTP ${pairingResponse.status}: ${errorText}`
      };
    }
  } catch (error) {
    console.error(`[PAIRING-CODE-GENERATOR] ❌ Erro na requisição:`, error);
    return {
      success: false,
      error: `Erro na requisição: ${error.message}`
    };
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

        // Usar função unificada para verificar status
        const statusInfo = await getInstanceStatus(targetInstanceName, cleanApiUrl, evolutionApiKey);
        
        console.log(`[EVOLUTION-HANDLER] Status verificado:`, statusInfo);
        
        if (statusInfo.exists && statusInfo.state === 'connected') {
          console.log('[EVOLUTION-HANDLER] Instância já conectada');
          return new Response(JSON.stringify({ 
            success: true,
            state: 'already_connected',
            message: 'WhatsApp já está conectado'
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Se não existe, criar instância com suporte a Pairing Code
        if (!statusInfo.exists) {
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

        // CORREÇÃO: Gerar QR Code (endpoint normal sem parâmetro)
        let qrCode = null;
        try {
          console.log(`[EVOLUTION-HANDLER] 🚨 Gerando QR Code - endpoint: ${cleanApiUrl}/instance/connect/${targetInstanceName}`);
          const qrResponse = await retryWithBackoff(() =>
            fetch(`${cleanApiUrl}/instance/connect/${targetInstanceName}`, {
              method: 'GET',
              headers: { 'apikey': evolutionApiKey }
            })
          );

          if (qrResponse.ok) {
            const qrData = await qrResponse.json();
            console.log('[EVOLUTION-HANDLER] 🚨 RAW QR RESPONSE:', JSON.stringify(qrData, null, 2));
            
            if (qrData.qrcode?.base64 || qrData.base64) {
              qrCode = qrData.qrcode?.base64 || qrData.base64;
              if (!qrCode.startsWith('data:image/')) {
                qrCode = `data:image/png;base64,${qrCode}`;
              }
              console.log('[EVOLUTION-HANDLER] ✅ QR Code extraído com sucesso');
            }
          }
        } catch (error) {
          console.error(`[EVOLUTION-HANDLER] ❌ Erro ao gerar QR Code:`, error);
        }

        // CORREÇÃO: Gerar Pairing Code usando função específica
        let pairingCode = null;
        const pairingResult = await generatePairingCodeWithPhone(targetInstanceName, profile.numero, cleanApiUrl, evolutionApiKey);
        
        if (pairingResult.success) {
          pairingCode = pairingResult.pairingCode;
          console.log(`[EVOLUTION-HANDLER] ✅ Pairing code gerado: ${pairingCode}`);
        } else {
          console.error(`[EVOLUTION-HANDLER] ❌ Erro ao gerar pairing code:`, pairingResult.error);
        }

        if (!qrCode && !pairingCode) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: "Não foi possível gerar códigos de conexão",
            debug: {
              qrCodeGenerated: !!qrCode,
              pairingCodeResult: pairingResult
            }
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
          message: 'Códigos gerados com sucesso',
          debug: {
            qrCodeGenerated: !!qrCode,
            pairingCodeGenerated: !!pairingCode,
            pairingCodeLength: pairingCode?.length || 0
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "get-status": {
        const targetInstanceName = instanceName || profile.instance_name;
        if (!targetInstanceName) {
          console.log('[GET-STATUS] Nenhuma instância encontrada - retornando disconnected');
          return new Response(JSON.stringify({ 
            success: true, 
            status: 'disconnected' 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        console.log(`[GET-STATUS] Verificando status para instância: ${targetInstanceName}`);
        auditLog("GET_STATUS", user.id, { instanceName: targetInstanceName });

        // CORREÇÃO: Usar função unificada com instrumentação completa
        const statusInfo = await getInstanceStatus(targetInstanceName, cleanApiUrl, evolutionApiKey);
        
        // INSTRUMENTAÇÃO: Log detalhado do resultado
        console.log('[GET-STATUS] Resultado da verificação:', {
          exists: statusInfo.exists,
          state: statusInfo.state,
          rawState: statusInfo.rawState,
          hasFullResponse: !!statusInfo.fullResponse
        });
        
        // Retornar status padronizado
        const finalStatus = statusInfo.exists ? statusInfo.state : 'disconnected';
        console.log(`[GET-STATUS] Status final retornado: ${finalStatus}`);
        
        return new Response(JSON.stringify({ 
          success: true, 
          status: finalStatus
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
