// ABOUTME: Edge function para processar o callback do OAuth do Google Calendar
// ABOUTME: Troca o código de autorização pelos tokens e salva no banco

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
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state') // Este é o userId
    const error = url.searchParams.get('error')

    if (error) {
      console.error('Erro do Google OAuth:', error)
      return new Response(
        `<html><body><script>window.close();</script><p>Erro na autorização: ${error}</p></body></html>`,
        { headers: { 'Content-Type': 'text/html' }, status: 400 }
      )
    }

    if (!code || !state) {
      throw new Error('Código de autorização ou state ausente')
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-calendar-callback`

    if (!clientId || !clientSecret) {
      throw new Error('Credenciais do Google não configuradas')
    }

    // Troca o código pelos tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      throw new Error(`Erro ao trocar código por tokens: ${errorData}`)
    }

    const tokens = await tokenResponse.json()
    const { access_token, refresh_token } = tokens

    if (!refresh_token) {
      throw new Error('Refresh token não recebido. Usuário pode já ter autorizado antes.')
    }

    // Salva os tokens no banco
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        google_calendar_token: access_token,
        google_calendar_refresh_token: refresh_token,
        google_calendar_connected: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', state)

    if (updateError) {
      console.error('Erro ao salvar tokens:', updateError)
      throw updateError
    }

    // Busca e salva as calendários do usuário
    const calendarsResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      }
    )

    if (calendarsResponse.ok) {
      const calendarsData = await calendarsResponse.json()
      const calendars = calendarsData.items || []

      // Salva os calendários na tabela user_calendars
      for (const calendar of calendars) {
        await supabase
          .from('user_calendars')
          .upsert({
            user_id: state,
            calendar_id: calendar.id,
            calendar_name: calendar.summary,
            color: calendar.backgroundColor || '#4285f4',
            is_enabled: calendar.selected || false,
            is_default: calendar.primary || false,
          }, {
            onConflict: 'user_id,calendar_id'
          })
      }

      // Define o calendário principal como padrão se não houver nenhum
      const primaryCalendar = calendars.find((c: any) => c.primary)
      if (primaryCalendar) {
        await supabase
          .from('profiles')
          .update({
            default_calendar_id: primaryCalendar.id
          })
          .eq('id', state)
      }
    }

    // Fecha a janela de popup e notifica o pai
    return new Response(
      `<html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_CALENDAR_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/configuracoes?google_calendar=success';
            }
          </script>
          <p>Autorização concluída! Fechando janela...</p>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  } catch (error) {
    console.error('Erro em google-calendar-callback:', error)
    return new Response(
      `<html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_CALENDAR_ERROR', error: '${(error as Error).message}' }, '*');
              window.close();
            } else {
              window.location.href = '/configuracoes?google_calendar=error';
            }
          </script>
          <p>Erro na autorização: ${(error as Error).message}</p>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' }, status: 500 }
    )
  }
})