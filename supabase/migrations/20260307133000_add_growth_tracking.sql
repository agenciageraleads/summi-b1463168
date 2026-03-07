CREATE TABLE IF NOT EXISTS public.growth_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key text UNIQUE,
  lead_key text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  plan_context text,
  source text,
  medium text,
  campaign text,
  content text,
  term text,
  referral_code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_growth_events_occurred_at
  ON public.growth_events (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_growth_events_event_type
  ON public.growth_events (event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_growth_events_user_id
  ON public.growth_events (user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_growth_events_lead_key
  ON public.growth_events (lead_key, occurred_at DESC);

ALTER TABLE public.growth_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_growth_events" ON public.growth_events;
CREATE POLICY "service_role_all_growth_events"
  ON public.growth_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.marketing_spend_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_start date NOT NULL,
  channel text NOT NULL,
  source text,
  amount_brl numeric(12,2) NOT NULL CHECK (amount_brl >= 0),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketing_spend_entries_unique
  ON public.marketing_spend_entries (month_start, channel, COALESCE(source, ''));

CREATE INDEX IF NOT EXISTS idx_marketing_spend_entries_month
  ON public.marketing_spend_entries (month_start DESC);

ALTER TABLE public.marketing_spend_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_marketing_spend_entries" ON public.marketing_spend_entries;
CREATE POLICY "service_role_all_marketing_spend_entries"
  ON public.marketing_spend_entries
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_marketing_spend_entries_updated_at ON public.marketing_spend_entries;
CREATE TRIGGER update_marketing_spend_entries_updated_at
  BEFORE UPDATE ON public.marketing_spend_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
