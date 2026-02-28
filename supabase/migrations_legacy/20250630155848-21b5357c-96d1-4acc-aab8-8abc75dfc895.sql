
-- CORREÇÃO 1: Políticas RLS corrigidas sem referências incorretas ao OLD

-- Para tabela chats - remover todas as políticas existentes primeiro
DROP POLICY IF EXISTS "chats_select_own_or_admin" ON public.chats;
DROP POLICY IF EXISTS "chats_insert_own" ON public.chats;
DROP POLICY IF EXISTS "chats_update_own_or_admin" ON public.chats;
DROP POLICY IF EXISTS "chats_delete_own_or_admin" ON public.chats;
DROP POLICY IF EXISTS "users_can_view_own_chats" ON public.chats;
DROP POLICY IF EXISTS "users_can_insert_own_chats" ON public.chats;
DROP POLICY IF EXISTS "users_can_update_own_chats" ON public.chats;
DROP POLICY IF EXISTS "users_can_delete_own_chats" ON public.chats;
DROP POLICY IF EXISTS "users_can_select_own_chats" ON public.chats;

-- Recriar políticas padronizadas para chats
CREATE POLICY "chats_select_own_or_admin" ON public.chats
  FOR SELECT 
  USING (
    id_usuario = auth.uid() OR 
    public.verify_admin_access(auth.uid())
  );

CREATE POLICY "chats_insert_own" ON public.chats
  FOR INSERT 
  WITH CHECK (id_usuario = auth.uid());

CREATE POLICY "chats_update_own_or_admin" ON public.chats
  FOR UPDATE 
  USING (
    id_usuario = auth.uid() OR 
    public.verify_admin_access(auth.uid())
  );

CREATE POLICY "chats_delete_own_or_admin" ON public.chats
  FOR DELETE 
  USING (
    id_usuario = auth.uid() OR 
    public.verify_admin_access(auth.uid())
  );

-- CORREÇÃO 2: Políticas para feedback
DROP POLICY IF EXISTS "feedback_select_own_or_admin" ON public.feedback;
DROP POLICY IF EXISTS "feedback_insert_own" ON public.feedback;
DROP POLICY IF EXISTS "feedback_update_own" ON public.feedback;
DROP POLICY IF EXISTS "feedback_delete_own_or_admin" ON public.feedback;
DROP POLICY IF EXISTS "users_can_view_own_feedback" ON public.feedback;
DROP POLICY IF EXISTS "users_can_insert_feedback" ON public.feedback;
DROP POLICY IF EXISTS "users_can_update_own_feedback" ON public.feedback;
DROP POLICY IF EXISTS "users_can_delete_own_feedback" ON public.feedback;

CREATE POLICY "feedback_select_own_or_admin" ON public.feedback
  FOR SELECT 
  USING (
    user_id = auth.uid() OR 
    public.verify_admin_access(auth.uid())
  );

CREATE POLICY "feedback_insert_own" ON public.feedback
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "feedback_update_own" ON public.feedback
  FOR UPDATE 
  USING (user_id = auth.uid());

CREATE POLICY "feedback_delete_own_or_admin" ON public.feedback
  FOR DELETE 
  USING (
    user_id = auth.uid() OR 
    public.verify_admin_access(auth.uid())
  );

-- CORREÇÃO 3: Políticas para profiles (SEM referência ao OLD)
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin_only" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "users_can_delete_own_profile" ON public.profiles;

CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT 
  USING (
    id = auth.uid() OR 
    public.verify_admin_access(auth.uid())
  );

-- Política de UPDATE mais restritiva - apenas admins podem alterar roles
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE 
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Política específica para admins alterarem qualquer perfil
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE 
  USING (public.verify_admin_access(auth.uid()))
  WITH CHECK (public.verify_admin_access(auth.uid()));

CREATE POLICY "profiles_delete_admin_only" ON public.profiles
  FOR DELETE 
  USING (public.verify_admin_access(auth.uid()));

-- CORREÇÃO 4: Políticas para subscribers
DROP POLICY IF EXISTS "subscribers_select_own_or_admin" ON public.subscribers;
DROP POLICY IF EXISTS "subscribers_update_own_or_system" ON public.subscribers;
DROP POLICY IF EXISTS "users_can_view_own_subscription" ON public.subscribers;

CREATE POLICY "subscribers_select_own_or_admin" ON public.subscribers
  FOR SELECT 
  USING (
    user_id = auth.uid() OR 
    public.verify_admin_access(auth.uid())
  );

CREATE POLICY "subscribers_update_own_or_admin" ON public.subscribers
  FOR UPDATE 
  USING (
    user_id = auth.uid() OR 
    public.verify_admin_access(auth.uid())
  );

-- CORREÇÃO 5: Função para prevenir escalação de privilégios via trigger
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger AS $$
BEGIN
  -- Se o role está sendo alterado e o usuário não é admin
  IF OLD.role != NEW.role AND NOT public.verify_admin_access(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar roles de usuário';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Aplicar trigger de segurança
DROP TRIGGER IF EXISTS prevent_role_escalation_trigger ON public.profiles;
CREATE TRIGGER prevent_role_escalation_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();

-- CORREÇÃO 6: Garantir que RLS está habilitado e forçado
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitored_whatsapp_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_groups_cache ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.chats FORCE ROW LEVEL SECURITY;
ALTER TABLE public.feedback FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.monitored_whatsapp_groups FORCE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_groups_cache FORCE ROW LEVEL SECURITY;
