// ABOUTME: Edge function para criar sessão de checkout do Stripe.
// ABOUTME: Funciona SEM autenticação (Stripe-First flow) - aceita email/planType no body.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { planType, referralCode } = await req.json();

    if (planType !== 'monthly' && planType !== 'annual') {
      throw new Error('Invalid plan type');
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2023-10-16" });
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    let authUserId: string | null = null;
    let referredByUserId: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader?.toLowerCase().startsWith("bearer ")) {
      const token = authHeader.split(" ", 2)[1];
      const { data: authUser } = await supabaseAdmin.auth.getUser(token);
      authUserId = authUser.user?.id ?? null;

      if (authUserId) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id,referred_by_user_id")
          .eq("id", authUserId)
          .maybeSingle();

        referredByUserId = profile?.referred_by_user_id ?? null;
      }
    }

    if (!referredByUserId && referralCode) {
      const { data: referrer } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("referral_code", String(referralCode).toUpperCase())
        .maybeSingle();
      referredByUserId = referrer?.id ?? null;
    }

    // Definir price_id e trial_days baseado no tipo de plano
    let priceId: string;
    let trialDays: number;
    if (planType === 'monthly') {
      priceId = 'price_1RZ8j9KyDqE0F1PtNvJzdK0F';
      trialDays = 7;
    } else {
      priceId = 'price_1RZ8j9KyDqE0F1PtIlw9cx2C';
      trialDays = 30;
    }

    // Checkout público — sem usuário logado
    // O Stripe coleta email, nome e telefone via custom_fields
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      payment_method_collection: "always",
      mode: "subscription",
      subscription_data: {
        trial_period_days: trialDays,
        metadata: {
          plan_type: planType,
          ...(authUserId ? { supabase_user_id: authUserId } : {}),
          ...(referredByUserId ? { referred_by_user_id: referredByUserId } : {}),
          ...(referralCode ? { referral_code: String(referralCode).toUpperCase() } : {}),
        },
      },
      metadata: {
        plan_type: planType,
        ...(authUserId ? { supabase_user_id: authUserId } : {}),
        ...(referredByUserId ? { referred_by_user_id: referredByUserId } : {}),
        ...(referralCode ? { referral_code: String(referralCode).toUpperCase() } : {}),
      },
      phone_number_collection: {
        enabled: true,
      },
      custom_fields: [
        {
          key: "full_name",
          label: { type: "custom", custom: "Seu nome completo" },
          type: "text",
        },
      ],
      success_url: `${req.headers.get("origin") || "https://summi.gera-leads.com"}/complete-signup?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin") || "https://summi.gera-leads.com"}/?canceled=true`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
