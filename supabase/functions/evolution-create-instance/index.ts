
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EVOLUTION-CREATE] ${step}${detailsStr}`);
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    const { instanceName } = await req.json();
    if (!instanceName) throw new Error("Instance name is required");

    logStep("Creating instance", { instanceName });

    const payload = {
      instanceName,
      token: evolutionApiKey,
      qrcode: true,
      instanceSettings: {
        settings: {
          groupsIgnore: true,
          syncFullHistory: true
        }
      },
      webhook: {
        webhookSettings: {
          webhookUrl: "https://webhookn8n.gera-leads.com/webhook/whatsapp",
          webhookBase64: true,
          webhookEvents: [
            "MESSAGES_UPSERT"
          ]
        }
      }
    };

    const response = await fetch(`${evolutionApiUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("Error creating instance", { status: response.status, error: errorText });
      throw new Error(`Failed to create instance: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    logStep("Instance created successfully", data);

    // Update user profile with instance name
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ instance_name: instanceName })
      .eq('id', user.id);

    if (updateError) {
      logStep("Error updating profile", updateError);
    }

    return new Response(JSON.stringify({
      success: true,
      instanceName: data.instance?.instanceName || instanceName,
      status: data.instance?.status || 'created'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in evolution-create-instance", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
