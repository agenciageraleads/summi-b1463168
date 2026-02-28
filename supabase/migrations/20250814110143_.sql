-- Corrigir search_path da função verify_admin_access
CREATE OR REPLACE FUNCTION public.verify_admin_access(user_id UUID)
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
$$;;
