-- SOLUÇÃO DEFINITIVA: Recriar função is_admin e reativar RLS corretamente

-- Recriar a função is_admin que funciona
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

-- Reativar RLS na tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS simples e funcionais
CREATE POLICY "profiles_select_all" 
ON public.profiles 
FOR SELECT 
USING (true);  -- Permitir visualizar todos os profiles (necessário para admin)

CREATE POLICY "profiles_update_own_or_admin" 
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid() OR is_admin())
WITH CHECK (id = auth.uid() OR is_admin());

CREATE POLICY "profiles_insert_own" 
ON public.profiles 
FOR INSERT 
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_delete_admin_only" 
ON public.profiles 
FOR DELETE 
USING (is_admin());

-- Log da correção
INSERT INTO public.security_audit_log (
  event_type, 
  event_details, 
  severity
) VALUES (
  'security_fix_applied',
  jsonb_build_object(
    'action', 'recreated_is_admin_function_and_rls_policies',
    'description', 'Corrigido problema de permissões admin',
    'timestamp', now()
  ),
  'medium'
);