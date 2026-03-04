-- Migration: adiciona coluna para rastrear último resumo diário enviado
-- Feature 2: Daily Summary Job (19:00 UTC)
-- O job diário é independente do job horário e envia resumo das conversas pendentes.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ultimo_summi_diario_em TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.profiles.ultimo_summi_diario_em IS
  'Timestamp do último resumo diário enviado (job 19:00 UTC). Evita envio duplo no mesmo dia.';

CREATE INDEX IF NOT EXISTS idx_profiles_ultimo_summi_diario
  ON public.profiles (ultimo_summi_diario_em);
