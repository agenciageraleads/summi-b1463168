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

// CORREÇÃO: Função para retry com backoff exponencial e timeout robusto
const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3, baseDelay = 2000, timeoutMs = 30000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[EVOLUTION-HANDLER] Tentativa ${attempt}/${maxRetries} com timeout de ${timeoutMs}ms`);
      
      // Implementar timeout para cada tentativa
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout de ${timeoutMs}ms atingido`)), timeoutMs)
      );
      
      const result = await Promise.race([fn(), timeoutPromise]);
      console.log(`[EVOLUTION-HANDLER] ✅ Tentativa ${attempt} bem-sucedida`);
      return result;
    } catch (error) {
      console.log(`[EVOLUTION-HANDLER] ❌ Tentativa ${attempt} falhou:`, (error as Error).message);
      
      if (attempt === maxRetries) {
        console.log(`[EVOLUTION-HANDLER] ❌ Todas as ${maxRetries} tentativas falharam`);
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`[EVOLUTION-HANDLER] ⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// CORREÇÃO: Validação do pairing code - aceitar 6 a 10 caracteres alfanuméricos
const validatePairingCode = (code: string | null | undefined): string | null => {
  if (!code) return null;
  
  const cleanCode = code.toString().trim().toUpperCase();
  
  // Validação relaxada - 6 a 10 caracteres alfanuméricos
  if (/^[A-Z0-9]{6,10}$/.test(cleanCode)) {
    console.log(`[PAIRING-VALIDATOR] ✅ Pairing code válido: ${cleanCode}`);
    return cleanCode;
  }
  
  console.log(`[PAIRING-VALIDATOR] ❌ Pairing code inválido - formato: "${code}" -> limpo: "${cleanCode}"`);
  return null;
};

// CORREÇÃO: Função robusta para reiniciar instância com timeout adequado
const restartInstance = async (instanceName: string, evolutionApiUrl: string, evolutionApiKey: string) => {
  console.log(`[RESTART-INSTANCE] 🔄 Reiniciando instância: ${instanceName}`);
  
  try {
    const restartResponse = await retryWithBackoff(() => 
      fetch(`${evolutionApiUrl}/instance/restart/${instanceName}`, {
        method: 'PUT',
        headers: { 'apikey': evolutionApiKey },
        signal: AbortSignal.timeout(20000) // Timeout de 20s por tentativa
      }), 2, 3000, 20000 // 2 tentativas, delay base 3s, timeout 20s
    );
    
    console.log(`[RESTART-INSTANCE] Response status: ${restartResponse.status}, ok: ${restartResponse.ok}`);
    
    if (restartResponse.ok) {
      const restartData = await restartResponse.json();
      console.log('[RESTART-INSTANCE] ✅ Instância reiniciada com sucesso:', JSON.stringify(restartData, null, 2));
      
      // CORREÇÃO: Validar se o restart realmente funcionou
      await new Promise(resolve => setTimeout(resolve, 3000)); // Aguardar estabilização
      
      const statusCheck = await getInstanceStatus(instanceName, evolutionApiUrl, evolutionApiKey);
      console.log(`[RESTART-INSTANCE] 🔍 Verificação pós-restart: ${statusCheck.state}`);
      
      return { 
        success: true, 
        data: restartData,
        postRestartStatus: statusCheck.state,
        validated: statusCheck.state !== 'connecting'
      };
    } else {
      const errorText = await restartResponse.text();
      console.log(`[RESTART-INSTANCE] ❌ Erro ao reiniciar: ${restartResponse.status} - ${errorText}`);
      return { success: false, error: `HTTP ${restartResponse.status}: ${errorText}` };
    }
  } catch (error) {
    console.error(`[RESTART-INSTANCE] ❌ Erro na requisição:`, error);
    return { success: false, error: `Erro na requisição: ${(error as Error).message}` };
  }
};

// CORREÇÃO: Função robusta para gerar QR Code com validação de connecting
const generateQRCodeOnly = async (instanceName: string, evolutionApiUrl: string, evolutionApiKey: string) => {
  console.log(`[QR-GENERATOR] 🎯 Gerando QR Code para instância: ${instanceName}`);
  
  try {
    // CORREÇÃO: Verificar status antes de gerar QR Code
    const statusCheck = await getInstanceStatus(instanceName, evolutionApiUrl, evolutionApiKey);
    
    if (statusCheck.state === 'connected') {
      console.log(`[QR-GENERATOR] ⚠️ Instância já conectada - não é necessário QR Code`);
      return {
        success: false,
        error: 'Instance is already connected',
        state: 'already_connected'
      };
    }
    
    if (statusCheck.state === 'connecting') {
      console.log(`[QR-GENERATOR] ⚠️ Instância em status connecting - pode precisar restart`);
      return {
        success: false,
        error: 'Instance is in connecting state - may need restart',
        needsRestart: true,
        state: 'connecting'
      };
    }
    
    const qrUrl = `${evolutionApiUrl}/instance/connect/${instanceName}`;
    console.log(`[QR-GENERATOR] 🎯 URL do QR Code: ${qrUrl}`);
    
    const qrResponse = await retryWithBackoff(() =>
      fetch(qrUrl, {
        method: 'GET',
        headers: { 'apikey': evolutionApiKey },
        signal: AbortSignal.timeout(15000) // Timeout de 15s
      }), 3, 2000, 15000
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
          rawResponse: qrData,
          needsRestart: true // Pode indicar problema que necessita restart
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
      error: `Erro na requisição: ${(error as Error).message}`
    };
  }
};

// CORREÇÃO: Função específica para gerar Pairing Code (com parâmetro number OBRIGATÓRIO)
const generatePairingCodeOnly = async (instanceName: string, phoneNumber: string, evolutionApiUrl: string, evolutionApiKey: string) => {
  console.log(`[PAIRING-GENERATOR] 🎯 Gerando pairing code para instância: ${instanceName} com número: ${phoneNumber}`);
  
  try {
    // CORREÇÃO CRÍTICA: Usar endpoint correto com ?number= obrigatório
    const pairingUrl = `${evolutionApiUrl}/instance/connect/${instanceName}?number=${phoneNumber}`;
    console.log(`[PAIRING-GENERATOR] 🎯 URL CORRETA do pairing code: ${pairingUrl}`);
    
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
      let rawPairingCode = pairingData.pairingCode || pairingData.qrcode?.pairingCode || pairingData.code;
      
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
          error: 'Pairing code não encontrado na resposta da API',
          rawResponse: pairingData,
          needsRestart: true // Sinaliza que precisa reiniciar
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
      error: `Erro na requisição: ${(error as Error).message}`
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
    return { success: false, error: (error as Error).message };
  }
};

// NOVA: Função para criar instância com suporte correto ao pairing code
const createInstanceWithPairingSupport = async (instanceName: string, phoneNumber: string, webhookUrl: string, evolutionApiUrl: string, evolutionApiKey: string, userRole: string = 'user') => {
  console.log(`[CREATE-INSTANCE] 🏗️ Criando instância com suporte a pairing code: ${instanceName}`);
  console.log(`[CREATE-INSTANCE] 👤 Role do usuário: ${userRole}`);
  
  // Determinar webhook baseado no role do usuário.
  const finalWebhookUrl = userRole === 'beta'
    ? (Deno.env.get("WEBHOOK_ANALISA_MENSAGENS") ?? webhookUrl)
    : webhookUrl;
  
  console.log(`[CREATE-INSTANCE] 🎯 Webhook selecionado: ${finalWebhookUrl} (role: ${userRole})`);
  
  try {
    // CORREÇÃO: Usar endpoint correto com parâmetro number para garantir pairing code
    const createUrl = `${evolutionApiUrl}/instance/create?number=${phoneNumber}`;
    console.log(`[CREATE-INSTANCE] 🏗️ URL de criação: ${createUrl}`);
    
    const createPayload = {
      instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      webhook: {
        url: finalWebhookUrl,
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
    return { success: false, error: `Erro na requisição: ${(error as Error).message}` };
  }
};

// NOVA: Função robusta para lidar com status "connecting" persistente
const handleConnectingStatus = async (instanceName: string, phoneNumber: string, webhookUrl: string, evolutionApiUrl: string, evolutionApiKey: string, userRole: string = 'user', maxRestartAttempts = 2) => {
  console.log(`[HANDLE-CONNECTING] 🔄 Lidando com status connecting para: ${instanceName} (role: ${userRole})`);
  
  for (let restartAttempt = 1; restartAttempt <= maxRestartAttempts; restartAttempt++) {
    console.log(`[HANDLE-CONNECTING] 🔄 Tentativa de restart ${restartAttempt}/${maxRestartAttempts}`);
    
    try {
      // 1. Tentar reiniciar a instância
      const restartResult = await restartInstance(instanceName, evolutionApiUrl, evolutionApiKey);
      
      if (!restartResult.success) {
        console.log(`[HANDLE-CONNECTING] ❌ Restart ${restartAttempt} falhou:`, restartResult.error);
        if (restartAttempt < maxRestartAttempts) {
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        } else {
          break; // Vai para recriação
        }
      }
      
      // 2. Aguardar estabilização após restart
      console.log(`[HANDLE-CONNECTING] ⏳ Aguardando 5 segundos após restart...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // 3. Tentar gerar pairing code após restart
      const pairingResult = await generatePairingCodeOnly(instanceName, phoneNumber, evolutionApiUrl, evolutionApiKey);
      
      if (pairingResult.success && pairingResult.pairingCode) {
        console.log(`[HANDLE-CONNECTING] ✅ Pairing code gerado após restart: ${pairingResult.pairingCode}`);
        
        // Tentar gerar QR Code também
        const qrResult = await generateQRCodeOnly(instanceName, evolutionApiUrl, evolutionApiKey);
        
        return {
          success: true,
          pairingCode: pairingResult.pairingCode,
          qrCode: qrResult.success ? qrResult.qrCode : null,
          method: 'restart',
          attempt: restartAttempt
        };
      } else {
        console.log(`[HANDLE-CONNECTING] ❌ Pairing code não gerado após restart ${restartAttempt}`);
        if (restartAttempt < maxRestartAttempts) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      
    } catch (error) {
      console.error(`[HANDLE-CONNECTING] ❌ Erro na tentativa de restart ${restartAttempt}:`, error);
      if (restartAttempt < maxRestartAttempts) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }
  
  // Se chegou aqui, todos os restarts falharam, tentar recriação
  console.log(`[HANDLE-CONNECTING] 🔄 Todos os restarts falharam, tentando recriação...`);
  
  try {
    // 1. Deletar instância existente
    const deleteResult = await deleteInstance(instanceName, evolutionApiUrl, evolutionApiKey);
    if (!deleteResult.success) {
      console.log(`[HANDLE-CONNECTING] ⚠️ Erro ao deletar, continuando... ${deleteResult.error}`);
    }
    
    // 2. Aguardar processamento da Evolution API
    console.log(`[HANDLE-CONNECTING] ⏳ Aguardando 5 segundos para processamento...`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 3. Criar nova instância
    const createResult = await createInstanceWithPairingSupport(instanceName, phoneNumber, webhookUrl, evolutionApiUrl, evolutionApiKey, userRole);
    
    if (createResult.success && createResult.pairingCode) {
      console.log(`[HANDLE-CONNECTING] ✅ Instância recriada com pairing code: ${createResult.pairingCode}`);
      return {
        success: true,
        pairingCode: createResult.pairingCode,
        qrCode: createResult.qrCode,
        method: 'recreation'
      };
    } else {
      console.log(`[HANDLE-CONNECTING] ❌ Falha na recriação:`, createResult.error);
      return {
        success: false,
        error: `Falha após ${maxRestartAttempts} restarts e recriação: ${createResult.error}`,
        method: 'recreation'
      };
    }
    
  } catch (error) {
    console.error(`[HANDLE-CONNECTING] ❌ Erro na recriação:`, error);
    return {
      success: false,
      error: `Erro na recriação: ${(error as Error).message}`,
      method: 'recreation'
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
    // Validação rigorosa das variáveis de ambiente
    const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");
    // Webhook para receber eventos da Evolution.
    const webhookUrl = Deno.env.get("WEBHOOK_RECEBE_MENSAGEM");

    if (!evolutionApiUrl || !evolutionApiKey) {
      console.error('[EVOLUTION-HANDLER] ❌ Variáveis de ambiente não configuradas');
      return new Response(JSON.stringify({
        success: false,
        error: "Configuração da Evolution API não encontrada"
      }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!webhookUrl) {
      console.error('[EVOLUTION-HANDLER] ❌ Webhook URL não configurada');
      return new Response(JSON.stringify({
        success: false,
        error: "Webhook não configurado"
      }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const cleanApiUrl = evolutionApiUrl.replace(/\/$/, '');

    // Processar ações baseadas no tipo
    switch (action) {
      case "initialize-connection": {
        auditLog("INITIALIZE_CONNECTION", user.id);
        
        console.log(`[INITIALIZE] 🚀 Iniciando inicialização para usuário ${user.id}`);
        console.log(`[INITIALIZE] 📋 Perfil: nome="${profile.nome}", numero="${profile.numero}", instance_name="${profile.instance_name}"`);
        
        if (!profile.numero) {
          console.log('[INITIALIZE] ❌ Número não configurado');
          return new Response(JSON.stringify({ 
            success: true,
            state: 'needs_phone_number',
            message: 'Configure seu número de telefone nas configurações'
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        if (!validatePhoneNumber(profile.numero)) {
          console.log('[INITIALIZE] ❌ Número inválido:', profile.numero);
          return new Response(JSON.stringify({ 
            success: false, 
            error: "Número de telefone inválido. Use formato brasileiro: 5511999999999" 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // **CORREÇÃO CRÍTICA: Lógica corrigida**
        
        if (!profile.instance_name) {
          // **CASO 1 e 3: Novo Usuário ou Pós-Deleção - CRIAR INSTÂNCIA**
          console.log('[INITIALIZE] 🆕 NOVO USUÁRIO - criando instância pela primeira vez');
          
          const instanceName = createValidInstanceName(profile.nome, profile.numero);
          console.log(`[INITIALIZE] 🏷️ Nome da instância gerado: ${instanceName}`);
          
          // Salvar nome da instância no banco ANTES de criar
          console.log('[INITIALIZE] 💾 Salvando instance_name no banco...');
          const { error: updateError } = await supabaseServiceRole
            .from('profiles')
            .update({ instance_name: instanceName })
            .eq('id', user.id);
          
          if (updateError) {
            console.error("[INITIALIZE] ❌ Erro ao salvar instance_name:", updateError);
            return new Response(JSON.stringify({ 
              success: false, 
              error: "Erro ao configurar instância no banco de dados" 
            }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
          
          console.log('[INITIALIZE] ✅ Instance_name salvo no banco com sucesso');
          
          // Criar nova instância
          console.log('[INITIALIZE] 🏗️ Chamando createInstanceWithPairingSupport...');
          const createResult = await createInstanceWithPairingSupport(
            instanceName, 
            profile.numero, 
            webhookUrl, 
            cleanApiUrl, 
            evolutionApiKey,
            profile.role || 'user'
          );
          
          console.log('[INITIALIZE] 🏗️ Resultado da criação:', {
            success: createResult.success,
            hasQrCode: !!createResult.qrCode,
            hasPairingCode: !!createResult.pairingCode,
            error: createResult.error
          });
          
          if (createResult.success) {
            return new Response(JSON.stringify({ 
              success: true,
              state: 'needs_connection',
              instanceName: instanceName,
              qrCode: createResult.qrCode,
              pairingCode: createResult.pairingCode,
              message: 'Nova instância criada - conecte seu WhatsApp'
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          } else {
            console.error('[INITIALIZE] ❌ Falha na criação da instância:', createResult.error);
            return new Response(JSON.stringify({ 
              success: false, 
              error: createResult.error || 'Falha ao criar nova instância'
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
          
        } else {
          // **CASO 2: Usuário Existente - RECONEXÃO**
          console.log('[INITIALIZE] 🔄 USUÁRIO EXISTENTE - reconectando instância:', profile.instance_name);
          
          // Verificar status atual da instância existente
          console.log('[INITIALIZE] 🔍 Verificando status da instância existente...');
          const statusInfo = await getInstanceStatus(profile.instance_name, cleanApiUrl, evolutionApiKey);
          
          console.log('[INITIALIZE] 📊 Status verificado:', {
            exists: statusInfo.exists,
            state: statusInfo.state,
            rawState: statusInfo.rawState
          });
          
          if (statusInfo.state === 'connected') {
            console.log('[INITIALIZE] ✅ Instância já conectada');
            return new Response(JSON.stringify({ 
              success: true,
              state: 'already_connected',
              instanceName: profile.instance_name,
              message: 'WhatsApp já está conectado'
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
          
          // Para instâncias desconectadas ou com problemas, tentar restart
          console.log('[INITIALIZE] 🔄 Instância precisa ser reiniciada - chamando restart...');
          const restartResult = await restartInstance(profile.instance_name, cleanApiUrl, evolutionApiKey);
          
          console.log('[INITIALIZE] 🔄 Resultado do restart:', {
            success: restartResult.success,
            error: restartResult.error
          });
          
          if (restartResult.success) {
            // Aguardar estabilização após restart
            console.log('[INITIALIZE] ⏳ Aguardando 3 segundos para estabilização...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Tentar gerar códigos após restart
            console.log('[INITIALIZE] 🎯 Gerando códigos após restart...');
            const pairingResult = await generatePairingCodeOnly(profile.instance_name, profile.numero, cleanApiUrl, evolutionApiKey);
            const qrResult = await generateQRCodeOnly(profile.instance_name, cleanApiUrl, evolutionApiKey);
            
            console.log('[INITIALIZE] 🎯 Códigos gerados:', {
              pairingSuccess: pairingResult.success,
              pairingCode: pairingResult.pairingCode,
              qrSuccess: qrResult.success,
              hasQrCode: !!qrResult.qrCode
            });
            
            // Se não conseguir gerar pairing code válido, deletar e recriar
            if (!pairingResult.success || !pairingResult.pairingCode) {
              console.log('[INITIALIZE] ⚠️ Pairing code não gerado após restart - recriando instância');
              
              // Deletar instância atual
              console.log('[INITIALIZE] 🗑️ Deletando instância atual...');
              await deleteInstance(profile.instance_name, cleanApiUrl, evolutionApiKey);
              
              // Aguardar processamento
              console.log('[INITIALIZE] ⏳ Aguardando processamento da deleção...');
              await new Promise(resolve => setTimeout(resolve, 3000));
              
              // Criar nova instância
              console.log('[INITIALIZE] 🏗️ Criando nova instância...');
              const recreateResult = await createInstanceWithPairingSupport(
                profile.instance_name, 
                profile.numero, 
                webhookUrl, 
                cleanApiUrl, 
                evolutionApiKey,
                profile.role || 'user'
              );
              
              console.log('[INITIALIZE] 🏗️ Resultado da recriação:', {
                success: recreateResult.success,
                hasQrCode: !!recreateResult.qrCode,
                hasPairingCode: !!recreateResult.pairingCode,
                error: recreateResult.error
              });
              
              if (recreateResult.success) {
                return new Response(JSON.stringify({ 
                  success: true,
                  state: 'needs_connection',
                  instanceName: profile.instance_name,
                  qrCode: recreateResult.qrCode,
                  pairingCode: recreateResult.pairingCode,
                  message: 'Instância recriada - conecte seu WhatsApp'
                }), {
                  headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
              } else {
                console.error('[INITIALIZE] ❌ Falha na recriação da instância:', recreateResult.error);
                return new Response(JSON.stringify({ 
                  success: false, 
                  error: 'Falha ao recriar instância após problemas de conexão'
                }), {
                  headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
              }
            }
            
            // Se conseguiu gerar códigos após restart
            return new Response(JSON.stringify({ 
              success: true,
              state: 'needs_connection',
              instanceName: profile.instance_name,
              qrCode: qrResult.success ? qrResult.qrCode : null,
              pairingCode: pairingResult.pairingCode,
              message: 'Instância reiniciada - conecte seu WhatsApp'
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
            
          } else {
            console.error('[INITIALIZE] ❌ Falha no restart da instância:', restartResult.error);
            // Fallback: tentar gerar códigos mesmo sem restart (evita 500 para o cliente)
            console.log('[INITIALIZE] 🔁 Fallback sem restart: tentando gerar códigos diretamente...');
            const pairingResult = await generatePairingCodeOnly(profile.instance_name, profile.numero, cleanApiUrl, evolutionApiKey);
            const qrResult = await generateQRCodeOnly(profile.instance_name, cleanApiUrl, evolutionApiKey);

            console.log('[INITIALIZE] 🔁 Resultado do fallback:', {
              pairingSuccess: pairingResult.success,
              qrSuccess: qrResult.success
            });

            if ((pairingResult.success && pairingResult.pairingCode) || (qrResult.success && qrResult.qrCode)) {
              return new Response(JSON.stringify({ 
                success: true,
                state: 'needs_connection',
                instanceName: profile.instance_name,
                qrCode: qrResult.success ? qrResult.qrCode : null,
                pairingCode: pairingResult.success ? pairingResult.pairingCode : null,
                message: 'Prosseguindo sem restart: códigos gerados com sucesso'
              }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            }

            // Se ainda falhar, tentar recriar a instância como último recurso
            console.log('[INITIALIZE] 🛠️ Fallback final: deletando e recriando instância...');
            await deleteInstance(profile.instance_name, cleanApiUrl, evolutionApiKey);
            await new Promise(resolve => setTimeout(resolve, 2000));
            const recreateResult = await createInstanceWithPairingSupport(
              profile.instance_name, 
              profile.numero, 
              webhookUrl, 
              cleanApiUrl, 
              evolutionApiKey,
              profile.role || 'user'
            );

            if (recreateResult.success) {
              return new Response(JSON.stringify({ 
                success: true,
                state: 'needs_connection',
                instanceName: profile.instance_name,
                qrCode: recreateResult.qrCode,
                pairingCode: recreateResult.pairingCode,
                message: 'Instância recriada após falha no restart'
              }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            }

            // Evitar FunctionsHttpError no cliente: retornar 200 com success:false
            return new Response(JSON.stringify({ 
              success: false, 
              state: 'needs_connection',
              error: 'Falha ao reiniciar e recriar instância. Tente novamente mais tarde.'
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
        }
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

        // NOVA LÓGICA: Verificar status e lidar com "connecting"
        const statusInfo = await getInstanceStatus(targetInstanceName, cleanApiUrl, evolutionApiKey);
        
        console.log(`[EVOLUTION-HANDLER] Status verificado:`, statusInfo);
        
        // Se já conectado, retornar
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

        // CORREÇÃO CRÍTICA: Se detectar "connecting", usar função robusta
        if (statusInfo.exists && statusInfo.state === 'connecting') {
          console.log('[EVOLUTION-HANDLER] 🔄 Status connecting detectado - iniciando processo de correção');
          
          const connectingResult = await handleConnectingStatus(
            targetInstanceName, 
            profile.numero, 
            webhookUrl, 
            cleanApiUrl, 
            evolutionApiKey,
            profile.role || 'user'
          );
          
          if (connectingResult.success) {
            return new Response(JSON.stringify({ 
              success: true,
              state: 'needs_connection',
              qrCode: connectingResult.qrCode,
              pairingCode: connectingResult.pairingCode,
              message: `Códigos gerados após ${connectingResult.method === 'restart' ? 'reiniciar' : 'recriar'} instância`,
              debug: {
                method: connectingResult.method,
                attempt: connectingResult.attempt
              }
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          } else {
            return new Response(JSON.stringify({ 
              success: false, 
              error: `Falha ao corrigir status connecting: ${connectingResult.error}`,
              needsRecreation: true
            }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
        }

        // Lógica normal para outros estados
        let qrCode = null;
        let pairingCode: string | null = null;

        // Gerar QR Code separadamente (sem parâmetros)
        console.log(`[EVOLUTION-HANDLER] 🎯 Gerando QR Code...`);
        const qrResult = await generateQRCodeOnly(targetInstanceName, cleanApiUrl, evolutionApiKey);
        
        if (qrResult.success) {
          qrCode = qrResult.qrCode;
          console.log('[EVOLUTION-HANDLER] ✅ QR Code gerado com sucesso');
        } else {
          console.error(`[EVOLUTION-HANDLER] ❌ Erro ao gerar QR Code:`, qrResult.error);
        }

        // CORREÇÃO CRÍTICA: Gerar Pairing Code com endpoint correto
        console.log(`[EVOLUTION-HANDLER] 🎯 Gerando Pairing Code com endpoint correto...`);
        const pairingResult = await generatePairingCodeOnly(targetInstanceName, profile.numero, cleanApiUrl, evolutionApiKey);
        
        if (pairingResult.success) {
          pairingCode = pairingResult.pairingCode ?? null;
          console.log(`[EVOLUTION-HANDLER] ✅ Pairing code gerado: ${pairingCode}`);
        } else {
          console.error(`[EVOLUTION-HANDLER] ❌ Erro ao gerar pairing code:`, pairingResult.error);
          
          // Se sinalizar necessidade de restart, usar função robusta
          if (pairingResult.needsRestart) {
            console.log(`[EVOLUTION-HANDLER] 🔄 Pairing code necessita restart - usando função robusta...`);
            
            const restartResult = await handleConnectingStatus(
              targetInstanceName, 
              profile.numero, 
              webhookUrl, 
              cleanApiUrl, 
              evolutionApiKey,
              profile.role || 'user'
            );
            
            if (restartResult.success) {
              pairingCode = restartResult.pairingCode ?? null;
              if (restartResult.qrCode) qrCode = restartResult.qrCode;
              console.log(`[EVOLUTION-HANDLER] ✅ Códigos gerados após correção: ${pairingCode}`);
            }
          }
        }

        // Se não conseguiu gerar pelo menos um código, erro
        if (!qrCode && !pairingCode) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: "Não foi possível gerar códigos de conexão. A instância pode estar em estado connecting.",
            needsRestart: true,
            debug: {
              qrResult: qrResult.error,
              pairingResult: pairingResult.error,
              instanceStatus: statusInfo.state
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
            pairingCodeLength: pairingCode?.length || 0,
            instanceStatus: statusInfo.state
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
            error: `Erro ao desconectar: ${(error as Error).message}` 
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
            error: `Erro ao deletar instância: ${(error as Error).message}` 
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
          const restartResult = await restartInstance(targetInstanceName, cleanApiUrl, evolutionApiKey);
          
          return new Response(JSON.stringify({ 
            success: restartResult.success,
            message: restartResult.success ? 'Instância reiniciada com sucesso' : restartResult.error
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });

        } catch (error) {
          console.error(`[EVOLUTION-HANDLER] Erro ao reiniciar instância:`, error);
          return new Response(JSON.stringify({ 
            success: false, 
            error: `Erro ao reiniciar instância: ${(error as Error).message}` 
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
