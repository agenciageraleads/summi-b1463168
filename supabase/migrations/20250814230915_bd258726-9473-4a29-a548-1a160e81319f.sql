-- ETAPA 1: LIMPEZA TOTAL - Remover todas as políticas conflitantes
DROP POLICY IF EXISTS "profiles_update_admin_role_management" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;

-- Remover funções duplicadas/inconsistentes
DROP FUNCTION IF EXISTS public.verify_admin_access(uuid);
DROP FUNCTION IF EXISTS public.is_current_user_admin();

-- ETAPA 2: CRIAR NOVA ESTRUTURA ADMIN LIMPA E SIMPLES

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

-- Políticas RLS simples e claras para profiles
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

-- Log da reorganização
INSERT INTO public.security_audit_log (
  event_type, 
  event_details, 
  severity
) VALUES (
  'system_reorganization',
  jsonb_build_object(
    'action', 'beta_system_cleanup',
    'description', 'Limpeza completa das políticas RLS e funções beta',
    'timestamp', now()
  ),
  'medium'
);