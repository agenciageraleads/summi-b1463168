-- Consolidate duplicate subscriber rows per user and prevent new duplicates.

WITH ranked AS (
  SELECT
    id,
    user_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY subscribed DESC, created_at DESC, updated_at DESC, id DESC
    ) AS row_num
  FROM public.subscribers
  WHERE user_id IS NOT NULL
)
DELETE FROM public.subscribers s
USING ranked r
WHERE s.id = r.id
  AND r.row_num > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subscribers_user_id_key'
      AND conrelid = 'public.subscribers'::regclass
  ) THEN
    ALTER TABLE public.subscribers
    ADD CONSTRAINT subscribers_user_id_key UNIQUE (user_id);
  END IF;
END
$$;
