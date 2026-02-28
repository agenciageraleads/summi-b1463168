WITH audio_totals AS (
  SELECT
    c.id_usuario AS user_id,
    SUM(
      COALESCE(
        CASE
          WHEN COALESCE(evt #>> '{raw,body,data,message,audioMessage,seconds}', '') ~ '^[0-9]+(\.[0-9]+)?$'
            THEN FLOOR((evt #>> '{raw,body,data,message,audioMessage,seconds}')::numeric)::bigint
        END,
        CASE
          WHEN COALESCE(evt #>> '{raw,data,message,audioMessage,seconds}', '') ~ '^[0-9]+(\.[0-9]+)?$'
            THEN FLOOR((evt #>> '{raw,data,message,audioMessage,seconds}')::numeric)::bigint
        END,
        CASE
          WHEN COALESCE(evt #>> '{raw,message,audioMessage,seconds}', '') ~ '^[0-9]+(\.[0-9]+)?$'
            THEN FLOOR((evt #>> '{raw,message,audioMessage,seconds}')::numeric)::bigint
        END,
        CASE
          WHEN COALESCE(evt #>> '{raw,body,data,message,audioMessage,duration}', '') ~ '^[0-9]+(\.[0-9]+)?$'
            THEN FLOOR((evt #>> '{raw,body,data,message,audioMessage,duration}')::numeric)::bigint
        END,
        CASE
          WHEN COALESCE(evt #>> '{raw,data,message,audioMessage,duration}', '') ~ '^[0-9]+(\.[0-9]+)?$'
            THEN FLOOR((evt #>> '{raw,data,message,audioMessage,duration}')::numeric)::bigint
        END,
        CASE
          WHEN COALESCE(evt #>> '{raw,message,audioMessage,duration}', '') ~ '^[0-9]+(\.[0-9]+)?$'
            THEN FLOOR((evt #>> '{raw,message,audioMessage,duration}')::numeric)::bigint
        END,
        0
      )
    ) AS total_seconds
  FROM public.chats AS c
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(COALESCE(c.conversa, '[]'::jsonb)) = 'array' THEN COALESCE(c.conversa, '[]'::jsonb)
      ELSE '[]'::jsonb
    END
  ) AS evt
  GROUP BY c.id_usuario
)
UPDATE public.profiles AS p
SET total_segundos_audio = GREATEST(COALESCE(p.total_segundos_audio, 0), COALESCE(a.total_seconds, 0))
FROM audio_totals AS a
WHERE p.id = a.user_id;
