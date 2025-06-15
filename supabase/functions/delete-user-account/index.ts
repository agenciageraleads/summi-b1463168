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
    console.log('[EDGE_FN][DEBUG] Authorization header recebido:', authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      auditLog("UNAUTHORIZED_ACCESS_ATTEMPT", "unknown", { endpoint: "delete-user-account" });
      return new Response(JSON.stringify({ success: false, error: "Token de autorização obrigatório ou formato inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    console.log('[EDGE_FN][DEBUG] access_token recebido (primeiros 20 chars):', token.substring(0, 20) + '...');

    if (!token) {
      return new Response(JSON.stringify({ success: false, error: "Token está vazio" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Cliente Supabase para validações
    const supabaseServiceRole = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // VALIDAR TOKEN: Checar se não expirou e existe sessão
    const { data: { user }, error: authError } = await supabaseServiceRole.auth.getUser(token);

    // Mais logs para debug do token e erro
    console.log('[EDGE_FN][DEBUG] Resultado getUser: user:', user, 'authError:', authError?.message ?? null);

    // Ajuda extra: printar o tipo do erro e dica de como proceder
    if (authError || !user) {
      // Tenta extrair um session_id do token JWT
      try {
        const [, payloadB64] = token.split(".");
        const payloadJSON = new TextDecoder().decode(Uint8Array.from(atob(payloadB64), c => c.charCodeAt(0)));
        const payload = JSON.parse(payloadJSON);
        const sessionId = payload?.session_id ?? '[N/A]';
        console.error('[EDGE_FN][DEBUG] Token payload session_id:', sessionId);
      } catch (e) {
        console.error('[EDGE_FN][DEBUG] Não foi possível decodificar JWT para session_id.');
      }
      auditLog("INVALID_TOKEN", "unknown", {
        error: authError?.message,
        dica: "O token pode estar expirado ou revogado. Por favor, faça login novamente antes de tentar apagar o usuário."
      });
      return new Response(JSON.stringify({
        success: false,
        error:
          "Token inválido, expirado ou sessão não encontrada. " +
          "Se você é admin, tente sair e entrar novamente antes de apagar usuários. " +
          "[DEBUG: " + (authError?.message || "Sem detalhes") + " ]"
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Pega o body da request
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
      .select('id, nome, email, instance_name')
      .eq('id', targetUserId)
      .maybeSingle();

    if (profileError || !targetProfile) {
      auditLog("DELETE_NONEXISTENT_USER", user.id, { target: targetUserId });
      return new Response(JSON.stringify({ success: false, error: "Usuário não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Nova etapa: Deletar instância na Evolution API (se existir)
    try {
      if (targetProfile.instance_name) {
        const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");
        const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");
        if (evolutionApiUrl && evolutionApiKey) {
          const cleanApiUrl = evolutionApiUrl.replace(/\/$/, '');
          // Faz requisição para deletar a instância do usuário na Evolution API
          const deleteInstanceRes = await fetch(`${cleanApiUrl}/instance/delete/${targetProfile.instance_name}`, {
            method: 'GET',
            headers: { 'apikey': evolutionApiKey }
          });
          auditLog("DELETE_EVOLUTION_INSTANCE", user.id, {
            target_user: targetUserId,
            evolution_instance: targetProfile.instance_name,
            http_status: deleteInstanceRes.status
          });
          if (!deleteInstanceRes.ok) {
            const delErr = await deleteInstanceRes.text();
            console.error('[EDGE_FN][DELETE-USER] Falha ao remover instancia da Evolution API:', delErr);
          }
        } else {
          console.warn('[EDGE_FN][DELETE-USER] Variáveis EVOLUTION_API_URL ou EVOLUTION_API_KEY não configuradas.');
        }
      }
    } catch (evoErr) {
      auditLog("DELETE_EVOLUTION_INSTANCE_ERROR", user.id, {
        evolution_instance: targetProfile.instance_name,
        error: evoErr.message
      });
      // Não impedir deleção do usuário se falhar a deleção da instance, apenas logar
      console.error('[EDGE_FN][DELETE-USER] Erro ao deletar instance na evolution API:', evoErr);
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
