
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Função para log de auditoria
const auditLog = (action: string, details?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[CONNECTION-CHECK] ${timestamp} - ${action}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    auditLog("CHECK_STARTED", { method: req.method });

    // Configurar cliente Supabase com service role para acesso completo
    const supabaseServiceRole = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verificar variáveis de ambiente
    const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");

    if (!evolutionApiUrl || !evolutionApiKey) {
      auditLog("MISSING_ENV_VARS");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Configuração da API Evolution não encontrada" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Buscar todos os usuários com instance_name definido
    const { data: profiles, error: profilesError } = await supabaseServiceRole
      .from('profiles')
      .select('id, nome, instance_name, email')
      .not('instance_name', 'is', null);

    if (profilesError) {
      auditLog("PROFILES_FETCH_ERROR", { error: profilesError.message });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Erro ao buscar perfis" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    auditLog("PROFILES_FOUND", { count: profiles?.length || 0 });

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Nenhum usuário com instância encontrado",
        checked: 0,
        connected: 0,
        disconnected: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let checkedCount = 0;
    let connectedCount = 0;
    let disconnectedCount = 0;
    const results = [];

    // Verificar status de cada instância
    for (const profile of profiles) {
      try {
        auditLog("CHECKING_INSTANCE", { 
          userId: profile.id, 
          instanceName: profile.instance_name 
        });

        // Fazer requisição para Evolution API com timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const statusResponse = await fetch(
          `${evolutionApiUrl}/instance/connectionState/${profile.instance_name}`, 
          {
            headers: { 'apikey': evolutionApiKey },
            signal: controller.signal
          }
        );

        clearTimeout(timeoutId);
        checkedCount++;

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          const isConnected = statusData.state === 'open';
          
          if (isConnected) {
            connectedCount++;
          } else {
            disconnectedCount++;
          }

          results.push({
            userId: profile.id,
            nome: profile.nome,
            instanceName: profile.instance_name,
            status: isConnected ? 'connected' : 'disconnected',
            evolutionStatus: statusData.state
          });

          auditLog("INSTANCE_STATUS", {
            userId: profile.id,
            instanceName: profile.instance_name,
            status: statusData.state,
            connected: isConnected
          });

        } else {
          disconnectedCount++;
          results.push({
            userId: profile.id,
            nome: profile.nome,
            instanceName: profile.instance_name,
            status: 'error',
            error: `HTTP ${statusResponse.status}`
          });

          auditLog("INSTANCE_ERROR", {
            userId: profile.id,
            instanceName: profile.instance_name,
            httpStatus: statusResponse.status
          });
        }

      } catch (error) {
        checkedCount++;
        disconnectedCount++;
        
        results.push({
          userId: profile.id,
          nome: profile.nome,
          instanceName: profile.instance_name,
          status: 'error',
          error: (error as Error).message
        });

        auditLog("INSTANCE_CHECK_ERROR", {
          userId: profile.id,
          instanceName: profile.instance_name,
          error: (error as Error).message
        });
      }
    }

    auditLog("CHECK_COMPLETED", {
      totalProfiles: profiles.length,
      checked: checkedCount,
      connected: connectedCount,
      disconnected: disconnectedCount
    });

    return new Response(JSON.stringify({ 
      success: true,
      summary: {
        totalProfiles: profiles.length,
        checked: checkedCount,
        connected: connectedCount,
        disconnected: disconnectedCount
      },
      results
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    auditLog("FUNCTION_ERROR", { error: (error as Error).message });
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Erro interno do servidor" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
