// ABOUTME: Edge function para sincronizar calendários do Google Calendar
// ABOUTME: Atualiza lista de calendários e renova tokens quando necessário

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

    // Busca o perfil do usuário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('google_calendar_token, google_calendar_refresh_token, google_calendar_connected')
      .eq('id', userId)
      .single()

    if (profileError) {
      throw new Error('Usuário não encontrado')
    }

    if (!profile.google_calendar_connected) {
      throw new Error('Google Calendar não conectado')
    }

    let accessToken = profile.google_calendar_token

    // Função para renovar o token se necessário
    const renewTokenIfNeeded = async () => {
      if (!profile.google_calendar_refresh_token) {
        throw new Error('Refresh token não disponível')
      }

      const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: profile.google_calendar_refresh_token,
          client_id: clientId!,
          client_secret: clientSecret!,
          grant_type: 'refresh_token',
        }),
      })

      if (!refreshResponse.ok) {
        throw new Error('Erro ao renovar token')
      }

      const tokens = await refreshResponse.json()
      accessToken = tokens.access_token

      // Atualiza o token no banco
      await supabase
        .from('profiles')
        .update({
          google_calendar_token: accessToken,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      return accessToken
    }

    // Tenta buscar os calendários
    let calendarsResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    )

    // Se o token expirou, renova e tenta novamente
    if (calendarsResponse.status === 401) {
      accessToken = await renewTokenIfNeeded()
      calendarsResponse = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      )
    }

    if (!calendarsResponse.ok) {
      throw new Error('Erro ao buscar calendários do Google')
    }

    const calendarsData = await calendarsResponse.json()
    const calendars = calendarsData.items || []

    // Atualiza/insere os calendários
    for (const calendar of calendars) {
      await supabase
        .from('user_calendars')
        .upsert({
          user_id: userId,
          calendar_id: calendar.id,
          calendar_name: calendar.summary,
          color: calendar.backgroundColor || '#4285f4',
          is_enabled: calendar.selected || false,
          is_default: calendar.primary || false,
        }, {
          onConflict: 'user_id,calendar_id'
        })
    }

    // Busca os calendários atualizados do banco
    const { data: userCalendars, error: calendarsError } = await supabase
      .from('user_calendars')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })

    if (calendarsError) {
      throw new Error('Erro ao buscar calendários do banco')
    }

    return new Response(
      JSON.stringify({ calendars: userCalendars }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Erro em google-calendar-sync:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})