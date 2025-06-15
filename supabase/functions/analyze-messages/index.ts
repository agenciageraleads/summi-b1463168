
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyzeRequest {
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Buscar webhook URL da chave secreta correta
    const webhookUrl = Deno.env.get('WEBHOOK_N8N_ANALISA_MENSAGENS');
    
    if (!webhookUrl) {
      console.error('Webhook URL not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook URL not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { userId }: AnalyzeRequest = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[ANALYZE] Iniciando análise para usuário: ${userId}`);

    // Chamar o webhook do n8n com o userId
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        timestamp: new Date().toISOString(),
        source: 'summi-dashboard'
      }),
    });

    if (!webhookResponse.ok) {
      console.error(`[ANALYZE] Erro no webhook: ${webhookResponse.status}`);
      return new Response(
        JSON.stringify({ error: 'Falha ao iniciar análise' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
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
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);
