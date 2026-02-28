
-- Habilitar a extensão pg_cron para tarefas agendadas
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Habilitar a extensão pg_net para requisições HTTP
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar o cron job para verificar conexões WhatsApp a cada 2 horas
SELECT cron.schedule(
  'check-whatsapp-connections',
  '0 */2 * * *', -- A cada 2 horas
  $$
  SELECT
    net.http_post(
        url:='https://fuhdqxaiewdztzuxriho.supabase.co/functions/v1/check-connection-status',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1aGRxeGFpZXdkenR6dXhyaWhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2OTQ1NjcsImV4cCI6MjA2NTI3MDU2N30.T3EAHi3ayX_5MG93jr2n6HVXe_CLsEUh_udCfi441mo"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);
;
