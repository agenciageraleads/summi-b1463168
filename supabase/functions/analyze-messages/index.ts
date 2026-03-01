
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request): Promise<Response> => {
  console.log(`[ANALYZE] Nova requisição: ${req.method} ${req.url}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[ANALYZE] Respondendo OPTIONS para CORS');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar se é POST
    if (req.method !== 'POST') {
      console.error(`[ANALYZE] Método não permitido: ${req.method}`);
      return new Response(
        JSON.stringify({ 
          error: 'Método não permitido', 
          success: false 
        }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Destino da analise: VPS worker.
    const workerUrl = Deno.env.get('SUMMI_WORKER_ANALYZE_URL');
    console.log(`[ANALYZE] Destino: ${workerUrl ? 'CONFIGURADO' : 'NÃO CONFIGURADO'}`);
    
    if (!workerUrl) {
      console.error('[ANALYZE] SUMMI_WORKER_ANALYZE_URL não configurado');
      return new Response(
        JSON.stringify({ 
          error: 'Destino de analise nao configurado',
          success: false 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Ler o corpo da requisição
    const body = await req.json();
    console.log(`[ANALYZE] Body recebido:`, body);
    
    const { userId } = body;
    
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

    // Preparar payload para o webhook
    const webhookPayload = {
      id_usuario: userId
    };

    console.log(`[ANALYZE] Enviando para destino:`, webhookPayload);

    // Encaminhar o Authorization do usuario (quando existir), para permitir validacao no worker.
    const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');

    // Chamar o worker (ou webhook legado)
    const webhookResponse = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
      body: JSON.stringify(webhookPayload),
    });

    console.log(`[ANALYZE] Resposta do webhook - Status: ${webhookResponse.status}`);

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error(`[ANALYZE] Erro no webhook: ${webhookResponse.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ 
          error: 'Falha ao chamar webhook',
          success: false,
          details: `Status: ${webhookResponse.status}`
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[ANALYZE] Webhook chamado com sucesso para usuário: ${userId}`);

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
    console.error('[ANALYZE] Erro:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        success: false,
        details: (error as Error).message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
