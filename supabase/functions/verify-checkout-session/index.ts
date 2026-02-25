// ABOUTME: Verifica uma sessão de checkout do Stripe e retorna dados para a página de complete-signup.
// ABOUTME: Endpoint público (sem JWT) - usado após redirect do Stripe Checkout.

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
    const { sessionId } = await req.json();

    if (!sessionId) {
      throw new Error("session_id is required");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2023-10-16" });

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'custom_fields'],
    });

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      // Em trial, status é 'complete' mas payment_status pode ser 'no_payment_required'
      if (session.status !== 'complete') {
        throw new Error("Checkout session not completed");
      }
    }

    const email = session.customer_details?.email || session.customer_email;
    const phone = session.customer_details?.phone || null;

    // Extrair nome do custom_fields
    let customerName: string | null = null;
    if (session.custom_fields && session.custom_fields.length > 0) {
      const nameField = session.custom_fields.find((f: any) => f.key === 'full_name');
      if (nameField && nameField.text) {
        customerName = nameField.text.value;
      }
    }

    if (!email) {
      throw new Error("Email not found in checkout session");
    }

    // Verificar se o usuário já definiu senha (já fez complete-signup antes)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: usersData } = await supabaseClient.auth.admin.listUsers();
    const user = usersData?.users?.find((u: any) => u.email === email);
    
    const needsPasswordSetup = user?.user_metadata?.needs_password_setup === true;

    return new Response(JSON.stringify({
      email,
      name: customerName,
      phone,
      needs_password_setup: needsPasswordSetup,
      user_exists: !!user,
    }), {
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
