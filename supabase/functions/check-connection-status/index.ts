
// ABOUTME: Edge Function para verificar status de conexões WhatsApp com melhorias de segurança
// ABOUTME: Implementa rate limiting, validação de entrada e logging de auditoria
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

// Rate limiting simples baseado em memória
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 10; // máximo 10 requests
const RATE_LIMIT_WINDOW = 60000; // por minuto

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

async function logSecurityEvent(supabase: any, eventType: string, details: any) {
  try {
    console.log(`[SECURITY AUDIT] ${eventType}:`, details);
    // Em produção, salvar em tabela de auditoria
  } catch (error) {
    console.error('[AUDIT ERROR]', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')

    if (!supabaseUrl || !supabaseServiceKey || !evolutionApiUrl || !evolutionApiKey) {
      console.error('[CHECK-CONNECTION] Variáveis de ambiente faltando');
      return new Response(
        JSON.stringify({ success: false, error: 'Configuração incompleta' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Rate limiting baseado no IP (simplificado)
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(clientIP)) {
      await logSecurityEvent(supabase, 'rate_limit_exceeded', { ip: clientIP });
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limit exceeded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    await logSecurityEvent(supabase, 'connection_status_check_started', { ip: clientIP });

    // Buscar todos os usuários com instance_name
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, instance_name, nome')
      .not('instance_name', 'is', null);

    if (profilesError) {
      console.error('[CHECK-CONNECTION] Erro ao buscar perfis:', profilesError);
      throw profilesError;
    }

    console.log(`[CHECK-CONNECTION] Verificando ${profiles?.length || 0} instâncias`);

    const results = [];
    const baseUrl = evolutionApiUrl.replace(/\/$/, '');
    
    for (const profile of profiles || []) {
      try {
        console.log(`[CHECK-CONNECTION] Verificando ${profile.instance_name}`);
        
        // Validar nome da instância
        if (!profile.instance_name || profile.instance_name.length > 50) {
          console.warn(`[CHECK-CONNECTION] Nome de instância inválido: ${profile.instance_name}`);
          continue;
        }

        const response = await fetch(
          `${baseUrl}/instance/connectionState/${profile.instance_name}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'apikey': evolutionApiKey
            },
            signal: AbortSignal.timeout(10000) // 10s timeout
          }
        );

        if (response.ok) {
          const data = await response.json();
          const isConnected = data.instance?.state === 'open';
          
          results.push({
            user_id: profile.id,
            instance_name: profile.instance_name,
            status: isConnected ? 'connected' : 'disconnected',
            details: data
          });
          
          console.log(`[CHECK-CONNECTION] ${profile.instance_name}: ${isConnected ? 'conectado' : 'desconectado'}`);
        } else {
          console.warn(`[CHECK-CONNECTION] Erro HTTP ${response.status} para ${profile.instance_name}`);
          results.push({
            user_id: profile.id,
            instance_name: profile.instance_name,
            status: 'error',
            details: { error: `HTTP ${response.status}` }
          });
        }
      } catch (error) {
        console.error(`[CHECK-CONNECTION] Erro para ${profile.instance_name}:`, error);
        results.push({
          user_id: profile.id,
          instance_name: profile.instance_name,
          status: 'error',
          details: { error: error.message }
        });
      }
    }

    await logSecurityEvent(supabase, 'connection_status_check_completed', {
      total_instances: profiles?.length || 0,
      results_count: results.length,
      connected_count: results.filter(r => r.status === 'connected').length
    });

    return new Response(
      JSON.stringify({
        success: true,
        total_checked: profiles?.length || 0,
        results: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CHECK-CONNECTION] Erro geral:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erro interno do servidor'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
