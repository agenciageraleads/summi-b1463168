-- Migration: tabelas de rastreamento de custo por usuário (admin-only)
-- Feature 4: Track Costs Per User
-- Tracking de custos OpenAI (transcrição, análise, resumo, TTS) + Stripe fee.

-- Tabela de custo diário agregado por usuário
CREATE TABLE IF NOT EXISTS public.user_costs (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date         DATE NOT NULL,

  -- Custo OpenAI por operação (USD)
  transcription_cost_usd  DECIMAL(12, 8) NOT NULL DEFAULT 0,
  analysis_cost_usd       DECIMAL(12, 8) NOT NULL DEFAULT 0,
  summary_cost_usd        DECIMAL(12, 8) NOT NULL DEFAULT 0,
  tts_cost_usd            DECIMAL(12, 8) NOT NULL DEFAULT 0,

  -- Totais
  cost_openai_usd  DECIMAL(12, 8) NOT NULL DEFAULT 0,
  cost_total_usd   DECIMAL(12, 8) NOT NULL DEFAULT 0,

  -- Métricas de volume
  call_count    INT NOT NULL DEFAULT 0,
  tokens_used   BIGINT NOT NULL DEFAULT 0,
  audio_minutes DECIMAL(10, 4) NOT NULL DEFAULT 0,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_user_costs_user_date ON public.user_costs (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_user_costs_date ON public.user_costs (date DESC);

-- RLS: apenas service role (sem exposição ao usuário final)
ALTER TABLE public.user_costs ENABLE ROW LEVEL SECURITY;

-- Admins e service role podem ver tudo
CREATE POLICY "service_role_all_user_costs"
  ON public.user_costs
  FOR ALL
  USING (auth.role() = 'service_role');


-- Tabela de log detalhado de custo por operação (para auditoria/debugging)
CREATE TABLE IF NOT EXISTS public.cost_logs (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  operation  TEXT NOT NULL,  -- 'transcribe', 'analyze', 'summary', 'tts'
  model      TEXT,
  cost_usd   DECIMAL(12, 8) NOT NULL DEFAULT 0,

  -- Detalhes opcionais
  tokens_input   INT,
  tokens_output  INT,
  tokens_total   INT,
  audio_seconds  DECIMAL(10, 2),
  char_count     INT
);

CREATE INDEX IF NOT EXISTS idx_cost_logs_user ON public.cost_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cost_logs_date ON public.cost_logs (created_at DESC);

-- RLS: apenas service role
ALTER TABLE public.cost_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_cost_logs"
  ON public.cost_logs
  FOR ALL
  USING (auth.role() = 'service_role');
