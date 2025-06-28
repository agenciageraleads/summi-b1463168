
-- FASE 1: Correções Críticas de RLS - Habilitar e Forçar RLS em todas as tabelas

-- 1. Habilitar RLS nas tabelas que estão desabilitadas
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- 2. FORÇAR RLS para garantir que as políticas sejam sempre aplicadas
ALTER TABLE public.chats FORCE ROW LEVEL SECURITY;
ALTER TABLE public.feedback FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers FORCE ROW LEVEL SECURITY;

-- 3. Limpar políticas duplicadas e recriar com nomes consistentes
-- Remover todas as políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Users can view their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can insert their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can update their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can delete their own chats" ON public.chats;
DROP POLICY IF EXISTS "users_can_view_own_chats" ON public.chats;
DROP POLICY IF EXISTS "users_can_insert_own_chats" ON public.chats;
DROP POLICY IF EXISTS "users_can_update_own_chats" ON public.chats;
DROP POLICY IF EXISTS "users_can_delete_own_chats" ON public.chats;
DROP POLICY IF EXISTS "users_can_select_own_chats" ON public.chats;

-- Recriar políticas para chats com nomes únicos
CREATE POLICY "chats_select_own" ON public.chats
  FOR SELECT USING (id_usuario = auth.uid());

CREATE POLICY "chats_insert_own" ON public.chats
  FOR INSERT WITH CHECK (id_usuario = auth.uid());

CREATE POLICY "chats_update_own" ON public.chats
  FOR UPDATE USING (id_usuario = auth.uid());

CREATE POLICY "chats_delete_own" ON public.chats
  FOR DELETE USING (id_usuario = auth.uid());

-- 4. Corrigir políticas para feedback
DROP POLICY IF EXISTS "users_can_view_own_feedback" ON public.feedback;
DROP POLICY IF EXISTS "users_can_insert_feedback" ON public.feedback;
DROP POLICY IF EXISTS "users_can_update_own_feedback" ON public.feedback;
DROP POLICY IF EXISTS "users_can_delete_own_feedback" ON public.feedback;

CREATE POLICY "feedback_select_own" ON public.feedback
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "feedback_insert_own" ON public.feedback
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "feedback_update_own" ON public.feedback
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "feedback_delete_own" ON public.feedback
  FOR DELETE USING (user_id = auth.uid());

-- 5. Corrigir políticas para profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "users_can_delete_own_profile" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE USING (id = auth.uid());

-- 6. Corrigir políticas para subscribers
DROP POLICY IF EXISTS "users_can_view_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "edge_functions_can_manage_subscriptions" ON public.subscribers;

CREATE POLICY "subscribers_select_own" ON public.subscribers
  FOR SELECT USING (user_id = auth.uid());

-- Política especial para Edge Functions com service role
CREATE POLICY "subscribers_service_role_manage" ON public.subscribers
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 7. Adicionar políticas para tabelas administrativas
ALTER TABLE public.admin_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_announcements FORCE ROW LEVEL SECURITY;

CREATE POLICY "admin_announcements_admin_only" ON public.admin_announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

ALTER TABLE public.announcement_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_deliveries FORCE ROW LEVEL SECURITY;

CREATE POLICY "announcement_deliveries_admin_only" ON public.announcement_deliveries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 8. Adicionar constraint para tornar user_id obrigatório onde necessário
ALTER TABLE public.feedback ALTER COLUMN user_id SET NOT NULL;

-- 9. Adicionar função para validação segura de telefone brasileiro
CREATE OR REPLACE FUNCTION public.validate_brazilian_phone(phone_number text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Remove todos os caracteres não numéricos
  phone_number := regexp_replace(phone_number, '[^0-9]', '', 'g');
  
  -- Verifica formato brasileiro: 55 + DDD (2 dígitos) + número (8-9 dígitos)
  RETURN phone_number ~ '^55[1-9][1-9][0-9]{8,9}$';
END;
$$;

-- 10. Adicionar função para gerar nomes de instância seguros
CREATE OR REPLACE FUNCTION public.generate_secure_instance_name(user_nome text, user_numero text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  clean_name text;
  random_suffix text;
  instance_name text;
BEGIN
  -- Limpar e truncar nome
  clean_name := lower(regexp_replace(
    translate(user_nome, 
      'áàâãäéèêëíìîïóòôõöúùûüçñ', 
      'aaaaaeeeeiiiioooooouuuucn'
    ), 
    '[^a-z0-9]', '', 'g'
  ));
  clean_name := substring(clean_name from 1 for 8);
  
  -- Gerar sufixo aleatório criptograficamente seguro
  random_suffix := encode(gen_random_bytes(4), 'hex');
  
  -- Combinar nome limpo + sufixo aleatório
  instance_name := clean_name || '_' || random_suffix;
  
  RETURN instance_name;
END;
$$;
