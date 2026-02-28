-- Finalizar remoção das últimas dependências da função verify_admin_access

-- Primeiro, substituir as políticas restantes que ainda dependem da função antiga
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin_only" ON public.profiles;

-- Criar as políticas de profiles com a nova função
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

-- Agora remover a função antiga
DROP FUNCTION IF EXISTS public.verify_admin_access(uuid);
DROP FUNCTION IF EXISTS public.is_current_user_admin();