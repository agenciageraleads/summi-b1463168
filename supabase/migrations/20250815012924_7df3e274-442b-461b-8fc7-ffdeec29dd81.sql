-- CORREÇÃO CRÍTICA DE SEGURANÇA: Proteger dados pessoais na tabela profiles
-- Remove política vulnerável que permite acesso público a todos os perfis
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;

-- Cria políticas seguras para acesso aos perfis
-- Usuários podem ver apenas seu próprio perfil
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- Admins podem ver todos os perfis (para administração)
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Verificar se RLS está habilitado (deve estar)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Verificar políticas atuais
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public';