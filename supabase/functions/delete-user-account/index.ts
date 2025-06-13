
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DELETE-USER-ACCOUNT] ${step}${detailsStr}`);
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
    logStep("Delete user account process started");

    const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");
    
    if (!evolutionApiUrl || !evolutionApiKey) {
      throw new Error("Evolution API credentials not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }

    const user = userData.user;
    logStep("User authenticated for deletion", { userId: user.id, email: user.email });

    // Buscar dados do perfil para obter instance_name
    const { data: profileData, error: profileError } = await supabaseClient
      .from('profiles')
      .select('instance_name')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      logStep("Warning: Could not fetch profile data", profileError);
    }

    const instanceName = profileData?.instance_name;

    // ETAPA A: Deletar instância da Evolution API (se existir)
    if (instanceName) {
      logStep("Step A: Deleting Evolution API instance", { instanceName });
      
      try {
        const deleteInstanceResponse = await fetch(`${evolutionApiUrl.replace(/\/$/, '')}/instance/delete/${instanceName}`, {
          method: 'DELETE',
          headers: {
            'apikey': evolutionApiKey
          }
        });

        if (deleteInstanceResponse.ok) {
          logStep("Evolution API instance deleted successfully");
        } else {
          const errorText = await deleteInstanceResponse.text();
          logStep("Warning: Could not delete Evolution API instance", { status: deleteInstanceResponse.status, error: errorText });
          // Continuar mesmo se a deleção da instância falhar
        }
      } catch (evolutionError) {
        logStep("Warning: Error deleting Evolution API instance", { error: evolutionError });
        // Continuar mesmo se houver erro
      }
    } else {
      logStep("No Evolution API instance to delete");
    }

    // ETAPA B: Deletar dados relacionados do usuário
    logStep("Step B: Deleting user related data");

    // Deletar chats do usuário
    const { error: chatsError } = await supabaseClient
      .from('chats')
      .delete()
      .eq('id_usuario', user.id);

    if (chatsError) {
      logStep("Error deleting user chats", chatsError);
      throw new Error(`Failed to delete user chats: ${chatsError.message}`);
    }
    logStep("User chats deleted successfully");

    // Deletar feedback do usuário
    const { error: feedbackError } = await supabaseClient
      .from('feedback')
      .delete()
      .eq('user_id', user.id);

    if (feedbackError) {
      logStep("Warning: Could not delete user feedback", feedbackError);
      // Não falhar por causa do feedback
    }

    // Deletar dados de assinatura
    const { error: subscribersError } = await supabaseClient
      .from('subscribers')
      .delete()
      .eq('user_id', user.id);

    if (subscribersError) {
      logStep("Warning: Could not delete subscriber data", subscribersError);
      // Não falhar por causa da assinatura
    }

    // Deletar perfil do usuário
    const { error: profileDeleteError } = await supabaseClient
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (profileDeleteError) {
      logStep("Error deleting user profile", profileDeleteError);
      throw new Error(`Failed to delete user profile: ${profileDeleteError.message}`);
    }
    logStep("User profile deleted successfully");

    // ETAPA C: Deletar usuário do sistema de autenticação
    logStep("Step C: Deleting user from auth system");
    
    const { error: authDeleteError } = await supabaseClient.auth.admin.deleteUser(user.id);
    
    if (authDeleteError) {
      logStep("Error deleting user from auth system", authDeleteError);
      throw new Error(`Failed to delete user from auth: ${authDeleteError.message}`);
    }
    logStep("User deleted from auth system successfully");

    logStep("User account deletion completed successfully", { userId: user.id });

    return new Response(JSON.stringify({
      success: true,
      message: 'User account deleted successfully'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in delete-user-account", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
