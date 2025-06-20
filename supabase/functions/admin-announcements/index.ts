
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!supabaseServiceKey || !supabaseUrl) {
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor não encontrada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '');

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autorização necessário' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se é admin
    const { data: isAdminResult } = await supabaseAdmin.rpc('is_admin', { user_id: user.id });
    if (!isAdminResult) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, ...body } = await req.json();

    if (action === 'create') {
      const { title, message, send_via_whatsapp, send_via_email } = body;

      // Criar anúncio
      const { data: announcement, error } = await supabaseAdmin
        .from('admin_announcements')
        .insert({
          title,
          message,
          send_via_whatsapp: send_via_whatsapp || false,
          send_via_email: send_via_email || false,
          created_by: user.id,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, announcement }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'send') {
      const { announcement_id } = body;

      // Buscar anúncio
      const { data: announcement, error: announcementError } = await supabaseAdmin
        .from('admin_announcements')
        .select('*')
        .eq('id', announcement_id)
        .single();

      if (announcementError || !announcement) {
        return new Response(
          JSON.stringify({ error: 'Anúncio não encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Buscar todos os usuários ativos
      const { data: users, error: usersError } = await supabaseAdmin
        .from('profiles')
        .select('id, email, numero, instance_name')
        .not('email', 'is', null);

      if (usersError) throw usersError;

      // Atualizar status para 'sending'
      await supabaseAdmin
        .from('admin_announcements')
        .update({ 
          status: 'sending',
          recipients_count: users.length,
          sent_at: new Date().toISOString()
        })
        .eq('id', announcement_id);

      let sentCount = 0;
      let failedCount = 0;

      // Enviar para cada usuário
      for (const targetUser of users) {
        // Email
        if (announcement.send_via_email && targetUser.email) {
          try {
            // Aqui você integraria com seu provedor de email
            // Por enquanto, apenas registramos a tentativa
            await supabaseAdmin
              .from('announcement_deliveries')
              .insert({
                announcement_id,
                user_id: targetUser.id,
                delivery_method: 'email',
                status: 'sent',
                sent_at: new Date().toISOString()
              });
            sentCount++;
          } catch (error) {
            await supabaseAdmin
              .from('announcement_deliveries')
              .insert({
                announcement_id,
                user_id: targetUser.id,
                delivery_method: 'email',
                status: 'failed',
                error_message: error.message
              });
            failedCount++;
          }
        }

        // WhatsApp
        if (announcement.send_via_whatsapp && targetUser.numero && targetUser.instance_name) {
          try {
            // Aqui você integraria com a Evolution API para enviar mensagem
            // Por enquanto, apenas registramos a tentativa
            await supabaseAdmin
              .from('announcement_deliveries')
              .insert({
                announcement_id,
                user_id: targetUser.id,
                delivery_method: 'whatsapp',
                status: 'sent',
                sent_at: new Date().toISOString()
              });
            sentCount++;
          } catch (error) {
            await supabaseAdmin
              .from('announcement_deliveries')
              .insert({
                announcement_id,
                user_id: targetUser.id,
                delivery_method: 'whatsapp',
                status: 'failed',
                error_message: error.message
              });
            failedCount++;
          }
        }
      }

      // Atualizar estatísticas finais
      await supabaseAdmin
        .from('admin_announcements')
        .update({
          status: 'sent',
          sent_count: sentCount,
          failed_count: failedCount
        })
        .eq('id', announcement_id);

      return new Response(
        JSON.stringify({
          success: true,
          sent_count: sentCount,
          failed_count: failedCount
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'list') {
      const { data: announcements, error } = await supabaseAdmin
        .from('admin_announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, announcements }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Ação não reconhecida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ADMIN-ANNOUNCEMENTS] Erro:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
