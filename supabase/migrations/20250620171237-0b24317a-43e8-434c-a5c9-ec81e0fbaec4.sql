
-- Criar tabela para cachear grupos WhatsApp
CREATE TABLE public.whatsapp_groups_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL,
  group_name TEXT NOT NULL,
  participants_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, group_id)
);

-- Habilitar RLS na tabela de cache de grupos
ALTER TABLE public.whatsapp_groups_cache ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para cache de grupos
CREATE POLICY "Users can view their own cached groups" 
  ON public.whatsapp_groups_cache 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cached groups" 
  ON public.whatsapp_groups_cache 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cached groups" 
  ON public.whatsapp_groups_cache 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cached groups" 
  ON public.whatsapp_groups_cache 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Criar tabela para anúncios administrativos
CREATE TABLE public.admin_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  send_via_whatsapp BOOLEAN DEFAULT false,
  send_via_email BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
  recipients_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0
);

-- Habilitar RLS na tabela de anúncios
ALTER TABLE public.admin_announcements ENABLE ROW LEVEL SECURITY;

-- Política para permitir apenas admins gerenciarem anúncios
CREATE POLICY "Only admins can manage announcements" 
  ON public.admin_announcements 
  FOR ALL 
  USING (public.is_admin(auth.uid()));

-- Criar tabela para rastrear envio de anúncios por usuário
CREATE TABLE public.announcement_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES public.admin_announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('email', 'whatsapp')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  UNIQUE(announcement_id, user_id, delivery_method)
);

-- Habilitar RLS na tabela de entregas
ALTER TABLE public.announcement_deliveries ENABLE ROW LEVEL SECURITY;

-- Política para permitir apenas admins visualizarem entregas
CREATE POLICY "Only admins can view deliveries" 
  ON public.announcement_deliveries 
  FOR ALL 
  USING (public.is_admin(auth.uid()));

-- Criar índices para performance
CREATE INDEX idx_whatsapp_groups_cache_user_id ON public.whatsapp_groups_cache(user_id);
CREATE INDEX idx_whatsapp_groups_cache_last_updated ON public.whatsapp_groups_cache(last_updated);
CREATE INDEX idx_admin_announcements_status ON public.admin_announcements(status);
CREATE INDEX idx_announcement_deliveries_announcement_id ON public.announcement_deliveries(announcement_id);
CREATE INDEX idx_announcement_deliveries_status ON public.announcement_deliveries(status);
