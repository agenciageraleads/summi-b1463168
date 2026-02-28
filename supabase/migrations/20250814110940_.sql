-- ETAPA 1: LIMPEZA TOTAL - Substituir todas as dependências da função verify_admin_access

-- Função única para verificar se usuário atual é admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = COALESCE(user_id, auth.uid()) AND role = 'admin'
  );
$$;

-- Substituir políticas em chats
DROP POLICY IF EXISTS "chats_select_own_or_admin" ON public.chats;
CREATE POLICY "chats_select_own_or_admin" 
ON public.chats 
FOR SELECT 
USING (id_usuario = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "chats_update_own_or_admin" ON public.chats;
CREATE POLICY "chats_update_own_or_admin" 
ON public.chats 
FOR UPDATE 
USING (id_usuario = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "chats_delete_own_or_admin" ON public.chats;
CREATE POLICY "chats_delete_own_or_admin" 
ON public.chats 
FOR DELETE 
USING (id_usuario = auth.uid() OR is_admin());

-- Substituir políticas em feedback
DROP POLICY IF EXISTS "feedback_select_own_or_admin" ON public.feedback;
CREATE POLICY "feedback_select_own_or_admin" 
ON public.feedback 
FOR SELECT 
USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "feedback_delete_own_or_admin" ON public.feedback;
CREATE POLICY "feedback_delete_own_or_admin" 
ON public.feedback 
FOR DELETE 
USING (user_id = auth.uid() OR is_admin());

-- Substituir políticas em subscribers
DROP POLICY IF EXISTS "subscribers_select_own_or_admin" ON public.subscribers;
CREATE POLICY "subscribers_select_own_or_admin" 
ON public.subscribers 
FOR SELECT 
USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "subscribers_update_own_or_admin" ON public.subscribers;
CREATE POLICY "subscribers_update_own_or_admin" 
ON public.subscribers 
FOR UPDATE 
USING (user_id = auth.uid() OR is_admin());

-- Substituir políticas em monitored_whatsapp_groups
DROP POLICY IF EXISTS "Admins can view all monitored groups" ON public.monitored_whatsapp_groups;
CREATE POLICY "Admins can view all monitored groups" 
ON public.monitored_whatsapp_groups 
FOR SELECT 
USING (is_admin());

-- Substituir políticas em user_calendars
DROP POLICY IF EXISTS "Admins can view all calendars" ON public.user_calendars;
CREATE POLICY "Admins can view all calendars" 
ON public.user_calendars 
FOR SELECT 
USING (is_admin());

-- Substituir políticas em leads
DROP POLICY IF EXISTS "leads_admin_access" ON public.leads;
CREATE POLICY "leads_admin_access" 
ON public.leads 
FOR ALL 
USING (is_admin());

-- Substituir políticas em security_audit_log
DROP POLICY IF EXISTS "security_audit_log_admin_view" ON public.security_audit_log;
CREATE POLICY "security_audit_log_admin_view" 
ON public.security_audit_log 
FOR SELECT 
USING (is_admin());

-- Substituir políticas em rate_limits
DROP POLICY IF EXISTS "rate_limits_own_view" ON public.rate_limits;
CREATE POLICY "rate_limits_own_view" 
ON public.rate_limits 
FOR SELECT 
USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "rate_limits_own_update" ON public.rate_limits;
CREATE POLICY "rate_limits_own_update" 
ON public.rate_limits 
FOR ALL 
USING (auth.uid() = user_id OR is_admin())
WITH CHECK (auth.uid() = user_id OR is_admin());;
