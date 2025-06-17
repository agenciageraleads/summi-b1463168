
-- Adicionar coluna para armazenar a aceitação dos termos de uso
ALTER TABLE public.profiles 
ADD COLUMN terms_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN terms_version TEXT;

-- Comentário: terms_accepted_at armazena quando o usuário aceitou
-- terms_version armazena qual versão dos termos foi aceita (ex: "v1.0")
