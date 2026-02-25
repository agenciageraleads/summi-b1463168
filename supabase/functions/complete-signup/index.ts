// ABOUTME: Edge function para completar signup pós-Stripe (definir senha).
// ABOUTME: Recebe email + nova senha, atualiza a senha do usuário via Admin API e remove flag needs_password_setup.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const { email, password } = await req.json();

    if (!email || !password) {
      throw new Error("Email e senha são obrigatórios");
    }

    if (password.length < 6) {
      throw new Error("A senha deve ter pelo menos 6 caracteres");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Buscar usuário por email
    const { data: usersData, error: listError } = await supabaseClient.auth.admin.listUsers();

    if (listError) {
      throw new Error("Erro ao buscar usuário");
    }

    const user = usersData.users.find((u: any) => u.email === email);

    if (!user) {
      throw new Error("Usuário não encontrado. O pagamento pode ainda estar sendo processado. Tente novamente em alguns segundos.");
    }

    // Atualizar senha e remover flag
    const { error: updateError } = await supabaseClient.auth.admin.updateUserById(user.id, {
      password: password,
      user_metadata: {
        ...user.user_metadata,
        needs_password_setup: false,
      },
    });

    if (updateError) {
      throw new Error("Erro ao definir senha: " + updateError.message);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Senha definida com sucesso! Faça login para acessar sua conta.",
      email: email,
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
