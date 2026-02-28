-- Fix da política circular de RLS para admins
-- A política atual causa um loop infinito ao fazer subconsulta na própria tabela

-- Remover política problemática
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Criar nova política usando a função is_admin() que não causa recursão
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Verificar se a função is_admin existe e está correta
-- Ela deve usar SECURITY DEFINER para evitar problemas de RLS
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = COALESCE(user_id, auth.uid()) 
    AND role = 'admin'
  );
$$;;
