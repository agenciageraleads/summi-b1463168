-- Usar CASCADE para remover todas as dependências da função verify_admin_access
DROP FUNCTION IF EXISTS public.verify_admin_access(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_current_user_admin() CASCADE;

-- Recriar as políticas necessárias com a função is_admin
CREATE POLICY "profiles_select_own_or_admin" 
ON public.profiles 
FOR SELECT 
USING (id = auth.uid() OR is_admin());

CREATE POLICY "profiles_update_own" 
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_admin_only" 
ON public.profiles 
FOR UPDATE 
USING (is_admin())
WITH CHECK (is_admin());

-- Log final da limpeza
INSERT INTO public.security_audit_log (
  event_type, 
  event_details, 
  severity
) VALUES (
  'system_reorganization',
  jsonb_build_object(
    'action', 'beta_system_final_cleanup',
    'description', 'Removidas todas as funções antigas com CASCADE',
    'timestamp', now()
  ),
  'medium'
);