
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

// Função para criar nome de instância válido
const createValidInstanceName = (nome: string, numero: string): string => {
  // Limpar nome: remover acentos, espaços e caracteres especiais
  const cleanName = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]/g, '') // Remove tudo exceto letras e números
    .substring(0, 12); // Máximo 12 caracteres para o nome
  
  // Pegar últimos 4 dígitos do número
  const lastDigits = numero.slice(-4);
  
  // Combinar: nome + últimos 4 dígitos = máximo 16 caracteres
  const instanceName = `${cleanName}_${lastDigits}`;
  
  console.log(`[EVOLUTION-HANDLER] Nome da instância criado: ${instanceName} (${instanceName.length} caracteres)`);
  
  return instanceName;
};

// Função para validar número de telefone
const validatePhoneNumber = (phone: string): boolean => {
  // Validação para números brasileiros - deve ter exatamente 13 dígitos
  const phoneRegex = /^55[1-9][1-9][0-9]{8,9}$/;
  const cleanPhone = phone.replace(/\D/g, '');
  console.log(`[EVOLUTION-HANDLER] Validando telefone: ${cleanPhone} - Válido: ${phoneRegex.test(cleanPhone)}`);
  return phoneRegex.test(cleanPhone);
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
      case "connect": {
        auditLog("CONNECT_REQUEST", user.id);
        
        console.log(`[EVOLUTION-HANDLER] Iniciando conexão - User: ${user.id}`);
        
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

        // Criar nome de instância válido
        const instanceNameToUse = profile.instance_name || createValidInstanceName(profile.nome, profile.numero);
        
        console.log(`[EVOLUTION-HANDLER] Instance name: ${instanceNameToUse}`);

        // Verificar se a instância já existe e está conectada
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
                const { error: updateError } = await supabaseServiceRole
                  .from('profiles')
                  .update({ instance_name: instanceNameToUse })
                  .eq('id', user.id);
                if (updateError) {
                  console.error("[EVOLUTION-HANDLER] Erro ao atualizar instance_name no profile:", updateError);
                }
              }
              return new Response(JSON.stringify({ 
                success: true,
                state: 'already_connected',
                instanceName: instanceNameToUse,
                message: 'WhatsApp já está conectado'
              }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            }
          }
        } catch (error) {
          console.log(`[EVOLUTION-HANDLER] Instance não existe, criando nova instância`);
        }
        
        // Auto-correção: se existe instance_name mas instância não existe na API, limpar estado
        if (profile.instance_name) {
          console.log(`[EVOLUTION-HANDLER] Limpando estado inconsistente - instance_name existe mas instância não foi encontrada na API`);
          await supabaseServiceRole
            .from('profiles')
            .update({ instance_name: null })
            .eq('id', user.id);
        }
        
        // Criar nova instância com PAIRING CODE como padrão
        console.log(`[EVOLUTION-HANDLER] Criando nova instância com Pairing Code: ${instanceNameToUse}`);
        
        try {
          const createPayload = {
            instanceName: instanceNameToUse,
            token: evolutionApiKey,
            qrcode: true, // Mantém QR Code disponível como fallback
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

          console.log(`[EVOLUTION-HANDLER] Payload de criação:`, JSON.stringify(createPayload, null, 2));

          const createResponse = await fetch(`${cleanApiUrl}/instance/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': evolutionApiKey
            },
            body: JSON.stringify(createPayload)
          });
          
          if (!createResponse.ok) {
            const errorText = await createResponse.text();
            console.error(`[EVOLUTION-HANDLER] Erro ao criar instância: ${createResponse.status} - ${errorText}`);
            throw new Error(`Falha ao criar instância: ${createResponse.status} - ${errorText}`);
          }
          
          const createData = await createResponse.json();
          console.log(`[EVOLUTION-HANDLER] Instância criada com sucesso:`, createData);
          
          // Salvar instance_name no perfil
          await supabaseServiceRole
            .from('profiles')
            .update({ instance_name: instanceNameToUse })
            .eq('id', user.id);
          
          // EXTRAIR PAIRING CODE da resposta
          const pairingCode = createData?.qrcode?.pairingCode;
          const qrCodeBase64 = createData?.qrcode?.base64;
          
          console.log(`[EVOLUTION-HANDLER] Pairing Code extraído: ${pairingCode ? 'SIM' : 'NÃO'}`);
          console.log(`[EVOLUTION-HANDLER] QR Code extraído: ${qrCodeBase64 ? 'SIM' : 'NÃO'}`);
          
          auditLog("INSTANCE_CREATED_SUCCESS", user.id, { instanceName: instanceNameToUse, hasPairingCode: !!pairingCode });
          
          return new Response(JSON.stringify({ 
            success: true,
            state: 'needs_pairing_code',
            instanceName: instanceNameToUse,
            pairingCode: pairingCode,
            qrCode: qrCodeBase64,
            message: 'Instância criada com sucesso. Use o código de pareamento para conectar.'
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

      case "recreate-for-pairing-code": {
        auditLog("RECREATE_FOR_PAIRING_CODE", user.id);
        
        console.log(`[EVOLUTION-HANDLER] Recriando instância para novo pairing code - User: ${user.id}`);
        
        if (!profile.instance_name) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: "Nenhuma instância encontrada para recriar" 
          }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const instanceNameToRecreate = profile.instance_name;
        console.log(`[EVOLUTION-HANDLER] Recriando instância: ${instanceNameToRecreate}`);

        try {
          // PASSO 1: Deletar instância atual (mesmo se retornar erro)
          console.log(`[EVOLUTION-HANDLER] PASSO 1: Deletando instância: ${instanceNameToRecreate}`);
          
          try {
            const deleteResponse = await fetch(`${cleanApiUrl}/instance/delete/${instanceNameToRecreate}`, {
              method: 'DELETE',
              headers: { 'apikey': evolutionApiKey }
            });
            
            if (deleteResponse.ok) {
              console.log(`[EVOLUTION-HANDLER] Instância deletada com sucesso`);
            } else {
              console.log(`[EVOLUTION-HANDLER] Delete retornou ${deleteResponse.status} - continuando mesmo assim`);
            }
          } catch (deleteError) {
            console.log(`[EVOLUTION-HANDLER] Erro no delete (continuando): ${deleteError.message}`);
          }

          // PASSO 2: Aguardar 10 segundos para garantir que a instância foi removida
          console.log(`[EVOLUTION-HANDLER] PASSO 2: Aguardando 10 segundos...`);
          await new Promise(resolve => setTimeout(resolve, 10000));

          // PASSO 3: Criar nova instância COM O MESMO NOME
          console.log(`[EVOLUTION-HANDLER] PASSO 3: Criando nova instância: ${instanceNameToRecreate}`);
          
          const createPayload = {
            instanceName: instanceNameToRecreate,
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

          const createResponse = await fetch(`${cleanApiUrl}/instance/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': evolutionApiKey
            },
            body: JSON.stringify(createPayload)
          });
          
          if (!createResponse.ok) {
            const errorText = await createResponse.text();
            console.error(`[EVOLUTION-HANDLER] Erro ao recriar instância: ${createResponse.status} - ${errorText}`);
            throw new Error(`Falha ao recriar instância: ${createResponse.status} - ${errorText}`);
          }
          
          const createData = await createResponse.json();
          console.log(`[EVOLUTION-HANDLER] Nova instância criada com sucesso:`, createData);
          
          // Extrair novo pairing code
          const pairingCode = createData?.qrcode?.pairingCode;
          const qrCodeBase64 = createData?.qrcode?.base64;
          
          console.log(`[EVOLUTION-HANDLER] Novo Pairing Code: ${pairingCode ? 'SIM' : 'NÃO'}`);
          console.log(`[EVOLUTION-HANDLER] Novo QR Code: ${qrCodeBase64 ? 'SIM' : 'NÃO'}`);
          
          auditLog("INSTANCE_RECREATED_SUCCESS", user.id, { instanceName: instanceNameToRecreate, hasPairingCode: !!pairingCode });
          
          return new Response(JSON.stringify({ 
            success: true,
            state: 'needs_pairing_code',
            instanceName: instanceNameToRecreate,
            pairingCode: pairingCode,
            qrCode: qrCodeBase64,
            message: 'Nova instância criada com sucesso. Use o novo código de pareamento.'
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
          
        } catch (error) {
          auditLog("RECREATE_ERROR", user.id, { error: error.message });
          console.error(`[EVOLUTION-HANDLER] Erro ao recriar instância:`, error);
          
          return new Response(JSON.stringify({ 
            success: false, 
            error: `Erro ao recriar instância: ${error.message}` 
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
        // LOGOUT SÓ FAZ LOGOUT, NÃO LIMPA PERFIL
        if (!instanceName) {
          return new Response(JSON.stringify({ success: false, error: "Nome da instância é obrigatório" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        try {
          const logoutResponse = await fetch(`${cleanApiUrl}/instance/logout/${instanceName}`, {
            method: 'DELETE',
            headers: { 'apikey': evolutionApiKey }
          });

          if (!logoutResponse.ok) {
            const errorTxt = await logoutResponse.text();
            auditLog("LOGOUT_ERROR", user.id, { instanceName, status: logoutResponse.status, error: errorTxt });
            return new Response(JSON.stringify({ success: false, error: `Erro ao fazer logout: ${logoutResponse.status} - ${errorTxt}` }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          auditLog("LOGOUT_SUCCESS", user.id, { instanceName });
          return new Response(JSON.stringify({ success: true, message: "Logout realizado com sucesso" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } catch (error) {
          auditLog("LOGOUT_EXCEPTION", user.id, { instanceName, error: error.message });
          return new Response(JSON.stringify({ success: false, error: `Erro ao fazer logout: ${error.message}` }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }

      case "delete": {
        // MODIFICADO: DELETE sempre tenta deletar e SEMPRE limpa o perfil local
        const instanceNameToDelete = profile.instance_name;
        
        if (!instanceNameToDelete) {
          auditLog("DELETE_NO_INSTANCE", user.id);
          return new Response(JSON.stringify({ 
            success: true,
            message: 'Nenhuma instância encontrada para deletar'
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        try {
          console.log(`[EVOLUTION-HANDLER] Deletando instância: ${instanceNameToDelete}`);
          
          // Tentar logout primeiro (best practice)
          try {
            const logoutResponse = await fetch(`${cleanApiUrl}/instance/logout/${instanceNameToDelete}`, {
              method: 'DELETE',
              headers: { 'apikey': evolutionApiKey }
            });
            auditLog("DELETE_LOGOUT_ATTEMPT", user.id, { 
              instanceName: instanceNameToDelete, 
              success: logoutResponse.ok 
            });
          } catch (logoutError) {
            console.log(`[EVOLUTION-HANDLER] Logout antes do delete falhou (continuando): ${logoutError.message}`);
          }

          // Tentar deletar a instância
          let deleteSuccess = false;
          try {
            const deleteResponse = await fetch(`${cleanApiUrl}/instance/delete/${instanceNameToDelete}`, {
              method: 'DELETE',
              headers: { 'apikey': evolutionApiKey }
            });

            if (deleteResponse.ok) {
              deleteSuccess = true;
              auditLog("DELETE_API_SUCCESS", user.id, { instanceName: instanceNameToDelete });
            } else {
              const errorText = await deleteResponse.text();
              console.log(`[EVOLUTION-HANDLER] API delete falhou: ${deleteResponse.status} - ${errorText}`);
              auditLog("DELETE_API_FAILED", user.id, { 
                instanceName: instanceNameToDelete, 
                status: deleteResponse.status, 
                error: errorText 
              });
            }
          } catch (deleteError) {
            console.log(`[EVOLUTION-HANDLER] Erro na chamada de delete: ${deleteError.message}`);
            auditLog("DELETE_API_ERROR", user.id, { 
              instanceName: instanceNameToDelete, 
              error: deleteError.message 
            });
          }

          // SEMPRE limpar o perfil local, independente do resultado da API
          const { error: updateError } = await supabaseServiceRole
            .from('profiles')
            .update({ instance_name: null })
            .eq('id', user.id);

          if (updateError) {
            console.error(`[EVOLUTION-HANDLER] Erro ao limpar instance_name do perfil: ${updateError.message}`);
            auditLog("DELETE_PROFILE_UPDATE_ERROR", user.id, { error: updateError.message });
            
            return new Response(JSON.stringify({ 
              success: false, 
              error: `Erro ao limpar dados do perfil: ${updateError.message}` 
            }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          auditLog("DELETE_COMPLETE_SUCCESS", user.id, { 
            instanceName: instanceNameToDelete, 
            apiDeleteSuccess: deleteSuccess 
          });

          return new Response(JSON.stringify({
            success: true,
            message: deleteSuccess 
              ? 'Instância deletada com sucesso na Evolution API e perfil limpo'
              : 'Perfil limpo com sucesso (instância pode já ter sido deletada na Evolution API)'
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });

        } catch (error) {
          auditLog("DELETE_EXCEPTION", user.id, { instanceName: instanceNameToDelete, error: error.message });
          console.error(`[EVOLUTION-HANDLER] Erro inesperado ao deletar:`, error);
          
          return new Response(JSON.stringify({ 
            success: false, 
            error: `Erro ao deletar instância: ${error.message}` 
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
