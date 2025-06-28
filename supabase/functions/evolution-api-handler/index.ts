
// ABOUTME: Edge Function para gerenciar API do Evolution WhatsApp - VERSÃO CORRIGIDA
// ABOUTME: Implementa criação segura de instâncias e geração de códigos de pareamento
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block'
}

// Rate limiting simples
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60000;

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(identifier);
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (limit.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  limit.count++;
  return true;
}

async function makeEvolutionRequest(url: string, options: RequestInit, maxRetries = 2): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[EVOLUTION] Tentativa ${attempt}/${maxRetries} - ${options.method} ${url}`);
      
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(20000) // 20s timeout
      });
      
      console.log(`[EVOLUTION] Resposta HTTP: ${response.status}`);
      return response;
      
    } catch (error) {
      console.error(`[EVOLUTION] Erro na tentativa ${attempt}:`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Aguardar antes da próxima tentativa
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
  
  throw new Error('Todas as tentativas falharam');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[EVOLUTION-API-HANDLER] 🚀 Iniciando processamento');

    // Verificar variáveis de ambiente
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')

    if (!supabaseUrl || !supabaseServiceKey || !evolutionApiUrl || !evolutionApiKey) {
      console.error('[EVOLUTION-API-HANDLER] ❌ Variáveis de ambiente faltando');
      return new Response(
        JSON.stringify({ success: false, error: 'Configuração do servidor incompleta' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    if (!checkRateLimit(clientIP)) {
      console.log('[EVOLUTION-API-HANDLER] ⚠️ Rate limit excedido para IP:', clientIP);
      return new Response(
        JSON.stringify({ success: false, error: 'Muitas tentativas. Tente novamente em alguns minutos.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    // Autenticar usuário
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('[EVOLUTION-API-HANDLER] ❌ Header de autorização ausente');
      return new Response(
        JSON.stringify({ success: false, error: 'Token de autorização necessário' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.error('[EVOLUTION-API-HANDLER] ❌ Erro de autenticação:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido ou expirado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    console.log('[EVOLUTION-API-HANDLER] ✅ Usuário autenticado:', user.id);

    // Buscar perfil do usuário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('nome, numero, instance_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('[EVOLUTION-API-HANDLER] ❌ Erro ao buscar perfil:', profileError);
      return new Response(
        JSON.stringify({ success: false, error: 'Perfil do usuário não encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!profile.numero) {
      console.error('[EVOLUTION-API-HANDLER] ❌ Número não configurado');
      return new Response(
        JSON.stringify({ success: false, error: 'Número de telefone não configurado no perfil' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Parsear dados da requisição
    const requestData = await req.json();
    const { action } = requestData;

    console.log('[EVOLUTION-API-HANDLER] 📋 Ação solicitada:', action);

    // Gerar nome de instância seguro se necessário
    let instanceName = profile.instance_name;
    if (!instanceName) {
      const { data: newInstanceName, error: nameError } = await supabase
        .rpc('generate_secure_instance_name', {
          user_nome: profile.nome || 'user',
          user_numero: profile.numero
        });
        
      if (nameError || !newInstanceName) {
        console.error('[EVOLUTION-API-HANDLER] ❌ Erro ao gerar nome:', nameError);
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao gerar nome da instância' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      
      instanceName = newInstanceName;
      console.log('[EVOLUTION-API-HANDLER] 📝 Nome gerado:', instanceName);
    }

    const baseUrl = evolutionApiUrl.replace(/\/$/, '');
    const headers = {
      'Content-Type': 'application/json',
      'apikey': evolutionApiKey
    };

    if (action === 'initialize-connection') {
      console.log('[EVOLUTION-API-HANDLER] 🔧 Inicializando conexão completa');

      try {
        // PASSO 1: Verificar se instância já existe
        console.log('[EVOLUTION-API-HANDLER] 🔍 Verificando instância existente:', instanceName);
        
        let instanceExists = false;
        try {
          const checkResponse = await makeEvolutionRequest(
            `${baseUrl}/instance/connectionState/${instanceName}`,
            { method: 'GET', headers }
          );
          
          if (checkResponse.ok) {
            const checkData = await checkResponse.json();
            instanceExists = true;
            console.log('[EVOLUTION-API-HANDLER] 📊 Status da instância:', checkData.instance?.state);
            
            // Se já está conectada, retornar sucesso
            if (checkData.instance?.state === 'open') {
              console.log('[EVOLUTION-API-HANDLER] ✅ Instância já conectada');
              return new Response(
                JSON.stringify({
                  success: true,
                  instanceName,
                  state: 'already_connected',
                  message: 'WhatsApp já está conectado'
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }
        } catch (error) {
          console.log('[EVOLUTION-API-HANDLER] ℹ️ Instância não existe, será criada');
          instanceExists = false;
        }

        // PASSO 2: Deletar instância existente se necessário
        if (instanceExists) {
          console.log('[EVOLUTION-API-HANDLER] 🗑️ Deletando instância existente');
          try {
            await makeEvolutionRequest(
              `${baseUrl}/instance/delete/${instanceName}`,
              { method: 'DELETE', headers }
            );
            console.log('[EVOLUTION-API-HANDLER] ✅ Instância deletada');
            
            // Aguardar cleanup
            await new Promise(resolve => setTimeout(resolve, 3000));
          } catch (deleteError) {
            console.log('[EVOLUTION-API-HANDLER] ⚠️ Erro ao deletar (continuando):', deleteError);
          }
        }

        // PASSO 3: Criar nova instância
        console.log('[EVOLUTION-API-HANDLER] 🏗️ Criando nova instância');
        
        const webhookUrl = Deno.env.get('WEBHOOK_N8N_RECEBE_MENSAGEM');
        
        const createPayload = {
          instanceName: instanceName,
          token: evolutionApiKey,
          qrcode: true,
          number: profile.numero,
          integration: "WHATSAPP-BAILEYS",
          webhook: webhookUrl ? {
            url: webhookUrl,
            byEvents: false,
            base64: true,
            headers: { "Content-Type": "application/json" },
            events: ["MESSAGES_UPSERT"]
          } : undefined,
          settings: {
            reject_call: false,
            msg_call: "",
            groups_ignore: true,
            always_online: false,
            read_messages: false,
            read_status: false
          }
        };

        console.log('[EVOLUTION-API-HANDLER] 📦 Payload de criação:', JSON.stringify(createPayload, null, 2));

        const createResponse = await makeEvolutionRequest(
          `${baseUrl}/instance/create`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(createPayload)
          }
        );

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          console.error('[EVOLUTION-API-HANDLER] ❌ Erro ao criar instância:', errorText);
          throw new Error(`Falha ao criar instância: ${createResponse.status} - ${errorText}`);
        }

        const createResult = await createResponse.json();
        console.log('[EVOLUTION-API-HANDLER] ✅ Instância criada:', createResult);

        // PASSO 4: Aguardar estabilização
        console.log('[EVOLUTION-API-HANDLER] ⏳ Aguardando estabilização...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // PASSO 5: Conectar instância para gerar códigos
        console.log('[EVOLUTION-API-HANDLER] 📱 Conectando para gerar códigos');
        
        const connectResponse = await makeEvolutionRequest(
          `${baseUrl}/instance/connect/${instanceName}`,
          { method: 'GET', headers }
        );

        if (!connectResponse.ok) {
          const errorText = await connectResponse.text();
          console.error('[EVOLUTION-API-HANDLER] ❌ Erro ao conectar:', errorText);
          throw new Error(`Falha ao conectar instância: ${connectResponse.status} - ${errorText}`);
        }

        const connectResult = await connectResponse.json();
        console.log('[EVOLUTION-API-HANDLER] 📨 Resultado da conexão:', connectResult);

        // PASSO 6: Extrair códigos
        let pairingCode = connectResult.pairingCode || connectResult.code;
        let qrCode = connectResult.qrcode?.base64 || connectResult.base64 || connectResult.qrcode?.code;

        if (qrCode && !qrCode.startsWith('data:image/')) {
          qrCode = `data:image/png;base64,${qrCode}`;
        }

        console.log('[EVOLUTION-API-HANDLER] 🎯 Códigos extraídos:', {
          hasPairingCode: !!pairingCode,
          hasQrCode: !!qrCode
        });

        // PASSO 7: Atualizar perfil do usuário
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ instance_name: instanceName })
          .eq('id', user.id);

        if (updateError) {
          console.error('[EVOLUTION-API-HANDLER] ⚠️ Erro ao atualizar perfil:', updateError);
        } else {
          console.log('[EVOLUTION-API-HANDLER] ✅ Perfil atualizado');
        }

        // PASSO 8: Retornar resultado
        return new Response(
          JSON.stringify({
            success: true,
            instanceName,
            pairingCode,
            qrCode,
            state: 'connecting',
            message: 'Instância criada e códigos gerados com sucesso'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (error) {
        console.error('[EVOLUTION-API-HANDLER] ❌ Erro no processo:', error);
        return new Response(
          JSON.stringify({
            success: false,
            error: error.message || 'Erro interno no processo de criação',
            details: error.toString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }

    // Outras ações (delete, etc.)
    return new Response(
      JSON.stringify({ success: false, error: 'Ação não suportada' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error) {
    console.error('[EVOLUTION-API-HANDLER] ❌ Erro inesperado:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erro interno do servidor',
        details: error.toString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
