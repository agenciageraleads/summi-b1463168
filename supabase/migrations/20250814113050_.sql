-- PLANO DE CORREÇÃO COMPLETA COM CASCADE PARA REMOVER DEPENDÊNCIAS
-- ================================================================

-- ETAPA 1: LIMPEZA TOTAL DAS POLÍTICAS PRIMEIRO (para evitar dependências)
-- ================================================================
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin_role_management" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_all_for_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin_only" ON public.profiles;

-- ETAPA 2: LIMPEZA DAS FUNÇÕES ADMIN REDUNDANTES COM CASCADE
-- ================================================================
DROP FUNCTION IF EXISTS public.is_current_user_admin() CASCADE;
DROP FUNCTION IF EXISTS public.verify_admin_access(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_current_user_role() CASCADE;

-- ETAPA 3: RECRIAÇÃO DA FUNÇÃO is_admin COM SINTAXE PERFEITA
-- ================================================================
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = COALESCE(user_id, auth.uid()) 
    AND role = 'admin'
  );
$$;

-- ETAPA 4: RECRIAÇÃO DAS POLÍTICAS RLS ESSENCIAIS
-- ================================================================

-- 1. Todos podem ver profiles (necessário para verificações admin)
CREATE POLICY "profiles_select_all" 
ON public.profiles 
FOR SELECT 
USING (true);

-- 2. Admin pode atualizar qualquer profile
CREATE POLICY "profiles_update_admin" 
ON public.profiles 
FOR UPDATE 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- 3. Usuário pode atualizar seu próprio profile
CREATE POLICY "profiles_update_own" 
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 4. Usuário pode inserir seu próprio profile
CREATE POLICY "profiles_insert_own" 
ON public.profiles 
FOR INSERT 
WITH CHECK (id = auth.uid());

-- 5. Apenas admin pode deletar profiles
CREATE POLICY "profiles_delete_admin" 
ON public.profiles 
FOR DELETE 
USING (is_admin(auth.uid()));

-- ETAPA 5: LOG DE AUDITORIA DA CORREÇÃO
-- ================================================================
INSERT INTO public.security_audit_log (
  event_type, 
  event_details, 
  severity
) VALUES (
  'rls_policies_complete_correction_with_cascade',
  jsonb_build_object(
    'action', 'complete_admin_functions_and_rls_correction_cascade',
    'functions_removed_cascade', ARRAY['is_current_user_admin', 'verify_admin_access', 'get_current_user_role'],
    'function_recreated', 'is_admin',
    'policies_recreated', ARRAY['profiles_select_all', 'profiles_update_admin', 'profiles_update_own', 'profiles_insert_own', 'profiles_delete_admin'],
    'timestamp', now(),
    'correction_plan', 'plano_infalivel_de_correcao_completa_com_cascade'
  ),
  'high'
);;
