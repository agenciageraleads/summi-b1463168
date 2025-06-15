
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyzeRequest {
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log(`[ANALYZE] Requisição recebida: ${req.method} ${req.url}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[ANALYZE] Retornando resposta CORS');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[ANALYZE] Processando requisição POST...');
    
    // Verificar se o método é POST
    if (req.method !== 'POST') {
      console.error(`[ANALYZE] Método não permitido: ${req.method}`);
      return new Response(
        JSON.stringify({ 
          error: 'Método não permitido. Use POST.',
          success: false 
        }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Buscar webhook URL da chave secreta
    const webhookUrl = Deno.env.get('WEBHOOK_N8N_ANALISA_MENSAGENS');
    console.log(`[ANALYZE] Webhook URL configurado: ${webhookUrl ? 'SIM' : 'NÃO'}`);
    
    if (!webhookUrl) {
      console.error('[ANALYZE] Webhook URL não configurado');
      return new Response(
        JSON.stringify({ 
          error: 'Webhook URL não configurado',
          success: false 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[ANALYZE] Lendo corpo da requisição...');
    const body = await req.text();
    console.log(`[ANALYZE] Corpo recebido: ${body}`);
    
    if (!body) {
      console.error('[ANALYZE] Corpo da requisição vazio');
      return new Response(
        JSON.stringify({ 
          error: 'Corpo da requisição não pode estar vazio',
          success: false 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    let parsedBody: AnalyzeRequest;
    try {
      parsedBody = JSON.parse(body);
    } catch (parseError) {
      console.error('[ANALYZE] Erro ao fazer parse do JSON:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Formato JSON inválido',
          success: false,
          details: parseError.message 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { userId } = parsedBody;
    
    if (!userId) {
      console.error('[ANALYZE] userId não fornecido');
      return new Response(
        JSON.stringify({ 
          error: 'userId é obrigatório',
          success: false 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[ANALYZE] Iniciando análise para usuário: ${userId}`);

    // Preparar dados para o webhook
    const webhookData = {
      userId: userId,
      timestamp: new Date().toISOString(),
      source: 'summi-dashboard'
    };

    console.log(`[ANALYZE] Enviando dados para webhook: ${JSON.stringify(webhookData)}`);

    // Chamar o webhook do n8n com timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout

    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log(`[ANALYZE] Resposta do webhook - Status: ${webhookResponse.status}`);

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        console.error(`[ANALYZE] Erro no webhook: ${webhookResponse.status} - ${errorText}`);
        return new Response(
          JSON.stringify({ 
            error: 'Falha ao iniciar análise no sistema externo',
            success: false,
            details: `Status: ${webhookResponse.status} - ${errorText}`
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const webhookResult = await webhookResponse.text();
      console.log(`[ANALYZE] Resposta do webhook: ${webhookResult}`);

    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('[ANALYZE] Timeout na chamada do webhook');
        return new Response(
          JSON.stringify({ 
            error: 'Timeout na análise - tente novamente',
            success: false 
          }),
          {
            status: 408,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      throw fetchError;
    }

    console.log(`[ANALYZE] Análise iniciada com sucesso para usuário: ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Análise iniciada com sucesso',
        userId: userId 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[ANALYZE] Erro inesperado:', error);
    console.error('[ANALYZE] Stack trace:', error.stack);
    console.error('[ANALYZE] Error name:', error.name);
    console.error('[ANALYZE] Error message:', error.message);
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        success: false,
        details: error.message,
        errorType: error.name 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

console.log('[ANALYZE] Função carregada e pronta para receber requisições');
serve(handler);
