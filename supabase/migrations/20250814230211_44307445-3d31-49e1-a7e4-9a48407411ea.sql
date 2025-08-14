-- Corrigir a assinatura da função verify_admin_access
DROP FUNCTION IF EXISTS public.verify_admin_access(UUID);

-- Recriar função com assinatura correta 
CREATE OR REPLACE FUNCTION public.verify_admin_access()
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

-- Recriar as políticas usando a função correta
DROP POLICY IF EXISTS "profiles_update_admin_role_management" ON public.profiles;
CREATE POLICY "profiles_update_admin_role_management" 
ON public.profiles 
FOR UPDATE 
USING (verify_admin_access())
WITH CHECK (verify_admin_access());

-- Recriar política de seleção
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" 
ON public.profiles 
FOR SELECT 
USING ((id = auth.uid()) OR verify_admin_access());