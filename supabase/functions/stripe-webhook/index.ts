// ABOUTME: Webhook do Stripe para processar eventos de checkout, assinatura e pagamentos
// ABOUTME: Cria perfil automaticamente se não existir, garantindo resiliência no fluxo

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Função para log detalhado dos eventos do webhook
const logWebhookEvent = (eventType: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${eventType}${detailsStr}`);
};

// Função auxiliar para garantir que o perfil existe
const ensureProfileExists = async (supabaseClient: any, userId: string, email: string, customerName?: string) => {
  logWebhookEvent("Verificando se perfil existe", { userId, email });
  
  const { data: existingProfile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  
  if (profileError) {
    logWebhookEvent("Erro ao verificar perfil", { error: profileError });
    return false;
  }
  
  if (!existingProfile) {
    logWebhookEvent("Perfil não encontrado, criando automaticamente", { userId, email });
    
    const { error: createError } = await supabaseClient
      .from('profiles')
      .insert({
        id: userId,
        nome: customerName || email.split('@')[0],
        email: email
      });
    
    if (createError) {
      logWebhookEvent("Erro ao criar perfil automaticamente", { error: createError });
      return false;
    }
    
    logWebhookEvent("Perfil criado automaticamente com sucesso");
  }
  
  return true;
};

// Função para buscar userId por email (tenta profiles, depois auth.users)
const findUserIdByEmail = async (supabaseClient: any, email: string) => {
  // Tentar primeiro na tabela profiles
  const { data: profileData, error: profileError } = await supabaseClient
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  
  if (!profileError && profileData) {
    return profileData.id;
  }
  
  // Se não encontrou em profiles, buscar em auth.users via admin
  const { data: usersData, error: usersError } = await supabaseClient.auth.admin.listUsers();
  
  if (usersError) {
    logWebhookEvent("Erro ao buscar usuários", { error: usersError });
    return null;
  }
  
  const user = usersData.users.find((u: any) => u.email === email);
  return user?.id || null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logWebhookEvent("Webhook iniciado");

    // Configurar Stripe e Supabase
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2023-10-16" 
    });
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verificar assinatura do webhook usando método assíncrono
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET");

    if (!signature || !webhookSecret) {
      throw new Error("Missing webhook signature or secret");
    }

    logWebhookEvent("Verificando assinatura do webhook");
    
    let event: Stripe.Event;
    try {
      // Usar o método assíncrono para compatibilidade com Deno
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      logWebhookEvent("Erro na verificação da assinatura", { error: (err as Error).message });
      return new Response(`Webhook signature verification failed: ${(err as Error).message}`, { status: 400 });
    }

    logWebhookEvent("Evento recebido", { type: event.type, id: event.id });

    // Processar diferentes tipos de eventos
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logWebhookEvent("Processando checkout concluído", { sessionId: session.id });
        
        if (session.mode === "subscription" && session.customer) {
          const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id;
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          
          if (customer.email) {
            logWebhookEvent("Atualizando dados do cliente", { email: customer.email });
            
            // Buscar userId - tenta profiles e auth.users
            let userId = await findUserIdByEmail(supabaseClient, customer.email);
            
            // Se ainda não encontrou e temos metadata do customer, usar o supabase_user_id
            if (!userId && customer.metadata?.supabase_user_id) {
              userId = customer.metadata.supabase_user_id;
              logWebhookEvent("Usando userId do metadata do Stripe", { userId });
            }

            if (!userId) {
              logWebhookEvent("Usuário não encontrado no banco", { email: customer.email });
              break;
            }

            // Garantir que o perfil existe
            await ensureProfileExists(supabaseClient, userId, customer.email, customer.name || undefined);

            // Buscar a assinatura criada (pode estar 'active' ou 'trialing')
            const subscriptions = await stripe.subscriptions.list({
              customer: customerId,
              status: "all",
              limit: 1,
            });

            const subscription = subscriptions.data.find((s: any) => s.status === 'active' || s.status === 'trialing');

            if (subscription) {
              const priceId = subscription.items.data[0].price.id;
              
              await supabaseClient.from("subscribers").upsert({
                user_id: userId,
                email: customer.email,
                stripe_customer_id: customerId,
                stripe_subscription_id: subscription.id,
                stripe_price_id: priceId,
                subscribed: true,
                subscription_status: subscription.status,
                subscription_start: new Date(subscription.start_date * 1000).toISOString(),
                subscription_end: new Date(subscription.current_period_end * 1000).toISOString(),
                updated_at: new Date().toISOString(),
              }, { onConflict: 'email' });
              
              logWebhookEvent("Assinatura ativada com sucesso", { email: customer.email, priceId, status: subscription.status });
            } else {
              logWebhookEvent("Nenhuma assinatura ativa ou em teste encontrada após o checkout", { customerId });
            }
          }
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logWebhookEvent("Processando atualização de assinatura", { 
          subscriptionId: subscription.id, 
          status: subscription.status 
        });
        
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        
        if (customer.email) {
          // Buscar userId
          let userId = await findUserIdByEmail(supabaseClient, customer.email);
          
          if (!userId && customer.metadata?.supabase_user_id) {
            userId = customer.metadata.supabase_user_id;
          }

          if (!userId) {
            logWebhookEvent("Usuário não encontrado no banco", { email: customer.email });
            break;
          }

          // Garantir que o perfil existe
          await ensureProfileExists(supabaseClient, userId, customer.email, customer.name || undefined);

          const isActive = subscription.status === 'active' || subscription.status === 'trialing';
          const priceId = isActive ? subscription.items.data[0].price.id : null;
          
          await supabaseClient.from("subscribers").upsert({
            user_id: userId,
            email: customer.email,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            stripe_price_id: priceId,
            subscribed: isActive,
            subscription_status: subscription.status,
            subscription_end: isActive ? new Date(subscription.current_period_end * 1000).toISOString() : null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'email' });
          
          logWebhookEvent("Status da assinatura atualizado", { 
            email: customer.email, 
            status: subscription.status 
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logWebhookEvent("Pagamento de fatura bem-sucedido", { invoiceId: invoice.id });
        
        if (invoice.subscription && invoice.customer) {
          const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id;
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          
          if (customer.email) {
            // Buscar userId
            let userId = await findUserIdByEmail(supabaseClient, customer.email);
            
            if (!userId && customer.metadata?.supabase_user_id) {
              userId = customer.metadata.supabase_user_id;
            }

            if (!userId) {
              logWebhookEvent("Usuário não encontrado no banco", { email: customer.email });
              break;
            }

            // Garantir que o perfil existe
            await ensureProfileExists(supabaseClient, userId, customer.email, customer.name || undefined);

            // Atualizar a data de renovação
            const subscription = await stripe.subscriptions.retrieve(
              typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id
            );
            
            await supabaseClient.from("subscribers").upsert({
              user_id: userId,
              email: customer.email,
              subscribed: true,
              subscription_end: new Date(subscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            }, { onConflict: 'email' });
            
            logWebhookEvent("Data de renovação atualizada", { email: customer.email });
          }
        }
        break;
      }

      default:
        logWebhookEvent("Evento não processado", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logWebhookEvent("ERRO no webhook", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
