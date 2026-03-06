
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

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    console.log(`[ANALYZE] Body recebido:`, body);

    // Encaminhar o Authorization do usuario (quando existir), para permitir validacao no worker.
    const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
    const jobId = typeof body.jobId === "string" ? body.jobId.trim() : "";

    const targetUrl = jobId
      ? `${workerUrl.replace(/\/+$/, "")}/status/${encodeURIComponent(jobId)}`
      : workerUrl;
    const method = jobId ? "GET" : "POST";

    const webhookResponse = await fetch(targetUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
      ...(jobId ? {} : { body: JSON.stringify({}) }),
    });

    console.log(`[ANALYZE] Resposta do webhook - Status: ${webhookResponse.status}`);

    const responseText = await webhookResponse.text();
    let responsePayload: Record<string, unknown> = {};
    try {
      responsePayload = responseText ? JSON.parse(responseText) : {};
    } catch {
      responsePayload = { raw: responseText };
    }

    if (!webhookResponse.ok) {
      console.error(`[ANALYZE] Erro no webhook: ${webhookResponse.status} - ${responseText}`);
      return new Response(
        JSON.stringify({ 
          error: 'Falha ao chamar webhook',
          success: false,
          details: `Status: ${webhookResponse.status}`,
          worker: responsePayload,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[ANALYZE] Worker respondeu com sucesso`);

    return new Response(
      JSON.stringify(responsePayload),
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
