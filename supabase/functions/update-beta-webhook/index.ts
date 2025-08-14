import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPDATE-BETA-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");
    
    if (!evolutionApiUrl || !evolutionApiKey) {
      throw new Error("Evolution API credentials not configured");
    }

    const cleanApiUrl = evolutionApiUrl.replace(/\/$/, '');
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");

    // Verificar se o usuário é admin
    const { data: adminProfile, error: adminError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();

    if (adminError || adminProfile?.role !== 'admin') {
      throw new Error("Admin access required");
    }

    const { userId, action } = await req.json();
    if (!userId || !action) {
      throw new Error("User ID and action are required");
    }

    logStep("Processing webhook update", { userId, action });

    // Buscar informações do usuário alvo
    const { data: targetProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('instance_name, role')
      .eq('id', userId)
      .single();

    if (profileError || !targetProfile) {
      logStep("User profile not found", { userId, error: profileError });
      return new Response(JSON.stringify({
        success: true,
        message: "User profile not found, no webhook to update"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { instance_name, role } = targetProfile;

    if (!instance_name) {
      logStep("User has no instance", { userId });
      return new Response(JSON.stringify({
        success: true,
        message: "User has no instance, no webhook to update"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Determinar qual webhook usar baseado na ação e role atual
    let webhookUrl;
    if (action === 'promote' || role === 'beta') {
      webhookUrl = "https://webhookn8n.gera-leads.com/webhook/whatsapp-beta";
    } else {
      webhookUrl = Deno.env.get("WEBHOOK_N8N_RECEBE_MENSAGEM");
    }

    logStep("Updating webhook for instance", { 
      instance: instance_name, 
      action, 
      newRole: action === 'promote' ? 'beta' : 'user',
      webhookUrl 
    });

    // Atualizar webhook da instância na Evolution API
    const updatePayload = {
      webhook: {
        url: webhookUrl,
        byEvents: false,
        base64: true,
        headers: { "Content-Type": "application/json" },
        events: ["MESSAGES_UPSERT"]
      }
    };

    const response = await fetch(`${cleanApiUrl}/instance/update/${instance_name}`, {
      method: 'PUT',
      headers: {
        'apikey': evolutionApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatePayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("Error updating webhook", { status: response.status, error: errorText });
      throw new Error(`Failed to update webhook: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    logStep("Webhook updated successfully", data);

    return new Response(JSON.stringify({
      success: true,
      message: `Webhook updated for ${action === 'promote' ? 'beta' : 'regular'} user`,
      instance: instance_name,
      webhookUrl
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in update-beta-webhook", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});