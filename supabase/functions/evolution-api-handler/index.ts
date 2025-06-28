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

        // Criar nome de instância válido
        const instanceNameToUse = profile.instance_name || createValidInstanceName(profile.nome, profile.numero);
        
        console.log(`[EVOLUTION-HANDLER] Instance name: ${instanceNameToUse}`);

        // TENTE SEMPRE SALVAR O instance_name, se não existir
        if (!profile.instance_name) {
          const { error: updateError } = await supabaseServiceRole
            .from('profiles')
            .update({ instance_name: instanceNameToUse })
            .eq('id', user.id);
          if (updateError) {
            console.error("[EVOLUTION-HANDLER] Erro ao salvar instance_name inicial:", updateError);
          } else {
            console.log(`[EVOLUTION-HANDLER] instance_name inicial salvo no profile: ${instanceNameToUse}`);
          }
        }

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
                const { error: updateError } = await supabaseServiceRole
                  .from('profiles')
                  .update({ instance_name: instanceNameToUse })
                  .eq('id', user.id);
                if (updateError) {
                  console.error("[EVOLUTION-HANDLER] Erro ao atualizar instance_name no profile:", updateError);
                } else {
                  console.log(`[EVOLUTION-HANDLER] instance_name atualizado no profile para: ${instanceNameToUse}`);
                }
                // Adicione mais logging
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
        
        // Criar nova instância com estrutura CORRETA conforme Evolution API v2.2.3
        console.log(`[EVOLUTION-HANDLER] Criando nova instância: ${instanceNameToUse}`);
        
        try {
          // PAYLOAD CORRIGIDO conforme documentação Evolution API v2.2.3
          const createPayload = {
            instanceName: instanceNameToUse,
            token: evolutionApiKey,
            qrcode: true,
            number: profile.numero,
            integration: "WHATSAPP-BAILEYS",
            webhook: {
              url: webhookUrl, // Usando a variável correta do N8N
              byEvents: false,
              base64: true,
              headers: {
                "Content-Type": "application/json"
              },
              events: ["MESSAGES_UPSERT"] // Array obrigatório mesmo com byEvents: false
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

          console.log(`[EVOLUTION-HANDLER] Payload de criação (Evolution v2.2.3):`, JSON.stringify(createPayload, null, 2));

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
        // LOGOUT SÓ LIMPA PERFIL SE A EVOLUTION CONFIRMAR QUE DESCONECTOU
        if (!instanceName) {
          return new Response(JSON.stringify({ success: false, error: "Nome da instância é obrigatório" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        try {
          // Solicita logout na Evolution
          const logoutResponse = await fetch(`${cleanApiUrl}/instance/logout/${instanceName}`, {
            method: 'GET',
            headers: { 'apikey': evolutionApiKey }
          });

          if (!logoutResponse.ok) {
            const errorTxt = await logoutResponse.text();
            auditLog("LOGOUT_ERROR", user.id, { instanceName, status: logoutResponse.status, error: errorTxt });
            return new Response(JSON.stringify({ success: false, error: `Erro ao deslogar: ${logoutResponse.status} - ${errorTxt}` }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          // VERIFICA SE SAIU MESMO: consulta novamente o status
          const checkStatusRes = await fetch(`${cleanApiUrl}/instance/connectionState/${instanceName}`, {
            headers: { 'apikey': evolutionApiKey }
          });
          let disconnected = false;
          if (!checkStatusRes.ok) {
            // Evolution não retornou status, considera como erro
            auditLog("LOGOUT_STATUS_CHECK_ERROR", user.id, { instanceName, status: checkStatusRes.status });
          } else {
            const statusData = await checkStatusRes.json();
            // Evolution retorna { state: ... }
            disconnected = statusData.state === 'disconnected' || statusData.state === 'closed';
          }

          if (!disconnected) {
            // Não desconectou de fato, não limpar o perfil
            auditLog("LOGOUT_INCOMPLETE", user.id, { instanceName });
            return new Response(JSON.stringify({ success: false, error: "Falha ao desconectar. Tente novamente." }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          // Logout everificado => limpando o instance_name no perfil
          await supabaseServiceRole
            .from('profiles')
            .update({ instance_name: null })
            .eq('id', user.id);

          auditLog("LOGOUT_SUCCESS", user.id, { instanceName });

          return new Response(JSON.stringify({ success: true, message: "WhatsApp desconectado com sucesso" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } catch (error) {
          auditLog("LOGOUT_EXCEPTION", user.id, { instanceName, error: error.message });
          return new Response(JSON.stringify({ success: false, error: `Erro ao deslogar: ${error.message}` }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }

      case "delete": {
        // DELETE: sempre faz logout antes de deletar e só limpa perfil se confirmadamente deletado
        if (!instanceName) {
          return new Response(JSON.stringify({ success: false, error: "Nome da instância é obrigatório" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        try {
          // Tenta logout antes de deletar (best practice Evolution)
          const logoutResponse = await fetch(`${cleanApiUrl}/instance/logout/${instanceName}`, {
            method: 'GET',
            headers: { 'apikey': evolutionApiKey }
          });
          // (Mesmo que dê erro ignora, pois podemos deletar mesmo assim)
          if (!logoutResponse.ok) {
            auditLog("DELETE_LOGOUT_WARNING", user.id, { instanceName, status: logoutResponse.status });
          }

          // Tenta deletar
          const deleteResponse = await fetch(`${cleanApiUrl}/instance/delete/${instanceName}`, {
            method: 'GET',
            headers: { 'apikey': evolutionApiKey }
          });

          if (!deleteResponse.ok) {
            const errorTxt = await deleteResponse.text();
            auditLog("DELETE_ERROR", user.id, { instanceName, status: deleteResponse.status, error: errorTxt });
            return new Response(JSON.stringify({ success: false, error: `Erro ao deletar: ${deleteResponse.status} - ${errorTxt}` }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          // Checa se deletou mesmo
          const checkStatusRes = await fetch(`${cleanApiUrl}/instance/connectionState/${instanceName}`, {
            headers: { 'apikey': evolutionApiKey }
          });
          let deleted = false;
          if (!checkStatusRes.ok) {
            // Status não encontrado já é indicador de sucesso!
            deleted = true;
          } else {
            const statusData = await checkStatusRes.json();
            // Instância não pode mais estar open/connected, só pode ser disconnected/null
            deleted = !statusData.state || statusData.state === 'disconnected' || statusData.state === 'closed';
          }

          if (!deleted) {
            // Instância ainda existe, não limpar perfil
            auditLog("DELETE_INCOMPLETE", user.id, { instanceName });
            return new Response(JSON.stringify({ success: false, error: "Falha ao remover instância. Tente novamente." }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          // Só chega aqui se realmente deletou!
          await supabaseServiceRole
            .from('profiles')
            .update({ instance_name: null })
            .eq('id', user.id);

          auditLog("DELETE_SUCCESS", user.id, { instanceName });
          return new Response(JSON.stringify({ success: true, message: "Instância deletada com sucesso" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } catch (error) {
          auditLog("DELETE_EXCEPTION", user.id, { instanceName, error: error.message });
          return new Response(JSON.stringify({ success: false, error: `Erro ao deletar: ${error.message}` }), {
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
