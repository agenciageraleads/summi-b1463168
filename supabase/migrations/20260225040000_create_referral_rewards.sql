create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  reward_key text not null unique,
  referrer_user_id uuid not null references public.profiles(id) on delete cascade,
  referred_user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  reward_type text not null,
  reward_days integer not null check (reward_days > 0),
  source_event text,
  created_at timestamptz not null default now()
);

create index if not exists idx_referral_rewards_referrer_user_id
  on public.referral_rewards(referrer_user_id);

create index if not exists idx_referral_rewards_referred_user_id
  on public.referral_rewards(referred_user_id);

create index if not exists idx_referral_rewards_stripe_subscription_id
  on public.referral_rewards(stripe_subscription_id);

alter table public.referral_rewards enable row level security;

-- leitura só via backend/service-role por enquanto (sem policy pública)
