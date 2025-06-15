
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EXTEND-TRIAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { userId, daysToAdd, reason } = await req.json();
    
    if (!userId || !daysToAdd) {
      throw new Error("userId e daysToAdd são obrigatórios");
    }

    logStep(`Iniciando extensão de trial`, { userId, daysToAdd, reason });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY não configurada");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Buscar dados do usuário
    const { data: subscriber, error: subError } = await supabaseAdmin
      .from('subscribers')
      .select('stripe_subscription_id, trial_ends_at, subscription_status')
      .eq('user_id', userId)
      .single();
    
    if (subError || !subscriber) {
      logStep("Usuário não encontrado", { error: subError });
      throw new Error("Usuário não encontrado");
    }

    // Apenas estender se ainda estiver em trial
    if (subscriber.subscription_status !== 'trialing') {
      logStep("Usuário não está mais em trial", { status: subscriber.subscription_status });
      throw new Error("Usuário não está mais em período de trial");
    }

    // Calcular nova data de expiração
    const currentTrialEnd = subscriber.trial_ends_at ? new Date(subscriber.trial_ends_at) : new Date();
    const newTrialEnd = new Date(currentTrialEnd.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
    
    logStep("Calculando nova data de trial", { 
      currentTrialEnd: currentTrialEnd.toISOString(),
      newTrialEnd: newTrialEnd.toISOString()
    });
    
    // Atualizar no banco de dados primeiro (fonte da verdade)
    const { error: updateError } = await supabaseAdmin
      .from('subscribers')
      .update({ 
        trial_ends_at: newTrialEnd.toISOString(),
        subscription_end: newTrialEnd.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    if (updateError) {
      logStep("Erro ao atualizar trial no banco", { error: updateError });
      throw new Error("Erro ao atualizar trial no banco de dados");
    }
    
    // Sincronizar com Stripe
    if (subscriber.stripe_subscription_id) {
      try {
        await stripe.subscriptions.update(subscriber.stripe_subscription_id, {
          trial_end: Math.floor(newTrialEnd.getTime() / 1000)
        });
        logStep("Trial sincronizado com Stripe com sucesso");
      } catch (stripeError) {
        logStep("Erro ao sincronizar com Stripe", { error: stripeError });
        // Não falha o processo, pois o banco é a fonte da verdade
      }
    }
    
    logStep(`Trial estendido com sucesso`);
    
    return new Response(JSON.stringify({
      success: true,
      message: `Trial estendido por ${daysToAdd} dias`,
      newTrialEnd: newTrialEnd.toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERRO ao estender trial", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
