
-- Correção crítica: Adicionar coluna email na tabela profiles
-- Esta coluna é necessária para o webhook do Stripe funcionar corretamente
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- Atualizar perfis existentes com emails dos usuários autenticados
-- Usar uma função para buscar emails da tabela auth.users
CREATE OR REPLACE FUNCTION public.sync_profile_emails()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles 
  SET email = auth_users.email
  FROM auth.users AS auth_users
  WHERE profiles.id = auth_users.id 
  AND profiles.email IS NULL;
END;
$$;

-- Executar a sincronização
SELECT public.sync_profile_emails();

-- Atualizar o trigger para incluir email ao criar novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Adicionar constrains de segurança
ALTER TABLE public.profiles 
  ADD CONSTRAINT valid_email_format 
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Limpar políticas RLS duplicadas e adicionar política para email
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Recriar políticas RLS mais restritivas
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id AND email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Criar função segura para verificação de admin no servidor
CREATE OR REPLACE FUNCTION public.verify_admin_access(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'admin'
  );
$$;

-- Adicionar constraint para validar números de telefone brasileiros
ALTER TABLE public.profiles 
  ADD CONSTRAINT valid_phone_format 
  CHECK (numero IS NULL OR numero ~ '^55[1-9][1-9][0-9]{8,9}$');
;
