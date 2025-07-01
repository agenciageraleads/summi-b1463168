
// ABOUTME: Edge Function para deletar conta de usuário com sequência transacional correta
// ABOUTME: Implementa ordem segura: Evolution API → Dados Supabase → Auth Users

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Token de autorização obrigatório' 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseServiceRole = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: "Token inválido ou sessão expirada"
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Buscar dados do usuário
    const { data: profile, error: profileError } = await supabaseServiceRole
      .from('profiles')
      .select('instance_name, nome, email')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Perfil não encontrado" 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // **CORREÇÃO CRÍTICA: Sequência Transacional Correta**
    
    // 1º) Deletar instância na Evolution API (se existir)
    if (profile.instance_name) {
      try {
        const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");
        const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");
        
        if (evolutionApiUrl && evolutionApiKey) {
          const cleanApiUrl = evolutionApiUrl.replace(/\/$/, '');
          const deleteInstanceResponse = await fetch(`${cleanApiUrl}/instance/delete/${profile.instance_name}`, {
            method: 'DELETE',
            headers: { 'apikey': evolutionApiKey }
          });
          
          // Aceitar tanto sucesso (200) quanto não encontrado (404)
          if (!deleteInstanceResponse.ok && deleteInstanceResponse.status !== 404) {
            throw new Error(`Falha ao deletar instância: ${deleteInstanceResponse.status}`);
          }
          
          console.log(`Instância ${profile.instance_name} deletada da Evolution API`);
        }
      } catch (evolutionError) {
        console.error('Erro ao deletar instância Evolution:', evolutionError);
        return new Response(JSON.stringify({
          success: false,
          error: 'Erro ao deletar instância WhatsApp'
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // 2º) Deletar dados relacionados do Supabase (SOMENTE se Evolution API foi bem-sucedida)
    try {
      // Deletar chats
      await supabaseServiceRole.from('chats').delete().eq('id_usuario', user.id);
      
      // Deletar feedback
      await supabaseServiceRole.from('feedback').delete().eq('user_id', user.id);
      
      // Deletar assinatura
      await supabaseServiceRole.from('subscribers').delete().eq('user_id', user.id);
      
      // Deletar perfil
      await supabaseServiceRole.from('profiles').delete().eq('id', user.id);
      
      console.log(`Dados do usuário ${user.id} deletados do Supabase`);
      
    } catch (supabaseError) {
      console.error('Erro ao deletar dados Supabase:', supabaseError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Erro ao deletar dados da conta'
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 3º) Deletar usuário do Auth (SOMENTE se Supabase foi bem-sucedido)
    try {
      const { error: deleteAuthError } = await supabaseServiceRole.auth.admin.deleteUser(user.id);
      
      if (deleteAuthError) {
        throw new Error(`Erro ao deletar usuário da autenticação: ${deleteAuthError.message}`);
      }
      
      console.log(`Usuário ${user.id} deletado do Auth`);
      
    } catch (authDeleteError) {
      console.error('Erro ao deletar usuário Auth:', authDeleteError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Erro ao deletar conta de usuário'
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Conta deletada com sucesso" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('Erro inesperado:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Erro interno do servidor" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
