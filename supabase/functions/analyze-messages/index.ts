
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyzeRequest {
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log(`[ANALYZE] Requisição recebida: ${req.method}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[ANALYZE] Retornando resposta CORS');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Buscar webhook URL da chave secreta correta
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
    
    let parsedBody: AnalyzeRequest;
    try {
      parsedBody = JSON.parse(body);
    } catch (parseError) {
      console.error('[ANALYZE] Erro ao fazer parse do JSON:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Formato JSON inválido',
          success: false 
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

    // Chamar o webhook do n8n com o userId
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData),
    });

    console.log(`[ANALYZE] Resposta do webhook - Status: ${webhookResponse.status}`);

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error(`[ANALYZE] Erro no webhook: ${webhookResponse.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ 
          error: 'Falha ao iniciar análise no sistema externo',
          success: false,
          details: `Status: ${webhookResponse.status}`
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const webhookResult = await webhookResponse.text();
    console.log(`[ANALYZE] Resposta do webhook: ${webhookResult}`);

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
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        success: false,
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);
