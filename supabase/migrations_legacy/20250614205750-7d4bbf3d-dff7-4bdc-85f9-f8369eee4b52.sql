
-- Corrigir search_path mutável nas funções de segurança
-- Isso previne ataques de search_path hijacking

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.sync_profile_emails()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles 
  SET email = auth_users.email
  FROM auth.users AS auth_users
  WHERE profiles.id = auth_users.id 
  AND profiles.email IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_admin_access(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'admin'
  );
$$;

-- Mover extensão pg_net para schema específico (se necessário)
-- Nota: pg_net geralmente é instalado automaticamente pelo Supabase
-- Se você instalou manualmente, descomente as linhas abaixo:

-- CREATE SCHEMA IF NOT EXISTS extensions;
-- ALTER EXTENSION pg_net SET SCHEMA extensions;
