
// ABOUTME: Edge Function para gerenciar API do Evolution WhatsApp com melhorias de segurança
// ABOUTME: Implementa validação rigorosa, geração segura de nomes de instância e auditoria
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
}

// Função para validar entrada do usuário
function validateInput(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Dados inválidos fornecidos');
    return { isValid: false, errors };
  }
  
  const { action } = data;
  const allowedActions = ['connect', 'delete', 'recreate-for-pairing-code'];
  
  if (!action || !allowedActions.includes(action)) {
    errors.push('Ação não permitida ou não especificada');
  }
  
  return { isValid: errors.length === 0, errors };
}

// Função para gerar nome de instância seguro
async function generateSecureInstanceName(supabase: any, userId: string): Promise<string> {
  try {
    console.log('[SECURITY] Gerando nome de instância seguro para usuário:', userId);
    
    // Buscar dados do usuário
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('nome, numero')
      .eq('id', userId)
      .single();
      
    if (error || !profile) {
      console.error('[SECURITY] Erro ao buscar perfil:', error);
      // Fallback para nome genérico + UUID
      return `user_${crypto.randomUUID().substring(0, 8)}`;
    }
    
    // Usar função do banco para gerar nome seguro
    const { data: result, error: fnError } = await supabase
      .rpc('generate_secure_instance_name', {
        user_nome: profile.nome || 'user',
        user_numero: profile.numero || '0000000000'
      });
      
    if (fnError || !result) {
      console.error('[SECURITY] Erro na função de geração:', fnError);
      // Fallback manual
      const cleanName = (profile.nome || 'user')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 8);
      const randomSuffix = crypto.randomUUID().substring(0, 8);
      return `${cleanName}_${randomSuffix}`;
    }
    
    console.log('[SECURITY] Nome de instância gerado com sucesso');
    return result;
  } catch (error) {
    console.error('[SECURITY] Erro inesperado na geração de nome:', error);
    return `fallback_${crypto.randomUUID().substring(0, 8)}`;
  }
}

// Função para fazer requisições à API Evolution com retry
async function makeEvolutionRequest(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[EVOLUTION] Tentativa ${attempt}/${maxRetries} - ${options.method} ${url}`);
      
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30000) // 30s timeout
      });
      
      if (response.ok) {
        return response;
      }
      
      if (attempt === maxRetries) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Aguardar antes da próxima tentativa
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      
    } catch (error) {
      console.error(`[EVOLUTION] Erro na tentativa ${attempt}:`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }
  
  throw new Error('Todas as tentativas falharam');
}

// Função para registrar eventos de auditoria
async function logSecurityEvent(supabase: any, userId: string, eventType: string, details: any) {
  try {
    const logEntry = {
      user_id: userId,
      event_type: eventType,
      details: JSON.stringify(details),
      timestamp: new Date().toISOString(),
      ip_address: 'unknown' // Deno não fornece IP facilmente
    };
    
    console.log('[AUDIT]', eventType, '- User:', userId, '- Details:', details);
    
    // Por enquanto, apenas log no console
    // Em produção, salvar em tabela de auditoria
    
  } catch (error) {
    console.error('[AUDIT] Erro ao registrar evento:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[EVOLUTION-API-HANDLER] Iniciando processamento da requisição');

    // Verificar variáveis de ambiente
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')

    if (!supabaseUrl || !supabaseServiceKey || !evolutionApiUrl || !evolutionApiKey) {
      console.error('[EVOLUTION-API-HANDLER] Variáveis de ambiente faltando');
      return new Response(
        JSON.stringify({ success: false, error: 'Configuração do servidor incompleta' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Autenticar usuário
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('[EVOLUTION-API-HANDLER] Header de autorização ausente');
      return new Response(
        JSON.stringify({ success: false, error: 'Token de autorização necessário' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.error('[EVOLUTION-API-HANDLER] Erro de autenticação:', authError);
      await logSecurityEvent(supabase, 'unknown', 'auth_failure', { error: authError?.message });
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido ou expirado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    console.log('[EVOLUTION-API-HANDLER] Usuário autenticado:', user.id);

    // Validar entrada
    const requestData = await req.json();
    const validation = validateInput(requestData);
    
    if (!validation.isValid) {
      console.error('[EVOLUTION-API-HANDLER] Validação falhou:', validation.errors);
      await logSecurityEvent(supabase, user.id, 'validation_failure', { errors: validation.errors });
      return new Response(
        JSON.stringify({ success: false, error: 'Dados de entrada inválidos', details: validation.errors }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { action } = requestData;
    await logSecurityEvent(supabase, user.id, 'api_action_requested', { action });

    // Gerar nome de instância seguro
    const instanceName = await generateSecureInstanceName(supabase, user.id);
    console.log('[EVOLUTION-API-HANDLER] Nome da instância:', instanceName);

    const baseUrl = evolutionApiUrl.replace(/\/$/, '');
    const headers = {
      'Content-Type': 'application/json',
      'apikey': evolutionApiKey
    };

    try {
      if (action === 'connect' || action === 'recreate-for-pairing-code') {
        console.log('[EVOLUTION-API-HANDLER] Iniciando processo de conexão');

        // PASSO 1: Sempre deletar instância existente primeiro (se existir)
        try {
          console.log('[EVOLUTION-API-HANDLER] Deletando instância existente:', instanceName);
          const deleteResponse = await makeEvolutionRequest(
            `${baseUrl}/instance/delete/${instanceName}`,
            { method: 'DELETE', headers }
          );
          
          if (deleteResponse.ok) {
            console.log('[EVOLUTION-API-HANDLER] Instância deletada com sucesso');
          }
        } catch (deleteError) {
          console.log('[EVOLUTION-API-HANDLER] Instância não existia ou erro ao deletar (continuando):', deleteError);
        }

        // PASSO 2: Aguardar 5 segundos para garantir cleanup
        console.log('[EVOLUTION-API-HANDLER] Aguardando cleanup da instância...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // PASSO 3: Criar nova instância
        console.log('[EVOLUTION-API-HANDLER] Criando nova instância:', instanceName);
        const createResponse = await makeEvolutionRequest(
          `${baseUrl}/instance/create`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              instanceName: instanceName,
              integration: 'WHATSAPP-BAILEYS'
            })
          }
        );

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          console.error('[EVOLUTION-API-HANDLER] Erro ao criar instância:', errorText);
          throw new Error(`Falha ao criar instância: ${createResponse.status} - ${errorText}`);
        }

        const createResult = await createResponse.json();
        console.log('[EVOLUTION-API-HANDLER] Instância criada com sucesso:', createResult);

        // PASSO 4: Conectar instância
        console.log('[EVOLUTION-API-HANDLER] Conectando instância:', instanceName);
        const connectResponse = await makeEvolutionRequest(
          `${baseUrl}/instance/connect/${instanceName}`,
          { method: 'GET', headers }
        );

        if (!connectResponse.ok) {
          const errorText = await connectResponse.text();
          console.error('[EVOLUTION-API-HANDLER] Erro ao conectar instância:', errorText);
          throw new Error(`Falha ao conectar instância: ${connectResponse.status} - ${errorText}`);
        }

        const connectResult = await connectResponse.json();
        console.log('[EVOLUTION-API-HANDLER] Resultado da conexão:', connectResult);

        // PASSO 5: Atualizar perfil do usuário com nome da instância
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ instance_name: instanceName })
          .eq('id', user.id);

        if (updateError) {
          console.error('[EVOLUTION-API-HANDLER] Erro ao atualizar perfil:', updateError);
        }

        await logSecurityEvent(supabase, user.id, 'instance_created', { instanceName });

        return new Response(
          JSON.stringify({
            success: true,
            instanceName,
            pairingCode: connectResult.pairingCode,
            qrCode: connectResult.base64,
            message: 'Instância criada e conectada com sucesso'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } else if (action === 'delete') {
        console.log('[EVOLUTION-API-HANDLER] Deletando instância:', instanceName);

        // Buscar nome da instância atual do usuário
        const { data: profile } = await supabase
          .from('profiles')
          .select('instance_name')
          .eq('id', user.id)
          .single();

        const currentInstanceName = profile?.instance_name || instanceName;

        const deleteResponse = await makeEvolutionRequest(
          `${baseUrl}/instance/delete/${currentInstanceName}`,
          { method: 'DELETE', headers }
        );

        if (!deleteResponse.ok) {
          const errorText = await deleteResponse.text();
          console.error('[EVOLUTION-API-HANDLER] Erro ao deletar instância:', errorText);
          throw new Error(`Falha ao deletar instância: ${deleteResponse.status} - ${errorText}`);
        }

        // Limpar instance_name do perfil
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ instance_name: null })
          .eq('id', user.id);

        if (updateError) {
          console.error('[EVOLUTION-API-HANDLER] Erro ao limpar perfil:', updateError);
        }

        await logSecurityEvent(supabase, user.id, 'instance_deleted', { instanceName: currentInstanceName });

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Instância deletada com sucesso'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

    } catch (evolutionError) {
      console.error('[EVOLUTION-API-HANDLER] Erro na API Evolution:', evolutionError);
      await logSecurityEvent(supabase, user.id, 'evolution_api_error', { 
        error: evolutionError.message, 
        action,
        instanceName 
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Erro interno do servidor',
          details: process.env.NODE_ENV === 'development' ? evolutionError.message : undefined
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

  } catch (error) {
    console.error('[EVOLUTION-API-HANDLER] Erro inesperado:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erro interno do servidor'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
