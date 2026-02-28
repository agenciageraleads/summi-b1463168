
-- Create feedback table
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('avaliacao', 'sugestao', 'bug')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_analise', 'resolvido'))
);

-- Create subscribers table for Stripe integration
CREATE TABLE public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  plan_type TEXT CHECK (plan_type IN ('monthly', 'annual')),
  subscription_start TIMESTAMPTZ,
  subscription_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Create policies for feedback
CREATE POLICY "users_can_view_own_feedback" ON public.feedback
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_can_insert_feedback" ON public.feedback
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create policies for subscribers
CREATE POLICY "users_can_view_own_subscription" ON public.subscribers
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "edge_functions_can_manage_subscriptions" ON public.subscribers
  FOR ALL USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_subscribers_updated_at
  BEFORE UPDATE ON public.subscribers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
