-- Migration: Add metrics and frequency configuration to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS total_segundos_audio BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_mensagens_analisadas BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_conversas_priorizadas BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS summi_frequencia TEXT DEFAULT '1h',
ADD COLUMN IF NOT EXISTS ultimo_summi_em TIMESTAMPTZ;

-- Comentários para documentação
COMMENT ON COLUMN public.profiles.total_segundos_audio IS 'Total acumulado de segundos de áudio processados';
COMMENT ON COLUMN public.profiles.total_mensagens_analisadas IS 'Total acumulado de mensagens analisadas pela IA';
COMMENT ON COLUMN public.profiles.total_conversas_priorizadas IS 'Total acumulado de conversas marcadas como importantes ou urgentes';
COMMENT ON COLUMN public.profiles.summi_frequencia IS 'Frequência de envio do relatório Summi (ex: 1h, 3h, 6h, 12h, 24h)';
COMMENT ON COLUMN public.profiles.ultimo_summi_em IS 'Data e hora do último envio de relatório Summi realizado com sucesso';

-- Função para incremento atômico de métricas
CREATE OR REPLACE FUNCTION increment_profile_metrics(
  target_user_id UUID,
  inc_audio_segundos BIGINT DEFAULT 0,
  inc_mensagens_analisadas BIGINT DEFAULT 0,
  inc_conversas_priorizadas BIGINT DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET 
    total_segundos_audio = COALESCE(total_segundos_audio, 0) + inc_audio_segundos,
    total_mensagens_analisadas = COALESCE(total_mensagens_analisadas, 0) + inc_mensagens_analisadas,
    total_conversas_priorizadas = COALESCE(total_conversas_priorizadas, 0) + inc_conversas_priorizadas
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
