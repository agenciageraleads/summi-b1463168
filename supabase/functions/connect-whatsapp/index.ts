
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[CONNECT-WHATSAPP] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("🚀 Iniciando processo de conexão WhatsApp");

    // 1. Autenticação e obtenção do perfil
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      logStep("❌ Erro de autenticação", authError);
      return new Response(
        JSON.stringify({ error: 'unauthorized' }),
        { status: 401, headers: corsHeaders }
      );
    }

    logStep("✅ Usuário autenticado", { userId: user.id });

    // 2. Obter perfil do usuário
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('numero')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      logStep("❌ Erro ao obter perfil", profileError);
      return new Response(
        JSON.stringify({ error: 'profile_not_found' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 3. Verificar se o número está preenchido
    if (!profile.numero) {
      logStep("❌ Número de telefone não configurado");
      return new Response(
        JSON.stringify({ error: 'phone_number_required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    logStep("📱 Número encontrado", { numero: profile.numero });

    // 4. Construir nome da instância
    const instanceName = `summi_${user.id}`;
    logStep("🏷️ Nome da instância gerado", { instanceName });

    // 5. Configurações da API Evolution
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');

    if (!evolutionApiUrl || !evolutionApiKey) {
      logStep("❌ Configurações da Evolution API ausentes");
      return new Response(
        JSON.stringify({ error: 'evolution_api_config_missing' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // 6. Verificar status da instância existente
    logStep("🔍 Verificando instância existente");
    const fetchResponse = await fetch(`${evolutionApiUrl}/instance/fetch/${instanceName}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
    });

    const fetchStatus = fetchResponse.status;
    logStep("📊 Status da verificação", { status: fetchStatus });

    if (fetchStatus === 404) {
      // Instância não existe - criar nova
      logStep("🔧 Criando nova instância");
      
      const createPayload = {
        instanceName: instanceName,
        number: profile.numero,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
        webhook: {
          url: "https://webhookn8n.gera-leads.com/webhook/whatsapp",
          byEvents: false,
          base64: true,
          headers: {
            "Content-Type": "application/json"
          },
          events: [
            "MESSAGES_UPSERT"
          ]
        },
        settings: {
          reject_call: false,
          msg_call: "",
          groups_ignore: true,
          always_online: false,
          read_messages: false,
          read_status: false
        }
      };

      const createResponse = await fetch(`${evolutionApiUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApiKey,
        },
        body: JSON.stringify(createPayload),
      });

      if (!createResponse.ok) {
        const createError = await createResponse.text();
        logStep("❌ Erro ao criar instância", { error: createError });
        return new Response(
          JSON.stringify({ error: 'instance_creation_failed', details: createError }),
          { status: 500, headers: corsHeaders }
        );
      }

      const createData = await createResponse.json();
      logStep("✅ Instância criada", { 
        hasQrcode: !!createData.qrcode, 
        hasPairingCode: !!createData.qrcode?.pairingCode 
      });

      // Atualizar perfil com nome da instância
      await supabaseClient
        .from('profiles')
        .update({ instance_name: instanceName })
        .eq('id', user.id);

      return new Response(
        JSON.stringify({
          status: 'awaiting_pairing',
          instanceName: instanceName,
          pairingCode: createData.qrcode?.pairingCode || null,
          qrBase64: createData.qrcode?.base64 || null,
        }),
        { status: 200, headers: corsHeaders }
      );

    } else if (fetchResponse.ok) {
      const instanceData = await fetchResponse.json();
      logStep("📋 Dados da instância existente", { status: instanceData.instance?.state });

      if (instanceData.instance?.state === 'open') {
        // Já conectado
        logStep("✅ Instância já conectada");
        return new Response(
          JSON.stringify({ status: 'already_connected' }),
          { status: 200, headers: corsHeaders }
        );
      } else {
        // Instância existe mas não conectada - aguardando pareamento
        logStep("⏳ Instância aguardando pareamento");
        return new Response(
          JSON.stringify({
            status: 'awaiting_pairing',
            instanceName: instanceName,
            pairingCode: instanceData.instance?.pairingCode,
            qrBase64: instanceData.instance?.qrcode?.base64 || null,
          }),
          { status: 200, headers: corsHeaders }
        );
      }
    } else {
      // Erro na verificação
      const fetchError = await fetchResponse.text();
      logStep("❌ Erro ao verificar instância", { error: fetchError });
      return new Response(
        JSON.stringify({ error: 'instance_fetch_failed', details: fetchError }),
        { status: 500, headers: corsHeaders }
      );
    }

  } catch (error) {
    logStep("❌ Erro inesperado", error);
    return new Response(
      JSON.stringify({ error: 'internal_server_error', details: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
