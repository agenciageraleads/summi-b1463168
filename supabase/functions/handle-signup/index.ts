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

// Função para estender trial de um usuário (recompensa por indicação)
const extendUserTrial = async (supabaseAdmin: any, stripe: Stripe, userId: string, daysToAdd: number) => {
  try {
    logStep(`Estendendo trial do usuário ${userId} por ${daysToAdd} dias`);
    
    // Buscar dados do usuário referente
    const { data: subscriber, error: subError } = await supabaseAdmin
      .from('subscribers')
      .select('stripe_subscription_id, trial_ends_at')
      .eq('user_id', userId)
      .single();
    
    if (subError || !subscriber) {
      logStep("Erro ao buscar subscriber para extensão", { error: subError });
      return;
    }
    
    // Calcular nova data de expiração do trial
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
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    if (updateError) {
      logStep("Erro ao atualizar trial no banco", { error: updateError });
      return;
    }
    
    // Sincronizar com Stripe se há subscription_id
    if (subscriber.stripe_subscription_id) {
      try {
        await stripe.subscriptions.update(subscriber.stripe_subscription_id, {
          trial_end: Math.floor(newTrialEnd.getTime() / 1000) // Unix timestamp
        });
        logStep("Trial sincronizado com Stripe com sucesso");
      } catch (stripeError) {
        logStep("Erro ao sincronizar com Stripe (continuando)", { error: stripeError });
        // Não falha o processo se Stripe falhar, pois o banco é a fonte da verdade
      }
    }
    
    logStep(`Trial estendido com sucesso para o usuário ${userId}`);
    
  } catch (error) {
    logStep("Erro inesperado ao estender trial", { error });
  }
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

    const { name, email, password, referralCode } = await req.json();
    if (!name || !email || !password) {
      throw new Error("Nome, email e senha são obrigatórios");
    }

    logStep("Dados recebidos", { name, email, referralCode });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Verificar se há código de indicação válido
    let referrerUserId = null;
    let trialDays = 7; // Trial padrão
    
    if (referralCode) {
      logStep("Verificando código de indicação", { referralCode });
      
      const { data: referrer, error: referrerError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('referral_code', referralCode.toUpperCase())
        .single();
      
      if (!referrerError && referrer) {
        referrerUserId = referrer.id;
        trialDays = 10; // Trial estendido para convidado
        logStep("Código de indicação válido encontrado", { referrerUserId });
      } else {
        logStep("Código de indicação inválido ou não encontrado", { error: referrerError });
      }
    }

    // Passo 1: Criar usuário no Supabase Auth
    logStep("Criando usuário no Supabase Auth");
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome: name }
    });

    if (authError || !authData.user) {
      logStep("Erro ao criar usuário", { error: authError });
      throw new Error(`Erro ao criar usuário: ${authError?.message}`);
    }

    const userId = authData.user.id;
    logStep("Usuário criado com sucesso", { userId });

    try {
      // Passo 2: Atualizar perfil com aceitação dos termos e referência
      logStep("Atualizando perfil com termos aceitos e referência");
      
      const profileUpdateData: any = {
        terms_accepted_at: new Date().toISOString(),
        terms_version: 'v1.0'
      };

      if (referrerUserId) {
        profileUpdateData.referred_by_user_id = referrerUserId;
      }

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdateData)
        .eq('id', userId);

      if (profileError) {
        logStep("Erro ao atualizar perfil", { error: profileError });
      }

      // Passo 3: Criar customer no Stripe
      logStep("Criando customer no Stripe");
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          supabase_user_id: userId,
          referred_by: referrerUserId || 'none'
        }
      });

      logStep("Customer criado no Stripe", { customerId: customer.id });

      // Passo 4: Criar subscription de trial no Stripe
      logStep(`Criando subscription de trial de ${trialDays} dias`);
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price: "price_1RZ8j9KyDqE0F1PtNvJzdK0F"
        }],
        trial_period_days: trialDays,
        payment_behavior: 'default_incomplete',
        metadata: {
          supabase_user_id: userId,
          referred_by: referrerUserId || 'none'
        }
      });

      logStep("Subscription de trial criada", { subscriptionId: subscription.id });

      // Calcular data de expiração do trial
      const trialEndDate = new Date(subscription.trial_end! * 1000);

      // Passo 5: Salvar dados na tabela subscribers
      logStep("Salvando dados na tabela subscribers");
      const { error: subscriberError } = await supabaseAdmin.from("subscribers").upsert({
        email,
        user_id: userId,
        stripe_customer_id: customer.id,
        stripe_subscription_id: subscription.id,
        subscribed: true,
        subscription_status: 'trialing',
        stripe_price_id: "price_1RZ8j9KyDqE0F1PtNvJzdK0F",
        subscription_end: trialEndDate.toISOString(),
        trial_ends_at: trialEndDate.toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'email' });

      if (subscriberError) {
        logStep("Erro ao salvar subscriber", { error: subscriberError });
        throw new Error(`Erro ao salvar dados de assinatura: ${subscriberError.message}`);
      }

      // Passo 6: Se houve indicação, recompensar o referrer
      if (referrerUserId) {
        logStep("Aplicando recompensa para o referrer");
        await extendUserTrial(supabaseAdmin, stripe, referrerUserId, 3); // 3 dias extras
      }

      logStep("Trial configurado com sucesso");

      return new Response(JSON.stringify({
        success: true,
        message: referrerUserId 
          ? `Conta criada com trial de ${trialDays} dias! Quem te indicou também ganhou 3 dias extras.`
          : `Conta criada com trial de ${trialDays} dias ativado!`,
        user: authData.user,
        session: authData.session
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } catch (stripeError) {
      // Rollback: deletar usuário se algo deu errado
      logStep("Erro com Stripe/perfil, fazendo rollback do usuário", { error: stripeError });
      
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
