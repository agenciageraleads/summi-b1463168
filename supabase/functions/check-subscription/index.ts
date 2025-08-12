
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Validação robusta dos secrets
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey || !stripeKey.startsWith('sk_')) {
      logStep("ERRO: Stripe key inválida ou não configurada");
      throw new Error("STRIPE_SECRET_KEY não configurada corretamente");
    }
    logStep("Stripe key validated");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("ERRO: Authorization header ausente");
      throw new Error("Token de autorização obrigatório");
    }
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    if (!token || token.length < 10) {
      logStep("ERRO: Token inválido");
      throw new Error("Token de autorização inválido");
    }
    
    logStep("Authenticating user with token");
    
    // Timeout para autenticação
    const authPromise = supabaseClient.auth.getUser(token);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Timeout na autenticação")), 10000)
    );
    
    const { data: userData, error: userError } = await Promise.race([authPromise, timeoutPromise]) as any;
    
    if (userError) {
      logStep("ERRO de autenticação", { error: userError.message });
      throw new Error(`Erro de autenticação: ${userError.message}`);
    }
    
    const user = userData.user;
    if (!user?.email) {
      logStep("ERRO: Usuário não autenticado ou email indisponível");
      throw new Error("Usuário não autenticado ou email não disponível");
    }
    
    logStep("User authenticated successfully", { userId: user.id, email: user.email });

    // Inicializar Stripe com timeout
    const stripe = new Stripe(stripeKey, { 
      apiVersion: "2023-10-16",
      timeout: 15000 // 15 segundos de timeout
    });
    
    logStep("Iniciando busca por cliente no Stripe", { email: user.email });
    
    // Retry logic para Stripe
    let customers;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        customers = await stripe.customers.list({ email: user.email, limit: 1 });
        break;
      } catch (stripeError: any) {
        retryCount++;
        logStep(`ERRO Stripe tentativa ${retryCount}`, { error: stripeError.message });
        
        if (retryCount >= maxRetries) {
          throw new Error(`Erro do Stripe após ${maxRetries} tentativas: ${stripeError.message}`);
        }
        
        // Aguardar antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
    
    if (customers.data.length === 0) {
      logStep("No customer found, updating unsubscribed state");
      await supabaseClient.from("subscribers").upsert({
        email: user.email,
        user_id: user.id,
        stripe_customer_id: null,
        subscription_status: 'inactive',
        stripe_price_id: null,
        subscription_end: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Também recuperar o cliente para verificar método de pagamento padrão
    const customer = await stripe.customers.retrieve(customerId) as any;
    const hasCustomerDefaultPm = !!(customer && customer.invoice_settings && customer.invoice_settings.default_payment_method);

    // Busca por assinaturas ativas ou em trial, verificando as mais recentes
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all", // Buscamos todas para pegar 'active' e 'trialing'
      limit: 10, // Aumenta o limite para garantir que encontramos a assinatura correta entre as mais recentes
    });

    const activeOrTrialingSubscription = subscriptions.data.find(sub => sub.status === 'active' || sub.status === 'trialing');
    
    let subscriptionStatus = 'inactive';
    let planType = null;
    let subscriptionEnd = null;
    let stripePriceId = null;
    let hasPaymentMethod = hasCustomerDefaultPm;

    if (activeOrTrialingSubscription) {
      const subscription = activeOrTrialingSubscription;
      subscriptionStatus = subscription.status; // 'active' ou 'trialing'
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      stripePriceId = subscription.items.data[0].price.id;
      // Verifica PM da assinatura (string ou objeto)
      const subDefaultPm = (subscription as any).default_payment_method;
      const subDefaultPmId = typeof subDefaultPm === 'string' ? subDefaultPm : subDefaultPm?.id;
      hasPaymentMethod = hasPaymentMethod || !!subDefaultPmId;

      logStep("Active or trialing subscription found", { subscriptionId: subscription.id, status: subscriptionStatus, endDate: subscriptionEnd, priceId: stripePriceId, hasPaymentMethod });
      
      // Determinar tipo do plano baseado no Price ID
      if (stripePriceId === "price_1RZ8j9KyDqE0F1PtNvJzdK0F") {
        planType = "monthly";
      } else if (stripePriceId === "price_1RZ8j9KyDqE0F1PtIlw9cx2C") {
        planType = "annual";
      }
      logStep("Determined plan type", { priceId: stripePriceId, planType });
    } else {
      logStep("No active or trialing subscription found");
    }

    // Atualiza banco com o status mais recente (independente do critério "estrito")
    await supabaseClient.from("subscribers").upsert({
      email: user.email,
      user_id: user.id,
      stripe_customer_id: customerId,
      subscription_status: subscriptionStatus,
      stripe_price_id: stripePriceId,
      subscription_end: subscriptionEnd,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' });

    const subscribedStrict = (subscriptionStatus === 'active') || (subscriptionStatus === 'trialing');

    logStep("Updated database with subscription info", { subscribed: subscribedStrict, status: subscriptionStatus, planType, stripePriceId, hasPaymentMethod });
    return new Response(JSON.stringify({
      subscribed: subscribedStrict,
      status: subscriptionStatus,
      plan_type: planType,
      stripe_price_id: stripePriceId,
      subscription_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERRO CRÍTICO in check-subscription", { 
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Determinar status baseado no tipo de erro
    let status = 500;
    if (errorMessage.includes("autenticação") || errorMessage.includes("Authorization")) {
      status = 401;
    } else if (errorMessage.includes("Timeout")) {
      status = 408;
    } else if (errorMessage.includes("STRIPE_SECRET_KEY")) {
      status = 503; // Service unavailable
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      timestamp: new Date().toISOString(),
      retryAfter: status === 408 ? 30 : undefined
    }), {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
        ...(status === 408 && { "Retry-After": "30" })
      },
      status: status,
    });
  }
});
