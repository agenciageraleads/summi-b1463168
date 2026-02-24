// ABOUTME: Edge function para iniciar o fluxo OAuth do Google Calendar
// ABOUTME: Gera URL de autorização e redireciona o usuário para o Google

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    if (!clientId) {
      throw new Error('GOOGLE_CLIENT_ID não configurado')
    }

    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-calendar-callback`
    
    // Parâmetros para o OAuth do Google Calendar
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
      access_type: 'offline',
      prompt: 'consent',
      state: userId, // Passamos o userId no state para identificar o usuário no callback
    })

    const authUrl = `https://accounts.google.com/o/oauth2/auth?${params.toString()}`

    return new Response(
      JSON.stringify({ authUrl }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Erro em google-calendar-auth:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})