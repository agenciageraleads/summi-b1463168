
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Função para logging detalhado
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[HANDLE-SIGNUP] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Usar service role para operações administrativas
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Iniciando processo de signup com trial");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY não configurada");

    const { name, email, password } = await req.json();
    if (!name || !email || !password) {
      throw new Error("Nome, email e senha são obrigatórios");
    }

    logStep("Dados recebidos", { name, email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Passo 1: Criar usuário no Supabase Auth
    logStep("Criando usuário no Supabase Auth");
    const redirectUrl = `${req.headers.get("origin") || "http://localhost:3000"}/`;
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirma email automaticamente para simplificar o trial
      user_metadata: { nome: name }
    });

    if (authError || !authData.user) {
      logStep("Erro ao criar usuário", { error: authError });
      throw new Error(`Erro ao criar usuário: ${authError?.message}`);
    }

    const userId = authData.user.id;
    logStep("Usuário criado com sucesso", { userId });

    try {
      // Passo 2: Criar customer no Stripe
      logStep("Criando customer no Stripe");
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          supabase_user_id: userId
        }
      });

      logStep("Customer criado no Stripe", { customerId: customer.id });

      // Passo 3: Criar subscription de trial no Stripe
      logStep("Criando subscription de trial");
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price: "price_1RZ8j9KyDqE0F1PtNvJzdK0F" // Price ID fornecido
        }],
        trial_period_days: 7,
        payment_behavior: 'default_incomplete', // Permite trial sem cartão
        metadata: {
          supabase_user_id: userId
        }
      });

      logStep("Subscription de trial criada", { subscriptionId: subscription.id });

      // Passo 4: Salvar dados na tabela subscribers
      logStep("Salvando dados na tabela subscribers");
      const { error: subscriberError } = await supabaseAdmin.from("subscribers").upsert({
        email,
        user_id: userId,
        stripe_customer_id: customer.id,
        stripe_subscription_id: subscription.id,
        subscribed: true, // True durante o trial
        subscription_status: 'trialing',
        stripe_price_id: "price_1RZ8j9KyDqE0F1PtNvJzdK0F",
        subscription_end: new Date(subscription.trial_end! * 1000).toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'email' });

      if (subscriberError) {
        logStep("Erro ao salvar subscriber", { error: subscriberError });
        throw new Error(`Erro ao salvar dados de assinatura: ${subscriberError.message}`);
      }

      logStep("Trial configurado com sucesso");

      // Retornar dados para login automático
      return new Response(JSON.stringify({
        success: true,
        message: "Conta criada com trial de 7 dias ativado!",
        user: authData.user,
        session: authData.session
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } catch (stripeError) {
      // Rollback: deletar usuário se algo deu errado com Stripe
      logStep("Erro com Stripe, fazendo rollback do usuário", { error: stripeError });
      
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        logStep("Rollback do usuário executado com sucesso");
      } catch (rollbackError) {
        logStep("Erro no rollback", { error: rollbackError });
      }
      
      throw stripeError;
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERRO no processo de signup", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
