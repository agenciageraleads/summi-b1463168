
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

// NOVA: Função para validar pairing code de 8 dígitos
const validatePairingCode = (code: string | null | undefined): string | null => {
  if (!code) return null;
  
  const cleanCode = code.toString().trim().toUpperCase();
  
  // Validar formato: exatos 8 caracteres alfanuméricos
  if (/^[A-Z0-9]{8}$/.test(cleanCode)) {
    console.log(`[PAIRING-VALIDATOR] ✅ Pairing code válido: ${cleanCode}`);
    return cleanCode;
  }
  
  console.log(`[PAIRING-VALIDATOR] ❌ Pairing code inválido: "${code}" -> limpo: "${cleanCode}"`);
  return null;
};

// CORREÇÃO: Função específica para gerar QR Code (sem parâmetros)
const generateQRCodeOnly = async (instanceName: string, evolutionApiUrl: string, evolutionApiKey: string) => {
  console.log(`[QR-GENERATOR] 🎯 Gerando QR Code para instância: ${instanceName}`);
  
  try {
    const qrUrl = `${evolutionApiUrl}/instance/connect/${instanceName}`;
    console.log(`[QR-GENERATOR] 🎯 URL do QR Code: ${qrUrl}`);
    
    const qrResponse = await retryWithBackoff(() =>
      fetch(qrUrl, {
        method: 'GET',
        headers: { 'apikey': evolutionApiKey }
      })
    );

    console.log(`[QR-GENERATOR] Response status: ${qrResponse.status}, ok: ${qrResponse.ok}`);
    
    if (qrResponse.ok) {
      const qrData = await qrResponse.json();
      console.log('[QR-GENERATOR] 🎯 RAW QR RESPONSE:', JSON.stringify(qrData, null, 2));
      
      let qrCodeData = qrData.qrcode?.base64 || qrData.base64 || qrData.qrcode?.code || qrData.code;
      
      if (qrCodeData && !qrCodeData.startsWith('data:image/')) {
        qrCodeData = `data:image/png;base64,${qrCodeData}`;
      }
      
      if (qrCodeData) {
        console.log(`[QR-GENERATOR] ✅ QR Code gerado com sucesso`);
        return {
          success: true,
          qrCode: qrCodeData,
          rawResponse: qrData
        };
      } else {
        console.log('[QR-GENERATOR] ❌ QR Code não encontrado na resposta');
        return {
          success: false,
          error: 'QR Code não encontrado na resposta da API',
          rawResponse: qrData
        };
      }
    } else {
      const errorText = await qrResponse.text();
      console.error(`[QR-GENERATOR] ❌ Erro HTTP: ${qrResponse.status} - ${errorText}`);
      return {
        success: false,
        error: `Erro HTTP ${qrResponse.status}: ${errorText}`
      };
    }
  } catch (error) {
    console.error(`[QR-GENERATOR] ❌ Erro na requisição:`, error);
    return {
      success: false,
      error: `Erro na requisição: ${error.message}`
    };
  }
};

// CORREÇÃO: Função específica para gerar Pairing Code (com parâmetro number)
const generatePairingCodeOnly = async (instanceName: string, phoneNumber: string, evolutionApiUrl: string, evolutionApiKey: string) => {
  console.log(`[PAIRING-GENERATOR] 🎯 Gerando pairing code para instância: ${instanceName} com número: ${phoneNumber}`);
  
  try {
    const pairingUrl = `${evolutionApiUrl}/instance/connect/${instanceName}?number=${phoneNumber}`;
    console.log(`[PAIRING-GENERATOR] 🎯 URL do pairing code: ${pairingUrl}`);
    
    const pairingResponse = await retryWithBackoff(() =>
      fetch(pairingUrl, {
        method: 'GET',
        headers: { 'apikey': evolutionApiKey }
      })
    );

    console.log(`[PAIRING-GENERATOR] Response status: ${pairingResponse.status}, ok: ${pairingResponse.ok}`);
    
    if (pairingResponse.ok) {
      const pairingData = await pairingResponse.json();
      console.log('[PAIRING-GENERATOR] 🎯 RAW PAIRING RESPONSE:', JSON.stringify(pairingData, null, 2));
      
      // Buscar pairing code em diferentes propriedades possíveis
      let rawPairingCode = pairingData.qrcode?.pairingCode || pairingData.pairingCode || pairingData.code;
      
      // Validar se é realmente um pairing code de 8 dígitos
      const validPairingCode = validatePairingCode(rawPairingCode);
      
      if (validPairingCode) {
        console.log(`[PAIRING-GENERATOR] ✅ Pairing code válido gerado: ${validPairingCode}`);
        return {
          success: true,
          pairingCode: validPairingCode,
          rawResponse: pairingData
        };
      } else {
        console.log('[PAIRING-GENERATOR] ❌ Pairing code inválido ou não encontrado na resposta');
        return {
          success: false,
          error: 'Pairing code de 8 dígitos não encontrado na resposta da API',
          rawResponse: pairingData,
          needsRecreation: true // Sinaliza que precisa recriar a instância
        };
      }
    } else {
      const errorText = await pairingResponse.text();
      console.error(`[PAIRING-GENERATOR] ❌ Erro HTTP: ${pairingResponse.status} - ${errorText}`);
      return {
        success: false,
        error: `Erro HTTP ${pairingResponse.status}: ${errorText}`
      };
    }
  } catch (error) {
    console.error(`[PAIRING-GENERATOR] ❌ Erro na requisição:`, error);
    return {
      success: false,
      error: `Erro na requisição: ${error.message}`
    };
  }
};

// NOVA: Função para deletar instância
const deleteInstance = async (instanceName: string, evolutionApiUrl: string, evolutionApiKey: string) => {
  console.log(`[DELETE-INSTANCE] 🗑️ Deletando instância: ${instanceName}`);
  
  try {
    const deleteResponse = await fetch(`${evolutionApiUrl}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: { 'apikey': evolutionApiKey }
    });
    
    console.log(`[DELETE-INSTANCE] Response status: ${deleteResponse.status}, ok: ${deleteResponse.ok}`);
    
    // 404 significa que já não existe, consideramos sucesso
    const success = deleteResponse.ok || deleteResponse.status === 404;
    
    if (success) {
      console.log(`[DELETE-INSTANCE] ✅ Instância deletada com sucesso`);
      return { success: true };
    } else {
      const errorText = await deleteResponse.text();
      console.log(`[DELETE-INSTANCE] ❌ Erro ao deletar: ${errorText}`);
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.error(`[DELETE-INSTANCE] ❌ Erro na requisição:`, error);
    return { success: false, error: error.message };
  }
};

// NOVA: Função para criar instância com suporte correto ao pairing code
const createInstanceWithPairingSupport = async (instanceName: string, phoneNumber: string, webhookUrl: string, evolutionApiUrl: string, evolutionApiKey: string) => {
  console.log(`[CREATE-INSTANCE] 🏗️ Criando instância com suporte a pairing code: ${instanceName}`);
  
  try {
    // CORREÇÃO: Usar endpoint correto com parâmetro number para garantir pairing code
    const createUrl = `${evolutionApiUrl}/instance/create?number=${phoneNumber}`;
    console.log(`[CREATE-INSTANCE] 🏗️ URL de criação: ${createUrl}`);
    
    const createPayload = {
      instanceName,
      qrcode: true,
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

    console.log('[CREATE-INSTANCE] 🏗️ Payload de criação:', JSON.stringify(createPayload, null, 2));

    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey
      },
      body: JSON.stringify(createPayload)
    });
    
    console.log(`[CREATE-INSTANCE] Response status: ${createResponse.status}, ok: ${createResponse.ok}`);
    
    if (createResponse.ok) {
      const creationData = await createResponse.json();
      console.log('[CREATE-INSTANCE] 🏗️ RAW CREATION RESPONSE:', JSON.stringify(creationData, null, 2));
      
      // Verificar se o pairing code já veio na resposta da criação
      const rawPairingCode = creationData.qrcode?.pairingCode || creationData.pairingCode;
      const validPairingCode = validatePairingCode(rawPairingCode);
      
      // Extrair QR Code se disponível
      let qrCodeData = creationData.qrcode?.base64 || creationData.base64;
      if (qrCodeData && !qrCodeData.startsWith('data:image/')) {
        qrCodeData = `data:image/png;base64,${qrCodeData}`;
      }
      
      console.log(`[CREATE-INSTANCE] ✅ Instância criada - Pairing code válido: ${!!validPairingCode}, QR Code: ${!!qrCodeData}`);
      
      return {
        success: true,
        pairingCode: validPairingCode,
        qrCode: qrCodeData,
        rawResponse: creationData
      };
    } else {
      const errorText = await createResponse.text();
      
      // Se erro for que já existe, não é fatal
      if (errorText && errorText.toLowerCase().includes("instance already exists")) {
        console.log('[CREATE-INSTANCE] ⚠️ Instância já existe, continuando...');
        return { success: true, alreadyExists: true };
      } else {
        console.error(`[CREATE-INSTANCE] ❌ Erro ao criar: ${createResponse.status} - ${errorText}`);
        return { success: false, error: `Erro HTTP ${createResponse.status}: ${errorText}` };
      }
    }
  } catch (error) {
    console.error(`[CREATE-INSTANCE] ❌ Erro na requisição:`, error);
    return { success: false, error: `Erro na requisição: ${error.message}` };
  }
};

// NOVA: Função para recriar instância quando pairing code não for gerado corretamente
const recreateInstanceForPairingCode = async (instanceName: string, phoneNumber: string, webhookUrl: string, evolutionApiUrl: string, evolutionApiKey: string, maxAttempts = 2) => {
  console.log(`[RECREATE-INSTANCE] 🔄 Iniciando recriação de instância para pairing code: ${instanceName}`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[RECREATE-INSTANCE] 🔄 Tentativa ${attempt}/${maxAttempts}`);
    
    try {
      // 1. Deletar instância existente
      console.log(`[RECREATE-INSTANCE] 🗑️ Deletando instância existente...`);
      const deleteResult = await deleteInstance(instanceName, evolutionApiUrl, evolutionApiKey);
      
      if (!deleteResult.success) {
        console.log(`[RECREATE-INSTANCE] ⚠️ Erro ao deletar, continuando... ${deleteResult.error}`);
      }
      
      // 2. Aguardar processamento da Evolution API
      console.log(`[RECREATE-INSTANCE] ⏳ Aguardando 5 segundos para processamento...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // 3. Criar nova instância
      console.log(`[RECREATE-INSTANCE] 🏗️ Criando nova instância...`);
      const createResult = await createInstanceWithPairingSupport(instanceName, phoneNumber, webhookUrl, evolutionApiUrl, evolutionApiKey);
      
      if (createResult.success && createResult.pairingCode) {
        console.log(`[RECREATE-INSTANCE] ✅ Instância recriada com sucesso - Pairing code: ${createResult.pairingCode}`);
        return {
          success: true,
          pairingCode: createResult.pairingCode,
          qrCode: createResult.qrCode,
          attempt: attempt
        };
      } else if (createResult.success && createResult.alreadyExists) {
        console.log(`[RECREATE-INSTANCE] ⚠️ Instância já existe na tentativa ${attempt}, tentando gerar pairing code...`);
        
        // Tentar gerar pairing code para instância existente
        const pairingResult = await generatePairingCodeOnly(instanceName, phoneNumber, evolutionApiUrl, evolutionApiKey);
        
        if (pairingResult.success && pairingResult.pairingCode) {
          console.log(`[RECREATE-INSTANCE] ✅ Pairing code gerado para instância existente: ${pairingResult.pairingCode}`);
          return {
            success: true,
            pairingCode: pairingResult.pairingCode,
            attempt: attempt
          };
        }
      }
      
      console.log(`[RECREATE-INSTANCE] ❌ Tentativa ${attempt} falhou:`, createResult.error);
      
      if (attempt < maxAttempts) {
        console.log(`[RECREATE-INSTANCE] ⏳ Aguardando antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
    } catch (error) {
      console.error(`[RECREATE-INSTANCE] ❌ Erro na tentativa ${attempt}:`, error);
      
      if (attempt === maxAttempts) {
        return {
          success: false,
          error: `Falha após ${maxAttempts} tentativas: ${error.message}`,
          attempt: attempt
        };
      }
    }
  }
  
  return {
    success: false,
    error: `Falha após ${maxAttempts} tentativas de recriação`,
    attempt: maxAttempts
  };
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

        let qrCode = null;
        let pairingCode = null;

        // CORREÇÃO: Gerar QR Code separadamente (sem parâmetros)
        console.log(`[EVOLUTION-HANDLER] 🎯 Gerando QR Code...`);
        const qrResult = await generateQRCodeOnly(targetInstanceName, cleanApiUrl, evolutionApiKey);
        
        if (qrResult.success) {
          qrCode = qrResult.qrCode;
          console.log('[EVOLUTION-HANDLER] ✅ QR Code gerado com sucesso');
        } else {
          console.error(`[EVOLUTION-HANDLER] ❌ Erro ao gerar QR Code:`, qrResult.error);
        }

        // CORREÇÃO: Gerar Pairing Code separadamente (com parâmetro number)
        console.log(`[EVOLUTION-HANDLER] 🎯 Gerando Pairing Code...`);
        const pairingResult = await generatePairingCodeOnly(targetInstanceName, profile.numero, cleanApiUrl, evolutionApiKey);
        
        if (pairingResult.success) {
          pairingCode = pairingResult.pairingCode;
          console.log(`[EVOLUTION-HANDLER] ✅ Pairing code gerado: ${pairingCode}`);
        } else {
          console.error(`[EVOLUTION-HANDLER] ❌ Erro ao gerar pairing code:`, pairingResult.error);
          
          // NOVA: Se pairing code falhou e sinaliza necessidade de recriação
          if (pairingResult.needsRecreation) {
            console.log(`[EVOLUTION-HANDLER] 🔄 Tentando recriar instância para gerar pairing code...`);
            
            const recreateResult = await recreateInstanceForPairingCode(
              targetInstanceName, 
              profile.numero, 
              webhookUrl, 
              cleanApiUrl, 
              evolutionApiKey
            );
            
            if (recreateResult.success) {
              pairingCode = recreateResult.pairingCode;
              if (recreateResult.qrCode) qrCode = recreateResult.qrCode;
              console.log(`[EVOLUTION-HANDLER] ✅ Instância recriada com pairing code: ${pairingCode}`);
            } else {
              console.error(`[EVOLUTION-HANDLER] ❌ Falha na recriação:`, recreateResult.error);
            }
          }
        }

        // Se não conseguiu gerar pelo menos um código, erro
        if (!qrCode && !pairingCode) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: "Não foi possível gerar códigos de conexão. Tente recriar a instância.",
            debug: {
              qrResult: qrResult.error,
              pairingResult: pairingResult.error
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

        const statusInfo = await getInstanceStatus(targetInstanceName, cleanApiUrl, evolutionApiKey);
        
        console.log('[GET-STATUS] Resultado da verificação:', {
          exists: statusInfo.exists,
          state: statusInfo.state,
          rawState: statusInfo.rawState,
          hasFullResponse: !!statusInfo.fullResponse
        });
        
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
          const deleteResult = await deleteInstance(targetInstanceName, cleanApiUrl, evolutionApiKey);

          // Limpar instance_name do perfil
          await supabaseServiceRole
            .from('profiles')
            .update({ instance_name: null })
            .eq('id', user.id);
          
          return new Response(JSON.stringify({ 
            success: true,
            message: deleteResult.success ? 'Instância deletada com sucesso' : 'Instância removida do perfil'
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
