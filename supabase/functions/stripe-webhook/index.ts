// ABOUTME: Webhook do Stripe para processar eventos de checkout, assinatura e pagamentos.
// ABOUTME: No fluxo Stripe-First, cria conta Supabase Auth + perfil automaticamente no checkout.session.completed.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logWebhookEvent = (eventType: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${eventType}${detailsStr}`);
};

const intEnv = (name: string, fallback: number): number => {
  const raw = Deno.env.get(name);
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

const REFERRAL_REFERRED_BONUS_DAYS = intEnv("REFERRAL_REFERRED_BONUS_DAYS", 3);
const REFERRAL_REFERRER_BONUS_DAYS = intEnv("REFERRAL_REFERRER_BONUS_DAYS", 3);
const REFERRAL_REFERRER_BETA_BONUS_DAYS = intEnv("REFERRAL_REFERRER_BETA_BONUS_DAYS", 6);

// Função auxiliar para garantir que o perfil existe
const ensureProfileExists = async (supabaseClient: any, userId: string, email: string, customerName?: string, phone?: string) => {
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
        email: email,
        numero: phone || null,
      });

    if (createError) {
      logWebhookEvent("Erro ao criar perfil automaticamente", { error: createError });
      return false;
    }

    logWebhookEvent("Perfil criado automaticamente com sucesso");
  } else if (phone || customerName) {
    // Atualizar perfil existente com dados do Stripe se necessário
    const updateData: Record<string, string> = {};
    if (phone) updateData.numero = phone;
    if (customerName) updateData.nome = customerName;

    await supabaseClient
      .from('profiles')
      .update(updateData)
      .eq('id', userId);
  }

  return true;
};

// Função para buscar userId por email
const findUserIdByEmail = async (supabaseClient: any, email: string) => {
  const { data: profileData, error: profileError } = await supabaseClient
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (!profileError && profileData) {
    return profileData.id;
  }

  const { data: usersData, error: usersError } = await supabaseClient.auth.admin.listUsers();

  if (usersError) {
    logWebhookEvent("Erro ao buscar usuários", { error: usersError });
    return null;
  }

  const user = usersData.users.find((u: any) => u.email === email);
  return user?.id || null;
};

// Gera senha temporária aleatória
const generateTempPassword = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  for (let i = 0; i < 24; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const recordReferralRewardOnce = async (
  supabaseClient: any,
  rewardKey: string,
  payload: {
    referrer_user_id: string;
    referred_user_id: string;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    reward_type: string;
    reward_days: number;
    source_event?: string | null;
  }
) => {
  const { data: existing } = await supabaseClient
    .from("referral_rewards")
    .select("id,reward_key")
    .eq("reward_key", rewardKey)
    .maybeSingle();

  if (existing) {
    return { inserted: false, reason: "duplicate" };
  }

  const { error } = await supabaseClient
    .from("referral_rewards")
    .insert({
      reward_key: rewardKey,
      ...payload,
      created_at: new Date().toISOString(),
    });

  if (error) {
    logWebhookEvent("Erro ao registrar reward de referral", { rewardKey, error });
    return { inserted: false, reason: "insert_error", error };
  }

  return { inserted: true };
};

const extendTrialForUser = async (
  supabaseClient: any,
  stripe: Stripe,
  userId: string,
  daysToAdd: number,
) => {
  const { data: subscriber, error: subError } = await supabaseClient
    .from("subscribers")
    .select("stripe_subscription_id, trial_ends_at, subscription_status")
    .eq("user_id", userId)
    .maybeSingle();

  if (subError || !subscriber) {
    return { ok: false, reason: "subscriber_not_found", error: subError };
  }

  if (subscriber.subscription_status !== "trialing") {
    return { ok: false, reason: "not_trialing", status: subscriber.subscription_status };
  }

  const currentTrialEnd = subscriber.trial_ends_at ? new Date(subscriber.trial_ends_at) : new Date();
  const newTrialEnd = new Date(currentTrialEnd.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

  const { error: updateError } = await supabaseClient
    .from("subscribers")
    .update({
      trial_ends_at: newTrialEnd.toISOString(),
      subscription_end: newTrialEnd.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (updateError) {
    return { ok: false, reason: "db_update_failed", error: updateError };
  }

  if (subscriber.stripe_subscription_id) {
    try {
      await stripe.subscriptions.update(subscriber.stripe_subscription_id, {
        trial_end: Math.floor(newTrialEnd.getTime() / 1000),
      });
    } catch (stripeError) {
      logWebhookEvent("Erro ao sincronizar trial com Stripe (continuando)", { userId, stripeError });
    }
  }

  return { ok: true, newTrialEnd: newTrialEnd.toISOString(), stripeSubscriptionId: subscriber.stripe_subscription_id ?? null };
};

const applyReferralRewardsIfEligible = async (
  supabaseClient: any,
  stripe: Stripe,
  args: {
    session: Stripe.Checkout.Session;
    userId: string;
    customerId: string;
    subscription: Stripe.Subscription;
  }
) => {
  const { session, userId, customerId, subscription } = args;

  const sessionMeta = (session.metadata || {}) as Record<string, string>;
  const subMeta = ((subscription.metadata || {}) as Record<string, string>);

  let referredByUserId =
    subMeta.referred_by_user_id ||
    sessionMeta.referred_by_user_id ||
    null;

  const referralCode = (subMeta.referral_code || sessionMeta.referral_code || "").trim().toUpperCase() || null;

  const { data: referredProfile } = await supabaseClient
    .from("profiles")
    .select("id,referred_by_user_id")
    .eq("id", userId)
    .maybeSingle();

  if (!referredByUserId && referredProfile?.referred_by_user_id) {
    referredByUserId = referredProfile.referred_by_user_id;
  }

  if (!referredByUserId && referralCode) {
    const { data: referrerByCode } = await supabaseClient
      .from("profiles")
      .select("id")
      .eq("referral_code", referralCode)
      .maybeSingle();
    if (referrerByCode?.id) {
      referredByUserId = referrerByCode.id;
    }
  }

  if (!referredByUserId || referredByUserId === userId) {
    return { applied: false, reason: "no_valid_referrer" };
  }

  if (!referredProfile?.referred_by_user_id) {
    await supabaseClient
      .from("profiles")
      .update({ referred_by_user_id: referredByUserId })
      .eq("id", userId);
  }

  const { data: referrerProfile } = await supabaseClient
    .from("profiles")
    .select("id,role")
    .eq("id", referredByUserId)
    .maybeSingle();

  const referrerRole = referrerProfile?.role || null;
  const referrerBonusDays = referrerRole === "beta" ? REFERRAL_REFERRER_BETA_BONUS_DAYS : REFERRAL_REFERRER_BONUS_DAYS;
  const referredBonusDays = REFERRAL_REFERRED_BONUS_DAYS;
  const subId = subscription.id;

  const results: Record<string, any> = {
    applied: true,
    referredByUserId,
    referrerRole,
    referredBonusDays,
    referrerBonusDays,
    referred: null,
    referrer: null,
  };

  const rewardKeyReferred = `checkout:${session.id}:referred:${userId}`;
  const referredReward = await recordReferralRewardOnce(supabaseClient, rewardKeyReferred, {
    referrer_user_id: referredByUserId,
    referred_user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subId,
    reward_type: "referred_trial_bonus",
    reward_days: referredBonusDays,
    source_event: "checkout.session.completed",
  });
  if (referredReward.inserted) {
    results.referred = await extendTrialForUser(supabaseClient, stripe, userId, referredBonusDays);
  } else {
    results.referred = { ok: false, reason: referredReward.reason };
  }

  const rewardKeyReferrer = `checkout:${session.id}:referrer:${referredByUserId}`;
  const referrerReward = await recordReferralRewardOnce(supabaseClient, rewardKeyReferrer, {
    referrer_user_id: referredByUserId,
    referred_user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subId,
    reward_type: "referrer_trial_bonus",
    reward_days: referrerBonusDays,
    source_event: "checkout.session.completed",
  });
  if (referrerReward.inserted) {
    results.referrer = await extendTrialForUser(supabaseClient, stripe, referredByUserId, referrerBonusDays);
  } else {
    results.referrer = { ok: false, reason: referrerReward.reason };
  }

  return results;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logWebhookEvent("Webhook iniciado");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16"
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET");

    if (!signature || !webhookSecret) {
      throw new Error("Missing webhook signature or secret");
    }

    logWebhookEvent("Verificando assinatura do webhook");

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      logWebhookEvent("Erro na verificação da assinatura", { error: (err as Error).message });
      return new Response(`Webhook signature verification failed: ${(err as Error).message}`, { status: 400 });
    }

    logWebhookEvent("Evento recebido", { type: event.type, id: event.id });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logWebhookEvent("Processando checkout concluído", { sessionId: session.id });

        if (session.mode === "subscription") {
          const sessionMeta = (session.metadata || {}) as Record<string, string>;
          const email = session.customer_details?.email || session.customer_email;
          const phone = session.customer_details?.phone || session.phone_number_collection?.toString() || null;
          
          // Extrair nome do custom_fields
          let customerName: string | null = null;
          if (session.custom_fields && session.custom_fields.length > 0) {
            const nameField = session.custom_fields.find((f: any) => f.key === 'full_name');
            if (nameField && nameField.text) {
              customerName = nameField.text.value;
            }
          }

          if (!email) {
            logWebhookEvent("Email não encontrado na sessão de checkout");
            break;
          }

          logWebhookEvent("Dados do checkout", { email, customerName, phone });

          // ===== STRIPE-FIRST: Criar conta Supabase se não existir =====
          let userId = await findUserIdByEmail(supabaseClient, email);
          if (!userId && sessionMeta.supabase_user_id) {
            userId = sessionMeta.supabase_user_id;
          }

          if (!userId) {
            logWebhookEvent("Usuário não existe, criando conta via Admin API...", { email });
            
            const tempPassword = generateTempPassword();
            
            const { data: newUser, error: createUserError } = await supabaseClient.auth.admin.createUser({
              email: email,
              password: tempPassword,
              email_confirm: true, // Confirmar email automaticamente (pagou = email válido)
              user_metadata: {
                nome: customerName || email.split('@')[0],
                numero: phone,
                stripe_checkout: true,
                needs_password_setup: true,
              },
            });

            if (createUserError) {
              logWebhookEvent("Erro ao criar usuário", { error: createUserError });
              break;
            }

            userId = newUser.user.id;
            logWebhookEvent("Usuário criado com sucesso", { userId });
          }

          // Garantir que o perfil existe com dados do Stripe
          await ensureProfileExists(supabaseClient, userId, email, customerName || undefined, phone || undefined);

          // Buscar assinatura do Stripe
          const customerId = typeof session.customer === 'string' ? session.customer : (session.customer as any)?.id;

          if (customerId) {
            // Atualizar metadata do customer no Stripe com o supabase_user_id
            await stripe.customers.update(customerId, {
              metadata: { supabase_user_id: userId },
            });

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
                email: email,
                stripe_customer_id: customerId,
                stripe_subscription_id: subscription.id,
                stripe_price_id: priceId,
                subscribed: true,
                subscription_status: subscription.status,
                subscription_start: new Date(subscription.start_date * 1000).toISOString(),
                subscription_end: new Date(subscription.current_period_end * 1000).toISOString(),
                trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'email' });

              logWebhookEvent("Assinatura ativada com sucesso", { email, priceId, status: subscription.status });

              try {
                const referralRewardResult = await applyReferralRewardsIfEligible(supabaseClient, stripe, {
                  session,
                  userId,
                  customerId,
                  subscription,
                });
                logWebhookEvent("Resultado do referral no checkout", {
                  sessionId: session.id,
                  userId,
                  referralRewardResult,
                });
              } catch (referralError) {
                logWebhookEvent("Erro ao aplicar recompensa de referral", {
                  sessionId: session.id,
                  userId,
                  error: String(referralError),
                });
              }
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
          let userId = await findUserIdByEmail(supabaseClient, customer.email);

          if (!userId && customer.metadata?.supabase_user_id) {
            userId = customer.metadata.supabase_user_id;
          }

          if (!userId) {
            logWebhookEvent("Usuário não encontrado no banco", { email: customer.email });
            break;
          }

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
            let userId = await findUserIdByEmail(supabaseClient, customer.email);

            if (!userId && customer.metadata?.supabase_user_id) {
              userId = customer.metadata.supabase_user_id;
            }

            if (!userId) {
              logWebhookEvent("Usuário não encontrado no banco", { email: customer.email });
              break;
            }

            await ensureProfileExists(supabaseClient, userId, customer.email, customer.name || undefined);

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
