-- Remover TODAS as políticas existentes da tabela profiles
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;

-- Recriar a função is_admin
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

-- Criar políticas RLS ultra-simples
CREATE POLICY "profiles_select_all" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "profiles_update_all_for_admin" 
ON public.profiles 
FOR UPDATE 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "profiles_update_own" 
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_insert_own" 
ON public.profiles 
FOR INSERT 
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_delete_admin_only" 
ON public.profiles 
FOR DELETE 
USING (is_admin());