
-- Adicionar coluna de role na tabela profiles para identificar administradores
ALTER TABLE public.profiles ADD COLUMN role text DEFAULT 'user';

-- Atualizar um usuário específico como admin (você deve substituir pelo seu user_id)
-- UPDATE public.profiles SET role = 'admin' WHERE id = 'SEU_USER_ID_AQUI';

-- Criar função para verificar se um usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'admin'
  );
$$;

-- Criar política RLS para permitir que admins vejam todos os perfis
CREATE POLICY "Admins can view all profiles" 
  ON public.profiles 
  FOR SELECT 
  USING (public.is_admin(auth.uid()) OR auth.uid() = id);

-- Criar política RLS para permitir que admins atualizem todos os perfis
CREATE POLICY "Admins can update all profiles" 
  ON public.profiles 
  FOR UPDATE 
  USING (public.is_admin(auth.uid()) OR auth.uid() = id);

-- Criar política RLS para permitir que admins deletem perfis
CREATE POLICY "Admins can delete profiles" 
  ON public.profiles 
  FOR DELETE 
  USING (public.is_admin(auth.uid()));

-- Permitir que admins vejam todos os subscribers
CREATE POLICY "Admins can view all subscribers" 
  ON public.subscribers 
  FOR SELECT 
  USING (public.is_admin(auth.uid()) OR auth.uid() = user_id);

-- Permitir que admins vejam todos os chats
CREATE POLICY "Admins can view all chats" 
  ON public.chats 
  FOR SELECT 
  USING (public.is_admin(auth.uid()) OR auth.uid() = id_usuario);

-- Permitir que admins vejam todos os feedbacks
CREATE POLICY "Admins can view all feedback" 
  ON public.feedback 
  FOR SELECT 
  USING (public.is_admin(auth.uid()) OR auth.uid() = user_id);
