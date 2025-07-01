
-- TRIGGER PARA SINCRONIZAÇÃO AUTOMÁTICA DE DADOS GOOGLE OAUTH
-- Copia nome e avatar do Google para a tabela profiles automaticamente

CREATE OR REPLACE FUNCTION public.handle_google_oauth_user()
RETURNS trigger AS $$
BEGIN
  -- Verificar se é login via Google OAuth
  IF NEW.provider = 'google' AND NEW.raw_user_meta_data IS NOT NULL THEN
    -- Inserir ou atualizar dados na tabela profiles
    INSERT INTO public.profiles (
      id, 
      nome, 
      email, 
      avatar
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
      NEW.email,
      NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
      nome = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', EXCLUDED.nome),
      email = NEW.email,
      avatar = COALESCE(NEW.raw_user_meta_data->>'avatar_url', profiles.avatar),
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger no auth.identities para capturar logins OAuth
CREATE OR REPLACE TRIGGER on_google_oauth_signin
  AFTER INSERT ON auth.identities
  FOR EACH ROW
  WHEN (NEW.provider = 'google')
  EXECUTE FUNCTION public.handle_google_oauth_user();
