// ABOUTME: Edge function para desconectar o Google Calendar
// ABOUTME: Remove tokens e limpa dados de calendários do usuário

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { userId } = await req.json()
    
    if (!userId) {
      throw new Error('User ID é obrigatório')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Busca o refresh token para revogar no Google
    const { data: profile } = await supabase
      .from('profiles')
      .select('google_calendar_refresh_token')
      .eq('id', userId)
      .single()

    // Revoga o token no Google se existir
    if (profile?.google_calendar_refresh_token) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${profile.google_calendar_refresh_token}`, {
          method: 'POST',
        })
      } catch (error) {
        console.log('Erro ao revogar token no Google (continuando):', error)
      }
    }

    // Remove os dados do Google Calendar do perfil
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        google_calendar_token: null,
        google_calendar_refresh_token: null,
        google_calendar_connected: false,
        default_calendar_id: null,
        calendar_preferences: {},
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (profileError) {
      throw profileError
    }

    // Remove todos os calendários do usuário
    const { error: calendarsError } = await supabase
      .from('user_calendars')
      .delete()
      .eq('user_id', userId)

    if (calendarsError) {
      throw calendarsError
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Google Calendar desconectado com sucesso' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Erro em google-calendar-disconnect:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})