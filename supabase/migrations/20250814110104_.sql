-- Verificar e corrigir políticas RLS da tabela profiles para permitir admin atualizar roles

-- Remover política restritiva que pode estar bloqueando admins
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Criar política que permite usuários atualizarem próprio perfil
CREATE POLICY "profiles_update_own" 
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Criar política separada que permite admins atualizarem qualquer perfil
CREATE POLICY "profiles_update_admin_role_management" 
ON public.profiles 
FOR UPDATE 
USING (verify_admin_access(auth.uid()))
WITH CHECK (verify_admin_access(auth.uid()));

-- Garantir que a política de seleção também funciona para admins
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" 
ON public.profiles 
FOR SELECT 
USING ((id = auth.uid()) OR verify_admin_access(auth.uid()));;
