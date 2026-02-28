-- Corrigir políticas que ainda usam verify_admin_access
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin_only" ON public.profiles;

-- Recriar as políticas com a função correta
CREATE POLICY "profiles_update_admin" 
ON public.profiles 
FOR UPDATE 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "profiles_delete_admin_only" 
ON public.profiles 
FOR DELETE 
USING (is_admin());

-- Verificar se há triggers ou outras referências
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_definition LIKE '%verify_admin_access%';;
