-- Criar nova função específica para admin sem parâmetros
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Verificar se o usuário logado é admin
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$;

-- Atualizar políticas para usar a nova função
DROP POLICY IF EXISTS "profiles_update_admin_role_management" ON public.profiles;
CREATE POLICY "profiles_update_admin_role_management" 
ON public.profiles 
FOR UPDATE 
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

-- Atualizar política de seleção 
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" 
ON public.profiles 
FOR SELECT 
USING ((id = auth.uid()) OR is_current_user_admin());