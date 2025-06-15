
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Função para log de auditoria de segurança
const auditLog = (action: string, userId: string, details?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[SECURITY-AUDIT] ${timestamp} - ${action} - User: ${userId}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar se há token de autorização
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      auditLog("UNAUTHORIZED_ACCESS_ATTEMPT", "unknown", { endpoint: "delete-user-account" });
      return new Response(JSON.stringify({ success: false, error: "Token de autorização obrigatório" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Configurar cliente Supabase com service role (para validação do token e operações administrativas)
    const supabaseServiceRole = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verificar token do usuário usando service role client
    const { data: { user }, error: authError } = await supabaseServiceRole.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      auditLog("INVALID_TOKEN", "unknown", { error: authError?.message });
      return new Response(JSON.stringify({ success: false, error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const body = await req.json();
    const targetUserId = body.target_user_id || user.id; // Se não especificado, assume própria conta

    // Verificar se é auto-deleção ou deleção por admin
    const isSelfDeletion = targetUserId === user.id;
    
    if (!isSelfDeletion) {
      // Verificar se o usuário é admin usando função segura
      const { data: isAdmin, error: adminError } = await supabaseServiceRole
        .rpc('verify_admin_access', { user_id: user.id });

      if (adminError || !isAdmin) {
        auditLog("UNAUTHORIZED_ADMIN_ACTION", user.id, { 
          action: "delete_user", 
          target: targetUserId,
          reason: "não é admin ou erro de verificação" 
        });
        return new Response(JSON.stringify({ success: false, error: "Acesso negado" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      
      auditLog("ADMIN_USER_DELETION", user.id, { target_user: targetUserId });
    } else {
      auditLog("SELF_ACCOUNT_DELETION", user.id);
    }

    // Validar se o usuário alvo existe
    const { data: targetProfile, error: profileError } = await supabaseServiceRole
      .from('profiles')
      .select('id, nome, email')
      .eq('id', targetUserId)
      .single();

    if (profileError || !targetProfile) {
      auditLog("DELETE_NONEXISTENT_USER", user.id, { target: targetUserId });
      return new Response(JSON.stringify({ success: false, error: "Usuário não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Deletar dados relacionados do usuário de forma segura
    try {
      // 1. Deletar chats do usuário
      await supabaseServiceRole
        .from('chats')
        .delete()
        .eq('id_usuario', targetUserId);

      // 2. Deletar feedback do usuário  
      await supabaseServiceRole
        .from('feedback')
        .delete()
        .eq('user_id', targetUserId);

      // 3. Deletar assinatura do usuário
      await supabaseServiceRole
        .from('subscribers')
        .delete()
        .eq('user_id', targetUserId);

      // 4. Deletar perfil do usuário
      await supabaseServiceRole
        .from('profiles')
        .delete()
        .eq('id', targetUserId);

      // 5. Deletar usuário da autenticação (último passo)
      const { error: deleteAuthError } = await supabaseServiceRole.auth.admin.deleteUser(targetUserId);
      
      if (deleteAuthError) {
        throw new Error(`Erro ao deletar usuário da autenticação: ${deleteAuthError.message}`);
      }

      auditLog("USER_DELETION_SUCCESS", user.id, { 
        deleted_user: targetUserId,
        deleted_profile: targetProfile.nome 
      });

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Conta deletada com sucesso" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (deleteError) {
      auditLog("USER_DELETION_ERROR", user.id, { 
        target: targetUserId,
        error: deleteError.message 
      });
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Erro interno ao deletar conta" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

  } catch (error) {
    auditLog("FUNCTION_ERROR", "unknown", { error: error.message });
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Erro interno do servidor" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
