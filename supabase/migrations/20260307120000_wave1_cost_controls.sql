-- Wave 1 cost controls:
-- - keep audio automations on for new users
-- - disable Summi em Audio globally for now
-- - add atomic daily cost increment RPC

ALTER TABLE public.profiles
  ALTER COLUMN resume_audio SET DEFAULT true;

ALTER TABLE public.profiles
  ALTER COLUMN segundos_para_resumir SET DEFAULT 90;

UPDATE public.profiles
SET "Summi em Audio?" = false
WHERE COALESCE("Summi em Audio?", false) IS DISTINCT FROM false;

CREATE OR REPLACE FUNCTION public.increment_user_cost(
  p_user_id uuid,
  p_date date,
  p_operation_col text,
  p_cost numeric,
  p_calls integer DEFAULT 0,
  p_tokens bigint DEFAULT 0,
  p_audio_minutes numeric DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_costs (
    user_id,
    date,
    transcription_cost_usd,
    analysis_cost_usd,
    summary_cost_usd,
    tts_cost_usd,
    cost_openai_usd,
    cost_total_usd,
    call_count,
    tokens_used,
    audio_minutes
  )
  VALUES (
    p_user_id,
    p_date,
    CASE WHEN p_operation_col = 'transcription_cost_usd' THEN COALESCE(p_cost, 0) ELSE 0 END,
    CASE WHEN p_operation_col = 'analysis_cost_usd' THEN COALESCE(p_cost, 0) ELSE 0 END,
    CASE WHEN p_operation_col = 'summary_cost_usd' THEN COALESCE(p_cost, 0) ELSE 0 END,
    CASE WHEN p_operation_col = 'tts_cost_usd' THEN COALESCE(p_cost, 0) ELSE 0 END,
    COALESCE(p_cost, 0),
    COALESCE(p_cost, 0),
    COALESCE(p_calls, 0),
    COALESCE(p_tokens, 0),
    COALESCE(p_audio_minutes, 0)
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    transcription_cost_usd = public.user_costs.transcription_cost_usd
      + CASE WHEN p_operation_col = 'transcription_cost_usd' THEN COALESCE(p_cost, 0) ELSE 0 END,
    analysis_cost_usd = public.user_costs.analysis_cost_usd
      + CASE WHEN p_operation_col = 'analysis_cost_usd' THEN COALESCE(p_cost, 0) ELSE 0 END,
    summary_cost_usd = public.user_costs.summary_cost_usd
      + CASE WHEN p_operation_col = 'summary_cost_usd' THEN COALESCE(p_cost, 0) ELSE 0 END,
    tts_cost_usd = public.user_costs.tts_cost_usd
      + CASE WHEN p_operation_col = 'tts_cost_usd' THEN COALESCE(p_cost, 0) ELSE 0 END,
    cost_openai_usd = public.user_costs.cost_openai_usd + COALESCE(p_cost, 0),
    cost_total_usd = public.user_costs.cost_total_usd + COALESCE(p_cost, 0),
    call_count = public.user_costs.call_count + COALESCE(p_calls, 0),
    tokens_used = public.user_costs.tokens_used + COALESCE(p_tokens, 0),
    audio_minutes = public.user_costs.audio_minutes + COALESCE(p_audio_minutes, 0),
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.increment_user_cost(uuid, date, text, numeric, integer, bigint, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_user_cost(uuid, date, text, numeric, integer, bigint, numeric) TO service_role;
