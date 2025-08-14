-- ETAPA 2: FINALIZAR LIMPEZA - Remover funções antigas e reorganizar profiles

-- Remover funções antigas agora que não há dependências
DROP FUNCTION IF EXISTS public.verify_admin_access(uuid);
DROP FUNCTION IF EXISTS public.is_current_user_admin();

-- Reorganizar políticas de profiles
DROP POLICY IF EXISTS "profiles_update_admin_role_management" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin_only" ON public.profiles;

-- Criar políticas limpas para profiles
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

CREATE POLICY "profiles_insert_own" 
ON public.profiles 
FOR INSERT 
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_delete_admin_only" 
ON public.profiles 
FOR DELETE 
USING (is_admin());

-- Log da reorganização final
INSERT INTO public.security_audit_log (
  event_type, 
  event_details, 
  severity
) VALUES (
  'system_reorganization',
  jsonb_build_object(
    'action', 'beta_system_cleanup_complete',
    'description', 'Finalizada limpeza completa das políticas RLS',
    'timestamp', now()
  ),
  'medium'
);