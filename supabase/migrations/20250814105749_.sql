-- Criar função para verificar acesso de admin
CREATE OR REPLACE FUNCTION public.verify_admin_access(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verificar se o usuário logado é admin
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que a função pode ser executada
GRANT EXECUTE ON FUNCTION public.verify_admin_access(UUID) TO authenticated;;
